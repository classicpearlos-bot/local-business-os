import { supabaseAdmin } from '../supabaseAdmin';
import { sendWhatsAppText, sendWhatsAppTemplate, sendWhatsAppLocation } from '../meta/whatsapp';
import { FlowExecutionEngine } from '../flows/engine';
import { generateSalonReply } from './salonAI';

export async function evaluateAutomations(
  orgId: string, 
  conversationId: string, 
  messageId: string, 
  inboundText: string,
  contactPhone: string,
  buttonId?: string
) {
  if (!inboundText && !buttonId) return;

  const rawInput = inboundText || (buttonId ? `[${buttonId}]` : '');
  const normalizedInput = rawInput.trim().toLowerCase();

  // 1. Fetch Contact & Conversation context
  const { data: convData } = await supabaseAdmin
    .from('conversations')
    .select('contact_id, contacts(id, name, phone_number, attributes)')
    .eq('id', conversationId)
    .single();

  const contact = (convData?.contacts as any) || {};
  const contactId = convData?.contact_id;
  const contactName = contact.name || 'Guest';
  const contactAttrs = contact.attributes || {};
  const botActive = contactAttrs.bot_active !== false; // defaults to true

  if (!botActive) {
    console.log(`Bot paused for conversation ${conversationId}. Human agent handling.`);
    return;
  }

  // 2. Load active legacy automations for explicit keyword actions (if any)
  const { data: automations } = await supabaseAdmin
    .from('automations')
    .select('*')
    .eq('organization_id', orgId)
    .eq('active', true)
    .in('action_type', ['TEXT', 'LOCATION', 'TEMPLATE'])
    .order('priority', { ascending: false });

  for (const automation of (automations || [])) {
    const config = automation.trigger_config as { keywords: string[] };
    if (!config || !config.keywords) continue;

    let matchedKeyword = null;

    for (const kw of config.keywords) {
      const normalizedKw = kw.trim().toLowerCase();
      if (!normalizedKw) continue;
      if (automation.trigger_type === 'EXACT') {
        if (normalizedInput === normalizedKw) matchedKeyword = kw;
      } else if (automation.trigger_type === 'CONTAINS') {
        const regex = new RegExp(`(^|\\b|\\s|[.,!?])${normalizedKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b|\\s|[.,!?]|$)`, 'i');
        if (regex.test(normalizedInput)) matchedKeyword = kw;
      }
      
      if (matchedKeyword) break;
    }

    if (matchedKeyword) {
      if (automation.cooldown_seconds > 0) {
        const { data: recentExec } = await supabaseAdmin
          .from('automation_executions')
          .select('created_at')
          .eq('automation_id', automation.id)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (recentExec) {
          const lastRan = new Date(recentExec.created_at).getTime();
          const now = Date.now();
          if (now - lastRan < automation.cooldown_seconds * 1000) {
            console.log(`Automation ${automation.name} blocked by cooldown.`);
            return;
          }
        }
      }

      await executeAction(automation, orgId, conversationId, messageId, matchedKeyword, contactPhone, contactId);
      return; 
    }
  }

  // 3. 24/7 Intelligent Salon AI Concierge (Primary Responder for all greetings, inquiries, and customer care)
  try {
    // Fetch recent conversation history for rich multi-turn context
    const { data: recentMsgs } = await supabaseAdmin
      .from('messages')
      .select('direction, type, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(8);

    let chatHistory = '';
    if (recentMsgs && recentMsgs.length > 0) {
      chatHistory = recentMsgs.reverse().map(m => {
        let msgText = '';
        if (m.type === 'text') {
          msgText = m.content?.text?.body || '';
        } else if (m.type === 'interactive') {
          msgText = m.content?.interactive?.button_reply?.title || 
                    m.content?.interactive?.list_reply?.title || 
                    m.content?.interactive?.body?.text || 
                    '[Selected Button]';
        } else if (m.type === 'template') {
          msgText = m.content?.template?.body_text || m.content?.text?.body || `[Template ${m.content?.template?.name || ''}]`;
        } else {
          msgText = `[Sent ${m.type}]`;
        }
        const speaker = m.direction?.toLowerCase() === 'inbound' ? 'Customer' : 'Assistant';
        return `${speaker}: ${msgText}`;
      }).join('\n');
    }

    // Generate intelligent response using Gemini 2.5 Flash + Deterministic Knowledge Fallback
    const finalReply = await generateSalonReply({
      apiKey: process.env.GEMINI_API_KEY,
      contactName,
      inboundText: rawInput,
      buttonId,
      chatHistory
    });

    if (finalReply) {
      // Fetch WhatsApp Account info (with automatic fallback to ensure 100% dispatch reliability)
      let account = null;
      const { data: orgAccount } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('phone_number_id, access_token')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (orgAccount?.phone_number_id && orgAccount?.access_token) {
        account = orgAccount;
      } else {
        const { data: fallbackAccount } = await supabaseAdmin
          .from('whatsapp_accounts')
          .select('phone_number_id, access_token')
          .limit(1)
          .maybeSingle();
        account = fallbackAccount;
      }

      if (account?.phone_number_id && account?.access_token) {
        const waRes = await sendWhatsAppText({
          phoneNumberId: account.phone_number_id,
          accessToken: account.access_token,
          to: contactPhone
        }, finalReply);

        if (waRes.messages && waRes.messages[0]) {
          await supabaseAdmin.from('messages').insert({
            organization_id: orgId,
            conversation_id: conversationId,
            contact_id: contactId,
            wam_id: waRes.messages[0].id,
            direction: 'OUTBOUND',
            type: 'text',
            content: { text: { body: finalReply } },
            status: 'SENT'
          });

          await supabaseAdmin.from('conversations').update({ 
            last_message_at: new Date().toISOString() 
          }).eq('id', conversationId);

          console.log(`[Salon AI Concierge] Successfully sent reply to ${contactPhone} (WAM ID: ${waRes.messages[0].id})`);
        } else {
          console.error('[Salon AI Concierge] Meta API error sending reply:', waRes);
        }
      } else {
        console.error('[Salon AI Concierge] No active WhatsApp account found for org', orgId);
      }
    }
  } catch (aiErr: any) {
    console.error('Salon AI Concierge Error:', aiErr);

    // Bulletproof Fail-Safe: Always send verified salon greeting / contact message directly
    try {
      const emergencyReply = `✨ *Welcome to Classic Pearl Unisex Salon!* ✨\n\nHow can we pamper you today? We specialize in luxury Hair Care, Hair Spa, Facials, Pedicure, Keratin & Grooming.\n\n📍 *Location:* https://share.google/jJemgk5XuiTanHc7P\n🕒 *Hours:* 10:00 AM – 9:00 PM (All 7 Days)\n📞 *Call / Booking:* +91 83107 30322\n\nPlease let us know what service you are looking for! 💛`;
      const { data: acct } = await supabaseAdmin.from('whatsapp_accounts').select('phone_number_id, access_token').limit(1).maybeSingle();
      if (acct?.phone_number_id && acct?.access_token) {
        const waRes = await sendWhatsAppText({
          phoneNumberId: acct.phone_number_id,
          accessToken: acct.access_token,
          to: contactPhone
        }, emergencyReply);

        if (waRes.messages?.[0]) {
          await supabaseAdmin.from('messages').insert({
            organization_id: orgId,
            conversation_id: conversationId,
            contact_id: contactId,
            wam_id: waRes.messages[0].id,
            direction: 'OUTBOUND',
            type: 'text',
            content: { text: { body: emergencyReply } },
            status: 'SENT'
          });
          await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
        }
      }
    } catch (fallbackErr) {
      console.error('Critical fallback error:', fallbackErr);
    }
  }
}

async function executeAction(automation: any, orgId: string, convId: string, msgId: string, matchedKeyword: string, phone: string, contactId?: string) {
  // 1. Log Execution
  await supabaseAdmin.from('automation_executions').insert({
    organization_id: orgId,
    automation_id: automation.id,
    conversation_id: convId,
    inbound_message_id: msgId,
    matched_keyword: matchedKeyword,
    action_type: automation.action_type,
    status: 'EXECUTED'
  });

  // 2. Fetch Account info
  const { data: account } = await supabaseAdmin
    .from('whatsapp_accounts')
    .select('phone_number_id, access_token')
    .eq('organization_id', orgId)
    .single();

  if (!account) return;

  // 3. Dispatch Meta Message
  const actionConfig = automation.action_config as any;

  try {
    let waRes;
    let payloadContent = {};
    let msgType = 'text';

    if (automation.action_type === 'TEXT') {
      msgType = 'text';
      payloadContent = { text: { body: actionConfig.text } };
      waRes = await sendWhatsAppText({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: phone
      }, actionConfig.text);
    } else if (automation.action_type === 'LOCATION') {
      msgType = 'location';
      payloadContent = { location: { latitude: actionConfig.latitude, longitude: actionConfig.longitude, name: actionConfig.name } };
      waRes = await sendWhatsAppLocation({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: phone
      }, actionConfig.latitude, actionConfig.longitude, actionConfig.name, actionConfig.address);
    } else if (automation.action_type === 'TEMPLATE') {
      msgType = 'template';
      payloadContent = { template: { name: actionConfig.template_name } };
      waRes = await sendWhatsAppTemplate({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: phone
      }, actionConfig.template_name, actionConfig.template_language, actionConfig.template_components || []);
    }

    if (waRes && waRes.messages && waRes.messages[0]) {
      await supabaseAdmin.from('messages').insert({
        organization_id: orgId,
        conversation_id: convId,
        contact_id: contactId || null,
        wam_id: waRes.messages[0].id,
        direction: 'OUTBOUND',
        type: msgType,
        content: payloadContent,
        status: 'SENT'
      });
      await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId);
    }
  } catch (err) {
    console.error('Failed to execute automation action', err);
  }
}
