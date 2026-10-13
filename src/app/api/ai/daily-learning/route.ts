import { NextResponse } from 'next/server';
import { runDailySalonLearning, getActiveLearnedPlaybook } from '@/lib/automations/learningEngine';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const triggerNow = searchParams.get('run') === 'true';

    if (triggerNow) {
      const insight = await runDailySalonLearning();
      return NextResponse.json({
        success: true,
        action: 'RUN_LEARNING_CYCLE',
        data: insight
      });
    }

    const currentPlaybook = getActiveLearnedPlaybook();
    return NextResponse.json({
      success: true,
      action: 'GET_ACTIVE_PLAYBOOK',
      data: currentPlaybook
    });
  } catch (error: any) {
    console.error('Daily learning route error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const insight = await runDailySalonLearning();
    return NextResponse.json({
      success: true,
      action: 'RUN_LEARNING_CYCLE',
      data: insight
    });
  } catch (error: any) {
    console.error('Daily learning execution error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
