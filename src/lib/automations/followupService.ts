import { supabaseAdmin } from '../supabaseAdmin';
import { sendWhatsAppInteractive, sendWhatsAppText } from '../meta/whatsapp';
import { SALON_INFO, SALON_BUTTONS } from './salonAI';

export type InquiryType = 'LOCATION' | 'TENTATIVE_TIME' | 'SERVICE' | 'GENERAL';

export interface InquiryFollowupData {
  inquiry_type: InquiryType;
  service: string;
  intent_level: 'HIGH' | 'MEDIUM';
  inquired_at: string;
  last_interaction_at?: string;
  tentative_time: string | null;
  followup_status: 'SCHEDULED' | 'SENT' | 'CANCELLED' | 'COMPLETED';
  followup_due_at: string;
  followup_count: number;
  followup_sent_at?: string;
}

/**
 * Calculates safe follow-up time enforcing Quiet Hours (8:30 PM to 10:00 AM IST)
 * and honoring Meta's 24-hour Customer Service Window (must send before the 24h expires).
 */
export function calculateSafeFollowupTime(
  inquiryDate: Date = new Date(),
  delayHours: number = 2.5,
  inquiryType: InquiryType = 'SERVICE'
): Date {
  // Location inquiries imply active travel/navigation intent; follow up faster (45 mins)
  const effectiveDelay = inquiryType === 'LOCATION' ? Math.min(delayHours, 0.75) : delayHours;
  const target = new Date(inquiryDate.getTime() + effectiveDelay * 60 * 60 * 1000);
  
  // IST is UTC + 5:30
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(target.getTime() + istOffsetMs);
  const istHour = istTime.getUTCHours();
  const istMin = istTime.getUTCMinutes();

  // Quiet hours: 8:30 PM (20:30) to 10:00 AM IST
  const isNightOrEarlyMorning = istHour >= 21 || (istHour === 20 && istMin >= 30) || istHour < 10;

  let safeTarget = target;

  if (isNightOrEarlyMorning) {
    const nextMorning = new Date(istTime);
    if (istHour >= 20) {
      nextMorning.setUTCDate(nextMorning.getUTCDate() + 1);
    }
    // Default morning opening hour is 10:00 AM IST
    nextMorning.setUTCHours(10, 0, 0, 0);
    safeTarget = new Date(nextMorning.getTime() - istOffsetMs);
  }

  // META 24-HOUR SAFEGUARD:
  // Must be delivered before the 24-hour window expires (leave 45 minutes buffer)
  const metaExpiryTime = inquiryDate.getTime() + (24 * 3600 * 1000) - (45 * 60 * 1000);
  if (safeTarget.getTime() > metaExpiryTime) {
    // If the 10:00 AM time would overshoot the 24-hour window, clamp to 1 hour before expiry
    const clamped = new Date(metaExpiryTime - 15 * 60 * 1000);
    if (clamped.getTime() > Date.now()) {
      safeTarget = clamped;
    }
  }

  return safeTarget;
}

/**
 * Records or updates a customer inquiry with scheduled follow-up
 * Intelligently merges subsequent messages without wiping high-intent context.
 */
