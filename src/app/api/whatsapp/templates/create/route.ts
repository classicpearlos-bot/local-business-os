import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createWhatsAppTemplate } from '@/lib/meta/templates';

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

    // Fetch WA Account using admin to bypass RLS
    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('waba_id, access_token')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!account || !account.waba_id || !account.access_token) {
      return NextResponse.json({ error: 'Meta WhatsApp account not configured' }, { status: 400 });
    }

    const payload = await request.json();
    
    // Meta requires names to be lowercase and underscore only
    if (payload.name && !/^[a-z0-9_]+$/.test(payload.name)) {
      return NextResponse.json({ error: 'Template name must be lowercase and contain only letters, numbers, and underscores.' }, { status: 400 });
    }

    try {
      // Submit to Meta
      const metaResponse = await createWhatsAppTemplate({
        wabaId: account.waba_id,
        accessToken: account.access_token
      }, payload);

      if (metaResponse.error) {
        return NextResponse.json({ error: metaResponse.error.message }, { status: 400 });
      }

      // If successful, save it locally with PENDING status
      await supabaseAdmin
        .from('message_templates')
        .insert({
          organization_id: orgId,
          name: payload.name,
          language: payload.language,
          category: payload.category,
          status: 'PENDING',
          components: payload.components
        });

      return NextResponse.json({ success: true, data: metaResponse }, { status: 200 });
    } catch (metaErr: any) {
      console.error('Meta Template Creation Error:', metaErr);
      return NextResponse.json({ error: metaErr.message || 'Failed to create template on Meta' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Template Creation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
