import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { calculateContactRFM } from '@/lib/rfm/segmentation';

export interface AudienceCriteria {
  opt_in_only?: boolean;
  rfm_segments?: Array<'VIP' | 'ACTIVE' | 'SLIPPING_AWAY' | 'LOST' | 'NEW'>;
  tags_include?: string[];
  tags_exclude?: string[];
  days_since_visit_min?: number;
  days_since_visit_max?: number;
  lifetime_spend_min?: number;
  birthday_upcoming_days?: number;
}

export interface AudiencePreviewResult {
  matching_count: number;
  excluded_opt_out_count: number;
  total_pool_count: number;
  contact_ids: string[];
  samples: Array<{
    id: string;
    name: string;
    phone_number: string;
    segment: string;
    tags: string[];
    days_since_visit: number | null;
  }>;
}

/**
 * Filter contacts by audience criteria with strict marketing consent enforcement
 */
export async function evaluateAudienceCriteria(
  orgId: string,
  criteria: AudienceCriteria
): Promise<AudiencePreviewResult> {
  const { data: contacts, error } = await supabaseAdmin
    .from('contacts')
    .select('id, name, phone_number, opted_in, attributes, created_at')
    .eq('organization_id', orgId);

  if (error) throw error;

  const allContacts = contacts || [];
  const matchingIds: string[] = [];
  const samples: AudiencePreviewResult['samples'] = [];
  let excludedOptOutCount = 0;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  for (const c of allContacts) {
    // STRICT MARKETING CONSENT: Only explicitly opted_in === true qualify
    const isOptedIn = c.opted_in === true;
    
    // Check opt-in constraint
    if (criteria.opt_in_only !== false && !isOptedIn) {
      excludedOptOutCount++;
      continue;
    }

    const { segment, daysSinceVisit, lifetimeSpend } = calculateContactRFM(c);
    const attrs = (c.attributes as any) || {};
    const tags: string[] = Array.isArray(attrs.tags) ? attrs.tags : [];

    // RFM Segment filter
    if (criteria.rfm_segments && criteria.rfm_segments.length > 0) {
      if (!criteria.rfm_segments.includes(segment)) continue;
    }

    // Tags Include filter (MUST have any included tags)
    if (criteria.tags_include && criteria.tags_include.length > 0) {
      const hasTag = criteria.tags_include.some(t => tags.includes(t));
      if (!hasTag) continue;
    }

    // Tags Exclude filter (MUST NOT have excluded tags)
    if (criteria.tags_exclude && criteria.tags_exclude.length > 0) {
      const hasExcludedTag = criteria.tags_exclude.some(t => tags.includes(t));
      if (hasExcludedTag) continue;
    }

    // Days Since Visit Min
    if (criteria.days_since_visit_min !== undefined) {
      if (daysSinceVisit === null || daysSinceVisit < criteria.days_since_visit_min) continue;
    }

    // Days Since Visit Max
    if (criteria.days_since_visit_max !== undefined) {
      if (daysSinceVisit === null || daysSinceVisit > criteria.days_since_visit_max) continue;
    }

    // Lifetime Spend Min
    if (criteria.lifetime_spend_min !== undefined) {
      if (lifetimeSpend < criteria.lifetime_spend_min) continue;
    }

    // Birthday Upcoming
    if (criteria.birthday_upcoming_days !== undefined) {
      const bdayStr = attrs.custom_fields?.birthday;
      if (!bdayStr) continue;
      const bday = new Date(bdayStr);
      if (isNaN(bday.getTime())) continue;
      const diffDays = Math.abs((bday.getMonth() - currentMonth) * 30 + (bday.getDate() - currentDay));
      if (diffDays > criteria.birthday_upcoming_days) continue;
    }

    // Contact matches all criteria
    matchingIds.push(c.id);

    if (samples.length < 10) {
      samples.push({
        id: c.id,
        name: c.name || 'Unnamed',
        phone_number: c.phone_number,
        segment,
        tags,
        days_since_visit: daysSinceVisit
      });
    }
  }

  return {
    matching_count: matchingIds.length,
    excluded_opt_out_count: excludedOptOutCount,
    total_pool_count: allContacts.length,
    contact_ids: matchingIds,
    samples
  };
}
