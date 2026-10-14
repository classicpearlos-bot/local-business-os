import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { filterOutBlockedNumbers } from '@/lib/contacts/blockedContacts';

async function resolveUserOrgId(userId: string): Promise<string | null> {
  const { data: mem } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return mem?.organization_id || null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const payload = await request.json();

    const {
      name,
      description,
      template_name,
      template_language,
      template_components,
      scheduled_at,
      contact_ids,
      audience_type
    } = payload;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    const orgId = await resolveUserOrgId(user.id);
    if (!orgId) return new NextResponse('Forbidden', { status: 403 });

    let recipientIds = Array.isArray(contact_ids) ? contact_ids : [];

    // CRITICAL FIX: The UI cannot fetch CRM contact IDs reliably due to RLS.
    // If the user selected 'crm', the server must fetch all opted-in CRM contact IDs natively using admin rights.
    if (audience_type === 'crm') {
      const { data: crmContacts } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('organization_id', orgId)
        .eq('opted_in', true);
        
      if (crmContacts) {
        recipientIds = crmContacts.map(c => c.id);
      }
    }

    // Only treat as future-scheduled if scheduled_at is > 60 seconds in the future.
    // Otherwise dispatch immediately as PENDING so the worker claims it right away.
    const nowMs = Date.now();
    const scheduledMs = scheduled_at ? new Date(scheduled_at).getTime() : nowMs;
    const isFutureSchedule = !isNaN(scheduledMs) && scheduledMs > nowMs + 60_000;
    const effectiveScheduledAt = !isNaN(scheduledMs) ? new Date(scheduledMs).toISOString() : new Date(nowMs).toISOString();

    const { data: campaign, error: campError } = await supabaseAdmin
      .from('campaigns')
      .insert({
        organization_id: orgId,
        name,
        description,
        template_name,
        template_language,
        template_components,
        status: isFutureSchedule ? 'SCHEDULED' : 'QUEUED',
        scheduled_at: effectiveScheduledAt,
        total_recipients: recipientIds.length,
        created_by: user.id
      })
      .select('id')
      .single();

    if (campError || !campaign) throw new Error(campError?.message || 'Failed to create campaign');

    // Batch fetch contacts to avoid URL Too Long
    let contacts: any[] = [];
    for (let i = 0; i < recipientIds.length; i += 100) {
      const batch = recipientIds.slice(i, i + 100);
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('id, phone_number, attributes')
        .eq('organization_id', orgId)
        .eq('opted_in', true)
        .in('id', batch);
      if (data) contacts.push(...data);
    }

    // Exclude any blocked contacts (both by attributes and matching blocked phone list)
    if (contacts.length > 0) {
      contacts = contacts.filter(c => c.attributes?.is_blocked !== true);
      const { allowed } = await filterOutBlockedNumbers(contacts.map(c => c.phone_number), orgId);
      const allowedSet = new Set(allowed);
      contacts = contacts.filter(c => allowedSet.has(c.phone_number));
    }

    if (contacts && contacts.length > 0) {
      // Create recipients in batches to be safe
      const recipients = contacts.map(c => ({
        organization_id: orgId,
        campaign_id: campaign.id,
        contact_id: c.id,
        phone_number: c.phone_number,
        status: isFutureSchedule ? 'SCHEDULED' : 'PENDING',
        scheduled_at: effectiveScheduledAt
      }));

      for (let i = 0; i < recipients.length; i += 500) {
        const batch = recipients.slice(i, i + 500);
        await supabaseAdmin.from('campaign_recipients').insert(batch);
      }
    }

    // Trigger worker asynchronously to immediately start processing
    const origin = request.headers.get('origin') || new URL(request.url).origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${origin}/api/whatsapp/campaigns/worker`, {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'x-ui-bypass': 'true'
      }
    }).catch(() => {});

    return NextResponse.json({ success: true, campaign_id: campaign.id });

  } catch (err: any) {
    console.error('Campaign Creation Error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
