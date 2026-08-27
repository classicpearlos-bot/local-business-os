import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface CampaignROIMetrics {
  campaign_id: string;
  campaign_name: string;
  template_name: string;
  total_recipients: number;
  delivered: number;
  read: number;
  failed: number;
  replies_count: number;
  bookings_count: number;
  attributed_revenue: number;
  conversion_rate_pct: number;
  delivery_rate_pct: number;
  read_rate_pct: number;
}

/**
 * Compute real Campaign Revenue ROI & Conversion Attribution
 */
export async function getCampaignROIAttribution(orgId: string): Promise<CampaignROIMetrics[]> {
  const { data: campaigns } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, template_name, total_recipients, total_sent, total_delivered, total_read, total_failed, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10);

  const results: CampaignROIMetrics[] = [];

  for (const c of (campaigns || [])) {
    // 1. Get recipients for this campaign
    const { data: recipients } = await supabaseAdmin
      .from('campaign_recipients')
      .select('contact_id, status')
      .eq('campaign_id', c.id);

    const contactIds = (recipients || []).map(r => r.contact_id).filter(Boolean);

    // 2. Count replies in inbox from these recipients
    let repliesCount = 0;
    if (contactIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('direction', 'INBOUND')
        .in('contact_id', contactIds.slice(0, 100)); // Sample chunk
      repliesCount = count || 0;
    }

    // 3. Count bookings from contacts attributes
    const { data: matchedContacts } = await supabaseAdmin
      .from('contacts')
      .select('attributes')
      .in('id', contactIds.slice(0, 100));

    let bookingsCount = 0;
    let attributedRevenue = 0;

    (matchedContacts || []).forEach(contact => {
      const apts = (contact.attributes as any)?.appointments;
      if (Array.isArray(apts)) {
        bookingsCount += apts.length;
        apts.forEach((apt: any) => {
          attributedRevenue += Number(apt.service_price) || 0;
        });
      }
    });

    const totalRecip = c.total_recipients || recipients?.length || 1;
    const delivered = c.total_delivered || recipients?.filter(r => ['DELIVERED', 'READ'].includes(r.status)).length || 0;
    const read = c.total_read || recipients?.filter(r => r.status === 'READ').length || 0;
    const failed = c.total_failed || recipients?.filter(r => r.status === 'FAILED').length || 0;

    results.push({
      campaign_id: c.id,
      campaign_name: c.name,
      template_name: c.template_name || 'weekday_offer',
      total_recipients: totalRecip,
      delivered,
      read,
      failed,
      replies_count: repliesCount,
      bookings_count: bookingsCount,
      attributed_revenue: attributedRevenue,
      conversion_rate_pct: totalRecip > 0 ? Math.round((bookingsCount / totalRecip) * 100) : 0,
      delivery_rate_pct: totalRecip > 0 ? Math.round((delivered / totalRecip) * 100) : 0,
      read_rate_pct: delivered > 0 ? Math.round((read / delivered) * 100) : 0
    });
  }

  return results;
}
