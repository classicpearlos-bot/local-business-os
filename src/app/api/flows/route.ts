import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getOrganizationFlows, saveFlow, deleteFlow } from '@/lib/flows/service';

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
    console.error('GET /api/flows error:', error);
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
    const { action } = body;

    // Save Flow (create or update)
    if (action === 'save' && body.flow) {
      const saved = await saveFlow(orgId, body.flow);
      if (!saved) {
        return NextResponse.json({ error: 'Failed to save flow to database' }, { status: 500 });
      }
      return NextResponse.json({ success: true, flow: saved });
    }

    // Delete Flow
    if (action === 'delete' && body.flow_id) {
      const ok = await deleteFlow(orgId, body.flow_id);
      if (!ok) return NextResponse.json({ error: 'Failed to delete flow' }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/flows error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
