import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  getBlockedContacts,
  blockContact,
  unblockContact
} from '@/lib/contacts/blockedContacts';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    const orgId = membership?.organization_id;
    const blockedContacts = await getBlockedContacts(orgId);

    return NextResponse.json({ data: blockedContacts, count: blockedContacts.length });
  } catch (err: any) {
    console.error('Error in GET /api/blocked-contacts:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    const orgId = membership?.organization_id;
    const body = await request.json();

    if (!body.phone_number) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    const result = await blockContact({
      phone_number: body.phone_number,
      name: body.name,
      reason: body.reason,
      source: body.source || 'admin',
      orgId
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, contact: result.contact });
  } catch (err: any) {
    console.error('Error in POST /api/blocked-contacts:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('id');
    const phoneNumber = searchParams.get('phone');

    if (!contactId && !phoneNumber) {
      return NextResponse.json({ error: 'Contact ID or phone number is required.' }, { status: 400 });
    }

    const result = await unblockContact({
      contact_id: contactId || undefined,
      phone_number: phoneNumber || undefined
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Contact successfully unblocked.' });
  } catch (err: any) {
    console.error('Error in DELETE /api/blocked-contacts:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
