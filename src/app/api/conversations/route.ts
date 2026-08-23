import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let orgId: string | null = null;
    if (user) {
      const { data: mem } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      orgId = mem?.organization_id || null;
    }

    if (!orgId) {
      const { data: orgs } = await supabaseAdmin.from('organizations').select('id').limit(1).maybeSingle();
      orgId = orgs?.id || null;
    }

    if (!orgId) {
      return NextResponse.json({ conversations: [] });
    }

    const { data: convs, error } = await supabaseAdmin
      .from('conversations')
      .select('*, contacts(*)')
      .eq('organization_id', orgId)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversations: convs || [] });
  } catch (err: any) {
    console.error('Conversations API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
