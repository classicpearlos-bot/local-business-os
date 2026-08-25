import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppText, sendWhatsAppTemplate, sendWhatsAppMedia, sendWhatsAppLocation } from '@/lib/meta/whatsapp';

async function resolveUserOrgId(userId: string): Promise<string | null> {
  const { data: mem } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return mem?.organization_id || null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    const payload = await request.json();

    // Fetch WA Account using admin to bypass RLS
    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('phone_number_id, access_token')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: 'Meta WhatsApp account not configured' }, { status: 400 });
    }

    // Resolve Contact Phone using admin
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('phone_number')
      .eq('id', payload.contactId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    let response;
    let msgType = 'text';
    let msgContent: any = {};
    
    // Dispatch to Meta
    if (payload.templateName) {
      msgType = 'template';
      msgContent = { template: { name: payload.templateName } };
      response = await sendWhatsAppTemplate({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: contact.phone_number
      }, payload.templateName, payload.language || 'en_US', payload.components || []);
    } else if (payload.mediaType && payload.mediaUrl) {
      msgType = payload.mediaType;
      msgContent = {
        [payload.mediaType]: {
          link: payload.mediaUrl,
          caption: payload.caption || payload.text,
          filename: payload.filename
        }
      };
      response = await sendWhatsAppMedia({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: contact.phone_number
      }, payload.mediaType, payload.mediaUrl, payload.caption || payload.text, payload.filename);
    } else if (payload.location) {
      msgType = 'location';
      msgContent = { location: { name: payload.location.name, address: payload.location.address, latitude: payload.location.latitude, longitude: payload.location.longitude } };
      response = await sendWhatsAppLocation({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: contact.phone_number
      }, payload.location.latitude, payload.location.longitude, payload.location.name, payload.location.address);
    } else if (payload.text) {
      msgType = 'text';
      msgContent = { text: { body: payload.text } };
      response = await sendWhatsAppText({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: contact.phone_number
      }, payload.text);
    } else {
      return NextResponse.json({ error: 'Unsupported message type.' }, { status: 400 });
    }

    if (response.error) {
       return NextResponse.json({ error: response.error.message }, { status: 400 });
    }

    const messageId = response.messages?.[0]?.id;

    // Log outbound message using admin
    try {
      const { data: conv } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('contact_id', payload.contactId)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (conv) {
        await supabaseAdmin.from('messages').insert({
          organization_id: orgId,
          conversation_id: conv.id,
          contact_id: payload.contactId,
          wam_id: messageId || `outbound_${Date.now()}`,
          direction: 'OUTBOUND',
          type: msgType,
          content: msgContent,
          status: 'SENT'
        });

        // Update conversation last_message_at
        await supabaseAdmin.from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conv.id);
      }
    } catch (logErr) {
      console.error('Failed to log outbound message:', logErr);
    }

    return NextResponse.json({ success: true, message_id: messageId }, { status: 200 });

  } catch (error: any) {
    console.error('API Send Error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
