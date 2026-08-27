'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AppointmentRecord, SalonService, SalonStaff, AppointmentSlot } from '@/lib/appointments/types';
import { CLASSIC_PEARLS_SERVICES, CLASSIC_PEARLS_STAFF } from '@/lib/appointments/pos-adapter';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  Plus, 
  CheckCircle2, 
  Phone, 
  Search, 
  Sparkles, 
  Filter, 
  DollarSign,
  AlertCircle,
  X
} from 'lucide-react';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchContact, setSearchContact] = useState('');
  const [selectedContact, setSelectedContact] = useState<any | null>(null);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState(CLASSIC_PEARLS_SERVICES[0].id);
  const [selectedStaffId, setSelectedStaffId] = useState(CLASSIC_PEARLS_STAFF[0].id);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('10:00 AM');
  const [notes, setNotes] = useState('');
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState('');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContacts = useCallback(async (query = '') => {
    try {
      const res = await fetch(`/api/contacts?search=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchSlots = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        view: 'slots',
        date: bookingDate,
        service_id: selectedServiceId,
        staff_id: selectedStaffId
      });
      const res = await fetch(`/api/appointments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.slots || []);
        if (data.slots?.length > 0) {
          setSelectedSlotTime(data.slots[0].time);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [bookingDate, selectedServiceId, selectedStaffId]);

  useEffect(() => {
    fetchAppointments();
    fetchContacts('');
  }, [fetchAppointments, fetchContacts]);

  useEffect(() => {
    if (showBookingModal) {
      fetchSlots();
    }
  }, [showBookingModal, fetchSlots]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) {
      setBookingError('Please select a customer for the appointment');
      return;
    }

    setBookingSaving(true);
    setBookingError('');
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: selectedContact.id,
          service_id: selectedServiceId,
          staff_id: selectedStaffId,
          date: bookingDate,
          time: selectedSlotTime,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setBookingError(data.error || 'Failed to book appointment');
        return;
      }

      setBookingSuccess(`Appointment booked successfully! Instant WhatsApp confirmation sent to ${selectedContact.phone_number}.`);
      setShowBookingModal(false);
      fetchAppointments();
      setTimeout(() => setBookingSuccess(null), 5000);
    } catch (e: any) {
      setBookingError(e.message);
    } finally {
      setBookingSaving(false);
    }
  };

  const selectedService = CLASSIC_PEARLS_SERVICES.find(s => s.id === selectedServiceId);

  return (
    <div className="flex h-screen bg-[#F7F3EA] text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Salon Appointments & POS Scheduling"
          subtitle="Real-time salon calendar, intelligent double-booking prevention, and instant WhatsApp confirmations."
          badge={<Badge variant="primary">{appointments.length} Bookings</Badge>}
          actions={
            <Button
              onClick={() => {
                setSelectedContact(null);
                setBookingError('');
                setShowBookingModal(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Book Appointment
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-6">
          
          {bookingSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 text-xs font-bold shadow-xl flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{bookingSuccess}</span>
              </div>
              <button onClick={() => setBookingSuccess(null)} className="text-emerald-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EFE3CF]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#7C756D]">Total Bookings</span>
                <Calendar className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-black text-white">{appointments.length}</p>
              <p className="text-[11px] font-medium text-[#7C756D] mt-1">Confirmed salon visits</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EFE3CF]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">WhatsApp Confirmed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400">
                {appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'COMPLETED').length}
              </p>
              <p className="text-[11px] font-medium text-[#7C756D] mt-1">Automated reminders queued</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EFE3CF]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">Est. Service Revenue</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400">
                ₹{appointments.reduce((acc, curr) => acc + (curr.service_price || 0), 0).toLocaleString()}
              </p>
              <p className="text-[11px] font-medium text-[#7C756D] mt-1">From active salon bookings</p>
            </div>
          </div>

          {/* Appointments Table */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-[#EFE3CF] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-black text-white">Scheduled Appointments</h3>
              </div>
              <Badge variant="primary">{appointments.length} Total</Badge>
            </div>

            {appointments.length === 0 ? (
              <div className="p-12 text-center text-[#7C756D] text-xs">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="font-bold">No appointments booked yet.</p>
                <p className="text-[#7C756D] text-[11px] mt-1">Click "Book Appointment" above to schedule a client with automated WhatsApp confirmation.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#FAF7F2]/70 border-b border-[#EFE3CF] text-[#7C756D] font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-5">Customer</th>
                      <th className="py-3 px-5">Service</th>
                      <th className="py-3 px-5">Stylist</th>
                      <th className="py-3 px-5">Date & Time</th>
                      <th className="py-3 px-5">Price</th>
                      <th className="py-3 px-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-white">{apt.customer_name}</div>
                          <div className="text-[11px] text-[#7C756D]">{apt.customer_phone}</div>
                        </td>
                        <td className="py-3.5 px-5 font-bold text-[#2C2723]">
                          {apt.service_name}
                        </td>
                        <td className="py-3.5 px-5 text-[#5D564E]">
                          {apt.staff_name}
                        </td>
                        <td className="py-3.5 px-5 text-[#5D564E] font-mono text-[11px]">
                          {apt.start_time}
                        </td>
                        <td className="py-3.5 px-5 font-black text-emerald-400">
                          ₹{apt.service_price}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700">
                            {apt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

        </main>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white border border-[#EFE3CF] rounded-3xl p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3CF]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-black">Book Salon Appointment</h3>
              </div>
              <button onClick={() => setShowBookingModal(false)} className="text-[#7C756D] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
              
              {/* Customer Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#7C756D] mb-1.5">Select Client (From CRM)</label>
                {selectedContact ? (
                  <div className="p-3 rounded-2xl bg-[#F7F3EA] border border-emerald-500/80 flex items-center justify-between">
                    <div>
                      <div className="font-black text-white text-sm">{selectedContact.name || 'Valued Customer'}</div>
                      <div className="text-[#7C756D] text-xs font-mono">{selectedContact.phone_number}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelectedContact(null)}>Change</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-[#7C756D]" />
                      <input
                        type="text"
                        placeholder="Search client by name or phone..."
                        value={searchContact}
                        onChange={(e) => {
                          setSearchContact(e.target.value);
                          fetchContacts(e.target.value);
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-[#F7F3EA] border border-[#EFE3CF] rounded-xl text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-[#EFE3CF] divide-y divide-slate-800/60 bg-[#F7F3EA]">
                      {contacts.map(c => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedContact(c)}
                          className="p-2.5 hover:bg-slate-800/60 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-white">{c.name || 'Unnamed'}</span>
                            <span className="text-[#7C756D] ml-2 font-mono text-[11px]">{c.phone_number}</span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-400">Select</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Service & Stylist Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#7C756D] mb-1">Service</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F3EA] border border-[#EFE3CF] rounded-xl text-white outline-none"
                  >
                    {CLASSIC_PEARLS_SERVICES.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (₹{s.price})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#7C756D] mb-1">Stylist / Specialist</label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F3EA] border border-[#EFE3CF] rounded-xl text-white outline-none"
                  >
                    {CLASSIC_PEARLS_STAFF.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Slot Matrix */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#7C756D] mb-1">Appointment Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F3EA] border border-[#EFE3CF] rounded-xl text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#7C756D] mb-1">Available Slot</label>
                  <select
                    value={selectedSlotTime}
                    onChange={(e) => setSelectedSlotTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F3EA] border border-[#EFE3CF] rounded-xl text-white outline-none"
                  >
                    {availableSlots.map(s => (
                      <option key={s.time} value={s.time}>{s.time} ({s.staff_name})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#7C756D] font-medium">Service Fee:</span>
                  <span className="text-emerald-400 font-black ml-1.5 text-sm">₹{selectedService?.price || 0}</span>
                </div>
                <Badge variant="success">Auto WhatsApp Confirmation</Badge>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowBookingModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={bookingSaving}>
                  {bookingSaving ? 'Booking...' : 'Confirm & Send WhatsApp'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
