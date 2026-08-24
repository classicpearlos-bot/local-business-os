import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/conversations — fetch all conversations for the org
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

// POST /api/conversations — Start a new conversation with any phone number
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: mem } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    const orgId = mem?.organization_id;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const payload = await request.json();
    const { phone_number, name } = payload;

    if (!phone_number) return NextResponse.json({ error: 'phone_number is required' }, { status: 400 });

    let normalized = phone_number.trim().replace(/[^0-9+]/g, '');
    if (!normalized.startsWith('+')) normalized = '+' + normalized;

    // Upsert the contact
    const { data: contact, error: contactErr } = await supabaseAdmin
      .from('contacts')
      .upsert({
        organization_id: orgId,
        phone_number: normalized,
        name: name?.trim() || normalized,
        opted_in: true
      }, { onConflict: 'organization_id,phone_number' })
      .select('id')
      .single();

    if (contactErr || !contact) {
      return NextResponse.json({ error: contactErr?.message || 'Failed to upsert contact' }, { status: 500 });
    }

    // Return existing conversation if already open
    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('organization_id', orgId)
      .eq('contact_id', contact.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ conversation_id: existing.id });
    }

    // Create new conversation
    const { data: conv, error: convErr } = await supabaseAdmin
      .from('conversations')
      .insert({
        organization_id: orgId,
        contact_id: contact.id,
        status: 'OPEN',
        last_message_at: new Date().toISOString(),
        unread_count: 0
      })
      .select('id')
      .single();

    if (convErr || !conv) {
      return NextResponse.json({ error: convErr?.message || 'Failed to create conversation' }, { status: 500 });
    }

    return NextResponse.json({ conversation_id: conv.id });
  } catch (err: any) {
    console.error('Create conversation error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
