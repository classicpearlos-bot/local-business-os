import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppTemplate } from '@/lib/meta/whatsapp';

export async function GET(request: Request) {
  try {
    const { data: claimed, error } = await supabaseAdmin.rpc('claim_campaign_recipients', { batch_size: 50 });
    
    if (error || !claimed || claimed.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let successCount = 0;
    let failureCount = 0;
    let processedCampaignIds = new Set();

    for (const recipient of claimed) {
      processedCampaignIds.add(recipient.campaign_id);
      const { data: campaign } = await supabaseAdmin.from('campaigns').select('*').eq('id', recipient.campaign_id).single();
      const { data: account } = await supabaseAdmin.from('whatsapp_accounts').select('*').eq('organization_id', campaign.organization_id).single();

      if (!account || !account.phone_number_id || !account.access_token) {
        await markFailed(recipient.id, 'NO_ACCOUNT', 'WhatsApp account not configured');
        failureCount++;
        continue;
      }

      try {
        const response = await sendWhatsAppTemplate({
          phoneNumberId: account.phone_number_id,
          accessToken: account.access_token,
          to: recipient.phone_number
        }, campaign.template_name, campaign.template_language, campaign.template_components || []);

        if (response.error) {
          const isRetryable = response.error.code === 429 || response.error.code === 131056;
          
          if (isRetryable && recipient.attempts < 5) {
            const delaySec = Math.pow(2, recipient.attempts) * 5; 
            const nextRetry = new Date(Date.now() + delaySec * 1000).toISOString();
            
            await supabaseAdmin.from('campaign_recipients').update({
              status: 'PENDING',
              next_retry_at: nextRetry,
              error_code: response.error.code?.toString() || 'RETRYABLE_ERROR',
              error_message: response.error.message
            }).eq('id', recipient.id);
          } else {
            await markFailed(recipient.id, response.error.code?.toString() || 'API_ERROR', response.error.message);
          }
          failureCount++;
        } else {
          await supabaseAdmin.from('campaign_recipients').update({
            status: 'SENT',
            sent_at: new Date().toISOString(),
            meta_message_id: response.messages?.[0]?.id
          }).eq('id', recipient.id);

          await supabaseAdmin.rpc('increment_campaign_sent', { camp_id: campaign.id });
          successCount++;
        }
      } catch (err: any) {
        if (recipient.attempts < 5) {
           await supabaseAdmin.from('campaign_recipients').update({
             status: 'PENDING',
             next_retry_at: new Date(Date.now() + 60000).toISOString(),
             error_message: err.message
           }).eq('id', recipient.id);
        } else {
           await markFailed(recipient.id, 'CRASH', err.message);
        }
        failureCount++;
      }
    }

    // After processing, check if campaigns are completely finished
    for (const campId of processedCampaignIds) {
      const { count: pendingCount } = await supabaseAdmin.from('campaign_recipients')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campId)
        .in('status', ['PENDING', 'PROCESSING']);
        
      if (pendingCount === 0) {
        await supabaseAdmin.from('campaigns').update({ status: 'COMPLETED' }).eq('id', campId);
      }
    }

    return NextResponse.json({ processed: claimed.length, success: successCount, failed: failureCount });
  } catch (error: any) {
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
