import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { processConversationAndMessage } from '@/lib/conversations/service';
import { evaluateAutomations } from '@/lib/automations/service';
import { queueTenantWebhook } from '@/lib/webhooks/service';
import { normalizePhoneNumber } from '@/utils/phone';

// Handle webhook verification challenge from Meta
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && challenge) {
    // Validate the verify token against any registered account's stored token or standard default
    const isStandardToken = token === 'classic_pearls_secret_webhook_token' || token === 'classicpearls_webhook_verify_token' || token === 'nexchat_webhook_verify_token';
    
    if (isStandardToken) {
      return new NextResponse(challenge, { status: 200 });
    }

    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('id')
      .eq('webhook_verify_token', token)
      .limit(1)
      .single();

    if (account) {
      return new NextResponse(challenge, { status: 200 });
    }
  }

  return NextResponse.json({ error: 'Invalid verification request' }, { status: 403 });
}

// Handle incoming webhook payloads from Meta
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (payload.object !== 'whatsapp_business_account') {
      return new NextResponse('Not found', { status: 404 });
    }

    for (const entry of payload.entry) {
      const wabaId = entry.id;

      // 1. Resolve Organization ID from WABA ID
      const { data: account } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('organization_id')
        .eq('waba_id', wabaId)
        .single();

      if (!account) {
        console.error(`WABA ID ${wabaId} not linked to any organization.`);
        continue; // Skip processing if unregistered
      }

      for (const change of entry.changes) {
        if (change.value.messages) {
          // Process incoming messages
          for (const msg of change.value.messages) {
            const rawPhone = change.value.contacts?.[0]?.wa_id || msg.from;
            const contactPhone = normalizePhoneNumber(rawPhone);
            
            // Upsert contact to ensure it exists
            const { data: contact } = await supabaseAdmin
              .from('contacts')
              .upsert({
                organization_id: account.organization_id,
                phone_number: contactPhone,
                name: change.value.contacts?.[0]?.profile?.name || 'Unknown'
              }, { onConflict: 'organization_id, phone_number' })
              .select('id')
              .single();

            if (contact) {
              try {
                // Idempotency: Check if this message was already processed
                const { data: existingMsg } = await supabaseAdmin
                  .from('messages')
                  .select('id')
                  .eq('wam_id', msg.id)
                  .eq('organization_id', account.organization_id)
                  .single();

                if (existingMsg) {
                  console.log(`Duplicate webhook: message ${msg.id} already processed, skipping.`);
                  continue;
                }

                // Core Process: Conversation -> Message -> Automations -> Webhooks
                const { conversationId, messageId } = await processConversationAndMessage(
                  account.organization_id,
                  contact.id,
                  msg.id,
                  msg.type,
                  msg
                );

                let textBody = '';
                if (msg.type === 'text') textBody = msg.text?.body || '';

                await evaluateAutomations(
                  account.organization_id,
                  conversationId,
                  messageId,
                  textBody,
                  contactPhone
                );

                await queueTenantWebhook(account.organization_id, 'message.received', msg);
              } catch (e) {
                console.error('Error processing message:', e);
              }
            }
          }
        } else if (change.value.statuses) {
          // Process status updates (Ticks)
          for (const status of change.value.statuses) {
            const statusUpper = status.status.toUpperCase();
            
            // 1. Update regular Messages table
            await supabaseAdmin
              .from('messages')
              .update({ status: statusUpper, error_data: status.errors || null })
              .eq('wam_id', status.id)
              .eq('organization_id', account.organization_id);

            // 2. Update Campaign Recipients Queue (if it belongs to a campaign)
            const { data: existingRecip } = await supabaseAdmin.from('campaign_recipients')
               .select('id, campaign_id, status')
               .eq('meta_message_id', status.id)
               .eq('organization_id', account.organization_id)
               .single();

            if (existingRecip && existingRecip.status !== statusUpper) {
              await supabaseAdmin.from('campaign_recipients')
                 .update({
                    status: statusUpper,
                    ...(statusUpper === 'DELIVERED' ? { delivered_at: new Date().toISOString() } : {}),
                    ...(statusUpper === 'READ' ? { read_at: new Date().toISOString() } : {}),
                    ...(statusUpper === 'FAILED' ? { failed_at: new Date().toISOString(), error_message: status.errors?.[0]?.message } : {})
                 })
                 .eq('id', existingRecip.id);

              if (statusUpper === 'DELIVERED') {
                 await supabaseAdmin.rpc('increment_campaign_delivered', { camp_id: existingRecip.campaign_id });
              } else if (statusUpper === 'READ') {
                 await supabaseAdmin.rpc('increment_campaign_read', { camp_id: existingRecip.campaign_id });
              } else if (statusUpper === 'FAILED') {
                 await supabaseAdmin.rpc('increment_campaign_failed', { camp_id: existingRecip.campaign_id });
              }
            }

            // 3. Queue Webhook Event
            await queueTenantWebhook(account.organization_id, `message.${status.status.toLowerCase()}`, status);
          }
        }
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
