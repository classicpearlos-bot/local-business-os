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
  return mem?.organization_id || null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: account, error: accErr } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (accErr) {
      console.error('DB Error fetching account:', accErr);
    }

    if (!account?.access_token) {
      return NextResponse.json({ error: 'Meta WhatsApp account not configured' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    const purpose = formData.get('purpose') as string || 'message'; // 'message' | 'template'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const mimeType = file.type || 'image/jpeg';
    const filename = (file as any).name || 'upload.jpg';

    // --- 1. Always upload to Supabase Storage for persistence & preview ---
    const fileExt = filename.split('.').pop() || 'jpg';
    const storagePath = `${orgId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Make sure bucket is public so LivePreview works
    await supabaseAdmin.storage.updateBucket('whatsapp-media', { public: true }).catch(() => {});

    const { error: uploadError } = await supabaseAdmin.storage.from('whatsapp-media').upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true
    });

    if (uploadError) {
      console.warn('Upload to whatsapp-media error, falling back to whatsapp_media:', uploadError);
      await supabaseAdmin.storage.from('whatsapp_media').upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true
      });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from('whatsapp-media').getPublicUrl(storagePath);

    // --- 2. PURPOSE: template ---
    if (purpose === 'template') {
      const appId = account.app_id || process.env.META_APP_ID || '2566956740405929';
      if (!appId) {
        return NextResponse.json({ error: 'Meta App ID is required to upload template images. Please configure it in Settings.' }, { status: 400 });
      }
      
      const { uploadImageForTemplate } = await import('@/lib/meta/media');
      try {
        const handle = await uploadImageForTemplate(
          appId,
          account.access_token,
          file,
          mimeType,
          filename
        );
        return NextResponse.json({ success: true, handle, url: publicUrl }, { status: 200 });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    // --- 3. PURPOSE: message (inbox / flow studio / campaigns) ---
    // Upload to Meta's /media endpoint to get a media_id for sending
    const { uploadMediaToMeta } = await import('@/lib/meta/media');
    try {
      const result = await uploadMediaToMeta(account.phone_number_id, account.access_token, file, mimeType);

      await supabaseAdmin.from('message_media').insert({
        organization_id: orgId,
        storage_path: storagePath,
        mime_type: mimeType,
        file_name: filename,
        file_size: file.size,
        direction: 'OUTBOUND',
        meta_media_id: result.id
      });

      // Return both media_id (for sending) and url (for UI preview)
      return NextResponse.json({
        success: true,
        media_id: result.id,
        storage_path: storagePath,
        url: publicUrl
      }, { status: 200 });
    } catch (err: any) {
      // Even if Meta upload fails, return the public URL so the UI can still preview the image
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
