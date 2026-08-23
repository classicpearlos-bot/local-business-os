import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { getWhatsAppTemplates } from '@/lib/meta/templates';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to sync templates.' }, { status: 401 });
    }

    // Get the user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No organization found for your account.' }, { status: 404 });
    }

    // Get the WhatsApp Account configured for this organization
    const { data: account } = await supabase
      .from('whatsapp_accounts')
      .select('waba_id, access_token')
      .eq('organization_id', member.organization_id)
      .single();

    if (!account || !account.waba_id || !account.access_token) {
      return NextResponse.json({ 
        error: 'WhatsApp Account is not connected yet. Please go to "Meta Connection" (/whatsapp) and enter your WhatsApp Business Account ID (WABA ID) and Access Token first.' 
      }, { status: 400 });
    }

    // Fetch templates from Meta Graph API
    let metaResponse;
    try {
      metaResponse = await getWhatsAppTemplates({
        wabaId: account.waba_id,
        accessToken: account.access_token
      });
    } catch (metaErr: any) {
      return NextResponse.json({ 
        error: `Meta Cloud API Error: ${metaErr.message || 'Invalid WABA ID or Access Token. Verify credentials in Meta Connection settings.'}` 
      }, { status: 400 });
    }

    if (metaResponse && metaResponse.data) {
      // Upsert templates into Supabase to sync them
      for (const template of metaResponse.data) {
        await supabaseAdmin
          .from('message_templates')
          .upsert({
            organization_id: member.organization_id,
            name: template.name,
            language: template.language,
            category: template.category,
            status: template.status,
            components: template.components
          }, { onConflict: 'organization_id, name, language' });
      }
    }

    return NextResponse.json({ success: true, data: metaResponse?.data || [] });
  } catch (error: any) {
    console.error('Fetch templates error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
