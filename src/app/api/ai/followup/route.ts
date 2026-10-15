import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { processDueFollowups, calculateSafeFollowupTime } from '@/lib/automations/followupService';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Background worker endpoint for managing and processing due customer follow-ups
 * Enforces all 6 Anti-Annoyance Guardrails:
 * 1. Strict Frequency Cap (Max 1 check-in per inquiry cycle)
 * 2. IST Quiet Hours Blackout (8:30 PM to 10:00 AM IST)
 * 3. Meta 24-Hour Service Window Compliance
 * 4. Activity Invalidation (cancelled if customer sent any message)
 * 5. Opt-Out & Block Respect
 * 6. Interactive WhatsApp Buttons
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const forceNow = searchParams.get('force') === 'true';
    const action = searchParams.get('action') || 'process';

    // 1. Process due follow-ups
    const stats = await processDueFollowups(limit, { forceNow });

    // 2. Fetch inquiry pipeline for real-time visibility in dashboard
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('id, name, phone_number, attributes, opted_in, created_at')
      .not('attributes->last_inquiry', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    const pipeline = (contacts || []).map((c: any) => {
      const inquiry = c.attributes?.last_inquiry || {};
      const inquiredTime = inquiry.inquired_at ? new Date(inquiry.inquired_at).getTime() : 0;
      const elapsedHours = (Date.now() - inquiredTime) / (1000 * 3600);
      const remainingMetaHours = Math.max(0, 24 - elapsedHours);

      return {
        id: c.id,
        name: c.name || 'Valued Client',
        phone_number: c.phone_number,
        is_blocked: c.attributes?.is_blocked || false,
        opted_in: c.opted_in,
        inquiry_type: inquiry.inquiry_type || 'SERVICE',
        service: inquiry.service,
        inquired_at: inquiry.inquired_at,
        followup_status: inquiry.followup_status,
        followup_due_at: inquiry.followup_due_at,
        followup_count: inquiry.followup_count || 0,
        followup_sent_at: inquiry.followup_sent_at,
        elapsed_hours: Math.round(elapsedHours * 10) / 10,
        remaining_meta_hours: Math.round(remainingMetaHours * 10) / 10,
        is_within_24h: remainingMetaHours > 0
      };
    });

    return NextResponse.json({
      success: true,
      stats,
      pipeline,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Follow-up API] Execution error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error processing follow-ups'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, limit = 25, forceNow = false, targetContactId, sampleDate, delayHours = 2.5 } = body;

    // Diagnostic quiet-hours math simulator
    if (action === 'test_quiet_hours') {
      const inputDate = sampleDate ? new Date(sampleDate) : new Date();
      const safeTime = calculateSafeFollowupTime(inputDate, delayHours);
      
      const istInput = new Date(inputDate.getTime() + 5.5 * 3600 * 1000).toISOString().replace('Z', ' IST');
      const istSafe = new Date(safeTime.getTime() + 5.5 * 3600 * 1000).toISOString().replace('Z', ' IST');

      return NextResponse.json({
        success: true,
        action: 'TEST_QUIET_HOURS',
        input: {
          utc: inputDate.toISOString(),
          ist: istInput,
          delayHours
        },
        result: {
          utc: safeTime.toISOString(),
          ist: istSafe,
          isDeferredToMorning: safeTime.getTime() - inputDate.getTime() > (delayHours + 1) * 3600 * 1000
        }
      });
    }

    // Default POST executes the follow-up worker
    const stats = await processDueFollowups(limit, { forceNow, targetContactId });

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Follow-up API] POST Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error executing follow-up action'
    }, { status: 500 });
  }
}
