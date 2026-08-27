import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCustomer360Profile } from '@/lib/customers/profile';

async function resolveUserOrgId(userId: string): Promise<string | null> {
  const { data: mem } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return mem?.organization_id || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const profile = await getCustomer360Profile(orgId, id);
    return NextResponse.json({ profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
