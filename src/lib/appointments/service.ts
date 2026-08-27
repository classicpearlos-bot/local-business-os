import { AppointmentRecord } from './types';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppText } from '@/lib/meta/whatsapp';
import { CLASSIC_PEARLS_SERVICES, CLASSIC_PEARLS_STAFF } from './pos-adapter';

/**
 * Create an appointment and dispatch instant WhatsApp confirmation with concurrency check
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

  // 1. CONCURRENCY & DOUBLE-BOOKING GUARD:
  // Check if this stylist is already booked for this exact slot
  const existingApts = await getOrganizationAppointments(orgId);
  const conflict = existingApts.find(a => 
    a.staff_id === staff.id && 
    a.start_time === targetSlotKey && 
    a.status !== 'CANCELLED'
  );

  if (conflict) {
    throw new Error(`Stylist ${staff.name} is already booked for ${payload.time} on ${payload.date}. Please select another time slot or stylist.`);
  }

  const appointment: AppointmentRecord = {
    id: `apt_${Date.now()}`,
    organization_id: orgId,
    contact_id: contact.id,
    customer_name: contact.name || 'Valued Customer',
    customer_phone: contact.phone_number,
    service_id: service.id,
    service_name: service.name,
    service_price: service.price,
    staff_id: staff.id,
    staff_name: staff.name,
    start_time: targetSlotKey,
    end_time: targetSlotKey,
    status: 'CONFIRMED',
    notes: payload.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Update customer profile with appointment details
  const attrs = (contact.attributes as any) || {};
  const currentAppointments = Array.isArray(attrs.appointments) ? attrs.appointments : [];
  await supabaseAdmin
    .from('contacts')
    .update({
      attributes: {
        ...attrs,
        appointments: [appointment, ...currentAppointments],
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
      const confirmMsg = `🌸 *APPOINTMENT CONFIRMED* 🌸\n\nDear ${contact.name || 'Client'},\nYour salon appointment has been booked!\n\n💇 *Service:* ${service.name}\n📅 *Date:* ${payload.date}\n⏰ *Time:* ${payload.time}\n👤 *Stylist:* ${staff.name}\n💰 *Price:* ₹${service.price}\n📍 *Location:* Classic Pearl Unisex Salon\n\n_We look forward to pampering you! Reply to this message if you need to reschedule._`;

      await sendWhatsAppText({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: contact.phone_number
      }, confirmMsg);
    }
  } catch (e) {
    console.error('Failed to send appointment confirmation WhatsApp:', e);
  }

  return appointment;
}

/**
 * List all salon appointments for an organization
 */
export async function getOrganizationAppointments(orgId: string): Promise<AppointmentRecord[]> {
  const { data: contacts } = await supabaseAdmin
    .from('contacts')
    .select('id, name, phone_number, attributes')
    .eq('organization_id', orgId);

  const appointments: AppointmentRecord[] = [];

  (contacts || []).forEach(c => {
    const contactApts = (c.attributes as any)?.appointments;
    if (Array.isArray(contactApts)) {
      appointments.push(...contactApts);
    }
  });

  appointments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return appointments;
}