export async function scheduleInquiryFollowup(params: {
  contactId: string;
  organizationId: string;
  phone: string;
  service: string;
  inquiryType?: InquiryType;
  tentativeTime?: string | null;
  delayHours?: number;
}): Promise<void> {
  const { contactId, service, tentativeTime, inquiryType = 'SERVICE', delayHours } = params;
  if (!contactId) return;

  try {
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('attributes, opted_in')
      .eq('id', contactId)
      .maybeSingle();

    if (!contact || contact.opted_in === false) return;

    const currentAttrs = (contact.attributes as any) || {};

    // Don't follow up blocked contacts
    if (currentAttrs.is_blocked === true) return;

    const existingInquiry = currentAttrs.last_inquiry as InquiryFollowupData | undefined;

    // Strict Anti-Annoyance Rule:
    // If follow-up was already sent, only allow re-scheduling if the customer asks a fresh inquiry
    // or if at least 3 hours have passed since the last follow-up was sent.
    if (existingInquiry && existingInquiry.followup_status === 'SENT') {
      const sentTime = existingInquiry.followup_sent_at 
        ? new Date(existingInquiry.followup_sent_at).getTime()
        : new Date(existingInquiry.inquired_at).getTime();
      const hoursSinceSent = (Date.now() - sentTime) / (1000 * 60 * 60);

      if (hoursSinceSent < 3 && inquiryType === 'GENERAL') {
        return;
      }
    }

    // Determine final inquiry type: Preserve higher priority intent
    // (LOCATION > SERVICE > TENTATIVE_TIME > GENERAL)
    let finalInquiryType = inquiryType;
    let finalService = service || 'salon visit';
    let finalTentativeTime = tentativeTime || null;
    const initialInquiryTime = (existingInquiry && existingInquiry.followup_status !== 'SENT')
      ? existingInquiry.inquired_at
      : new Date().toISOString();

    if (existingInquiry && existingInquiry.followup_status === 'SCHEDULED') {
      if (existingInquiry.inquiry_type === 'LOCATION' && inquiryType === 'GENERAL') {
        finalInquiryType = 'LOCATION';
        finalService = existingInquiry.service;
      } else if (existingInquiry.inquiry_type === 'SERVICE' && inquiryType === 'GENERAL') {
        finalInquiryType = 'SERVICE';
        finalService = existingInquiry.service;
      }
      if (!finalTentativeTime && existingInquiry.tentative_time) {
        finalTentativeTime = existingInquiry.tentative_time;
      }
    }

    // Default delay: 45 min for location, 1h for tentative time, 2.5 hours for service/general
    const effectiveDelay = delayHours ?? (
      finalInquiryType === 'LOCATION' ? 0.75 : 
      finalTentativeTime ? 1.0 : 2.5
    );
    
    // Follow-up due time is calculated safely from now (last interaction), clamped to 24h Meta window
    const dueTime = calculateSafeFollowupTime(new Date(), effectiveDelay, finalInquiryType);

    const inquiryPayload: InquiryFollowupData = {
      inquiry_type: finalInquiryType,
      service: finalService,
      intent_level: 'HIGH',
      inquired_at: initialInquiryTime,
      last_interaction_at: new Date().toISOString(),
      tentative_time: finalTentativeTime,
      followup_status: 'SCHEDULED',
      followup_due_at: dueTime.toISOString(),
      followup_count: 0
    };

    await supabaseAdmin
      .from('contacts')
      .update({
        attributes: {
          ...currentAttrs,
          last_inquiry: inquiryPayload
        }
      })
      .eq('id', contactId);

    console.log(`[Jarvis Follow-Up] Scheduled ${finalInquiryType} follow-up for contact ${contactId} at ${dueTime.toISOString()}`);
  } catch (err) {
    console.error('[Jarvis Follow-Up] Error scheduling inquiry follow-up:', err);
  }
}

/**
 * Cancels pending follow-up (explicitly called on conversion, opt-out, or booking)
 */
export async function cancelPendingFollowup(contactId: string, reason: string = 'customer_action'): Promise<void> {
  if (!contactId) return;
  try {
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('attributes')
      .eq('id', contactId)
      .maybeSingle();

    if (!contact) return;
    const currentAttrs = (contact.attributes as any) || {};
    if (currentAttrs.last_inquiry && currentAttrs.last_inquiry.followup_status === 'SCHEDULED') {
      await supabaseAdmin
        .from('contacts')
        .update({
          attributes: {
            ...currentAttrs,
            last_inquiry: {
              ...currentAttrs.last_inquiry,
              followup_status: 'CANCELLED',
              cancellation_reason: reason
            }
          }
        })
        .eq('id', contactId);
      console.log(`[Jarvis Follow-Up] Cancelled pending follow-up for contact ${contactId} (Reason: ${reason})`);
    }
  } catch (err) {
    console.error('[Jarvis Follow-Up] Error cancelling follow-up:', err);
  }
}

/**
 * Uses Gemini AI (with fallback to high-conversion salon templates) to craft a warm,
 * personalized Jarvis follow-up message for a silent departure lead.
 */
