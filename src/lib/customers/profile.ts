import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface Customer360Profile {
  id: string;
  organization_id: string;
  name: string;
  phone_number: string;
  opted_in: boolean;
  created_at: string;
  tags: string[];
  custom_fields: Record<string, any>;
  rfm_segment: 'NEW' | 'ACTIVE' | 'SLIPPING_AWAY' | 'LOST' | 'VIP';
  metrics: {
    first_visit: string | null;
    last_visit: string | null;
    days_since_visit: number | null;
    total_visits: number;
    lifetime_spend: number;
    average_bill: number;
    favorite_service: string;
    preferred_staff: string;
    membership_tier: string;
    reward_balance: number;
  };
  timeline: Array<{
    id: string;
    type: 'MESSAGE_INBOUND' | 'MESSAGE_OUTBOUND' | 'CAMPAIGN_RECEIVED' | 'OPT_IN_CHANGE' | 'NOTE';
    title: string;
    description: string;
    timestamp: string;
    status?: string;
    metadata?: any;
  }>;
}

/**
 * Build rich Customer 360 Profile
 */
export async function getCustomer360Profile(orgId: string, contactId: string): Promise<Customer360Profile> {
  // 1. Fetch Contact
  const { data: contact, error: contactError } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .eq('organization_id', orgId)
    .single();

  if (contactError || !contact) throw new Error('Customer not found');

  const attrs = (contact.attributes as any) || {};
  const tags: string[] = Array.isArray(attrs.tags) ? attrs.tags : [];
  const customFields: Record<string, any> = attrs.custom_fields || {};

  // 2. Fetch Conversation & Messages in parallel
  const [messagesRes, campaignsRes] = await Promise.all([
    supabaseAdmin
      .from('messages')
      .select('id, direction, type, content, status, created_at')
      .eq('contact_id', contactId)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabaseAdmin
      .from('campaign_recipients')
      .select('id, campaign_id, status, error_message, sent_at, created_at, campaigns(name, template_name)')
      .eq('contact_id', contactId)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)
  ]);

  // 3. Compute RFM & Salon Metrics
  const lastVisitDate = customFields.last_visit ? new Date(customFields.last_visit) : null;
  const daysSinceVisit = lastVisitDate 
    ? Math.max(0, Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const totalVisits = Number(customFields.total_visits) || (messagesRes.data && messagesRes.data.length > 0 ? 1 : 0);
  const lifetimeSpend = Number(customFields.lifetime_spend) || 0;
  const averageBill = totalVisits > 0 ? Math.round(lifetimeSpend / totalVisits) : 0;

  // Determine RFM Segment
  let rfmSegment: 'NEW' | 'ACTIVE' | 'SLIPPING_AWAY' | 'LOST' | 'VIP' = 'NEW';
  if (lifetimeSpend >= 5000 || tags.includes('VIP')) {
    rfmSegment = 'VIP';
  } else if (daysSinceVisit !== null && daysSinceVisit > 90) {
    rfmSegment = 'LOST';
  } else if (daysSinceVisit !== null && daysSinceVisit >= 45) {
    rfmSegment = 'SLIPPING_AWAY';
  } else if (totalVisits > 0) {
    rfmSegment = 'ACTIVE';
  }

  // 4. Construct Unified Activity Timeline
  const timeline: Customer360Profile['timeline'] = [];

  (messagesRes.data || []).forEach(m => {
    const textBody = m.content?.text?.body || m.content?.template?.name || `[${m.type} message]`;
    timeline.push({
      id: `msg_${m.id}`,
      type: m.direction === 'INBOUND' ? 'MESSAGE_INBOUND' : 'MESSAGE_OUTBOUND',
      title: m.direction === 'INBOUND' ? 'Customer Replied' : 'Outbound Message Sent',
      description: textBody,
      timestamp: m.created_at,
      status: m.status,
      metadata: m.content
    });
  });

  (campaignsRes.data || []).forEach((c: any) => {
    const campaignName = c.campaigns?.name || 'Broadcast Campaign';
    timeline.push({
      id: `camp_${c.id}`,
      type: 'CAMPAIGN_RECEIVED',
      title: `Broadcast: ${campaignName}`,
      description: `Template: ${c.campaigns?.template_name || 'weekday_offer'} • Status: ${c.status}${c.error_message ? ` (${c.error_message})` : ''}`,
      timestamp: c.sent_at || c.created_at,
      status: c.status
    });
  });

  // Sort timeline chronologically descending
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    id: contact.id,
    organization_id: contact.organization_id,
    name: contact.name || 'Valued Customer',
    phone_number: contact.phone_number,
    opted_in: contact.opted_in ?? true,
    created_at: contact.created_at,
    tags,
    custom_fields: customFields,
    rfm_segment: rfmSegment,
    metrics: {
      first_visit: customFields.first_visit || contact.created_at,
      last_visit: customFields.last_visit || null,
      days_since_visit: daysSinceVisit,
      total_visits: totalVisits,
      lifetime_spend: lifetimeSpend,
      average_bill: averageBill,
      favorite_service: customFields.favorite_service || 'Hair Spa / Facial',
      preferred_staff: customFields.preferred_stylist || 'Any Stylist',
      membership_tier: customFields.membership_level || 'Standard',
      reward_balance: Number(customFields.reward_balance) || 100
    },
    timeline
  };
}
