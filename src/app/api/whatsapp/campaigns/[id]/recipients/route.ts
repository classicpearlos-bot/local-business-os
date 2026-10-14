import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  calculateDailyLimitReset,
  encodeDailyLimitDescription,
  parseDailyLimitDescription,
  formatISTTime
} from '@/lib/meta/dailyLimitResume';

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
        (campaign.total_recipients !== totalCount ||
          campaign.total_sent !== sentCount ||
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

    // 6. Parse and enrich Daily Limit Auto-Resume metadata
    const parsedDailyLimit = parseDailyLimitDescription(campaign.description);
    let dailyLimitDetails = null;

    if (parsedDailyLimit.isDailyLimitPaused || campaign.status === 'SCHEDULED' || campaign.description?.includes('daily limit')) {
      const referenceTime = parsedDailyLimit.hitAt || campaign.started_at || campaign.completed_at || campaign.created_at;
      const calcWindow = calculateDailyLimitReset(referenceTime);
      const scheduledTarget = campaign.scheduled_at || calcWindow.resumeAt;
      const targetCalc = calculateDailyLimitReset(new Date(new Date(scheduledTarget).getTime() - 24 * 60 * 60 * 1000));

      const heldBackInDb = enrichedRecipients.filter((r: any) =>
        r.error_code === 'DAILY_LIMIT_REACHED' ||
        (r.status === 'SCHEDULED' && r.scheduled_at) ||
        (r.error_message && r.error_message.includes('daily limit'))
      ).length;

      dailyLimitDetails = {
        isDailyLimitPaused: true,
        hitAt: referenceTime,
        resumeAt: scheduledTarget,
        displayStopped: formatISTTime(referenceTime),
        displayResume: formatISTTime(scheduledTarget),
        heldBackCount: heldBackInDb || parsedDailyLimit.heldBackCount,
        sentTotal: campaign.total_sent || parsedDailyLimit.sentTotal || 0,
        formattedCountdown: targetCalc.formattedCountdown,
        isDue: targetCalc.isDue,
        hoursRemaining: targetCalc.hoursRemaining,
        minutesRemaining: targetCalc.minutesRemaining
      };
    }

    return NextResponse.json({
      campaign,
      template: template || null,
      recipients: enrichedRecipients,
      daily_limit_details: dailyLimitDetails
    });
  } catch (err: any) {
    console.error('Error loading campaign report:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Resume, schedule auto-resume, or retry failed recipients for this campaign
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

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is treated as standard resume now
    }

    const action = body.action || 'RESUME_NOW';

    // 1. Action: SCHEDULE_AUTO_RESUME (Schedule hold to resume automatically tomorrow at target time)
    if (action === 'SCHEDULE_AUTO_RESUME') {
      const targetResumeAt = body.resume_at || calculateDailyLimitReset(nowIso).resumeAt;
      const stoppedAt = body.stopped_at || nowIso;

      // Update remaining recipients to SCHEDULED
      const { data: scheduledRecips, error: recipErr } = await supabaseAdmin
        .from('campaign_recipients')
        .update({
          status: 'SCHEDULED',
          scheduled_at: targetResumeAt,
          next_retry_at: null,
          error_code: 'DAILY_LIMIT_REACHED',
          error_message: `Paused by Meta 24-hr daily limit. Auto-resumes ${formatISTTime(targetResumeAt)}.`
        })
        .eq('campaign_id', campaignId)
        .in('status', ['FAILED', 'SCHEDULED', 'PENDING'])
        .select('id');

      if (recipErr) {
        return NextResponse.json({ error: recipErr.message }, { status: 500 });
      }

      // Fetch campaign to preserve title and sent totals
      const { data: camp } = await supabaseAdmin
        .from('campaigns')
        .select('description, total_sent')
        .eq('id', campaignId)
        .single();

      const heldCount = scheduledRecips?.length || 0;
      const newDesc = encodeDailyLimitDescription(camp?.description, stoppedAt, targetResumeAt, heldCount, camp?.total_sent || 0);

      await supabaseAdmin
        .from('campaigns')
        .update({
          status: 'SCHEDULED',
          scheduled_at: targetResumeAt,
          description: newDesc,
          updated_at: nowIso
        })
        .eq('id', campaignId);

      return NextResponse.json({
        success: true,
        scheduled: true,
        resume_at: targetResumeAt,
        display_resume: formatISTTime(targetResumeAt),
        held_back_count: heldCount
      });
    }

    // 2. Action: CANCEL_AUTO_RESUME (User stops the auto-resume and leaves campaign finished)
    if (action === 'CANCEL_AUTO_RESUME') {
      const { data: camp } = await supabaseAdmin
        .from('campaigns')
        .select('description')
        .eq('id', campaignId)
        .single();

      const cleanDesc = (camp?.description || '')
        .replace(/\s*•\s*\[DAILY_LIMIT_PAUSED:.*?\]/g, '')
        .trim();

      await supabaseAdmin
        .from('campaigns')
        .update({
          status: 'COMPLETED',
          scheduled_at: null,
          description: cleanDesc ? `${cleanDesc} • [Auto-resume cancelled by user]` : '[Auto-resume cancelled by user]',
          updated_at: nowIso
        })
        .eq('id', campaignId);

      await supabaseAdmin
        .from('campaign_recipients')
        .update({
          status: 'FAILED',
          error_message: 'Hold cancelled: Auto-resume was cancelled by admin.'
        })
        .eq('campaign_id', campaignId)
        .eq('status', 'SCHEDULED');

      return NextResponse.json({ success: true, cancelled: true });
    }

    // 3. Action: RESUME_NOW (Immediate dispatch override)
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

    const { data: camp } = await supabaseAdmin
      .from('campaigns')
      .select('description')
      .eq('id', campaignId)
      .single();

    const cleanDesc = (camp?.description || '')
      .replace(/\s*•\s*\[DAILY_LIMIT_PAUSED:.*?\]/g, '')
      .trim();

    await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'PROCESSING',
        scheduled_at: null,
        description: cleanDesc,
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
