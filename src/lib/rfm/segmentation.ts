import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface RFMSegmentSummary {
  vip_count: number;
  active_count: number;
  slipping_away_count: number;
  lost_count: number;
  new_count: number;
  birthday_upcoming_count: number;
  total_contacts: number;
}

export interface RFMContact {
  id: string;
  name: string;
  phone_number: string;
  segment: 'VIP' | 'ACTIVE' | 'SLIPPING_AWAY' | 'LOST' | 'NEW';
  days_since_visit: number | null;
  lifetime_spend: number;
  total_visits: number;
  tags: string[];
  opted_in: boolean;
}

/**
 * Calculate RFM Segment for a single contact
 */
export function calculateContactRFM(contact: any): { segment: 'VIP' | 'ACTIVE' | 'SLIPPING_AWAY' | 'LOST' | 'NEW'; daysSinceVisit: number | null; lifetimeSpend: number; totalVisits: number } {
  const attrs = (contact.attributes as any) || {};
  const tags: string[] = Array.isArray(attrs.tags) ? attrs.tags : [];
  const customFields = attrs.custom_fields || {};

  const lastVisitStr = customFields.last_visit;
  const lastVisitDate = lastVisitStr ? new Date(lastVisitStr) : null;
  const daysSinceVisit = lastVisitDate && !isNaN(lastVisitDate.getTime())
    ? Math.max(0, Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const totalVisits = Number(customFields.total_visits) || (daysSinceVisit !== null ? 1 : 0);
  const lifetimeSpend = Number(customFields.lifetime_spend) || 0;

  let segment: 'VIP' | 'ACTIVE' | 'SLIPPING_AWAY' | 'LOST' | 'NEW' = 'NEW';

  if (lifetimeSpend >= 5000 || totalVisits >= 5 || tags.includes('VIP')) {
    segment = 'VIP';
  } else if (daysSinceVisit !== null && daysSinceVisit > 90) {
    segment = 'LOST';
  } else if (daysSinceVisit !== null && daysSinceVisit >= 45) {
    segment = 'SLIPPING_AWAY';
  } else if (daysSinceVisit !== null && daysSinceVisit < 45) {
    segment = 'ACTIVE';
  } else if (totalVisits > 0) {
    segment = 'ACTIVE';
  }

  return { segment, daysSinceVisit, lifetimeSpend, totalVisits };
}

/**
 * Get RFM Segmentation Breakdown & Counts across the entire organization
 */
export async function getRFMSegmentationSummary(orgId: string): Promise<RFMSegmentSummary> {
  const { data: contacts, error } = await supabaseAdmin
    .from('contacts')
    .select('id, attributes, created_at')
    .eq('organization_id', orgId);

  if (error) throw error;

  let vip_count = 0;
  let active_count = 0;
  let slipping_away_count = 0;
  let lost_count = 0;
  let new_count = 0;
  let birthday_upcoming_count = 0;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  (contacts || []).forEach(c => {
    const { segment } = calculateContactRFM(c);

    if (segment === 'VIP') vip_count++;
    else if (segment === 'SLIPPING_AWAY') slipping_away_count++;
    else if (segment === 'LOST') lost_count++;
    else if (segment === 'ACTIVE') active_count++;
    else new_count++;

    // Check birthday in next 7 days
    const bdayStr = (c.attributes as any)?.custom_fields?.birthday;
    if (bdayStr) {
      const bday = new Date(bdayStr);
      if (!isNaN(bday.getTime())) {
        const diffDays = Math.abs((bday.getMonth() - currentMonth) * 30 + (bday.getDate() - currentDay));
        if (diffDays <= 7) birthday_upcoming_count++;
      }
    }
  });

  return {
    vip_count,
    active_count,
    slipping_away_count,
    lost_count,
    new_count,
    birthday_upcoming_count,
    total_contacts: contacts?.length || 0
  };
}

/**
 * Run Automated RFM Tag Sync on Database
 */
export async function syncRFMTagsAcrossOrganization(orgId: string) {
  const { data: contacts, error } = await supabaseAdmin
    .from('contacts')
    .select('id, attributes')
    .eq('organization_id', orgId);

  if (error) throw error;

  let updatedCount = 0;

  for (const c of (contacts || [])) {
    const attrs = (c.attributes as any) || {};
    const currentTags: string[] = Array.isArray(attrs.tags) ? attrs.tags : [];
    const { segment } = calculateContactRFM(c);

    // Manage RFM tags
    const rfmTagMap: Record<string, string> = {
      VIP: 'VIP',
      SLIPPING_AWAY: 'Slipping Away',
      LOST: 'Lost Client',
      ACTIVE: 'Active Client',
      NEW: 'New Client'
    };

    const targetTag = rfmTagMap[segment];
    const otherRFMTags = Object.values(rfmTagMap).filter(t => t !== targetTag && t !== 'VIP');

    // Clean old RFM tags and add current tag
    let updatedTags = currentTags.filter(t => !otherRFMTags.includes(t));
    if (targetTag && !updatedTags.includes(targetTag)) {
      updatedTags.push(targetTag);
    }

    if (JSON.stringify(currentTags) !== JSON.stringify(updatedTags) || attrs.rfm_segment !== segment) {
      await supabaseAdmin
        .from('contacts')
        .update({
          attributes: {
            ...attrs,
            tags: updatedTags,
            rfm_segment: segment
          }
        })
        .eq('id', c.id);
      updatedCount++;
    }
  }

  return { success: true, updatedCount };
}
