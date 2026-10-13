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

  // 2. Identify if this message is a Salon Inquiry or Direct Action
  // If the message asks about services, pricing, bookings, discounts, or clicked an action button,
  // it is an inquiry and MUST NOT be intercepted by generic greeting flows.
  const INQUIRY_KEYWORDS = [
    'spa', 'hair', 'cut', 'facial', 'wax', 'waxing', 'pedicure', 'manicure',
    'massage', 'color', 'colour', 'shave', 'beard', 'cleanup', 'clean up',
    'detan', 'de-tan', 'keratin', 'botox', 'nanoplastia', 'smoothen', 'straighten',
    'price', 'pricing', 'cost', 'rate', 'how much', 'charge', 'charges', 'fee',
    'discount', 'discounts', 'offer', 'offers', 'deal', 'deals', 'combo', 'combos', 'package', 'packages',
    'book', 'booking', 'appointment', 'slot', 'timing', 'time', 'open', 'close', 'hours',
    'location', 'where', 'address', 'reach', 'map', 'direction', 'directions',
    'men', 'women', 'male', 'female', 'gents', 'ladies', 'guy', 'girl'
  ];

  const isInquiry = Boolean(
    buttonId ||
    INQUIRY_KEYWORDS.some(kw => {
      const regex = new RegExp(`(^|\\b|\\s|[.,!?])${kw}(\\b|\\s|[.,!?]|$)`, 'i');
      return regex.test(normalizedInput);
    })
  );

  // 3. Evaluate Visual Flows First (ONLY for pure greetings like "hi", "hello" - never for inquiries)
  if (!isInquiry && contactId) {
    const { data: flows } = await supabaseAdmin
      .from('flows')
      .select('id, trigger_config')
      .eq('organization_id', orgId)
      .eq('status', 'PUBLISHED')
      .eq('trigger_type', 'KEYWORD');

    for (const flow of (flows || [])) {
      const config = (flow.trigger_config as any) || {};
      const keywords = config.keywords || [];
      const matchAll = config.match_all === true;
      
      const isMatch = matchAll || keywords.some((k: string) => {
        const kw = k.trim().toLowerCase();
        if (!kw) return false;
        // Whole word boundary match
        const regex = new RegExp(`(^|\\b|\\s|[.,!?])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b|\\s|[.,!?]|$)`, 'i');
        return regex.test(normalizedInput);
      });

      if (isMatch) {
        // Trigger match! Start flow execution
        const execId = await FlowExecutionEngine.start(orgId, flow.id, contactId, conversationId, messageId);
        if (execId) return; // Flow handled it, exit.
      }
    }
  }

  // 4. Load active legacy automations for the organization, ordered by priority
  const { data: automations } = await supabaseAdmin
    .from('automations')
    .select('*')
    .eq('organization_id', orgId)
    .eq('active', true)
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

      await executeAction(automation, orgId, conversationId, messageId, matchedKeyword, contactPhone);
      return; 
    }
  }

  // 5. Intelligent Salon AI Concierge
  try {
    // Fetch recent conversation history for context
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
      // Fetch WhatsApp Account info
      const { data: account } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('phone_number_id, access_token')
        .eq('organization_id', orgId)
        .single();

      if (account) {
        const waRes = await sendWhatsAppText({
          phoneNumberId: account.phone_number_id,
          accessToken: account.access_token,
          to: contactPhone
        }, finalReply);

        if (waRes.messages && waRes.messages[0]) {
          await supabaseAdmin.from('messages').insert({
            organization_id: orgId,
            conversation_id: conversationId,
            wam_id: waRes.messages[0].id,
            direction: 'OUTBOUND',
            type: 'text',
            content: { text: { body: finalReply } },
            status: 'SENT'
          });

          await supabaseAdmin.from('conversations').update({ 
            last_message_at: new Date().toISOString() 
          }).eq('id', conversationId);
        }
      }
    }
  } catch (aiErr: any) {
    console.error('Salon AI Concierge Error:', aiErr);
  }
}

async function executeAction(automation: any, orgId: string, convId: string, msgId: string, matchedKeyword: string, phone: string) {
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