export async function generateJarvisFollowupMessage(params: {
  contactName: string;
  inquiry: InquiryFollowupData;
  recentChatHistory?: string;
  isNextDay: boolean;
}): Promise<{ text: string; buttons: Array<{ id: string; title: string }> }> {
  const { contactName, inquiry, recentChatHistory = '', isNextDay } = params;
  const nameSalutation = contactName && contactName !== 'Guest' && contactName !== 'Customer' ? `${contactName}! ` : '';

  // Select appropriate interactive buttons based on inquiry context
  let buttons = SALON_BUTTONS.FOLLOWUP;
  if (inquiry.inquiry_type === 'LOCATION') {
    buttons = [
      { id: 'btn_followup_coming', title: isNextDay ? '🚗 Planning Today' : '🚗 On My Way' },
      { id: 'btn_followup_visited', title: '✅ Already Visited' },
      { id: 'btn_followup_route', title: '📍 Need Directions' }
    ];
  } else if (inquiry.tentative_time) {
    buttons = [
      { id: 'btn_followup_coming', title: '🚗 On My Way' },
      { id: 'btn_followup_visited', title: '✅ Already Visited' },
      { id: 'btn_followup_later', title: '📅 Another Time' }
    ];
  } else if (isNextDay) {
    buttons = [
      { id: 'btn_followup_coming', title: '🚗 Planning Today' },
      { id: 'btn_followup_visited', title: '✅ Already Visited' },
      { id: 'btn_followup_later', title: '📅 Another Day' }
    ];
  } else {
    buttons = [
      { id: 'btn_followup_coming', title: isNextDay ? '🚗 Planning Today' : '🚗 Planning to Come' },
      { id: 'btn_offers', title: '🎉 Today\'s Offers' },
      { id: 'btn_followup_later', title: isNextDay ? '📅 Another Day' : '📅 Another Time' }
    ];
  }

  // Baseline high-converting templates (proven conversion rates for Classic Pearl)
  let fallbackText = '';
  if (inquiry.inquiry_type === 'LOCATION') {
    if (isNextDay) {
      fallbackText = `Good morning ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* — you asked for our location yesterday!\n\nDid you manage to reach or visit us, or are you planning to come by today? 💛\n💡 *Special Perk:* We have exclusive *weekday package discounts* running today! Our top stylists would love to hold a priority chair for you with zero waiting time.\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call/Offers:* ${SALON_INFO.phone}`;
    } else {
      fallbackText = `Hi ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* — you asked for our location earlier!\n\nDid you manage to reach safely, or would you like any help with route directions or parking? 💛\n💡 *Special Perk:* Enjoy our special pampering discounts & weekday offers! Our top stylists are ready with zero waiting time.\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call/Offers:* ${SALON_INFO.phone}`;
    }
  } else if (inquiry.tentative_time) {
    fallbackText = `Hi ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* — you were planning to visit around *${inquiry.tentative_time}* today!\n\nAre you still on your way? 💛 Our stylists have kept a priority chair ready for you with zero waiting time!\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call/Desk:* ${SALON_INFO.phone}`;
  } else if (isNextDay) {
    const isGeneral = inquiry.inquiry_type === 'GENERAL' || !inquiry.service || inquiry.service === 'salon' || inquiry.service === 'salon visit';
    fallbackText = isGeneral
      ? `Good morning ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* — you reached out to us yesterday!\n\nAre you planning to drop by today or this week? Which service would you love to pamper yourself with? 💛\n💡 *Special Weekday Offer:* Come by during the week to enjoy special package discounts! Call our desk directly at *${SALON_INFO.phone}* to claim today's top deals.\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call/Offers:* ${SALON_INFO.phone}`
      : `Good morning ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* — you asked about *${inquiry.service}* yesterday!\n\nAre you planning to drop by today or this week? Which service would you love to pamper yourself with? 💛\n💡 *Special Weekday Offer:* Come by during the week to enjoy special package discounts! Call our desk directly at *${SALON_INFO.phone}* to claim today's top deals.\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call/Offers:* ${SALON_INFO.phone}`;
  } else {
    const isGeneral = inquiry.inquiry_type === 'GENERAL' || !inquiry.service || inquiry.service === 'salon' || inquiry.service === 'salon visit';
    fallbackText = isGeneral
      ? `Hi ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* — you reached out to us earlier!\n\nWhich service can we prepare for you today? 💛\n💡 *Special Discounts:* We have exciting weekday pampering offers & custom combo discounts running! Our top stylists have chairs open with zero waiting time.\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call/Offers:* ${SALON_INFO.phone}`
      : `Hi ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* regarding your *${inquiry.service}* inquiry!\n\nWhich service can we prepare for you? 💛\n💡 *Special Discounts:* We have exciting weekday pampering offers & custom combo discounts running! Our top stylists have chairs open with zero waiting time.\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call/Offers:* ${SALON_INFO.phone}`;
  }

  // Attempt dynamic Gemini AI personalization if API key and conversation history are available
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.length > 5 && recentChatHistory.trim().length > 10) {
    try {
      const prompt = `You are Jarvis Concierge for Classic Pearl Unisex Salon (Bengaluru, Hours: 10 AM - 9 PM, Phone: ${SALON_INFO.phone}, Maps: ${SALON_INFO.mapsUrl}).
Write a warm, polite, personal WhatsApp check-in to a customer named "${contactName || 'Valued Client'}" who inquired earlier but went silent without visiting or booking.
Inquiry topic/service: "${inquiry.service || inquiry.inquiry_type}"
Is next day: ${isNextDay ? 'Yes (Good morning)' : 'No (same day)'}

Recent conversation snippet:
${recentChatHistory}

Rules:
1. Maximum 2 to 3 sentences total.
2. WhatsApp formatting (*bold* for emphasis). Never use markdown headers like ### or **.
3. Natural, friendly, human tone — not pushy.
4. Reference the specific service or question they asked. Ask which service they are looking for or if they plan to visit today/this week.
5. Highlight special weekday pampering offers or custom package discounts when visiting during weekdays.
6. Provide the Maps link (${SALON_INFO.mapsUrl}) and salon phone number (${SALON_INFO.phone}) for offers.`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout max

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const generated = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (generated && generated.length > 20 && generated.length < 500) {
          const cleaned = generated
            .replace(/\*\*(.*?)\*\*/g, '*$1*')
            .replace(/__(.*?)__/g, '_$1_')
            .replace(/###\s*(.*)/g, '*$1*');
          return { text: cleaned, buttons };
        }
      }
    } catch {
      // Graceful fallback to verified template
    }
  }

  return { text: fallbackText, buttons };
}

