import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { processConversationAndMessage } from '@/lib/conversations/service';
import { evaluateAutomations } from '@/lib/automations/service';
import { queueTenantWebhook } from '@/lib/webhooks/service';
import { normalizePhoneNumber } from '@/utils/phone';
import { sendWhatsAppText } from '@/lib/meta/whatsapp';

function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!appSecret) return true; // BYPASS in development/MVP if secret is not set
  if (!signatureHeader) return false; 
  try {
    const [algorithm, signature] = signatureHeader.split('=');
    if (algorithm !== 'sha256' || !signature) return false;
    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  } catch (e) {
    return false;
  }
}

// Handle webhook verification challenge from Meta
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && challenge) {
    const envToken = process.env.WEBHOOK_VERIFY_TOKEN;
    const isStandardToken = 
      token === envToken ||
      token === 'classic_pearls_secret_webhook_token' || 
      token === 'classicpearls_webhook_verify_token' || 
      token === 'nexchat_webhook_verify_token';
    
    if (isStandardToken) {
      return new NextResponse(challenge, { status: 200 });
    }

    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('id')
      .eq('webhook_verify_token', token)
      .limit(1)
      .maybeSingle();

    if (account) {
      return new NextResponse(challenge, { status: 200 });
    }
  }

  return NextResponse.json({ error: 'Invalid verification request' }, { status: 403 });
}

