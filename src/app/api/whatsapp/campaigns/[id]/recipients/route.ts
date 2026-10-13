import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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
    const statusFilter = searchParams.get('status');

    // 1. Fetch campaign details via supabaseAdmin
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle();

    if (campErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // 2. Fetch template details
    const { data: template } = await supabaseAdmin
      .from('message_templates')
      .select('id, name, category, language, status, components')
      .eq('organization_id', campaign.organization_id)
      .eq('name', campaign.template_name)
      .maybeSingle();

    // 3. Fetch all recipients for this campaign via supabaseAdmin
    let query = supabaseAdmin
      .from('campaign_recipients')
      .select('id, contact_id, phone_number, status, meta_message_id, error_code, error_message, attempts, scheduled_at, processing_at, last_attempt_at, sent_at, delivered_at, read_at, failed_at, created_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })
      .limit(10000);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter.toUpperCase());
    }

    const { data: rawRecipients, error: recErr } = await query;
    if (recErr) {
      return NextResponse.json({ error: recErr.message }, { status: 500 });
    }

    const recipientsList = rawRecipients || [];

    // 4. Batch fetch contact names for all contact_ids
    const contactIds = Array.from(new Set(recipientsList.map((r: any) => r.contact_id).filter(Boolean)));
    const contactNameMap = new Map<string, { name: string; opted_in: boolean }>();

    for (let i = 0; i < contactIds.length; i += 200) {
      const batchIds = contactIds.slice(i, i + 200);
      const { data: contacts } = await supabaseAdmin
        .from('contacts')
        .select('id, name, phone_number, opted_in')
        .in('id', batchIds);
      (contacts || []).forEach((c: any) => {
        contactNameMap.set(c.id, {
          name: c.name || 'Valued Client',
          opted_in: c.opted_in !== false
        });
      });
    }

    const enrichedRecipients = recipientsList.map((r: any) => {
      const cInfo = r.contact_id ? contactNameMap.get(r.contact_id) : undefined;
      return {
        ...r,
        contact_name: cInfo?.name || 'Client',
        contact_opted_in: cInfo?.opted_in ?? true
      };
    });

    // 5. Sync campaign aggregate counters if needed
    if (!statusFilter || statusFilter === 'all') {
      const totalCount = enrichedRecipients.length;
      const sentCount = enrichedRecipients.filter((r: any) => ['SENT', 'DELIVERED', 'READ'].includes(r.status)).length;
      const deliveredCount = enrichedRecipients.filter((r: any) => ['DELIVERED', 'READ'].includes(r.status)).length;
      const readCount = enrichedRecipients.filter((r: any) => r.status === 'READ').length;
      const failedCount = enrichedRecipients.filter((r: any) => r.status === 'FAILED').length;

      if (
        totalCount > 0 &&
        (campaign.total_sent !== sentCount ||
          campaign.total_delivered !== deliveredCount ||
          campaign.total_read !== readCount ||
          campaign.total_failed !== failedCount)
      ) {
        await supabaseAdmin
          .from('campaigns')
          .update({
            total_recipients: totalCount,
            total_sent: sentCount,
            total_delivered: deliveredCount,
            total_read: readCount,
            total_failed: failedCount
          })
          .eq('id', campaignId);

        campaign.total_recipients = totalCount;
        campaign.total_sent = sentCount;
        campaign.total_delivered = deliveredCount;
        campaign.total_read = readCount;
        campaign.total_failed = failedCount;
      }
    }

    return NextResponse.json({
      campaign,
      template: template || null,
      recipients: enrichedRecipients
    });
  } catch (err: any) {
    console.error('Error loading campaign report:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Retry failed or unsent recipients for this campaign
export async function POST(
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
    const nowIso = new Date().toISOString();

    // Reset FAILED, SCHEDULED, or stuck PROCESSING recipients back to PENDING
    const { data: resetRows, error } = await supabaseAdmin
      .from('campaign_recipients')
      .update({
        status: 'PENDING',
        scheduled_at: nowIso,
        next_retry_at: null,
        error_code: null,
        error_message: null
      })
      .eq('campaign_id', campaignId)
      .in('status', ['FAILED', 'SCHEDULED', 'PENDING'])
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'PROCESSING',
        updated_at: nowIso
      })
      .eq('id', campaignId);

    // Trigger worker immediately
    const origin = request.headers.get('origin') || new URL(request.url).origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${origin}/api/whatsapp/campaigns/worker`, {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'x-ui-bypass': 'true'
      }
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      requeued: resetRows?.length || 0
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
