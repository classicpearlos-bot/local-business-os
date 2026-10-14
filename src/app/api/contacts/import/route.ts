import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getBlockedContacts, getPhoneMatchKeys } from '@/lib/contacts/blockedContacts';

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

    if (!membership) {
      return NextResponse.json({ error: 'No organization membership' }, { status: 403 });
    }

    const payload = await request.json();
    const contactsToImport = payload.contacts;

    if (!Array.isArray(contactsToImport) || contactsToImport.length === 0) {
      return NextResponse.json({ error: 'No valid contacts provided in payload' }, { status: 400 });
    }

    const orgId = membership.organization_id;

    const blockedList = await getBlockedContacts(orgId);
    const blockedLast10 = new Set(blockedList.map(b => getPhoneMatchKeys(b.phone_number).last10));

    const records = contactsToImport.map((c: any) => {
      const phone = c.phone_number || c.normalizedPhone;
      const isBlocked = blockedLast10.has(getPhoneMatchKeys(phone).last10);
      return {
        organization_id: orgId,
        name: c.name || 'Valued Customer',
        phone_number: phone,
        opted_in: isBlocked ? false : (c.opted_in !== undefined ? c.opted_in : true),
        ...(isBlocked ? { attributes: { is_blocked: true, blocked_reason: 'Pre-existing blocked contact' } } : {})
      };
    });

    // Upsert using supabaseAdmin
    const { error } = await supabaseAdmin
      .from('contacts')
      .upsert(records, {
        onConflict: 'organization_id,phone_number',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Bulk import error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Batch fetch to avoid URI Too Long error
    const phoneNumbers = records.map(r => r.phone_number);
    let finalContacts: any[] = [];
    
    // Process in batches of 100
    for (let i = 0; i < phoneNumbers.length; i += 100) {
      const batch = phoneNumbers.slice(i, i + 100);
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('id, name, phone_number, opted_in')
        .eq('organization_id', orgId)
        .in('phone_number', batch);
      if (data) finalContacts.push(...data);
    }

    return NextResponse.json({
      success: true,
      importedCount: finalContacts.length,
      contacts: finalContacts
    });

  } catch (err: any) {
    console.error('Bulk contact import failed', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
