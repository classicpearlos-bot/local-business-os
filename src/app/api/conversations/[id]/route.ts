import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function resolveUserOrgId(userId: string): Promise<string | null> {
  const { data: mem } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return mem?.organization_id || null;
}

/**
 * GET /api/conversations/[id] - Get single conversation details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: conversation, error } = await supabaseAdmin
      .from('conversations')
      .select('*, contacts(*), conversation_labels(chat_labels(*))')
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .single();

    if (error || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/conversations/[id] - Update conversation status and/or assigned_to
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { status, assigned_to, priority } = body;

    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (status !== undefined) {
      const validStatuses = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];
      const normalizedStatus = String(status).toUpperCase();
      if (!validStatuses.includes(normalizedStatus)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      updates.status = normalizedStatus;
    }

    if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to || null;
    }

    if (priority !== undefined) {
      updates.priority = priority;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .select('*, contacts(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation: updated });
  } catch (err: any) {
    console.error('Conversation update error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
