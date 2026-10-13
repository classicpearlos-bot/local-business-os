import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getWhatsAppTemplates } from '@/lib/meta/templates';

async function resolveUserOrgId(userId: string): Promise<string | null> {
  const { data: mem } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return mem?.organization_id || null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch local templates using admin to bypass RLS
    let { data: templates, error } = await supabaseAdmin
      .from('message_templates')
      .select('*')
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (error) throw error;

    // Auto-sync with Meta if any template is currently PENDING
    const hasPending = (templates || []).some((t: any) => t.status === 'PENDING');
    if (hasPending) {
      try {
        const { data: account } = await supabaseAdmin
          .from('whatsapp_accounts')
          .select('waba_id, access_token')
          .eq('organization_id', orgId)
          .maybeSingle();

        if (account?.waba_id && account?.access_token) {
          const metaRes = await getWhatsAppTemplates({
            wabaId: account.waba_id,
            accessToken: account.access_token
          });
          const metaList = metaRes?.data || [];
          for (const mt of metaList) {
            await supabaseAdmin
              .from('message_templates')
              .update({ status: mt.status, components: mt.components })
              .eq('organization_id', orgId)
              .eq('name', mt.name);
          }

          const { data: refreshed } = await supabaseAdmin
            .from('message_templates')
            .select('*')
            .eq('organization_id', orgId)
            .order('name', { ascending: true });
          if (refreshed) templates = refreshed;
        }
      } catch (syncErr) {
        console.warn('Background Meta template sync skipped:', syncErr);
      }
    }

    return NextResponse.json({ data: templates || [] }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch local templates error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
