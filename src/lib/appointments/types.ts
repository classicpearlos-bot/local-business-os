export interface SalonService {
  id: string;
  name: string;
  category: 'Hair' | 'Skin & Facial' | 'Bridal & Makeup' | 'Nails' | 'Spa';
  price: number;
  duration_minutes: number;
  buffer_minutes: number;
  description?: string;
  active: boolean;
}

export interface SalonStaff {
  id: string;
  name: string;
  role: 'Senior Stylist' | 'Hair Master' | 'Skin Specialist' | 'Makeup Artist' | 'Receptionist';
  phone?: string;
  specialties: string[];
  active: boolean;
}

export interface AppointmentSlot {
  time: string; // e.g. "10:00 AM", "11:30 AM"
  start_time: string; // ISO string
  end_time: string; // ISO string
  available: boolean;
  staff_id: string;
  staff_name: string;
}

export interface AppointmentRecord {
  id: string;
  organization_id: string;
  contact_id: string;
  customer_name: string;
  customer_phone: string;
  service_id: string;
  service_name: string;
  service_price: number;
  staff_id: string;
  staff_name: string;
  start_time: string;
  end_time: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
  created_at: string;
  updated_at: string;
}
