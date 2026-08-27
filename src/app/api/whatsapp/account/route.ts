import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function resolveUserOrgId(userId: string): Promise<string | null> {
  const { data: mem } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (mem?.organization_id) return mem.organization_id;

  // Auto-provision org if none exists
  const { data: newOrg } = await supabaseAdmin
    .from('organizations')
    .insert({ name: 'Classic Pearl' })
    .select('id')
    .single();

  if (newOrg) {
    const { data: ownerRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'owner')
      .maybeSingle();

    if (ownerRole) {
      await supabaseAdmin.from('organization_members').insert({
        organization_id: newOrg.id,
        user_id: userId,
        role_id: ownerRole.id
      });
    } else {
      await supabaseAdmin.from('organization_members').insert({
        organization_id: newOrg.id,
        user_id: userId
      });
    }
    return newOrg.id;
  }

  return null;
}

/**
 * POST /api/whatsapp/account
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) {
      return NextResponse.json({ error: 'Failed to resolve organization' }, { status: 500 });
    }

    const { waba_id, phone_number_id, access_token, webhook_verify_token } = await request.json();

    if (!waba_id || !phone_number_id || !access_token) {
      return NextResponse.json({ 
        error: 'waba_id, phone_number_id, and access_token are required' 
      }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('whatsapp_accounts').upsert({
      organization_id: orgId,
      waba_id,
      phone_number_id,
      access_token,
      webhook_verify_token: webhook_verify_token || 'classic_pearls_secret_webhook_token'
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
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) {
      return NextResponse.json({ account: null });
    }

    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('waba_id, phone_number_id, webhook_verify_token, created_at')
      .eq('organization_id', orgId)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ account: account || null });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
