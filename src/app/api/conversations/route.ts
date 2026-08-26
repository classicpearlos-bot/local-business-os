import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizePhoneNumber, isValidWhatsAppNumber } from '@/utils/phone';

// GET /api/conversations - fetch all conversations for the org
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const assignedParam = searchParams.get('assigned_to');

    let query = supabaseAdmin
      .from('conversations')
      .select(`
        *,
        contacts(*),
        conversation_labels(
          label_id,
          chat_labels(id, name, color)
        )
      `)
      .eq('organization_id', orgId)
      .order('last_message_at', { ascending: false });

    if (statusParam && statusParam !== 'all') {
      query = query.eq('status', statusParam.toUpperCase());
    }

    if (assignedParam) {
      if (assignedParam === 'unassigned') {
        query = query.is('assigned_to', null);
      } else if (assignedParam === 'me' && user) {
        query = query.eq('assigned_to', user.id);
      } else {
        query = query.eq('assigned_to', assignedParam);
      }
    }

    const { data: convs, error } = await query;

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

// POST /api/conversations - Start a new conversation with any phone number
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

    if (!phone_number) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });

    const normalized = normalizePhoneNumber(phone_number);
    if (!isValidWhatsAppNumber(normalized)) {
      return NextResponse.json({ error: 'Please enter a valid phone number with country code (e.g. +91XXXXXXXXXX)' }, { status: 400 });
    }

    // 1. Check if contact already exists
    let { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id, name, phone_number')
      .eq('organization_id', orgId)
      .eq('phone_number', normalized)
      .maybeSingle();

    // 2. If not found, create contact safely
    if (!contact) {
      const { data: newContact, error: contactErr } = await supabaseAdmin
        .from('contacts')
        .insert({
          organization_id: orgId,
          phone_number: normalized,
          name: name?.trim() || normalized,
          opted_in: true
        })
        .select('id, name, phone_number')
        .single();

      if (contactErr || !newContact) {
        return NextResponse.json({ error: contactErr?.message || 'Failed to create contact' }, { status: 500 });
      }
      contact = newContact;
    }

    // 3. Return existing conversation if already exists
    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('organization_id', orgId)
      .eq('contact_id', contact.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ conversation_id: existing.id, is_existing: true });
    }

    // 4. Create new conversation
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

    return NextResponse.json({ conversation_id: conv.id, is_existing: false });
  } catch (err: any) {
    console.error('Create conversation error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