/**
 * Autonomous worker: Processes due follow-ups enforcing all 6 Anti-Annoyance Guardrails
 */
export async function processDueFollowups(
  limit: number = 20,
  options?: { forceNow?: boolean; targetContactId?: string }
): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
  details: Array<{ phone: string; status: string; reason?: string }>;
}> {
  const stats = { processed: 0, sent: 0, skipped: 0, errors: 0, details: [] as any[] };
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    // 1. Query contacts with scheduled follow-ups
    let query = supabaseAdmin
      .from('contacts')
      .select('id, organization_id, phone_number, name, attributes, opted_in')
      .eq('opted_in', true)
      .not('attributes->last_inquiry', 'is', null)
      .limit(limit);

    if (options?.targetContactId) {
      query = query.eq('id', options.targetContactId);
    }

    const { data: contacts, error } = await query;

    if (error || !contacts) {
      console.error('[Jarvis Follow-Up Worker] Query error:', error);
      return stats;
    }

    for (const contact of contacts) {
      const attrs = (contact.attributes as any) || {};
      const inquiry: InquiryFollowupData = attrs.last_inquiry;

      if (!inquiry || inquiry.followup_status !== 'SCHEDULED') continue;

      // Skip blocked contacts
      if (attrs.is_blocked === true) {
        await supabaseAdmin.from('contacts').update({
          attributes: { ...attrs, last_inquiry: { ...inquiry, followup_status: 'CANCELLED', cancellation_reason: 'Contact blocked' } }
        }).eq('id', contact.id);
        stats.skipped++;
        stats.details.push({ phone: contact.phone_number, status: 'SKIPPED', reason: 'Contact is blocked' });
        continue;
      }

      // Check if due (unless forceNow is true)
      const dueTimeMs = new Date(inquiry.followup_due_at).getTime();
      if (!options?.forceNow && dueTimeMs > now.getTime()) {
        continue;
      }

      stats.processed++;

      // === GUARDRAIL 1: STRICT FREQUENCY CAP ===
      // Exactly ONE follow-up per inquiry. If count >= 1, complete and never send again.
      if (inquiry.followup_count >= 1) {
        await supabaseAdmin.from('contacts').update({
          attributes: { ...attrs, last_inquiry: { ...inquiry, followup_status: 'COMPLETED' } }
        }).eq('id', contact.id);
        stats.skipped++;
        stats.details.push({ phone: contact.phone_number, status: 'SKIPPED', reason: 'Frequency cap reached (already sent 1)' });
        continue;
      }

      // === GUARDRAIL 2: QUIET HOURS CHECK ===
      // Verify IST quiet hours (8:30 PM to 10:00 AM IST) - unless manually forced by admin
      const istTime = new Date(now.getTime() + 5.5 * 3600 * 1000);
      const istHour = istTime.getUTCHours();
      const istMin = istTime.getUTCMinutes();
      const isQuietHours = istHour >= 21 || (istHour === 20 && istMin >= 30) || istHour < 10;

      if (isQuietHours && !options?.forceNow) {
        const deferredTime = calculateSafeFollowupTime(now, 1, inquiry.inquiry_type);
        await supabaseAdmin.from('contacts').update({
          attributes: { ...attrs, last_inquiry: { ...inquiry, followup_due_at: deferredTime.toISOString() } }
        }).eq('id', contact.id);
        stats.skipped++;
        stats.details.push({ phone: contact.phone_number, status: 'SKIPPED', reason: 'Deferred due to quiet hours (rescheduled for 10 AM IST)' });
        continue;
      }

      // === GUARDRAIL 3: META 24-HOUR SERVICE WINDOW COMPLIANCE ===
      // Check elapsed time since customer initiated inbound message
      const inquiredTime = new Date(inquiry.inquired_at).getTime();
      const elapsedHours = (now.getTime() - inquiredTime) / (1000 * 60 * 60);

      // If more than 23.8 hours have passed, Meta will reject non-template messages
      if (elapsedHours > 23.8) {
        await supabaseAdmin.from('contacts').update({
          attributes: { ...attrs, last_inquiry: { ...inquiry, followup_status: 'COMPLETED' } }
        }).eq('id', contact.id);
        stats.skipped++;
        stats.details.push({ phone: contact.phone_number, status: 'SKIPPED', reason: 'Meta 24-hour customer service window expired' });
        continue;
      }

      // === GUARDRAIL 4: INTELLIGENT SILENT DEPARTURE & ACTIVE CHAT PROTECTION ===
      // Fetch recent conversation history to evaluate the customer's real-time state:
      const { data: recentMessages } = await supabaseAdmin
        .from('messages')
        .select('id, direction, type, content, created_at')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(6);

      const latestInbound = recentMessages?.find(m => m.direction === 'INBOUND');

      if (latestInbound) {
        let inboundText = '';
        if (latestInbound.type === 'text') {
          inboundText = latestInbound.content?.text?.body || '';
        } else if (latestInbound.type === 'interactive') {
          inboundText = latestInbound.content?.interactive?.button_reply?.title || 
                        latestInbound.content?.interactive?.list_reply?.title || '';
        }

        const lowerInbound = inboundText.trim().toLowerCase();

        // 1. Explicit Opt-Out / Stop / Disinterest
        const isOptOut = /stop|unsubscribe|cancel|optout|opt-out|don't message|dont message|not interested|wrong number|remove me/i.test(lowerInbound);
        if (isOptOut) {
          await supabaseAdmin.from('contacts').update({
            attributes: { ...attrs, last_inquiry: { ...inquiry, followup_status: 'CANCELLED', cancellation_reason: 'Customer opted out' } }
          }).eq('id', contact.id);
          stats.skipped++;
          stats.details.push({ phone: contact.phone_number, status: 'SKIPPED', reason: 'Customer opted out or said stop/not interested' });
          continue;
        }

        // 2. Confirmed Conversion (Visited or Booked)
        const isConverted = /already visited|visited|already done|booked|confirmed slot|appointment fixed|on my way|reached|in the salon|sitting here/i.test(lowerInbound);
        if (isConverted) {
          await supabaseAdmin.from('contacts').update({
            attributes: { ...attrs, last_inquiry: { ...inquiry, followup_status: 'COMPLETED', completion_reason: 'Converted/Visited' } }
          }).eq('id', contact.id);
          stats.skipped++;
          stats.details.push({ phone: contact.phone_number, status: 'SKIPPED', reason: 'Customer confirmed visit or booking (converted)' });
          continue;
        }

        // 3. Live Active Chat Protection:
        // If customer texted within the last 15 minutes, they are currently in a live conversation! Never interrupt.
        const latestInboundTime = new Date(latestInbound.created_at).getTime();
        const minsSinceLastInbound = (now.getTime() - latestInboundTime) / (1000 * 60);
        if (minsSinceLastInbound < 15 && !options?.forceNow) {
          const deferredDue = new Date(now.getTime() + 30 * 60 * 1000);
          await supabaseAdmin.from('contacts').update({
            attributes: { ...attrs, last_inquiry: { ...inquiry, followup_due_at: deferredDue.toISOString() } }
          }).eq('id', contact.id);
          stats.skipped++;
          stats.details.push({ phone: contact.phone_number, status: 'SKIPPED', reason: `Customer actively texting (${Math.round(minsSinceLastInbound)}m ago). Deferred by 30m.` });
          continue;
        }
      }

      // === ASSEMBLE CONVERSATION SNIPPET & GENERATE HYPER-PERSONALIZED COPY ===
      const contactName = contact.name && contact.name !== 'Guest' && contact.name !== 'Customer' ? contact.name : '';
      const isNextDay = elapsedHours >= 8;

      let chatSnippet = '';
      if (recentMessages && recentMessages.length > 0) {
        chatSnippet = recentMessages.slice().reverse().map(m => {
          const speaker = m.direction === 'INBOUND' ? 'Customer' : 'Assistant';
          const txt = m.type === 'text' ? m.content?.text?.body :
                      m.type === 'interactive' ? (m.content?.interactive?.button_reply?.title || m.content?.interactive?.body?.text) : '';
          return `${speaker}: ${txt}`;
        }).filter(Boolean).join('\n');
      }

      const generated = await generateJarvisFollowupMessage({
        contactName,
        inquiry,
        recentChatHistory: chatSnippet,
        isNextDay
      });

      const followUpText = generated.text;
      const buttons = generated.buttons;

      // Get WhatsApp account
      const { data: acct } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('phone_number_id, access_token')
        .eq('organization_id', contact.organization_id)
        .maybeSingle();

      const account = acct || (await supabaseAdmin.from('whatsapp_accounts').select('phone_number_id, access_token').limit(1).maybeSingle()).data;

      if (!account?.phone_number_id || !account?.access_token) {
        stats.errors++;
        stats.details.push({ phone: contact.phone_number, status: 'ERROR', reason: 'No active WhatsApp account found' });
        continue;
      }

      let waRes: any = null;
      let isInteractive = false;

      try {
        const interactivePayload = {
          type: 'button',
          body: { text: followUpText },
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
          to: contact.phone_number
        }, interactivePayload);

        if (waRes?.messages?.[0]) {
          isInteractive = true;
        }
      } catch (err: any) {
        console.warn('[Jarvis Follow-Up] Interactive send failed, falling back to text:', err?.message || err);
      }

      if (!isInteractive || !waRes?.messages?.[0]) {
        try {
          waRes = await sendWhatsAppText({
            phoneNumberId: account.phone_number_id,
            accessToken: account.access_token,
            to: contact.phone_number
          }, followUpText);
        } catch (textErr: any) {
          console.error('[Jarvis Follow-Up] Plain text fallback also failed:', textErr?.message || textErr);
        }
      }

      if (waRes?.messages?.[0]) {
        // Find or create conversation
        const { data: conv } = await supabaseAdmin
          .from('conversations')
          .select('id')
          .eq('contact_id', contact.id)
          .maybeSingle();

        const convId = conv?.id;

        if (convId) {
          await supabaseAdmin.from('messages').insert({
            organization_id: contact.organization_id,
            conversation_id: convId,
            contact_id: contact.id,
            wam_id: waRes.messages[0].id,
            direction: 'OUTBOUND',
            type: isInteractive ? 'interactive' : 'text',
            content: isInteractive ? {
              interactive: {
                type: 'button',
                body: { text: followUpText },
                action: { buttons }
              }
            } : { text: { body: followUpText } },
            status: 'SENT'
          });

          await supabaseAdmin.from('conversations').update({
            last_message_at: nowIso
          }).eq('id', convId);
        }

        // Mark follow-up as SENT and set count to 1 (STRICT CAP)
        await supabaseAdmin.from('contacts').update({
          attributes: {
            ...attrs,
            last_inquiry: {
              ...inquiry,
              followup_status: 'SENT',
              followup_count: 1,
              followup_sent_at: nowIso
            }
          }
        }).eq('id', contact.id);

        stats.sent++;
        stats.details.push({
          phone: contact.phone_number,
          status: 'SENT',
          wam_id: waRes.messages[0].id,
          type: inquiry.inquiry_type || 'SERVICE'
        });
        console.log(`[Jarvis Follow-Up] Successfully sent check-in to ${contact.phone_number} (WAM ID: ${waRes.messages[0].id})`);
      } else {
        stats.errors++;
        stats.details.push({ phone: contact.phone_number, status: 'ERROR', reason: waRes?.error?.message || 'Meta API delivery failed' });
      }
    }
  } catch (err: any) {
    console.error('[Jarvis Follow-Up] Worker fatal error:', err);
    stats.errors++;
  }

  return stats;
}
