import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('chat_labels')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ labels: [] });
      throw error;
    }

    return NextResponse.json({ labels: data || [] });
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

    const { name, color } = await request.json();
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    const { data, error } = await supabase
      .from('chat_labels')
      .insert({
        organization_id: mem.organization_id,
        name: name.trim(),
        color: color || '#4F46E5'
      })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ label: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
