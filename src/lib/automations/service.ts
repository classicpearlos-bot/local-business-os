import { supabaseAdmin } from '../supabaseAdmin';
import { sendWhatsAppText, sendWhatsAppTemplate, sendWhatsAppLocation } from '../meta/whatsapp';
import { GoogleGenAI } from '@google/genai';

export async function evaluateAutomations(
  orgId: string, 
  conversationId: string, 
  messageId: string, 
  inboundText: string,
  contactPhone: string
) {
  if (!inboundText) return;

  const normalizedInput = inboundText.trim().toLowerCase();

  // Load active automations for the organization, ordered by priority (highest first)
  const { data: automations } = await supabaseAdmin
    .from('automations')
    .select('*')
    .eq('organization_id', orgId)
    .eq('active', true)
    .order('priority', { ascending: false });

  if (!automations || automations.length === 0) return;

  for (const automation of automations) {
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
  if (process.env.GEMINI_API_KEY && inboundText && inboundText.length > 2) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are the official AI WhatsApp assistant for "Classic Pearl Unisex Salon". 
Information: 
- Location: https://share.google/jJemgk5XuiTanHc7P
- Hours: Monday to Sunday, 10:00 AM to 9:00 PM.
Rules:
- Be extremely polite, conversational, and helpful.
- Keep answers very short and formatted for WhatsApp.
- If they ask for location or hours, provide it and suggest booking an appointment for feasibility.
- Only answer questions related to the salon.

User Message: "${inboundText}"`;

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
          await sendWhatsAppText({
            phoneNumberId: account.phone_number_id,
            accessToken: account.access_token,
            to: contactPhone
          }, response.text);
          
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
    if (automation.action_type === 'TEXT') {
       await sendWhatsAppText({
         phoneNumberId: account.phone_number_id,
         accessToken: account.access_token,
         to: phone
       }, actionConfig.text);
    } else if (automation.action_type === 'LOCATION') {
       await sendWhatsAppLocation({
         phoneNumberId: account.phone_number_id,
         accessToken: account.access_token,
         to: phone
       }, actionConfig.latitude, actionConfig.longitude, actionConfig.name, actionConfig.address);
    } else if (automation.action_type === 'TEMPLATE') {
       await sendWhatsAppTemplate({
         phoneNumberId: account.phone_number_id,
         accessToken: account.access_token,
         to: phone
       }, actionConfig.template_name, actionConfig.template_language, actionConfig.template_components || []);
    }

    // You could also save the outbound message to the messages table here
  } catch (err) {
    console.error('Failed to execute automation action', err);
  }
}
