import { supabaseAdmin } from '../supabaseAdmin';
import { sendWhatsAppInteractive, sendWhatsAppText } from '../meta/whatsapp';
import { SALON_INFO, SALON_BUTTONS } from './salonAI';

export interface InquiryFollowupData {
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
 */
export function calculateSafeFollowupTime(inquiryDate: Date = new Date(), delayHours: number = 3.5): Date {
  const target = new Date(inquiryDate.getTime() + delayHours * 60 * 60 * 1000);
  
  // IST is UTC + 5:30
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(target.getTime() + istOffsetMs);
  const istHour = istTime.getUTCHours();
  const istMin = istTime.getUTCMinutes();

  // Quiet hours: 8:30 PM (20:30) to 10:00 AM IST
  if (istHour >= 21 || (istHour === 20 && istMin >= 30) || istHour < 10) {
    const nextMorning = new Date(istTime);
    if (istHour >= 20) {
      nextMorning.setUTCDate(nextMorning.getUTCDate() + 1);
    }
    nextMorning.setUTCHours(10, 30, 0, 0); // 10:30 AM IST
    return new Date(nextMorning.getTime() - istOffsetMs);
  }

  return target;
}

/**
 * Records or updates a customer inquiry with scheduled follow-up
 */
export async function scheduleInquiryFollowup(params: {
  contactId: string;
  organizationId: string;
  phone: string;
  service: string;
  tentativeTime?: string | null;
}): Promise<void> {
  const { contactId, service, tentativeTime } = params;
  if (!contactId) return;

  try {
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('attributes, opted_in')
      .eq('id', contactId)
      .maybeSingle();

    if (!contact || contact.opted_in === false) return;

    const currentAttrs = (contact.attributes as any) || {};
    const existingInquiry = currentAttrs.last_inquiry as InquiryFollowupData | undefined;

    // Strict Anti-Annoyance Rule: If follow-up was already sent in the last 24 hours, don't spam
    if (existingInquiry && existingInquiry.followup_status === 'SENT') {
      const sentTime = new Date(existingInquiry.inquired_at).getTime();
      if (Date.now() - sentTime < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const dueTime = calculateSafeFollowupTime(new Date(), 3.5);

    const inquiryPayload: InquiryFollowupData = {
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

    console.log(`[Follow-up Engine] Scheduled gentle check-in for contact ${contactId} at ${dueTime.toISOString()}`);
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
export async function processDueFollowups(limit: number = 20): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
}> {
  const stats = { processed: 0, sent: 0, skipped: 0, errors: 0 };
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    // 1. Query contacts with due follow-ups
    const { data: contacts, error } = await supabaseAdmin
      .from('contacts')
      .select('id, organization_id, phone_number, name, attributes, opted_in')
      .eq('opted_in', true)
      .not('attributes->last_inquiry', 'is', null)
      .limit(limit);

    if (error || !contacts) {
      console.error('[Follow-up Worker] Query error:', error);
      return stats;
    }

    for (const contact of contacts) {
      const attrs = (contact.attributes as any) || {};
      const inquiry: InquiryFollowupData = attrs.last_inquiry;

      if (!inquiry || inquiry.followup_status !== 'SCHEDULED') continue;
      if (new Date(inquiry.followup_due_at).getTime() > now.getTime()) continue;

      stats.processed++;

      // === GUARDRAIL 1: STRICT FREQUENCY CAP ===
      // Exactly ONE follow-up per inquiry. If count >= 1, complete and never send again.
      if (inquiry.followup_count >= 1) {
        await supabaseAdmin.from('contacts').update({
          attributes: { ...attrs, last_inquiry: { ...inquiry, followup_status: 'COMPLETED' } }
        }).eq('id', contact.id);
        stats.skipped++;
        continue;
      }

      // === GUARDRAIL 2: QUIET HOURS CHECK ===
      // Verify IST quiet hours (8:30 PM to 10:00 AM IST)
      const istTime = new Date(now.getTime() + 5.5 * 3600 * 1000);
      const istHour = istTime.getUTCHours();
      const istMin = istTime.getUTCMinutes();
      const isQuietHours = istHour >= 21 || (istHour === 20 && istMin >= 30) || istHour < 10;

      if (isQuietHours) {
        const deferredTime = calculateSafeFollowupTime(now, 1);
        await supabaseAdmin.from('contacts').update({
          attributes: { ...attrs, last_inquiry: { ...inquiry, followup_due_at: deferredTime.toISOString() } }
        }).eq('id', contact.id);
        stats.skipped++;
        continue;
      }

      // === GUARDRAIL 3: META 24-HOUR SERVICE WINDOW COMPLIANCE ===
      // Ensure the customer initiated within 24 hours
      const inquiredTime = new Date(inquiry.inquired_at).getTime();
      const elapsedHours = (now.getTime() - inquiredTime) / (1000 * 60 * 60);
      if (elapsedHours > 24) {
        await supabaseAdmin.from('contacts').update({
          attributes: { ...attrs, last_inquiry: { ...inquiry, followup_status: 'COMPLETED' } }
        }).eq('id', contact.id);
        stats.skipped++;
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
        continue;
      }

      // === DISPATCH INTERACTIVE FOLLOW-UP MESSAGE ===
      const contactName = contact.name && contact.name !== 'Guest' ? contact.name : '';
      const nameSalutation = contactName ? `${contactName}! ` : '';

      const followUpText = inquiry.tentative_time
        ? `Hi ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* — you were planning to visit around *${inquiry.tentative_time}* today!\n\nAre you still planning to come? Our stylists would love to hold a chair for you with zero waiting time! 💛\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call:* ${SALON_INFO.phone}`
        : `Hi ${nameSalutation}🌸 Quick check-in from *Classic Pearl Unisex Salon* regarding your *${inquiry.service}* inquiry!\n\nOur top stylists have open slots today. Would you like us to hold a chair ready for you? 💛\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n📞 *Call:* ${SALON_INFO.phone}`;

      // Get WhatsApp account
      const { data: acct } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('phone_number_id, access_token')
        .eq('organization_id', contact.organization_id)
        .maybeSingle();

      const account = acct || (await supabaseAdmin.from('whatsapp_accounts').select('phone_number_id, access_token').limit(1).maybeSingle()).data;

      if (!account?.phone_number_id || !account?.access_token) {
        stats.errors++;
        continue;
      }

      const buttons = SALON_BUTTONS.FOLLOWUP;
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
      } catch (err) {
        console.warn('[Follow-up Worker] Interactive send failed, falling back to text:', err);
      }

      if (!isInteractive || !waRes?.messages?.[0]) {
        waRes = await sendWhatsAppText({
          phoneNumberId: account.phone_number_id,
          accessToken: account.access_token,
          to: contact.phone_number
        }, followUpText);
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

        // Mark follow-up as SENT and increment count to 1 (STRICT CAP)
        await supabaseAdmin.from('contacts').update({
          attributes: {
            ...attrs,
            last_inquiry: {
              ...inquiry,
              followup_status: 'SENT',
              followup_count: 1
            }
          }
        }).eq('id', contact.id);

        stats.sent++;
        console.log(`[Follow-up Worker] Successfully sent high-value follow-up to ${contact.phone_number}`);
      } else {
        stats.errors++;
      }
    }
  } catch (err) {
    console.error('[Follow-up Worker] Execution error:', err);
  }

  return stats;
}
