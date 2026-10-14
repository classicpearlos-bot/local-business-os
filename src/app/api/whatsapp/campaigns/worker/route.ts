import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppTemplate } from '@/lib/meta/whatsapp';

export const maxDuration = 60; // Full 60s execution window on Vercel Serverless

function isDailyLimitError(err: any): boolean {
  if (!err) return false;
  const code = Number(err.code);
  const msg = String(err.message || '').toLowerCase();
  
  // Meta Cloud API error codes when daily messaging tier limit or rate limits are reached:
  // 131056: Rate limit hit / Business eligibility / Daily messaging tier limit
  // 131048: Spam rate limit hit
  // 130429: Cloud API rate limit hit
  // 429: Too Many Requests
  if (code === 131056 || code === 131048 || code === 130429 || code === 429) {
    return true;
  }
  if (
    msg.includes('daily limit') ||
    msg.includes('messaging limit') ||
    msg.includes('eligibility limit') ||
    msg.includes('tier limit') ||
    msg.includes('rate limit') ||
    msg.includes('too many messages') ||
    msg.includes('spam rate limit') ||
    msg.includes('quota')
  ) {
    return true;
  }
  return false;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const isUiBypass = request.headers.get('x-ui-bypass') === 'true';
  
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}` && !isUiBypass) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let totalProcessed = 0;
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  const processedCampaignIds = new Set<string>();
  const dailyLimitHitCampaigns = new Set<string>();

  try {
    const nowIso = new Date().toISOString();

    // 0. PROMOTE DUE SCHEDULED RECIPIENTS & CAMPAIGNS TO PENDING/QUEUED
    // Fixes the issue where scheduled_at <= now left recipients stuck in 'SCHEDULED'
    await supabaseAdmin
      .from('campaign_recipients')
      .update({ status: 'PENDING' })
      .eq('status', 'SCHEDULED')
      .lte('scheduled_at', nowIso);

    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'QUEUED' })
      .eq('status', 'SCHEDULED')
      .lte('scheduled_at', nowIso);

    // 1. STALE CLAIM RECOVERY: Automatically reset any claims stuck in 'PROCESSING' > 2 minutes
    const staleThreshold = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from('campaign_recipients')
      .update({
        status: 'PENDING',
        error_message: 'Recovered from stale worker claim'
      })
      .eq('status', 'PROCESSING')
      .lt('processing_at', staleThreshold);

    // Cache template component structures, campaigns, and WhatsApp accounts across batches
    const { data: tmplRecords } = await supabaseAdmin
      .from('message_templates')
      .select('organization_id, name, components');
    
    const tmplMap = new Map<string, any>();
    (tmplRecords || []).forEach((t: any) => {
      tmplMap.set(`${t.organization_id}_${t.name}`, t.components);
    });

    const campaignCache = new Map<string, any>();
    const accountCache = new Map<string, any>();

    // 2. Continuous execution loop running until queue is drained or 50s safety limit reached
    while (Date.now() - startTime < 50000) {
      let { data: claimed, error } = await supabaseAdmin.rpc('claim_campaign_recipients', { batch_size: 50 });

      // Fallback: if RPC returned empty, check directly for PENDING recipients that are due
      if (error || !claimed || claimed.length === 0) {
        const { data: fallbackPending } = await supabaseAdmin
          .from('campaign_recipients')
          .select('*')
          .eq('status', 'PENDING')
          .lte('scheduled_at', new Date().toISOString())
          .limit(50);

        if (!fallbackPending || fallbackPending.length === 0) {
          break; // Queue is completely drained
        }

        const fallbackIds = fallbackPending.map((r: any) => r.id);
        await supabaseAdmin
          .from('campaign_recipients')
          .update({
            status: 'PROCESSING',
            processing_at: new Date().toISOString(),
            last_attempt_at: new Date().toISOString()
          })
          .in('id', fallbackIds);

        claimed = fallbackPending;
      }

      totalProcessed += claimed.length;

      // Pre-load campaigns for this batch and mark QUEUED -> PROCESSING
      const batchCampaignIds = Array.from(new Set<string>(claimed.map((r: any) => r.campaign_id)));
      for (const cId of batchCampaignIds) {
        processedCampaignIds.add(cId);
        if (!campaignCache.has(cId)) {
          const { data: camp } = await supabaseAdmin
            .from('campaigns')
            .select('*')
            .eq('id', cId)
            .single();
          if (camp) {
            if (camp.status === 'QUEUED' || camp.status === 'SCHEDULED') {
              await supabaseAdmin
                .from('campaigns')
                .update({
                  status: 'PROCESSING',
                  started_at: camp.started_at || new Date().toISOString()
                })
                .eq('id', cId);
              camp.status = 'PROCESSING';
            }
            campaignCache.set(cId, camp);
          }
        }
      }

      // Pre-load WhatsApp accounts for organizations in this batch
      const batchOrgIds = Array.from(
        new Set<string>(
          batchCampaignIds
            .map(id => campaignCache.get(id)?.organization_id)
            .filter(Boolean)
        )
      );
      for (const orgId of batchOrgIds) {
        if (!accountCache.has(orgId)) {
          const { data: acc } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('*')
            .eq('organization_id', orgId)
            .single();
          if (acc) accountCache.set(orgId, acc);
        }
      }

      // Batch-load all contacts in this batch of 50 in a single query
      const batchContactIds = Array.from(new Set<string>(claimed.map((r: any) => r.contact_id).filter(Boolean)));
      const contactMap = new Map<string, any>();
      if (batchContactIds.length > 0) {
        const { data: batchContacts } = await supabaseAdmin
          .from('contacts')
          .select('id, name, phone_number, opted_in')
          .in('id', batchContactIds);
        (batchContacts || []).forEach((c: any) => contactMap.set(c.id, c));
      }

      // Process recipients in parallel chunks of 10 for 10x faster throughput
      const CONCURRENCY = 10;
      for (let i = 0; i < claimed.length; i += CONCURRENCY) {
        const slice = claimed.slice(i, i + CONCURRENCY);
        await Promise.allSettled(
          slice.map(async (recipient: any) => {
            const campaign = campaignCache.get(recipient.campaign_id);
            if (!campaign) return;

            // Circuit Breaker: If this campaign already hit Meta daily limit, halt processing immediately
            if (dailyLimitHitCampaigns.has(campaign.id)) {
              return;
            }

            if (campaign.status === 'CANCELLED' || campaign.status === 'PAUSED') {
              await supabaseAdmin.from('campaign_recipients').update({
                status: 'CANCELLED',
                error_code: 'CAMPAIGN_CANCELLED',
                error_message: `Campaign was marked as ${campaign.status}`
              }).eq('id', recipient.id);
              return;
            }

            // DUPLICATE SEND PROTECTION: Skip if already sent or has meta_message_id
            if (recipient.meta_message_id || recipient.status === 'SENT' || recipient.status === 'DELIVERED') {
              return;
            }

            const contact = contactMap.get(recipient.contact_id);
            if (!contact || contact.opted_in !== true) {
              await supabaseAdmin.from('campaign_recipients').update({
                status: 'FAILED',
                failed_at: new Date().toISOString(),
                error_code: 'OPTED_OUT',
                error_message: 'Contact is not opted-in for marketing broadcasts'
              }).eq('id', recipient.id);
              skippedCount++;
              return;
            }

            const account = accountCache.get(campaign.organization_id);
            if (!account || !account.phone_number_id || !account.access_token) {
              await markFailed(recipient.id, 'NO_ACCOUNT', 'WhatsApp account not configured');
              failureCount++;
              return;
            }

            try {
              const customerName = contact.name || 'Valued Customer';
              const firstName = customerName.split(' ')[0] || 'Valued Customer';
              const phone = contact.phone_number || '';

              const dynamicComponents = JSON.parse(JSON.stringify(campaign.template_components || []));
              dynamicComponents.forEach((comp: any) => {
                if (comp.parameters) {
                  comp.parameters.forEach((param: any) => {
                    if (param.type === 'text' && typeof param.text === 'string') {
                      param.text = param.text
                        .replace(/{{name}}/gi, customerName)
                        .replace(/{{first_name}}/gi, firstName)
                        .replace(/{{phone}}/gi, phone);
                    }
                  });
                }
              });

              const response = await sendWhatsAppTemplate({
                phoneNumberId: account.phone_number_id,
                accessToken: account.access_token,
                to: recipient.phone_number
              }, campaign.template_name, campaign.template_language, dynamicComponents);

              if (response.error) {
                // 1. Check for Meta Daily Messaging Limit / Tier 1 Cap Hit
                if (isDailyLimitError(response.error)) {
                  console.warn(`[Campaign Worker] DAILY LIMIT REACHED on campaign ${campaign.id}! Halting broadcast immediately.`);
                  dailyLimitHitCampaigns.add(campaign.id);

                  // Fail current recipient with clear daily limit error
                  await supabaseAdmin.from('campaign_recipients').update({
                    status: 'FAILED',
                    failed_at: new Date().toISOString(),
                    error_code: 'DAILY_LIMIT_REACHED',
                    error_message: 'Not sent: Meta WhatsApp daily messaging limit reached for today. Will be ready to send tomorrow.'
                  }).eq('id', recipient.id);

                  // HALT BROADCAST: Immediately mark all remaining PENDING, PROCESSING, or SCHEDULED recipients as DAILY_LIMIT_REACHED
                  await supabaseAdmin.from('campaign_recipients').update({
                    status: 'FAILED',
                    failed_at: new Date().toISOString(),
                    error_code: 'DAILY_LIMIT_REACHED',
                    error_message: 'Not sent: Broadcast stopped immediately because Meta 24-hour daily limit was reached for today.'
                  }).eq('campaign_id', campaign.id).in('status', ['PENDING', 'PROCESSING', 'SCHEDULED']);

                  failureCount++;
                  return;
                }

                // 2. Standard retryable error handling
                const isRetryable = response.error.code === 500 || response.error.code === 503;
                if (isRetryable && (recipient.attempts || 0) < 3) {
                  const delaySec = Math.pow(2, recipient.attempts || 1) * 5;
                  const nextRetry = new Date(Date.now() + delaySec * 1000).toISOString();
                  await supabaseAdmin.from('campaign_recipients').update({
                    status: 'PENDING',
                    next_retry_at: nextRetry,
                    error_code: response.error.code?.toString() || 'RETRYABLE_ERROR',
                    error_message: response.error.message
                  }).eq('id', recipient.id);
                } else {
                  await markFailed(recipient.id, response.error.code?.toString() || 'API_ERROR', response.error.message);
                  await supabaseAdmin.rpc('increment_campaign_failed', { camp_id: campaign.id });
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
              if ((recipient.attempts || 0) < 5) {
                await supabaseAdmin.from('campaign_recipients').update({
                  status: 'PENDING',
                  next_retry_at: new Date(Date.now() + 60000).toISOString(),
                  error_message: err.message
                }).eq('id', recipient.id);
              } else {
                await markFailed(recipient.id, 'CRASH', err.message);
                await supabaseAdmin.rpc('increment_campaign_failed', { camp_id: campaign.id });
              }
              failureCount++;
            }
          })
        );
      }
    }

    // 3. Also include any campaigns currently in QUEUED / PROCESSING / RUNNING so their totals and completion are synced
    const { data: activeCampaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .in('status', ['QUEUED', 'PROCESSING', 'RUNNING']);

    (activeCampaigns || []).forEach((c: any) => processedCampaignIds.add(c.id));

    // Sync exact sent/failed counts and completion status for all touched/active campaigns
    for (const campId of Array.from(processedCampaignIds)) {
      const [
        { count: pendingCount },
        { count: sentTotal },
        { count: failedTotal }
      ] = await Promise.all([
        supabaseAdmin
          .from('campaign_recipients')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campId)
          .in('status', ['PENDING', 'PROCESSING', 'SCHEDULED']),
        supabaseAdmin
          .from('campaign_recipients')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campId)
          .in('status', ['SENT', 'DELIVERED', 'READ']),
        supabaseAdmin
          .from('campaign_recipients')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campId)
          .eq('status', 'FAILED')
      ]);

      const updates: any = {
        total_sent: sentTotal || 0,
        total_failed: failedTotal || 0,
        updated_at: new Date().toISOString()
      };

      if ((pendingCount || 0) === 0) {
        updates.status = 'COMPLETED';
        updates.completed_at = new Date().toISOString();
        if (dailyLimitHitCampaigns.has(campId)) {
          const camp = campaignCache.get(campId);
          updates.description = (camp?.description ? camp.description.split(' • [')[0] + ' • ' : '') + 
            `[Completed: Stopped immediately because Meta 24-hr daily limit was reached. ${sentTotal || 0} sent, remaining held back.]`;
        }
      } else {
        updates.status = 'PROCESSING';
      }

      await supabaseAdmin
        .from('campaigns')
        .update(updates)
        .eq('id', campId);
    }

    // Remaining count in queue
    const { count: totalRemaining } = await supabaseAdmin
      .from('campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .in('status', ['PENDING', 'PROCESSING']);

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
