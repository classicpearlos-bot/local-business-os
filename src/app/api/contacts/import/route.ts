import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST /api/contacts/import
 * Bulk imports parsed Excel/CSV contacts into the organization's contacts table.
 * Uses supabaseAdmin to bypass RLS on the contacts table.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve org via admin to avoid RLS issues on organization_members too
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

    // Build records for upsert
    const records = contactsToImport.map((c: any) => ({
      organization_id: orgId,
      name: c.name || 'Valued Customer',
      phone_number: c.phone_number || c.normalizedPhone,
      opted_in: c.opted_in !== undefined ? c.opted_in : true
    }));

    // Upsert using supabaseAdmin to bypass RLS
    const { data: inserted, error } = await supabaseAdmin
      .from('contacts')
      .upsert(records, {
        onConflict: 'organization_id,phone_number',
        ignoreDuplicates: false
      })
      .select('id, name, phone_number, opted_in');

    if (error) {
      console.error('Bulk import error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      importedCount: inserted?.length || 0,
      contacts: inserted || []
    });

  } catch (err: any) {
    console.error('Bulk contact import failed', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
