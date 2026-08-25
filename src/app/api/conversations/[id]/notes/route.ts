import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';

export async function POST(request: Request, context: any) {
  try {
    const { id: conversation_id } = context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await request.json();
    if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });

    const { data, error } = await supabase
      .from('chat_notes')
      .insert({ conversation_id, content, created_by: user.id })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ note: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
