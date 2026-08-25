import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('quick_replies')
      .select('*')
      .eq('is_active', true)
      .order('shortcut', { ascending: true });

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ quick_replies: [] }); // Table doesn't exist yet
      throw error;
    }

    return NextResponse.json({ quick_replies: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: mem } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!mem) return NextResponse.json({ error: 'No org found' }, { status: 403 });

    const { shortcut, title, content } = await request.json();
    if (!shortcut || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { data, error } = await supabase
      .from('quick_replies')
      .insert({
        organization_id: mem.organization_id,
        shortcut: shortcut.trim().toLowerCase(),
        title: title || shortcut,
        content,
        created_by: user.id
      })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ quick_reply: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
