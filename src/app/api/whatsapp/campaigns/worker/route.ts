import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppTemplate } from '@/lib/meta/whatsapp';

export const maxDuration = 60; // Full 60s execution window on Vercel Serverless

export async function GET(request: Request) {
  const startTime = Date.now();
  let totalProcessed = 0;
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  const processedCampaignIds = new Set<string>();

  try {
    // 1. STALE CLAIM RECOVERY: Automatically reset any claims stuck in 'PROCESSING' > 5 minutes
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from('campaign_recipients')
      .update({
        status: 'PENDING',
        error_message: 'Recovered from stale worker claim'
      })
      .eq('status', 'PROCESSING')
      .lt('processing_at', staleThreshold);

    // Cache template component structures across batches
    const { data: tmplRecords } = await supabaseAdmin
      .from('message_templates')
      .select('organization_id, name, components');
    
    const tmplMap = new Map<string, any>();
    (tmplRecords || []).forEach((t: any) => {
      tmplMap.set(`${t.organization_id}_${t.name}`, t.components);
    });

    // 2. Continuous execution loop running until queue is drained or 45s safety limit reached
    while (Date.now() - startTime < 45000) {
      const { data: claimed, error } = await supabaseAdmin.rpc('claim_campaign_recipients', { batch_size: 50 });
      
      if (error || !claimed || claimed.length === 0) {
        break; // Queue is completely drained
      }

      totalProcessed += claimed.length;

      for (const recipient of claimed) {
        processedCampaignIds.add(recipient.campaign_id);
        
        // Fetch campaign details
        const { data: campaign } = await supabaseAdmin
          .from('campaigns')
          .select('*')
          .eq('id', recipient.campaign_id)
          .single();

        if (!campaign) continue;

        // If campaign was cancelled or paused, mark recipient accordingly
        if (campaign.status === 'CANCELLED' || campaign.status === 'PAUSED') {
          await supabaseAdmin.from('campaign_recipients').update({
            status: 'CANCELLED',
            error_code: 'CAMPAIGN_CANCELLED',
            error_message: `Campaign was marked as ${campaign.status}`
          }).eq('id', recipient.id);
          continue;
        }

        // DUPLICATE SEND PROTECTION: Skip if already sent or has meta_message_id
        const { data: existingRecip } = await supabaseAdmin
          .from('campaign_recipients')
          .select('meta_message_id, status')
          .eq('id', recipient.id)
          .single();

        if (existingRecip?.meta_message_id || existingRecip?.status === 'SENT' || existingRecip?.status === 'DELIVERED') {
          continue; // Already dispatched safely
        }

        // DISPATCH-TIME OPT-IN RECHECK: Verify contact is strictly opted-in
        const { data: contact } = await supabaseAdmin
          .from('contacts')
          .select('id, name, phone_number, opted_in')
          .eq('id', recipient.contact_id)
          .single();

        if (!contact || contact.opted_in !== true) {
          await supabaseAdmin.from('campaign_recipients').update({
            status: 'FAILED',
            failed_at: new Date().toISOString(),
            error_code: 'OPTED_OUT',
            error_message: 'Contact is not opted-in for marketing broadcasts'
          }).eq('id', recipient.id);
          skippedCount++;
          continue;
        }

        const { data: account } = await supabaseAdmin
          .from('whatsapp_accounts')
          .select('*')
          .eq('organization_id', campaign.organization_id)
          .single();

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
            const wamId = response.messages?.[0]?.id;

            await supabaseAdmin.from('campaign_recipients').update({
              status: 'SENT',
              sent_at: new Date().toISOString(),
              meta_message_id: wamId
            }).eq('id', recipient.id);

            await supabaseAdmin.rpc('increment_campaign_sent', { camp_id: campaign.id });
            successCount++;

            // Ensure conversation & message exist in the Inbox
            try {
              if (recipient.contact_id) {
                let { data: conv } = await supabaseAdmin
                  .from('conversations')
                  .select('id')
                  .eq('organization_id', campaign.organization_id)
                  .eq('contact_id', recipient.contact_id)
                  .maybeSingle();

                if (!conv) {
                  const { data: newConv } = await supabaseAdmin
                    .from('conversations')
                    .insert({
                      organization_id: campaign.organization_id,
                      contact_id: recipient.contact_id,
                      status: 'OPEN',
                      last_message_at: new Date().toISOString(),
                      unread_count: 0
                    })
                    .select('id')
                    .single();
                  conv = newConv;
                } else {
                  await supabaseAdmin
                    .from('conversations')
                    .update({ last_message_at: new Date().toISOString() })
                    .eq('id', conv.id);
                }

                if (conv && wamId) {
                  const tmplComponents = tmplMap.get(`${campaign.organization_id}_${campaign.template_name}`) || [];
                  let headerImg = null;
                  let bodyTxt = null;
                  let btns: any[] = [];

                  (tmplComponents || []).forEach((c: any) => {
                    if (c.type === 'HEADER' && c.format === 'IMAGE') {
                      headerImg = c.example?.header_handle?.[0] || null;
                    } else if (c.type === 'BODY') {
                      bodyTxt = c.text;
                    } else if (c.type === 'BUTTONS') {
                      btns = c.buttons || [];
                    }
                  });

                  await supabaseAdmin.from('messages').insert({
                    organization_id: campaign.organization_id,
                    contact_id: recipient.contact_id,
                    conversation_id: conv.id,
                    wam_id: wamId,
                    direction: 'OUTBOUND',
                    type: 'template',
                    content: { 
                      template: { 
                        name: campaign.template_name,
                        header_image: headerImg,
                        body_text: bodyTxt,
                        buttons: btns
                      },
                      text: { body: bodyTxt || `[Campaign: ${campaign.name || 'Broadcast'}]` },
                      image: headerImg ? { url: headerImg } : undefined
                    },
                    status: 'SENT'
                  });
                }
              }
            } catch (e) {
              console.error('Failed to log broadcast to conversation:', e);
            }
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
    }

    // Check and update completion status for all touched campaigns
    for (const campId of Array.from(processedCampaignIds)) {
      const { count: pendingCount } = await supabaseAdmin.from('campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campId)
        .in('status', ['PENDING', 'PROCESSING', 'SCHEDULED']);
        
      if (pendingCount === 0) {
        await supabaseAdmin.from('campaigns').update({ 
          status: 'COMPLETED',
          completed_at: new Date().toISOString()
        }).eq('id', campId);
      }
    }

    // Remaining count in queue
    const { count: totalRemaining } = await supabaseAdmin
      .from('campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .in('status', ['PENDING', 'PROCESSING', 'SCHEDULED']);

    return NextResponse.json({ 
      processed: totalProcessed, 
      success: successCount, 
      failed: failureCount,
      skipped: skippedCount,
      remaining: totalRemaining || 0
    });

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
