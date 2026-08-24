import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppTemplate } from '@/lib/meta/whatsapp';
import { normalizePhoneNumber, isValidWhatsAppNumber } from '@/utils/phone';

/**
 * POST /api/whatsapp/campaigns/test-send
 * Sends a single test campaign message to an engineer/marketer's phone before launching broadcast.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use supabaseAdmin to bypass RLS on org membership lookup
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
    const { test_phone, template_name, template_language, template_components } = payload;

    if (!test_phone) {
      return NextResponse.json({ error: 'Test phone number is required' }, { status: 400 });
    }

    if (!template_name) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(test_phone);
    if (!isValidWhatsAppNumber(normalizedPhone)) {
      return NextResponse.json({ error: 'Invalid phone number format. Please include country code, e.g. +91...' }, { status: 400 });
    }

    // Fetch WA account credentials via admin to bypass RLS
    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('phone_number_id, access_token')
      .eq('organization_id', membership.organization_id)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Meta WhatsApp account not connected for your organization.' }, { status: 400 });
    }

    // Dispatch test message through Meta Cloud API
    const response = await sendWhatsAppTemplate(
      {
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: normalizedPhone
      },
      template_name,
      template_language || 'en_US',
      template_components || []
    );

    if (response.error) {
      return NextResponse.json({
        error: `Meta API Error (${response.error.code}): ${response.error.message}`,
        details: response.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      meta_message_id: response.messages?.[0]?.id,
      recipient: normalizedPhone
    });

  } catch (err: any) {
    console.error('Test send error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
