import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    const { data: msgs, error: msgErr } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    const { data: notes, error: notesErr } = await supabaseAdmin
      .from('chat_notes')
      .select('*')
      .eq('conversation_id', conversationId);

    // If chat_notes table does not exist yet, ignore the error
    let combined = [...(msgs || [])];
    if (!notesErr && notes) {
      const formattedNotes = notes.map(n => ({
        id: n.id,
        conversation_id: n.conversation_id,
        content: n.content,
        created_at: n.created_at,
        type: 'internal_note',
        direction: 'outbound',
        status: 'sent'
      }));
      combined = [...combined, ...formattedNotes];
      combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return NextResponse.json({ messages: combined });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
