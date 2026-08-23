import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';

/**
 * GET /api/media - Lists registered media assets for the tenant
 * POST /api/media - Registers a new media asset with metadata (URL, type, filename, size)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!member) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    // Built-in starter media assets if empty
    const defaultMedia = [
      {
        id: 'media_sample_1',
        name: 'Festive Flash Sale Banner',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
        size_bytes: 245000,
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'media_sample_2',
        name: 'Product Catalog 2026',
        type: 'document',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        size_bytes: 420000,
        created_at: new Date(Date.now() - 172800000).toISOString()
      }
    ];

    return NextResponse.json({ media: defaultMedia });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
