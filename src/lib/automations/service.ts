import { supabaseAdmin } from '../supabaseAdmin';
import { sendWhatsAppText, sendWhatsAppTemplate, sendWhatsAppLocation, sendWhatsAppInteractive } from '../meta/whatsapp';
import { FlowExecutionEngine } from '../flows/engine';
import { generateSalonResponse, extractArrivalTime } from './salonAI';
import { scheduleInquiryFollowup, cancelPendingFollowup } from './followupService';

export async function evaluateAutomations(
  orgId: string, 
  conversationId: string, 
  messageId: string, 
  inboundText: string,
  contactPhone: string,
  buttonId?: string,
  credentials?: { phoneNumberId: string; accessToken: string },
  contactContext?: { contactId: string; contactName: string }
) {
  if (!inboundText && !buttonId) return;

  const rawInput = inboundText || (buttonId ? `[${buttonId}]` : '');
  const normalizedInput = rawInput.trim().toLowerCase();

  // 1. Resolve Contact context (use fast in-memory context if passed)
  let contactId = contactContext?.contactId;
  let contactName = contactContext?.contactName || 'Guest';

  if (!contactId) {
    const { data: convData } = await supabaseAdmin
      .from('conversations')
      .select('contact_id, contacts(id, name, phone_number, attributes)')
      .eq('id', conversationId)
      .maybeSingle();

    const contact = (convData?.contacts as any) || {};
    contactId = convData?.contact_id;
    contactName = contact.name || 'Guest';
    const contactAttrs = contact.attributes || {};
    if (contactAttrs.bot_active === false) {
      console.log(`Bot paused for conversation ${conversationId}. Human agent handling.`);
      return;
    }
  }

  // Zero-Annoyance Guardrail: Only cancel if explicit opt-out or booking/visit confirmation
  if (contactId && (
    normalizedInput.includes('stop') ||
    normalizedInput.includes('unsubscribe') ||
    normalizedInput.includes('cancel') ||
    normalizedInput === 'already visited' ||
    buttonId === 'btn_followup_visited' ||
    buttonId === 'btn_followup_later'
  )) {
    void cancelPendingFollowup(contactId, 'opt_out_or_completed');
  }

  // 2. Load active legacy automations for explicit keyword actions (only for text messages, skip for button clicks)
  if (!buttonId) {
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

    // Generate intelligent response with interactive button support
    const aiResult = await generateSalonResponse({
      apiKey: process.env.GEMINI_API_KEY,
      contactName,
      inboundText: rawInput,
      buttonId,
      chatHistory
    });

    const finalReply = aiResult.reply;
    const buttons = aiResult.buttons;

    if (finalReply) {
      // Fetch WhatsApp Account info (fast path: use passed in-memory credentials if available)
      let account: { phone_number_id: string; access_token: string } | null = 
        credentials?.phoneNumberId && credentials?.accessToken 
          ? { phone_number_id: credentials.phoneNumberId, access_token: credentials.accessToken } 
          : null;

      if (!account) {
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
      }

      if (account?.phone_number_id && account?.access_token) {
        let waRes: any = null;
        let isInteractiveSent = false;

        // Dispatch Native Interactive WhatsApp Buttons if buttons are provided (1 to 3 buttons supported by Meta)
        if (buttons && buttons.length >= 1 && buttons.length <= 3) {
          try {
            const interactivePayload = {
              type: 'button',
              body: {
                text: finalReply
              },
              action: {
                buttons: buttons.map(b => ({
                  type: 'reply',
                  reply: {
                    id: b.id.substring(0, 256),
                    title: b.title.substring(0, 20)
                  }
                }))
              }
            };

            waRes = await sendWhatsAppInteractive({
              phoneNumberId: account.phone_number_id,
              accessToken: account.access_token,
              to: contactPhone
            }, interactivePayload);

            if (waRes?.messages?.[0]) {
              isInteractiveSent = true;
            }
          } catch (interactiveErr) {
            console.warn('[Salon AI Concierge] Interactive buttons send failed, falling back to text:', interactiveErr);
          }
        }

        // Graceful Fallback: If interactive send was not attempted or failed, send plain text message
        if (!isInteractiveSent || !waRes?.messages?.[0]) {
          waRes = await sendWhatsAppText({
            phoneNumberId: account.phone_number_id,
            accessToken: account.access_token,
            to: contactPhone
          }, finalReply);
        }

        if (waRes.messages && waRes.messages[0]) {
          await supabaseAdmin.from('messages').insert({
            organization_id: orgId,
            conversation_id: conversationId,
            contact_id: contactId,
            wam_id: waRes.messages[0].id,
            direction: 'OUTBOUND',
            type: isInteractiveSent ? 'interactive' : 'text',
            content: isInteractiveSent ? {
              interactive: {
                type: 'button',
                body: { text: finalReply },
                action: { buttons }
              }
            } : { text: { body: finalReply } },
            status: 'SENT'
          });

          await supabaseAdmin.from('conversations').update({ 
            last_message_at: new Date().toISOString() 
          }).eq('id', conversationId);

          console.log(`[Salon AI Concierge] Successfully sent ${isInteractiveSent ? 'interactive' : 'text'} reply to ${contactPhone} (WAM ID: ${waRes.messages[0].id})`);

          // Autonomous Smart Follow-up Scheduling:
          // Jarvis tracks every customer interaction that opens a 24-hour Meta customer service window.
          // Enforces strict frequency cap of 1, quiet hours blackout, and zero annoyance.
          if (buttonId === 'btn_followup_visited' || buttonId === 'btn_followup_later') {
            void cancelPendingFollowup(contactId, buttonId === 'btn_followup_visited' ? 'already_visited' : 'deferred_by_client');
          } else if (contactId && !normalizedInput.includes('stop') && !normalizedInput.includes('cancel') && !normalizedInput.includes('unsubscribe')) {
            const arrivalTime = extractArrivalTime(rawInput);
            
            const isLocationInquiry = 
              normalizedInput.includes('location') || 
              normalizedInput.includes('address') || 
              normalizedInput.includes('map') || 
              normalizedInput.includes('maps') || 
              normalizedInput.includes('directions') || 
              normalizedInput.includes('direction') || 
              normalizedInput.includes('where are you') || 
              normalizedInput.includes('where is') || 
              normalizedInput.includes('reach') || 
              normalizedInput.includes('how to reach') || 
              normalizedInput.includes('route') || 
              buttonId === 'btn_location' || 
              buttonId === 'btn_menu_location' || 
              buttonId === 'btn_maps' ||
              buttonId === 'btn_followup_route';

            const isPricingInquiry = 
              normalizedInput.includes('price') || 
              normalizedInput.includes('rate') || 
              normalizedInput.includes('cost') || 
              normalizedInput.includes('charge') || 
              normalizedInput.includes('charges') || 
              normalizedInput.includes('offer') || 
              normalizedInput.includes('discount') || 
              buttonId === 'btn_offers';

            const isBookingInquiry = 
              normalizedInput.includes('book') || 
              normalizedInput.includes('slot') || 
              normalizedInput.includes('appointment') || 
              buttonId === 'btn_book';

            const isServiceInquiry = 
              normalizedInput.includes('haircut') || 
              normalizedInput.includes('hair cut') || 
              normalizedInput.includes('spa') || 
              normalizedInput.includes('wax') || 
              normalizedInput.includes('beard') || 
              normalizedInput.includes('facial') || 
              normalizedInput.includes('pedicure') || 
              normalizedInput.includes('manicure') || 
              normalizedInput.includes('keratin') || 
              normalizedInput.includes('botox') || 
              normalizedInput.includes('nanoplastia') || 
              normalizedInput.includes('color') || 
              normalizedInput.includes('colour') || 
              normalizedInput.includes('root touch') || 
              normalizedInput.includes('touch up') || 
              normalizedInput.includes('touchup') || 
              normalizedInput.includes('ammonia') || 
              normalizedInput.includes('highlights') || 
              normalizedInput.includes('streaks') || 
              normalizedInput.includes('balayage') || 
              normalizedInput.includes('threading') || 
              normalizedInput.includes('combo') || 
              normalizedInput.includes('clean up') || 
              normalizedInput.includes('cleanup') || 
              normalizedInput.includes('bleach') || 
              normalizedInput.includes('detan') || 
              normalizedInput.includes('shave') || 
              normalizedInput.includes('massage') || 
              !!arrivalTime;

            if (isLocationInquiry) {
              void scheduleInquiryFollowup({
                contactId,
                organizationId: orgId,
                phone: contactPhone,
                inquiryType: 'LOCATION',
                service: 'salon location & directions',
                tentativeTime: arrivalTime,
                delayHours: 0.75 // Gentle check-in 45 mins after directions
              });
            } else if (arrivalTime) {
              void scheduleInquiryFollowup({
                contactId,
                organizationId: orgId,
                phone: contactPhone,
                inquiryType: 'TENTATIVE_TIME',
                service: `visit around ${arrivalTime}`,
                tentativeTime: arrivalTime,
                delayHours: 1.0
              });
            } else if (isServiceInquiry || isPricingInquiry || isBookingInquiry) {
              let detectedService = 'salon visit';
              if (normalizedInput.includes('haircut') || normalizedInput.includes('hair cut')) detectedService = 'haircut';
              else if (normalizedInput.includes('spa')) detectedService = 'hair spa';
              else if (normalizedInput.includes('wax')) detectedService = 'waxing';
              else if (normalizedInput.includes('beard')) detectedService = 'beard & grooming';
              else if (normalizedInput.includes('facial')) detectedService = 'facial & skincare';
              else if (normalizedInput.includes('pedicure')) detectedService = 'pedicure';
              else if (normalizedInput.includes('manicure')) detectedService = 'manicure';
              else if (normalizedInput.includes('botox')) detectedService = 'hair botox therapy';
              else if (normalizedInput.includes('keratin')) detectedService = 'keratin protein treatment';
              else if (normalizedInput.includes('nanoplastia')) detectedService = 'nanoplastia treatment';
              else if (normalizedInput.includes('root touch') || normalizedInput.includes('touch up')) detectedService = 'root touch-up';
              else if (normalizedInput.includes('color') || normalizedInput.includes('ammonia') || normalizedInput.includes('highlights')) detectedService = 'hair coloring & highlights';
              else if (normalizedInput.includes('combo')) detectedService = 'value combo';
              else if (isBookingInquiry) detectedService = 'appointment booking';
              else if (isPricingInquiry) detectedService = 'pricing & offers';

              void scheduleInquiryFollowup({
                contactId,
                organizationId: orgId,
                phone: contactPhone,
                inquiryType: 'SERVICE',
                service: detectedService,
                tentativeTime: arrivalTime,
                delayHours: 2.5
              });
            } else {
              // Autonomous General Inbound Fallback: Every customer conversation is tracked
              void scheduleInquiryFollowup({
                contactId,
                organizationId: orgId,
                phone: contactPhone,
                inquiryType: 'GENERAL',
                service: 'salon visit',
                tentativeTime: null,
                delayHours: 3.0
              });
            }
          }
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
