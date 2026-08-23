import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import crypto from 'crypto';

/**
 * POST /api/developers/keys - Generate a new developer API key
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Key name is required' }, { status: 400 });

    // Generate a secure random token: sk_live_...
    const rawSecret = `sk_live_${crypto.randomBytes(24).toString('hex')}`;
    const prefix = rawSecret.slice(0, 12);
    const hash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id: membership.organization_id,
        name,
        key_prefix: prefix,
        key_hash: hash,
        created_by: user.id
      })
      .select('id, name, key_prefix, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Return the plaintext key ONCE to the user
    return NextResponse.json({
      apiKey,
      rawKey: rawSecret // Display this in UI once
    }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/developers/keys - Revoke an API key
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });

    const { error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
