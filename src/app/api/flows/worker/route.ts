import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { FlowExecutionEngine } from '@/lib/flows/engine';
import { getOrganizationFlows } from '@/lib/flows/service';
import { FlowExecution } from '@/lib/flows/types';

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();
    
    // Query flow executions waiting for scheduled resumption
    const { data: waitingExecs, error } = await supabaseAdmin
      .from('flow_executions')
      .select('id, organization_id')
      .eq('status', 'WAITING')
      .lte('resume_at', now)
      .limit(50);

    if (error) throw error;

    let resumedCount = 0;
    if (waitingExecs && waitingExecs.length > 0) {
      for (const exec of waitingExecs) {
        // Kick off resume asynchronously so worker doesn't time out
        FlowExecutionEngine.resume(exec.id, exec.organization_id).catch(e => console.error('Resume error:', e));
        resumedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now,
      resumed_executions: resumedCount
    });
  } catch (error: any) {
    console.error('Flow worker error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
