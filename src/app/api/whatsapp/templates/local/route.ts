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

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch local templates using admin to bypass RLS
    const { data: templates, error } = await supabaseAdmin
      .from('message_templates')
      .select('*')
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: templates || [] }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch local templates error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
