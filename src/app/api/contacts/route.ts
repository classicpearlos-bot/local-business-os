import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizePhoneNumber, isValidWhatsAppNumber } from '@/utils/phone';

async function resolveUserOrgId(userId: string): Promise<string | null> {
  const { data: mem } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return mem?.organization_id || null;
}

/**
 * GET /api/contacts - List contacts with search and pagination
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const optedInParam = searchParams.get('opted_in');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (optedInParam === 'true') {
      query = query.eq('opted_in', true);
    } else if (optedInParam === 'false') {
      query = query.eq('opted_in', false);
    }

    if (search) {
      const cleanDigits = search.replace(/\D/g, '');
      if (cleanDigits.length >= 3) {
        query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${cleanDigits}%,phone_number.ilike.%${search}%`);
      } else {
        query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%`);
      }
    }

    // Fetch contacts and head counts in parallel
    const [
      contactsRes,
      optedInCountRes,
      optedOutCountRes
    ] = await Promise.all([
      query,
      supabaseAdmin.from('contacts').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('opted_in', true),
      supabaseAdmin.from('contacts').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('opted_in', false)
    ]);

    if (contactsRes.error) return NextResponse.json({ error: contactsRes.error.message }, { status: 500 });

    return NextResponse.json({ 
      contacts: contactsRes.data || [], 
      total: contactsRes.count || 0,
      opted_in_count: optedInCountRes.count || 0,
      opted_out_count: optedOutCountRes.count || 0,
      page, 
      limit 
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/contacts - Create a new contact
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await request.json();
    const { name, phone_number, attributes, opted_in } = body;

    if (!phone_number) {
      return NextResponse.json({ error: 'phone_number is required' }, { status: 400 });
    }

    // Normalize phone number to E.164
    const normalizedPhone = normalizePhoneNumber(phone_number);

    if (!isValidWhatsAppNumber(normalizedPhone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        organization_id: orgId,
        phone_number: normalizedPhone,
        name: name || null,
        attributes: attributes || {},
        opted_in: opted_in !== undefined ? opted_in : true
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A contact with this phone number already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contact }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/contacts - Update a contact (opt-out handling)
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await request.json();
    const { id, name, opted_in, attributes } = body;

    if (!id) return NextResponse.json({ error: 'Contact id is required' }, { status: 400 });

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (opted_in !== undefined) updates.opted_in = opted_in;
    if (attributes !== undefined) updates.attributes = attributes;

    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    return NextResponse.json({ contact });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
