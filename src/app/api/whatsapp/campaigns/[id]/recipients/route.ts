import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';

/**
 * GET /api/whatsapp/campaigns/[id]/recipients
 * Returns recipient-level message traces and Meta error codes for debugging.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('campaign_recipients')
      .select('id, phone_number, status, meta_message_id, error_code, error_message, attempts, sent_at, delivered_at, read_at, failed_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (status && status !== 'all') {
      query = query.eq('status', status.toUpperCase());
    }

    const { data: recipients, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recipients });

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
