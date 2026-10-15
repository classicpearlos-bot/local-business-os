import { supabaseAdmin } from '../supabaseAdmin';
import { sendWhatsAppInteractive, sendWhatsAppText } from '../meta/whatsapp';
import { SALON_INFO, SALON_BUTTONS } from './salonAI';

export type InquiryType = 'LOCATION' | 'TENTATIVE_TIME' | 'SERVICE' | 'GENERAL';

export interface InquiryFollowupData {
  inquiry_type: InquiryType;
  service: string;
  intent_level: 'HIGH' | 'MEDIUM';
  inquired_at: string;
  tentative_time: string | null;
  followup_status: 'SCHEDULED' | 'SENT' | 'CANCELLED' | 'COMPLETED';
  followup_due_at: string;
  followup_count: number;
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

    // Strict Anti-Annoyance Rule: If follow-up was already sent in the last 24 hours, don't spam
    if (existingInquiry && existingInquiry.followup_status === 'SENT') {
      const sentTime = new Date(existingInquiry.inquired_at).getTime();
      if (Date.now() - sentTime < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Default delay: 45 min for location, 2.5 hours for service/general
    const effectiveDelay = delayHours ?? (inquiryType === 'LOCATION' ? 0.75 : 2.5);
    const dueTime = calculateSafeFollowupTime(new Date(), effectiveDelay, inquiryType);

    const inquiryPayload: InquiryFollowupData = {
      inquiry_type: inquiryType,
      service: service || 'salon',
      intent_level: 'HIGH',
      inquired_at: new Date().toISOString(),
      tentative_time: tentativeTime || null,
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

    console.log(`[Follow-up Engine] Scheduled ${inquiryType} follow-up for contact ${contactId} at ${dueTime.toISOString()}`);
  } catch (err) {
    console.error('[Follow-up Engine] Error scheduling inquiry follow-up:', err);
  }
}

/**
 * Cancels pending follow-up (e.g. when customer replies or takes action)
 */
export async function cancelPendingFollowup(contactId: string): Promise<void> {
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
              followup_status: 'CANCELLED'
            }
          }
        })
        .eq('id', contactId);
      console.log(`[Follow-up Engine] Cancelled pending follow-up for active contact ${contactId}`);
    }
  } catch (err) {
    console.error('[Follow-up Engine] Error cancelling follow-up:', err);
  }
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
    // 1. Query contacts with due follow-ups
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
      console.error('[Follow-up Worker] Query error:', error);
      return stats;
    }

    for (const contact of contacts) {
      const attrs = (contact.attributes as any) || {};
      const inquiry: InquiryFollowupData = attrs.last_inquiry;

      if (!inquiry || inquiry.followup_status !== 'SCHEDULED') continue;

      // Skip blocked contacts
      if (attrs.is_blocked === true) {
        await supabaseAdmin.from('contacts').update({
          attributes: { ...attrs, last_inquiry: { ...inquiry, followup_status: 'CANCELLED' } }
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

      // === GUARDRAIL 4: ACTIVITY INVALIDATION ===
      // Check if customer sent any inbound message after inquired_at
      const { data: recentInbound } = await supabaseAdmin
        .from('messages')
        .select('id, created_at')
        .eq('contact_id', contact.id)
        .eq('direction', 'INBOUND')
        .gt('created_at', inquiry.inquired_at)
        .limit(1)
        .maybeSingle();

      if (recentInbound) {
        await supabaseAdmin.from('contacts').update({
          attributes: { ...attrs, last_inquiry: { ...inquiry, followup_status: 'CANCELLED' } }
        }).eq('id', contact.id);
        stats.skipped++;
        stats.details.push({ phone: contact.phone_number, status: 'SKIPPED', reason: 'Customer sent inbound message after inquiry (invalidated)' });
        continue;
      }

      // === DISPATCH INTERACTIVE FOLLOW-UP MESSAGE ===
      const contactName = contact.name && contact.name !== 'Guest' && contact.name !== 'Customer' ? contact.name : '';
      const nameSalutation = contactName ? `${contactName}! ` : '';
      const isNextDay = elapsedHours >= 8;

      let followUpText = '';
      let buttons = SALON_BUTTONS.FOLLOWUP;

      if (inquiry.inquiry_type === 'LOCATION') {
        buttons = [
          { id: 'btn_followup_coming', title: isNextDay ? '🚗 Planning Today' : '🚗 On My Way' },
          { id: 'btn_followup_visited', title: '✅ Already Visited' },
          { id: 'btn_followup_route', title: '📍 Need Directions' }
        ];

        if (isNextDay) {
          followUpText = `Good morning ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* — you asked for our location yesterday!\n\nDid you manage to reach or visit us, or are you planning to come by today? 💛 Our doors are open (10:00 AM – 9:00 PM) and our top stylists would love to hold a priority chair for you!\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call:* ${SALON_INFO.phone}`;
        } else {
          followUpText = `Hi ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* — you asked for our location earlier!\n\nDid you manage to reach safely, or would you like any help with route directions or parking? 💛 Our stylists are ready with zero waiting time!\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call:* ${SALON_INFO.phone}`;
        }
      } else if (inquiry.tentative_time) {
        followUpText = `Hi ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* — you were planning to visit around *${inquiry.tentative_time}* today!\n\nAre you still on your way? Our stylists would love to hold a chair ready for you with zero waiting time! 💛\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call:* ${SALON_INFO.phone}`;
        buttons = [
          { id: 'btn_followup_coming', title: '🚗 On My Way' },
          { id: 'btn_followup_visited', title: '✅ Already Visited' },
          { id: 'btn_followup_later', title: '📅 Another Time' }
        ];
      } else if (isNextDay) {
        followUpText = `Good morning ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* regarding your *${inquiry.service}* inquiry yesterday!\n\nOur top stylists have open chairs today. Would you like us to hold a slot ready for your consultation with zero waiting time? 💛\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call:* ${SALON_INFO.phone}`;
        buttons = [
          { id: 'btn_followup_coming', title: '🚗 Planning Today' },
          { id: 'btn_followup_visited', title: '✅ Already Visited' },
          { id: 'btn_followup_later', title: '📅 Another Day' }
        ];
      } else {
        followUpText = `Hi ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* regarding your *${inquiry.service}* inquiry!\n\nOur top stylists have open slots today. Would you like us to hold a chair ready for you? 💛\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call:* ${SALON_INFO.phone}`;
        buttons = [
          { id: 'btn_followup_coming', title: '🚗 Planning to Come' },
          { id: 'btn_followup_visited', title: '✅ Already Visited' },
          { id: 'btn_followup_later', title: '📅 Another Time' }
        ];
      }

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
        console.warn('[Follow-up Worker] Interactive send failed, falling back to text:', err?.message || err);
      }

      if (!isInteractive || !waRes?.messages?.[0]) {
        try {
          waRes = await sendWhatsAppText({
            phoneNumberId: account.phone_number_id,
            accessToken: account.access_token,
            to: contact.phone_number
          }, followUpText);
        } catch (textErr: any) {
          console.error('[Follow-up Worker] Plain text fallback also failed:', textErr?.message || textErr);
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
        console.log(`[Follow-up Worker] Successfully sent follow-up to ${contact.phone_number} (WAM ID: ${waRes.messages[0].id})`);
      } else {
        stats.errors++;
        stats.details.push({ phone: contact.phone_number, status: 'ERROR', reason: 'Meta Graph API call failed' });
      }
    }
  } catch (err: any) {
    console.error('[Follow-up Worker] Execution error:', err);
  }

  return stats;
}
