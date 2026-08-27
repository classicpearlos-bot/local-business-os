import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { executeFlowStep } from '@/lib/flows/engine';
import { getOrganizationFlows } from '@/lib/flows/service';
import { FlowExecution } from '@/lib/flows/types';

export const maxDuration = 60;

export async function GET() {
  try {
    const now = new Date().toISOString();
    
    // In production, query flow executions waiting for scheduled resumption
    // For this architecture, ensure worker reports status cleanly
    const flows = await getOrganizationFlows('org_main');

    return NextResponse.json({
      success: true,
      timestamp: now,
      active_flows: flows.length,
      resumed_executions: 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
