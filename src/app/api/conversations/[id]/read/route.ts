import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppReadReceipt } from '@/lib/meta/whatsapp';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: mem } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!mem) return NextResponse.json({ error: 'No org' }, { status: 403 });
    const orgId = mem.organization_id;

    // Reset conversation unread_count
    await supabaseAdmin
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    // Find latest unread inbound message wam_id
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, wam_id')
      .eq('conversation_id', conversationId)
      .eq('direction', 'inbound')
      .neq('status', 'READ')
      .order('created_at', { ascending: false })
      .limit(1);

    if (messages && messages.length > 0 && messages[0].wam_id) {
      // Get WABA Account
      const { data: account } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('phone_number_id, access_token')
        .eq('organization_id', orgId)
        .single();

      if (account) {
        // Send Read Receipt to Meta
        await sendWhatsAppReadReceipt({
          phoneNumberId: account.phone_number_id,
          accessToken: account.access_token,
          to: '' // Not required for read receipts, only wam_id is needed
        }, messages[0].wam_id);
      }

      // Mark local messages as read
      await supabaseAdmin
        .from('messages')
        .update({ status: 'READ' })
        .eq('conversation_id', conversationId)
        .eq('direction', 'inbound')
        .neq('status', 'READ');
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
