import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';

/**
 * POST /api/whatsapp/account
 * Saves WhatsApp Cloud API credentials securely via authenticated server-side route.
 * 
 * SECURITY: Credentials (especially access_token) must never be handled
 * purely client-side. This server route validates the user's session and
 * organization membership before persisting.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify organization membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No organization membership found' }, { status: 403 });
    }

    // Only owners/admins can update WhatsApp credentials
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only owners and admins can update WhatsApp settings' }, { status: 403 });
    }

    const { waba_id, phone_number_id, access_token, webhook_verify_token } = await request.json();

    if (!waba_id || !phone_number_id || !access_token) {
      return NextResponse.json({ 
        error: 'waba_id, phone_number_id, and access_token are required' 
      }, { status: 400 });
    }

    // Upsert account — user's org_id is taken from authenticated membership, not from client
    const { error } = await supabase.from('whatsapp_accounts').upsert({
      organization_id: membership.organization_id,
      waba_id,
      phone_number_id,
      access_token,
      webhook_verify_token: webhook_verify_token || `nx_${Math.random().toString(36).substring(2, 14)}`
    }, { onConflict: 'waba_id' });

    if (error) {
      console.error('Failed to save WhatsApp account:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('WhatsApp account save error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/whatsapp/account
 * Returns current WhatsApp account config for the authenticated user's org.
 * Does NOT return the access_token (masked for security).
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    const { data: account } = await supabase
      .from('whatsapp_accounts')
      .select('waba_id, phone_number_id, webhook_verify_token, created_at')
      .eq('organization_id', membership.organization_id)
      .single();

    return NextResponse.json({ account: account || null });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
