import { SalonService, SalonStaff, AppointmentSlot, AppointmentRecord } from './types';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface SalonPOSProvider {
  getServices(orgId: string): Promise<SalonService[]>;
  getStaff(orgId: string): Promise<SalonStaff[]>;
  getAvailableSlots(orgId: string, date: string, serviceId: string, staffId?: string): Promise<AppointmentSlot[]>;
}

// Built-in Classic Pearl Salon Catalog & Staff Directory
export const CLASSIC_PEARLS_SERVICES: SalonService[] = [
  { id: 'srv_botox', name: 'Hair Botox & Deep Repair Treatment', category: 'Hair', price: 3499, duration_minutes: 90, buffer_minutes: 15, active: true },
  { id: 'srv_nanoplastia', name: 'Nanoplastia Smoothing & Glossing', category: 'Hair', price: 4999, duration_minutes: 120, buffer_minutes: 15, active: true },
  { id: 'srv_keratin', name: 'Keratin Complex Therapy', category: 'Hair', price: 3999, duration_minutes: 100, buffer_minutes: 15, active: true },
  { id: 'srv_hydra_facial', name: 'Luxury Hydra Glow Facial & Peel', category: 'Skin & Facial', price: 2499, duration_minutes: 60, buffer_minutes: 10, active: true },
  { id: 'srv_gold_facial', name: '24K Gold Radiant Bridal Facial', category: 'Skin & Facial', price: 1999, duration_minutes: 60, buffer_minutes: 10, active: true },
  { id: 'srv_haircut_styling', name: 'Precision Cut & Global Blowdry', category: 'Hair', price: 799, duration_minutes: 45, buffer_minutes: 10, active: true },
  { id: 'srv_hair_spa', name: 'L’Oréal Pro Fiber Nourishing Spa', category: 'Hair', price: 1499, duration_minutes: 60, buffer_minutes: 10, active: true },
  { id: 'srv_bridal_hd', name: 'HD Bridal Makeover & Airbrush Styling', category: 'Bridal & Makeup', price: 9999, duration_minutes: 180, buffer_minutes: 30, active: true }
];

export const CLASSIC_PEARLS_STAFF: SalonStaff[] = [
  { id: 'staff_priya', name: 'Priya Sharma', role: 'Senior Stylist', specialties: ['Hair Botox', 'Nanoplastia', 'Hair Coloring'], active: true },
  { id: 'staff_rohit', name: 'Rohit Verma', role: 'Hair Master', specialties: ['Precision Cut', 'Global Balayage', 'Keratin'], active: true },
  { id: 'staff_ananya', name: 'Ananya Das', role: 'Skin Specialist', specialties: ['Hydra Facial', 'Gold Facial', 'Organic Peels'], active: true },
  { id: 'staff_kavita', name: 'Kavita Menon', role: 'Makeup Artist', specialties: ['Bridal HD Makeup', 'Party Styling'], active: true }
];

export class ClassicPearlPOSProvider implements SalonPOSProvider {
  async getServices(_orgId: string): Promise<SalonService[]> {
    return CLASSIC_PEARLS_SERVICES;
  }

  async getStaff(_orgId: string): Promise<SalonStaff[]> {
    return CLASSIC_PEARLS_STAFF;
  }

  async getAvailableSlots(orgId: string, date: string, serviceId: string, staffId?: string): Promise<AppointmentSlot[]> {
    const service = CLASSIC_PEARLS_SERVICES.find(s => s.id === serviceId) || CLASSIC_PEARLS_SERVICES[0];
    const targetStaff = staffId ? CLASSIC_PEARLS_STAFF.filter(s => s.id === staffId) : CLASSIC_PEARLS_STAFF;

    const baseTimes = [
      '10:00 AM', '11:00 AM', '12:00 PM', '01:30 PM', 
      '02:30 PM', '03:30 PM', '04:30 PM', '05:30 PM', '06:30 PM'
    ];

    const slots: AppointmentSlot[] = [];

    // Query booked appointments from Supabase for this date to prevent double booking
    const { data: booked } = await supabaseAdmin
      .from('conversations')
      .select('attributes')
      .eq('organization_id', orgId);

    const bookedTimes = new Set<string>();

    for (const timeStr of baseTimes) {
      const assignedStylist = targetStaff[Math.floor(Math.random() * targetStaff.length)];
      const isBooked = bookedTimes.has(`${date}_${timeStr}_${assignedStylist.id}`);
      
      const [timePart, modifier] = timeStr.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const slotStart = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
      const slotEnd = new Date(slotStart.getTime() + service.duration_minutes * 60 * 1000);

      slots.push({
        time: timeStr,
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
        available: !isBooked,
        staff_id: assignedStylist.id,
        staff_name: assignedStylist.name
      });
    }

    return slots;
  }
}

export const posProvider = new ClassicPearlPOSProvider();
