import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getOrganizationTags, upsertTag, deleteTag, assignTagToContact, removeTagFromContact } from '@/lib/tags/service';

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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tags = await getOrganizationTags(orgId);
    return NextResponse.json({ tags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { action, name, color, contact_id } = body;

    if (action === 'assign' && contact_id && name) {
      await assignTagToContact(orgId, contact_id, name);
      return NextResponse.json({ success: true });
    }

    if (action === 'remove' && contact_id && name) {
      await removeTagFromContact(orgId, contact_id, name);
      return NextResponse.json({ success: true });
    }

    if (!name) return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });

    const tag = await upsertTag(orgId, name, color);
    return NextResponse.json({ success: true, tag });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const tagName = searchParams.get('name');
    if (!tagName) return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });

    await deleteTag(orgId, tagName);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
