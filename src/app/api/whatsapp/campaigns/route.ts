import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';

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
      contact_ids
    } = payload;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
    }

    const recipientIds = Array.isArray(contact_ids) ? contact_ids : [];

    // Get current org
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    const { data: orgs } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1);
    if (!orgs || orgs.length === 0) return new NextResponse('Forbidden', { status: 403 });
    const orgId = orgs[0].organization_id;

    // 1. Create Campaign
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .insert({
        organization_id: orgId,
        name,
        description,
        template_name,
        template_language,
        template_components,
        status: scheduled_at ? 'SCHEDULED' : 'QUEUED',
        scheduled_at: scheduled_at || new Date().toISOString(),
        total_recipients: recipientIds.length,
        created_by: user.id
      })
      .select('id')
      .single();

    if (campError || !campaign) throw new Error(campError?.message || 'Failed to create campaign');

    // 2. Fetch contacts to get phone numbers - ONLY opted-in contacts
    // Critical: Never broadcast to opted-out contacts (legal compliance + WhatsApp policy)
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, phone_number')
      .eq('organization_id', orgId)
      .eq('opted_in', true)
      .in('id', contact_ids);

    if (contacts && contacts.length > 0) {
      // 3. Create Campaign Recipients
      const recipients = contacts.map(c => ({
        organization_id: orgId,
        campaign_id: campaign.id,
        contact_id: c.id,
        phone_number: c.phone_number,
        status: scheduled_at ? 'SCHEDULED' : 'PENDING',
        scheduled_at: scheduled_at || new Date().toISOString()
      }));

      const { error: recipError } = await supabase.from('campaign_recipients').insert(recipients);
      if (recipError) throw new Error(recipError.message);
    }

    return NextResponse.json({ success: true, campaign_id: campaign.id });

  } catch (err: any) {
    console.error('Campaign Creation Error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
