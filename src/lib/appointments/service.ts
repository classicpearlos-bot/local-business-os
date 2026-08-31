import { AppointmentRecord } from './types';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppText } from '@/lib/meta/whatsapp';
import { CLASSIC_PEARLS_SERVICES, CLASSIC_PEARLS_STAFF } from './pos-adapter';

/**
 * Create an appointment and dispatch instant WhatsApp confirmation with ATOMIC concurrency check
 */
export async function createSalonAppointment(
  orgId: string,
  payload: {
    contact_id: string;
    service_id: string;
    staff_id: string;
    date: string;
    time: string;
    notes?: string;
  }
): Promise<AppointmentRecord> {
  const { data: contact, error: contactErr } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('id', payload.contact_id)
    .eq('organization_id', orgId)
    .single();

  if (contactErr || !contact) throw new Error('Customer not found');

  const service = CLASSIC_PEARLS_SERVICES.find(s => s.id === payload.service_id) || CLASSIC_PEARLS_SERVICES[0];
  const staff = CLASSIC_PEARLS_STAFF.find(s => s.id === payload.staff_id) || CLASSIC_PEARLS_STAFF[0];

  const targetSlotKey = `${payload.date} ${payload.time}`;

  // 1. ATOMIC DOUBLE-BOOKING GUARD
  // We rely on the database unique constraint idx_appointments_no_double_booking
  const { data: newApt, error: insertError } = await supabaseAdmin
    .from('appointments')
    .insert({
      organization_id: orgId,
      contact_id: contact.id,
      service_id: service.id,
      service_name: service.name,
      service_price: service.price,
      staff_id: staff.id,
      staff_name: staff.name,
      start_time: targetSlotKey,
      end_time: targetSlotKey,
      status: 'CONFIRMED',
      notes: payload.notes
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505' || insertError.message.includes('unique constraint')) {
      throw new Error(`Stylist ${staff.name} is already booked for ${payload.time} on ${payload.date}. Please select another time slot or stylist.`);
    }
    throw new Error(`Failed to book appointment: ${insertError.message}`);
  }

  const appointment = newApt as unknown as AppointmentRecord;

  // Update customer profile with custom fields
  const attrs = (contact.attributes as any) || {};
  await supabaseAdmin
    .from('contacts')
    .update({
      attributes: {
        ...attrs,
        custom_fields: {
          ...(attrs.custom_fields || {}),
          last_visit: payload.date,
          favorite_service: service.name,
          preferred_stylist: staff.name
        }
      }
    })
    .eq('id', contact.id);

  // Dispatch instant WhatsApp Confirmation Message
  try {
    const { data: accounts } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('*')
      .eq('organization_id', orgId)
      .limit(1);

    const account = accounts?.[0];
    if (account && contact.phone_number) {
      const confirmMsg = `*APPOINTMENT CONFIRMED*\n\nDear ${contact.name || 'Client'},\nYour salon appointment has been booked!\n\n*Service:* ${service.name}\n*Date:* ${payload.date}\n*Time:* ${payload.time}\n*Stylist:* ${staff.name}\n*Price:* ${service.price}\n*Location:* Classic Pearl Unisex Salon\n\n_We look forward to pampering you! Reply to this message if you need to reschedule._`;

      await sendWhatsAppText({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: contact.phone_number
      }, confirmMsg);
    }
  } catch (e) {
    console.error('Failed to send appointment confirmation WhatsApp:', e);
  }

  // --- CAMPAIGN ROI ATTRIBUTION ---
  // Check if this contact received a campaign message in the last 7 days
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Find recent campaign messages sent to this contact
    const { data: recentRecipients } = await supabaseAdmin
      .from('campaign_recipients')
      .select('campaign_id, created_at, status')
      .eq('contact_id', contact.id)
      .gte('created_at', sevenDaysAgo)
      .in('status', ['DELIVERED', 'READ', 'REPLIED']) // Any engagement
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (recentRecipients && recentRecipients.length > 0) {
      const recip = recentRecipients[0];
      
      // Found a recent campaign touchpoint! Log attribution.
      await supabaseAdmin.from('campaign_attribution').insert({
        organization_id: orgId,
        contact_id: contact.id,
        campaign_id: recip.campaign_id,
        engagement_time: recip.created_at,
        conversion_time: new Date().toISOString(),
        appointment_id: appointment.id,
        revenue_generated: service.price
      });
    }
  } catch (roiError) {
    console.error('Failed to track campaign ROI attribution:', roiError);
  }

  return appointment;
}

/**
 * List all salon appointments for an organization
 */
export async function getOrganizationAppointments(orgId: string): Promise<AppointmentRecord[]> {
  const { data: appointments, error } = await supabaseAdmin
    .from('appointments')
    .select('*, contacts(name, phone_number)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch appointments:', error);
    return [];
  }

  return (appointments || []).map(a => ({
    ...a,
    customer_name: a.contacts?.name || 'Valued Customer',
    customer_phone: a.contacts?.phone_number || ''
  })) as AppointmentRecord[];
}
