import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { processConversationAndMessage } from '@/lib/conversations/service';
import { evaluateAutomations } from '@/lib/automations/service';
import { queueTenantWebhook } from '@/lib/webhooks/service';
import { normalizePhoneNumber } from '@/utils/phone';
import { sendWhatsAppText } from '@/lib/meta/whatsapp';

function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return false; // MUST reject in production if missing
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

    // Verify cryptographic HMAC signature
    const isValid = verifyMetaSignature(rawBody, signatureHeader, appSecret);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
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
                if (msg.type === 'text') textBody = msg.text?.body || '';

                const normalizedCommand = textBody.trim().toLowerCase();
                const STOP_WORDS = ['stop', 'unsubscribe', 'cancel', 'optout', 'opt-out', 'remove', 'remove me', 'do not message', 'end', 'quit', 'block'];
                const START_WORDS = ['start', 'subscribe', 'unstop', 'optin', 'opt-in', 'unblock'];

                const isStopCommand = STOP_WORDS.includes(normalizedCommand);
                const isStartCommand = START_WORDS.includes(normalizedCommand);

                const currentAttrs = (contact.attributes as any) || {};

                if (isStopCommand) {
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
                  await evaluateAutomations(
                    accountOrgId,
                    conversationId,
                    messageId,
                    textBody,
                    contactPhone
                  );
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
          for (const statusObj of change.value.statuses) {
            const wamId = statusObj.id;
            const newStatus = statusObj.status.toUpperCase();
            const statusTimestamp = new Date(parseInt(statusObj.timestamp) * 1000).toISOString();

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

              // Only update if the new status is a progression, or if it's FAILED
              if (newRank > currentRank || newStatus === 'FAILED') {
                const msgUpdates: any = { status: newStatus };
                
                if (newStatus === 'SENT') msgUpdates.sent_at = statusTimestamp;
                if (newStatus === 'DELIVERED') msgUpdates.delivered_at = statusTimestamp;
                if (newStatus === 'READ') msgUpdates.read_at = statusTimestamp;
                if (newStatus === 'FAILED') {
                  msgUpdates.failed_at = statusTimestamp;
                  msgUpdates.failure_code = statusObj.errors?.[0]?.code?.toString();
                  msgUpdates.failure_message = statusObj.errors?.[0]?.title || statusObj.errors?.[0]?.message;
                  msgUpdates.error_data = statusObj.errors ? statusObj.errors[0] : null;
                }

                await supabaseAdmin
                  .from('messages')
                  .update(msgUpdates)
                  .eq('id', currentMsg.id);
              }
            }

            // 2. Update campaign_recipients if message was part of a broadcast
            const { data: recip } = await supabaseAdmin
              .from('campaign_recipients')
              .select('id, campaign_id, status')
              .eq('meta_message_id', wamId)
              .maybeSingle();

            if (recip) {
              const STATUS_RANK: Record<string, number> = { 'SENDING': 1, 'SENT': 2, 'DELIVERED': 3, 'READ': 4, 'FAILED': 5 };
              const currentRank = STATUS_RANK[recip.status] || 0;
              const newRank = STATUS_RANK[newStatus] || 0;

              if (newRank > currentRank || newStatus === 'FAILED') {
                const updates: any = { status: newStatus };
                
                if (newStatus === 'DELIVERED') {
                  updates.delivered_at = statusTimestamp;
                  if (recip.status !== 'DELIVERED' && recip.status !== 'READ') {
                    await supabaseAdmin.rpc('increment_campaign_delivered', { camp_id: recip.campaign_id });
                  }
                } else if (newStatus === 'READ') {
                  updates.read_at = statusTimestamp;
                  if (recip.status !== 'READ') {
                    await supabaseAdmin.rpc('increment_campaign_read', { camp_id: recip.campaign_id });
                  }
                } else if (newStatus === 'FAILED') {
                  updates.failed_at = statusTimestamp;
                  updates.error_code = statusObj.errors?.[0]?.code?.toString() || 'DELIVERY_FAILED';
                  updates.error_message = statusObj.errors?.[0]?.title || statusObj.errors?.[0]?.message || 'Message delivery failed';
                  if (recip.status !== 'FAILED') {
                    await supabaseAdmin.rpc('increment_campaign_failed', { camp_id: recip.campaign_id });
                  }
                }

                await supabaseAdmin
                  .from('campaign_recipients')
                  .update(updates)
                  .eq('id', recip.id);
              }
            }
          }
        }
      }
    }

    return new NextResponse('EVENT_RECEIVED', { status: 200 });

  } catch (error: any) {
    console.error('Webhook processing exception:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
