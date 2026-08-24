import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { uploadMediaToMeta } from '@/lib/meta/media';

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
      .select('phone_number_id, access_token')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!account || !account.phone_number_id || !account.access_token) {
      return NextResponse.json({ error: 'Meta WhatsApp account not configured' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert Next.js File/Blob to standard Blob if needed, or pass directly
    const mimeType = file.type;

    try {
      const metaResponse = await uploadMediaToMeta(
        account.phone_number_id,
        account.access_token,
        file,
        mimeType
      );

      return NextResponse.json({ success: true, media_id: metaResponse.id }, { status: 200 });
    } catch (metaErr: any) {
      console.error('Meta Upload Error:', metaErr);
      return NextResponse.json({ error: metaErr.message || 'Failed to upload to Meta' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
