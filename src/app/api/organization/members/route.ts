import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function resolveUserOrgId(userId: string): Promise<string | null> {
  const { data: mem } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return mem?.organization_id || null;
}

/**
 * GET /api/organization/members - Get list of staff/agents in the current organization
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: members, error } = await supabaseAdmin
      .from('organization_members')
      .select('id, user_id, role, created_at')
      .eq('organization_id', orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Format member items with display names
    const formatted = (members || []).map(m => ({
      id: m.user_id,
      member_id: m.id,
      role: m.role,
      name: m.user_id === user.id ? `You (${m.role})` : `Agent (${m.role})`
    }));

    return NextResponse.json({ members: formatted });
  } catch (err: any) {
    console.error('Fetch members error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
