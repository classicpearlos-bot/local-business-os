import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSalonAppointment, getOrganizationAppointments } from '@/lib/appointments/service';
import { posProvider } from '@/lib/appointments/pos-adapter';

async function resolveUserOrgId(userId: string): Promise<string | null> {
  const { data: mem } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return mem?.organization_id || null;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const serviceId = searchParams.get('service_id') || 'srv_botox';
    const staffId = searchParams.get('staff_id') || undefined;

    if (view === 'slots') {
      const slots = await posProvider.getAvailableSlots(orgId, date, serviceId, staffId);
      return NextResponse.json({ slots });
    }

    if (view === 'catalog') {
      const services = await posProvider.getServices(orgId);
      const staff = await posProvider.getStaff(orgId);
      return NextResponse.json({ services, staff });
    }

    const appointments = await getOrganizationAppointments(orgId);
    return NextResponse.json({ appointments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const appointment = await createSalonAppointment(orgId, body);

    return NextResponse.json({ success: true, appointment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
