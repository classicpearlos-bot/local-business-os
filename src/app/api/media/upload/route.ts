import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { uploadImageForTemplate } from '@/lib/meta/media';

async function resolveUserOrgId(userId: string): Promise<string | null> {
  const { data: mem } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return mem?.organization_id || null;
}

const META_APP_ID = '2566956740405929';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('phone_number_id, access_token')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!account?.access_token) {
      return NextResponse.json({ error: 'Meta WhatsApp account not configured' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    const purpose = formData.get('purpose') as string || 'message'; // 'message' or 'template'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const mimeType = file.type || 'image/jpeg';
    const filename = (file as any).name || 'upload.jpg';

    if (purpose === 'template') {
      // Use resumable upload API to get a template-compatible handle
      try {
        const handle = await uploadImageForTemplate(
          META_APP_ID,
          account.access_token,
          file,
          mimeType,
          filename
        );
        return NextResponse.json({ success: true, handle }, { status: 200 });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    } else {
      // Regular media upload for sending messages
      const { uploadMediaToMeta } = await import('@/lib/meta/media');
      try {
        const result = await uploadMediaToMeta(account.phone_number_id, account.access_token, file, mimeType);
        return NextResponse.json({ success: true, media_id: result.id }, { status: 200 });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
