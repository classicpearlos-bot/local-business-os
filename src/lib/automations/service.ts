import { supabaseAdmin } from '../supabaseAdmin';
import { sendWhatsAppText, sendWhatsAppTemplate, sendWhatsAppLocation } from '../meta/whatsapp';
import { GoogleGenAI } from '@google/genai';
import servicesData from './services.json';

export async function evaluateAutomations(
  orgId: string, 
  conversationId: string, 
  messageId: string, 
  inboundText: string,
  contactPhone: string
) {
  if (!inboundText) return;

  // DEBUG LOG
  await supabaseAdmin.from('automation_executions').insert({
    organization_id: orgId,
    conversation_id: conversationId,
    inbound_message_id: messageId,
    matched_keyword: 'DEBUG_START',
    action_type: 'TEXT',
    status: 'EXECUTED',
    error: 'Gemini Key Exists: ' + !!process.env.GEMINI_API_KEY
  });


  const normalizedInput = inboundText.trim().toLowerCase();

  // Load active automations for the organization, ordered by priority (highest first)
  const { data: automations } = await supabaseAdmin
    .from('automations')
    .select('*')
    .eq('organization_id', orgId)
    .eq('active', true)
    .order('priority', { ascending: false });

  // If no automations, we still proceed to AI fallback

  for (const automation of (automations || [])) {
    const config = automation.trigger_config as { keywords: string[] };
    if (!config || !config.keywords) continue;

    let matchedKeyword = null;

    for (const kw of config.keywords) {
      const normalizedKw = kw.trim().toLowerCase();
      if (automation.trigger_type === 'EXACT') {
        if (normalizedInput === normalizedKw) matchedKeyword = kw;
      } else if (automation.trigger_type === 'CONTAINS') {
        if (normalizedInput.includes(normalizedKw)) matchedKeyword = kw;
      }
      
      if (matchedKeyword) break;
    }

    if (matchedKeyword) {
      // Check cooldown (rudimentary check using execution logs)
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
            return; // Skip execution
          }
        }
      }

      // Execute Action
      await executeAction(automation, orgId, conversationId, messageId, matchedKeyword, contactPhone);
      
      // Stop evaluating after the first match
      return; 
    }
  }

  // AI Fallback if no keywords matched
  if (process.env.GEMINI_API_KEY && inboundText && inboundText.length > 0) {
    try {
      // Fetch recent conversation history for context
      const { data: recentMsgs } = await supabaseAdmin
        .from('messages')
        .select('direction, type, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(8);

      let chatHistory = "";
      if (recentMsgs && recentMsgs.length > 0) {
        chatHistory = recentMsgs.reverse().map(m => {
           let msgText = "";
           if (m.type === 'text') msgText = m.content?.text?.body || '';
           else msgText = `[Sent ${m.type}]`;
           return `${m.direction === 'inbound' ? 'Customer' : 'Assistant'}: ${msgText}`;
        }).join('\n');
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Condense services data to save tokens and prevent huge unreadable blocks
      const servicesString = JSON.stringify(servicesData);
      
      const prompt = `You are the official AI WhatsApp assistant for "Classic Pearl Unisex Salon". Your goal is to keep the customer engaged, be extremely polite, and provide whatever information they want about the salon.

Information: 
- Location: https://share.google/jJemgk5XuiTanHc7P
- Hours: Monday to Sunday, 10:00 AM to 9:00 PM.

--- SALON SERVICES & PRICING DATABASE ---
${servicesString}

CRITICAL RULES FOR SERVICES & PRICING:
1. Your ultimate motto is to convert the user into a potential client and get them to visit the salon. Be extremely polite, natural, and highly engaging.
2. When asked about a service (e.g., "head massage"), list all matching services (Men and Women) with their exact prices.
3. ALWAYS show both the 'Regular Price' and 'Member Price' clearly. Do NOT guess prices.
4. STRICT COMBO RULE: DO NOT show or suggest Combos randomly. Only list standard services unless they explicitly ask for combos.
5. If they explicitly ask "Do you have combos?", reply EXACTLY with: "Can I know what are the combos you are looking for? What are the services?"
6. DISCOUNTS/OFFERS: If they ask about discounts or offers, you MUST reply EXACTLY with this: "If your billing is more than 1999+, you get up to 5% flat discount on all services. For further discounts, please visit the salon so we can provide you the best possible services with the best possible prices."
7. Keep answers very short, punchy, and formatted nicely for WhatsApp. Use emojis sparingly.

--- CHAT HISTORY ---
${chatHistory}

--- CURRENT MESSAGE ---
Customer: "${inboundText}"

Reply as the Assistant to keep the customer engaged:`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      if (response.text) {
        // Fetch Account info
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
          }, response.text);
          
          // Save outbound AI message to chat history
          if (waRes.messages && waRes.messages[0]) {
             await supabaseAdmin.from('messages').insert({
               organization_id: orgId,
               conversation_id: conversationId,
               wam_id: waRes.messages[0].id,
               direction: 'outbound',
               type: 'text',
               content: { text: { body: response.text } },
               status: 'SENT'
             });
             
             await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
          }

          // Log execution for AI
          await supabaseAdmin.from('automation_executions').insert({
            organization_id: orgId,
            conversation_id: conversationId,
            inbound_message_id: messageId,
            matched_keyword: 'AI_FALLBACK',
            action_type: 'TEXT',
            status: 'EXECUTED'
          });
        }
      }
    } catch (aiErr) {
      console.error("AI Fallback Error:", aiErr);
    }
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
         direction: 'outbound',
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
