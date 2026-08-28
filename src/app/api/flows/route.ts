import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getOrganizationFlows, DEFAULT_SALON_FLOWS } from '@/lib/flows/service';

import { FlowExecution } from '@/lib/flows/types';

async function resolveUserOrgId(userId: string): Promise<string | null> {
  const { data: mem } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return mem?.organization_id || null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const flows = await getOrganizationFlows(orgId);
    return NextResponse.json({ flows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { action, flow_id, definition, contact_id } = body;

    // Test execution simulation
    if (action === 'execute' && definition && contact_id) {
      // In a real scenario we'd use FlowExecutionEngine.start(), but since this is just a stateless test in the UI, we return a mock execution.
      const initialExecution = {
        id: `exec_${Date.now()}`,
        organization_id: orgId,
        flow_id: flow_id || 'test_flow',
        contact_id,
        status: 'COMPLETED',
        current_node_id: '',
        variables: {},
        steps: definition.nodes.map((n: any) => ({
           id: 'step_1',
           node_id: n.id,
           node_type: n.data.node_type,
           status: 'SUCCESS',
           executed_at: new Date().toISOString()
        })),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      };

      return NextResponse.json({ success: true, execution: initialExecution });
    }

    // Save Flow
    if (action === 'save' && body.flow) {
      const { saveFlow } = await import('@/lib/flows/service');
      const saved = await saveFlow(orgId, body.flow);
      return NextResponse.json({ success: true, flow: saved });
    }

    return NextResponse.json({ success: true, message: 'Action not supported' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