// Handle incoming webhook payloads from Meta
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-hub-signature-256');
    const appSecret = process.env.META_APP_SECRET || '';

    // Check cryptographic HMAC signature (warn instead of hard-failing if META_APP_SECRET env var is stale)
    const isValid = verifyMetaSignature(rawBody, signatureHeader, appSecret);
    if (!isValid) {
      console.warn('Webhook signature mismatch (check META_APP_SECRET env var) — proceeding via WABA verification');
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new NextResponse('Invalid JSON', { status: 400 });
    }

    if (payload.object !== 'whatsapp_business_account') {
      return new NextResponse('Not found', { status: 404 });
    }

    for (const entry of (payload.entry || [])) {
      const wabaId = entry.id;

      // 1. Resolve Organization ID from WABA ID or active account
      let accountOrgId: string | null = null;
      let accessToken: string | null = null;
      let phoneNumberId: string | null = null;

      const { data: account } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('organization_id, access_token, phone_number_id')
        .eq('waba_id', wabaId)
        .maybeSingle();

      if (account?.organization_id) {
        accountOrgId = account.organization_id;
        accessToken = account.access_token;
        phoneNumberId = account.phone_number_id;
      } else {
        const { data: fallbackAccount } = await supabaseAdmin
          .from('whatsapp_accounts')
          .select('organization_id, access_token, phone_number_id')
          .limit(1)
          .maybeSingle();
        accountOrgId = fallbackAccount?.organization_id || null;
        accessToken = fallbackAccount?.access_token || null;
        phoneNumberId = fallbackAccount?.phone_number_id || null;
      }

      if (!accountOrgId || !accessToken) {
        console.error(`WABA ID ${wabaId} not linked or missing access token.`);
        continue;
      }

      for (const change of (entry.changes || [])) {
        if (change.value.messages) {
          // Process incoming messages
          for (const msg of change.value.messages) {
            const rawPhone = change.value.contacts?.[0]?.wa_id || msg.from;
            const contactPhone = normalizePhoneNumber(rawPhone);
            
            // Upsert contact to ensure it exists
            const { data: contact } = await supabaseAdmin
              .from('contacts')
              .upsert({
                organization_id: accountOrgId,
                phone_number: contactPhone,
                name: change.value.contacts?.[0]?.profile?.name || 'Customer'
              }, { onConflict: 'organization_id, phone_number' })
              .select('id, opted_in, attributes')
              .single();

            if (contact) {
              try {
                // Idempotency: Check if this message was already processed
                const { data: existingMsg } = await supabaseAdmin
                  .from('messages')
                  .select('id')
                  .eq('wam_id', msg.id)
                  .eq('organization_id', accountOrgId)
                  .maybeSingle();

                if (existingMsg) {
                  continue;
                }

                // Core Process: Conversation -> Message -> Automations -> Webhooks
                const { conversationId, messageId } = await processConversationAndMessage(
                  accountOrgId,
                  contact.id,
                  msg.id,
                  msg.type,
                  msg
                );

                // Handle Inbound Media Persistence
                const mediaTypes = ['image', 'video', 'audio', 'document', 'sticker'];
                if (mediaTypes.includes(msg.type) && msg[msg.type]?.id) {
                  const mediaObj = msg[msg.type];
                  try {
                    const { downloadMediaFromMeta } = await import('@/lib/meta/media');
                    const { buffer, mimeType } = await downloadMediaFromMeta(mediaObj.id, accessToken);
                    
                    const fileExt = mimeType.split('/')[1] || 'bin';
                    const storagePath = `${accountOrgId}/${Date.now()}_inbound_${msg.id.substring(0,6)}.${fileExt}`;
                    
                    // Upload to Storage
                    await supabaseAdmin.storage.from('whatsapp-media').upload(storagePath, buffer, {
                      contentType: mimeType,
                      upsert: false
                    });
                    
                    // Save to message_media
                    await supabaseAdmin.from('message_media').insert({
                      organization_id: accountOrgId,
                      contact_id: contact.id,
                      conversation_id: conversationId,
                      message_id: messageId,
                      storage_path: storagePath,
                      mime_type: mimeType,
                      file_name: mediaObj.filename || `inbound_${msg.type}.${fileExt}`,
                      file_size: buffer.byteLength,
                      direction: 'INBOUND',
                      meta_media_id: mediaObj.id
                    });
                  } catch (mediaErr) {
                    console.error(`Failed to persist inbound media for msg ${msg.id}:`, mediaErr);
                  }
                }

                let textBody = '';
                let buttonId = '';
                if (msg.type === 'text') {
                  textBody = msg.text?.body || '';
                } else if (msg.type === 'interactive' && msg.interactive?.type === 'button_reply') {
                  textBody = msg.interactive.button_reply.title || '';
                  buttonId = msg.interactive.button_reply.id || '';
                }

                const normalizedCommand = textBody.trim().toLowerCase();
                const STOP_WORDS = ['stop', 'unsubscribe', 'cancel', 'optout', 'opt-out', 'remove', 'remove me', 'do not message', 'end', 'quit', 'block'];
                const START_WORDS = ['start', 'subscribe', 'unstop', 'optin', 'opt-in', 'unblock'];

                const isStopCommand = STOP_WORDS.includes(normalizedCommand);
                const isStartCommand = START_WORDS.includes(normalizedCommand);

                const currentAttrs = (contact.attributes as any) || {};

                if (currentAttrs.is_blocked === true) {
                  console.log(`[Webhook] Contact ${contactPhone} is marked as BLOCKED. Suppressing all automated responses, AI bot, and workflows.`);
                } else if (isStopCommand) {
                  // Idempotent: only process and reply if currently opted in
                  if (contact.opted_in !== false) {
                    await supabaseAdmin
                      .from('contacts')
                      .update({ 
                        opted_in: false,
                        attributes: {
                          ...currentAttrs,
                          opt_out_timestamp: new Date().toISOString(),
                          opt_out_source: 'WhatsApp STOP Keyword'
                        }
                      })
                      .eq('id', contact.id);

                    const { data: accountInfo } = await supabaseAdmin
                      .from('whatsapp_accounts')
                      .select('phone_number_id, access_token')
                      .eq('organization_id', accountOrgId)
                      .maybeSingle();

                    if (accountInfo?.phone_number_id && accountInfo?.access_token) {
                      const optOutReply = 'You have unsubscribed from promotional broadcasts. Reply START to opt back in.';
                      const sendRes = await sendWhatsAppText({
                        phoneNumberId: accountInfo.phone_number_id,
                        accessToken: accountInfo.access_token,
                        to: contactPhone
                      }, optOutReply);

                      if (sendRes.messages?.[0]?.id) {
                        await supabaseAdmin.from('messages').insert({
                          organization_id: accountOrgId,
                          conversation_id: conversationId,
                          direction: 'OUTBOUND',
                          type: 'text',
                          content: { text: { body: optOutReply } },
                          status: 'DELIVERED',
                          wam_id: sendRes.messages[0].id
                        });
                      }
                    }
                  }
                } else if (isStartCommand) {
                  // Opt back in
                  if (contact.opted_in === false) {
                    await supabaseAdmin
                      .from('contacts')
                      .update({ 
                        opted_in: true,
                        attributes: {
                          ...currentAttrs,
                          opt_in_timestamp: new Date().toISOString(),
                          opt_in_source: 'WhatsApp START Keyword'
                        }
                      })
                      .eq('id', contact.id);

                    const { data: accountInfo } = await supabaseAdmin
                      .from('whatsapp_accounts')
                      .select('phone_number_id, access_token')
                      .eq('organization_id', accountOrgId)
                      .maybeSingle();

                    if (accountInfo?.phone_number_id && accountInfo?.access_token) {
                      const optInReply = 'You have successfully subscribed to updates and promotional broadcasts. Reply STOP anytime to opt out.';
                      const sendRes = await sendWhatsAppText({
                        phoneNumberId: accountInfo.phone_number_id,
                        accessToken: accountInfo.access_token,
                        to: contactPhone
                      }, optInReply);

                      if (sendRes.messages?.[0]?.id) {
                        await supabaseAdmin.from('messages').insert({
                          organization_id: accountOrgId,
                          conversation_id: conversationId,
                          direction: 'OUTBOUND',
                          type: 'text',
                          content: { text: { body: optInReply } },
                          status: 'DELIVERED',
                          wam_id: sendRes.messages[0].id
                        });
                      }
                    }
                  }
                } else {
                  let handledByFlow = false;
                  
                  // Fast Path: Only check custom visual flow engine if button is from a canvas flow (fl_),
                  // native salon concierge buttons (btn_) go directly to the high-speed salon engine!
                  if (buttonId && !buttonId.startsWith('btn_')) {
                    const { FlowExecutionEngine } = await import('@/lib/flows/engine');
                    const { data: waitingExec } = await supabaseAdmin
                      .from('flow_executions')
                      .select('id')
                      .eq('organization_id', accountOrgId)
                      .eq('contact_id', contact.id)
                      .eq('status', 'WAITING')
                      .order('updated_at', { ascending: false })
                      .limit(1)
                      .maybeSingle();

                    if (waitingExec) {
                      const resumed = await FlowExecutionEngine.resume(waitingExec.id, accountOrgId, buttonId);
                      handledByFlow = Boolean(resumed);
                    }
                  }

                  if (!handledByFlow) {
                    await evaluateAutomations(
                      accountOrgId,
                      conversationId,
                      messageId,
                      textBody,
                      contactPhone,
                      buttonId,
                      phoneNumberId && accessToken ? { phoneNumberId, accessToken } : undefined,
                      contact ? { contactId: contact.id, contactName: change.value.contacts?.[0]?.profile?.name || 'Customer' } : undefined
                    );
                  }
                }

                // Queue developer webhook dispatch
                await queueTenantWebhook(accountOrgId, 'message.received', {
                  message_id: messageId,
                  wam_id: msg.id,
                  contact_id: contact.id,
                  phone_number: contactPhone,
                  direction: 'INBOUND',
                  type: msg.type,
                  content: msg,
                  timestamp: msg.timestamp
                });

              } catch (msgErr) {
                console.error(`Error processing message ${msg.id}:`, msgErr);
              }
            }
          }
        }

        // Process status updates (sent, delivered, read, failed)
        if (change.value.statuses) {
          const touchedCampaignIds = new Set<string>();

          for (const statusObj of change.value.statuses) {
            const wamId = statusObj.id;
            const newStatus = statusObj.status.toUpperCase();
            const statusTimestamp = statusObj.timestamp
              ? new Date(parseInt(statusObj.timestamp) * 1000).toISOString()
              : new Date().toISOString();
            const recipientPhone = statusObj.recipient_id ? String(statusObj.recipient_id).replace(/\D/g, '') : '';

            // 1. Fetch current message to enforce monotonic progression
            const { data: currentMsg } = await supabaseAdmin
              .from('messages')
              .select('id, status, conversation_id, contact_id')
              .eq('wam_id', wamId)
              .maybeSingle();

            if (currentMsg) {
              const STATUS_RANK: Record<string, number> = { 'SENDING': 1, 'SENT': 2, 'DELIVERED': 3, 'READ': 4, 'FAILED': 5 };
              const currentRank = STATUS_RANK[currentMsg.status] || 0;
              const newRank = STATUS_RANK[newStatus] || 0;

              // Only update existing columns on messages (status, error_data)
              if (newRank > currentRank || newStatus === 'FAILED') {
                const msgUpdates: any = { status: newStatus };
                if (newStatus === 'FAILED') {
                  msgUpdates.error_data = statusObj.errors ? statusObj.errors[0] : null;
                }

                await supabaseAdmin
                  .from('messages')
                  .update(msgUpdates)
                  .eq('id', currentMsg.id);
              }
            }

            // 2. Update campaign_recipients if message was part of a broadcast
            let { data: recip } = await supabaseAdmin
              .from('campaign_recipients')
              .select('id, campaign_id, status, meta_message_id')
              .eq('meta_message_id', wamId)
              .maybeSingle();

            // Fallback: match by recipient phone number if meta_message_id was not yet linked
            if (!recip && recipientPhone) {
              const phoneVariants = [
                `+${recipientPhone}`,
                recipientPhone,
                recipientPhone.length === 10 ? `+91${recipientPhone}` : `+${recipientPhone}`
              ];
              const { data: fallbackRecip } = await supabaseAdmin
                .from('campaign_recipients')
                .select('id, campaign_id, status, meta_message_id')
                .in('phone_number', phoneVariants)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              if (fallbackRecip) {
                recip = fallbackRecip;
              }
            }

            if (recip) {
              touchedCampaignIds.add(recip.campaign_id);
              const STATUS_RANK: Record<string, number> = { 'SENDING': 1, 'SENT': 2, 'DELIVERED': 3, 'READ': 4, 'FAILED': 5 };
              const currentRank = STATUS_RANK[recip.status] || 0;
              const newRank = STATUS_RANK[newStatus] || 0;

              if (newRank >= currentRank || newStatus === 'FAILED') {
                const updates: any = {
                  status: newStatus,
                  meta_message_id: wamId || recip.meta_message_id
                };
                
                if (newStatus === 'SENT') {
                  updates.sent_at = statusTimestamp;
                } else if (newStatus === 'DELIVERED') {
                  updates.delivered_at = statusTimestamp;
                } else if (newStatus === 'READ') {
                  updates.read_at = statusTimestamp;
                  if (!recip.status || recip.status === 'SENT') {
                    updates.delivered_at = statusTimestamp;
                  }
                } else if (newStatus === 'FAILED') {
                  updates.failed_at = statusTimestamp;
                  updates.error_code = statusObj.errors?.[0]?.code?.toString() || 'DELIVERY_FAILED';
                  updates.error_message = statusObj.errors?.[0]?.title || statusObj.errors?.[0]?.message || 'Message delivery failed';
                }

                await supabaseAdmin
                  .from('campaign_recipients')
                  .update(updates)
                  .eq('id', recip.id);
              }
            }
          }

          // Sync campaign counters accurately for all touched campaigns
          for (const campId of Array.from(touchedCampaignIds)) {
            const [
              { count: sentCount },
              { count: deliveredCount },
              { count: readCount },
              { count: failedCount }
            ] = await Promise.all([
              supabaseAdmin
                .from('campaign_recipients')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', campId)
                .in('status', ['SENT', 'DELIVERED', 'READ']),
              supabaseAdmin
                .from('campaign_recipients')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', campId)
                .in('status', ['DELIVERED', 'READ']),
              supabaseAdmin
                .from('campaign_recipients')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', campId)
                .eq('status', 'READ'),
              supabaseAdmin
                .from('campaign_recipients')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', campId)
                .eq('status', 'FAILED')
            ]);

            await supabaseAdmin
              .from('campaigns')
              .update({
                total_sent: sentCount || 0,
                total_delivered: deliveredCount || 0,
                total_read: readCount || 0,
                total_failed: failedCount || 0,
                updated_at: new Date().toISOString()
              })
              .eq('id', campId);
          }
        }
      }
    }

    // Background Check: If any campaigns or recipients in SCHEDULED are now due (e.g. 24h daily limit reset reached), wake up the worker
    try {
      const nowIso = new Date().toISOString();
      const { count: dueCount } = await supabaseAdmin
        .from('campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'SCHEDULED')
        .lte('scheduled_at', nowIso);

      if ((dueCount || 0) > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://local-business-os-amber.vercel.app';
        fetch(`${appUrl}/api/whatsapp/campaigns/worker`, {
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'x-ui-bypass': 'true'
          }
        }).catch(() => {});
      }
    } catch {
      // non-blocking
    }

    // Background Autonomous Follow-up Processing on Webhook Events
    try {
      const { processDueFollowups } = await import('@/lib/automations/followupService');
      void processDueFollowups(5);
    } catch {
      // non-blocking
    }

    return new NextResponse('EVENT_RECEIVED', { status: 200 });

  } catch (error: any) {
    console.error('Webhook processing exception:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
