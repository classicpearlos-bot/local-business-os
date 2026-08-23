import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppTemplate } from '@/lib/meta/whatsapp'; // Or wherever the Meta client is

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max duration for this serverless function if deployed on Vercel

export async function GET(request: Request) {
  // Simple cron trigger
  try {
    const BATCH_SIZE = 25; // Process 25 recipients at a time per tick
    
    // 1. Claim recipients using our atomic RPC function
    const { data: claimed, error: claimError } = await supabaseAdmin.rpc('claim_campaign_recipients', {
      batch_size: BATCH_SIZE
    });

    if (claimError) {
      console.error('Failed to claim recipients from queue', claimError);
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ message: 'Queue is empty' }, { status: 200 });
    }

    // 2. Fetch the actual campaign details for the claimed recipients
    const campaignIds = [...new Set(claimed.map((r: any) => r.campaign_id))];
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id, template_name, template_language, template_components, organization_id')
      .in('id', campaignIds);

    const campaignsMap = new Map(campaigns?.map(c => [c.id, c]));

    // 3. Process each recipient sequentially (or map concurrently with a limit)
    let successCount = 0;
    let failureCount = 0;

    for (const recipient of claimed) {
      const campaign = campaignsMap.get(recipient.campaign_id);
      
      if (!campaign) {
        await markFailed(recipient.id, 'CAMPAIGN_NOT_FOUND', 'Campaign data could not be found');
        failureCount++;
        continue;
      }

      // Fetch the WhatsApp Account for this organization
      const { data: account } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('phone_number_id, access_token')
        .eq('organization_id', campaign.organization_id)
        .single();

      if (!account) {
        await markFailed(recipient.id, 'ACCOUNT_NOT_FOUND', 'Meta WhatsApp Account not linked');
        failureCount++;
        continue;
      }

      try {
        // Dispatch to Meta
        const response = await sendWhatsAppTemplate({
          phoneNumberId: account.phone_number_id,
          accessToken: account.access_token,
          to: recipient.phone_number
        }, campaign.template_name, campaign.template_language, campaign.template_components || []);

        // Response handling
        if (response.error) {
          // Check if rate limited (429) or other retryable vs permanent error
          const isRetryable = response.error.code === 429 || response.error.code === 131056; // Example Meta rate limit codes
          
          if (isRetryable && recipient.attempts < 5) {
            // Calculate exponential backoff
            const delaySec = Math.pow(2, recipient.attempts) * 5; 
            const nextRetry = new Date(Date.now() + delaySec * 1000).toISOString();
            
            await supabaseAdmin.from('campaign_recipients').update({
              status: 'PENDING', // Send back to pending
              next_retry_at: nextRetry,
              error_code: response.error.code?.toString() || 'RETRYABLE_ERROR',
              error_message: response.error.message
            }).eq('id', recipient.id);
          } else {
            // Permanent failure
            await markFailed(recipient.id, response.error.code?.toString() || 'API_ERROR', response.error.message);
          }
          failureCount++;
        } else {
          // Success! Meta accepted the message. The webhook will handle DELIVERED/READ ticks later.
          await supabaseAdmin.from('campaign_recipients').update({
            status: 'SENT',
            sent_at: new Date().toISOString(),
            meta_message_id: response.messages?.[0]?.id // Store the WA ID!
          }).eq('id', recipient.id);

          // Update campaign analytics synchronously (can also be done via a trigger)
          await supabaseAdmin.rpc('increment_campaign_sent', { camp_id: campaign.id });

          successCount++;
        }

      } catch (err: any) {
        console.error('Crash processing recipient', recipient.id, err);
        // If it's a crash, we retry it
        if (recipient.attempts < 5) {
           await supabaseAdmin.from('campaign_recipients').update({
             status: 'PENDING',
             next_retry_at: new Date(Date.now() + 60000).toISOString(), // 1 minute retry
             error_message: err.message
           }).eq('id', recipient.id);
        } else {
           await markFailed(recipient.id, 'CRASH', err.message);
        }
        failureCount++;
      }
    }

    return NextResponse.json({ processed: claimed.length, success: successCount, failed: failureCount });
  } catch (error: any) {
    console.error('Fatal Queue Error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function markFailed(recipientId: string, errorCode: string, errorMessage: string) {
  await supabaseAdmin.from('campaign_recipients').update({
    status: 'FAILED',
    failed_at: new Date().toISOString(),
    error_code: errorCode,
    error_message: errorMessage
  }).eq('id', recipientId);
}
