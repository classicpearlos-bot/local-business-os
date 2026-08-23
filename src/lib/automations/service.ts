import { supabaseAdmin } from '../supabaseAdmin';
import { sendWhatsAppText, sendWhatsAppTemplate } from '../meta/whatsapp';

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
      
      // Stop evaluating after the first match (if we only want 1 reply per message)
      break; 
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
