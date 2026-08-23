import { supabaseAdmin } from '../supabaseAdmin';

export async function processConversationAndMessage(orgId: string, contactId: string, wamId: string, msgType: string, content: any) {
  // 1. Find or create conversation
  let conversationId: string;
  
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('id, unread_count')
    .eq('organization_id', orgId)
    .eq('contact_id', contactId)
    .single();

  if (conv) {
    conversationId = conv.id;
    // Update last message time and unread
    await supabaseAdmin.from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: conv.unread_count + 1
      })
      .eq('id', conv.id);
  } else {
    // Create new conversation
    const { data: newConv, error } = await supabaseAdmin.from('conversations')
      .insert({
        organization_id: orgId,
        contact_id: contactId,
        status: 'OPEN',
        unread_count: 1
      })
      .select('id')
      .single();
    
    if (error || !newConv) throw new Error(error?.message || 'Failed to create conversation');
    conversationId = newConv.id;
  }

  // 2. Insert message
  const { data: message, error: msgError } = await supabaseAdmin.from('messages')
    .insert({
      organization_id: orgId,
      conversation_id: conversationId,
      contact_id: contactId,
      wam_id: wamId,
      direction: 'INBOUND',
      type: msgType,
      content: content,
      status: 'DELIVERED'
    })
    .select('id')
    .single();
    
  if (msgError || !message) throw new Error(msgError?.message || 'Failed to insert message');

  return { conversationId, messageId: message.id };
}
