import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';

export async function POST(request: Request, context: any) {
  try {
    const { id: conversation_id } = context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { label_id } = await request.json();
    if (!label_id) return NextResponse.json({ error: 'Missing label_id' }, { status: 400 });

    const { error } = await supabase
      .from('conversation_labels')
      .insert({ conversation_id, label_id });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const { id: conversation_id } = context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const label_id = searchParams.get('label_id');
    if (!label_id) return NextResponse.json({ error: 'Missing label_id' }, { status: 400 });

    const { error } = await supabase
      .from('conversation_labels')
      .delete()
      .match({ conversation_id, label_id });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
