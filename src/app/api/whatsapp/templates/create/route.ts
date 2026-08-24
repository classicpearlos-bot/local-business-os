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

    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('waba_id, access_token')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!account || !account.waba_id || !account.access_token) {
      return NextResponse.json({ error: 'Meta WhatsApp account not configured' }, { status: 400 });
    }

    const payload = await request.json();

    // Validate name
    if (payload.name && !/^[a-z0-9_]+$/.test(payload.name)) {
      return NextResponse.json({ error: 'Template name must be lowercase letters, numbers and underscores only.' }, { status: 400 });
    }

    // Sanitize components before sending to Meta:
    // - IMAGE headers: remove "example.header_handle" — that requires a special resumable upload API.
    //   Just send format: IMAGE without example. Meta will approve it, and the actual image
    //   is provided per-send at broadcast time.
    // - Strip any markdown from BODY text
    const sanitizedComponents = (payload.components || []).map((comp: any) => {
      if (comp.type === 'HEADER' && comp.format === 'IMAGE') {
        // Remove example entirely — just declare format IMAGE
        return { type: 'HEADER', format: 'IMAGE' };
      }
      if (comp.type === 'BODY' && comp.text) {
        // Strip markdown: **bold**, *italic*, __under__, _italic_
        const cleanText = comp.text
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/__(.*?)__/g, '$1')
          .replace(/_(.*?)_/g, '$1');
        return { ...comp, text: cleanText };
      }
      return comp;
    });

    // Validate BODY is not empty after sanitization
    const bodyComp = sanitizedComponents.find((c: any) => c.type === 'BODY');
    if (!bodyComp || !bodyComp.text?.trim()) {
      return NextResponse.json({ error: 'Body text is required.' }, { status: 400 });
    }

    // Validate Call button phone numbers
    const buttonsComp = sanitizedComponents.find((c: any) => c.type === 'BUTTONS');
    if (buttonsComp?.buttons) {
      for (const btn of buttonsComp.buttons) {
        if (btn.type === 'PHONE_NUMBER') {
          const phone = (btn.phone_number || '').trim();
          if (!/^\+\d{7,15}$/.test(phone)) {
            return NextResponse.json({
              error: `Call button phone number "${phone}" is invalid. Use format: +917483654138 (plus sign + digits only, no spaces)`
            }, { status: 400 });
          }
        }
      }
    }

    const metaPayload = {
      name: payload.name,
      language: payload.language,
      category: payload.category,
      components: sanitizedComponents
    };

    try {
      const metaResponse = await createWhatsAppTemplate({
        wabaId: account.waba_id,
        accessToken: account.access_token
      }, metaPayload);

      if (metaResponse.error) {
        return NextResponse.json({ error: `Meta rejected: ${metaResponse.error.message}` }, { status: 400 });
      }

      // Save locally with PENDING status
      await supabaseAdmin
        .from('message_templates')
        .insert({
          organization_id: orgId,
          name: payload.name,
          language: payload.language,
          category: payload.category,
          status: 'PENDING',
          components: sanitizedComponents
        });

      return NextResponse.json({ success: true, data: metaResponse }, { status: 200 });

    } catch (metaErr: any) {
      console.error('Meta Template Creation Error:', metaErr);
      // Return the raw Meta error message so the user can understand exactly what failed
      const errMsg = metaErr?.data?.error?.message || metaErr?.message || 'Failed to create template on Meta';
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Template Creation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
