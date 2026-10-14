import { NextRequest, NextResponse } from 'next/server';
import { processDueFollowups, calculateSafeFollowupTime } from '@/lib/automations/followupService';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Background worker endpoint for processing due customer follow-ups
 * Enforces all 6 Anti-Annoyance Guardrails:
 * 1. Strict Frequency Cap (Max 1 check-in per inquiry cycle)
 * 2. IST Quiet Hours Blackout (8:30 PM to 10:00 AM IST)
 * 3. Meta 24-Hour Service Window Compliance
 * 4. Activity Invalidation (cancelled if customer sent any message)
 * 5. Opt-Out & Stop Respect
 * 6. Interactive WhatsApp Buttons ([ 🚗 Planning to Come ], [ ✅ Already Visited ], [ 📅 Another Time ])
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const stats = await processDueFollowups(limit);

    return NextResponse.json({
      success: true,
      message: 'Autonomous follow-up worker completed successfully',
      stats,
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
    const { action, sampleDate, delayHours = 3.5, limit = 20 } = body;

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
    const stats = await processDueFollowups(limit);

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
