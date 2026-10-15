import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizePhoneNumber } from '@/utils/phone';

export interface BlockedContactItem {
  id: string;
  organization_id: string;
  phone_number: string;
  name: string;
  blocked_at: string;
  blocked_reason: string;
  blocked_by: string;
  created_at: string;
}

/**
 * Standardize phone number for matching:
 * Returns the clean digits and the last 10 digits for accurate matching across formats.
 */
export function getPhoneMatchKeys(phone: string): { normalized: string; last10: string } {
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const normalized = digits ? `+${digits.startsWith('91') && digits.length === 12 ? digits : digits.length === 10 ? '91' + digits : digits}` : phone;
  return { normalized, last10 };
}

/**
 * Advanced Intent Analysis: Detects rejection, hostility, stop commands,
 * or disinterest phrases to trigger automatic blocking and quality rating protection.
 */
export function detectOptOutOrHostility(input: string): { isRejected: boolean; reason: string } {
  if (!input) return { isRejected: false, reason: '' };
  const s = input.trim().toLowerCase();

  // 1. Standalone / Exact command triggers
  if (/^(stop|unsubscribe|cancel|optout|opt-out|remove|remove me|end|quit|block|block me|block my number|dnd|pls stop|please stop|leave me)$/i.test(s)) {
    return { isRejected: true, reason: `Customer sent stop command: "${input.trim()}"` };
  }

  // 2. Reject / Not Interested / Don't want
  if (/\b(not interested|not intrested|no interest|not required|don't want|dont want|never contact|not need|dont need|don't need|no need|stop messaging me|stop texting me)\b/i.test(s)) {
    return { isRejected: true, reason: `Customer expressed disinterest: "${input.trim()}"` };
  }

  // 3. Stop messaging / Don't text me
  if (/\b(don't message|dont message|do not message|stop messaging|stop texting|don't text|dont text|do not text|stop sending|please stop|stop it|stop it now|stop bothering|stop disturbing)\b/i.test(s)) {
    return { isRejected: true, reason: `Customer requested to stop messages: "${input.trim()}"` };
  }

  // 4. Block requests
  if (/\b(block me|block my number|please block|block this number|block karo)\b/i.test(s)) {
    return { isRejected: true, reason: `Customer requested block: "${input.trim()}"` };
  }

  // 5. Intrusion / Suspicion (Who are you? Why texting me?)
  if (/\b(who are you|who r u|who is this|why are you texting|why are you messaging|why texting me|why messaging me|why r u texting|why r u messaging|how did you get my number|how you got my number|why message me|why text me|who gave you my number)\b/i.test(s)) {
    return { isRejected: true, reason: `Customer questioned contact: "${input.trim()}"` };
  }

  // 6. Leave alone / Wrong number / Go away
  if (/\b(please leave|leave me alone|leave me|wrong number|wrong person|get lost|go away|don't disturb|dont disturb|do not disturb|pls leave|dont disturb me)\b/i.test(s)) {
    return { isRejected: true, reason: `Customer requested to be left alone: "${input.trim()}"` };
  }

  // 7. Unsubscribe / Remove my number
  if (/\b(unsubscribe|remove my number|remove me|delete my number|delete me|take me off|optout|opt-out)\b/i.test(s)) {
    return { isRejected: true, reason: `Customer requested removal: "${input.trim()}"` };
  }

  // 8. Spam / Complaint / Threat
  if (/\b(stop spamming|spam|scam|fraud|reporting you|will report|report spam|police|complaint|cyber crime)\b/i.test(s)) {
    return { isRejected: true, reason: `Customer flagged spam/complaint: "${input.trim()}"` };
  }

  // 9. Hostile / Abusive / Profanity
  if (/\b(fuck off|f\*\*\* off|fuck you|fck|bitch|bastard|idiot|shut up|nonsense|bakwaas|faltu)\b/i.test(s)) {
    return { isRejected: true, reason: `Hostile/abusive language: "${input.trim()}"` };
  }

  return { isRejected: false, reason: '' };
}

/**
 * Fetch all blocked contacts for an organization.
 */
export async function getBlockedContacts(orgId?: string): Promise<BlockedContactItem[]> {
  try {
    let query = supabaseAdmin
      .from('contacts')
      .select('id, organization_id, phone_number, name, attributes, created_at')
      .contains('attributes', { is_blocked: true })
      .order('created_at', { ascending: false });

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((c: any) => ({
      id: c.id,
      organization_id: c.organization_id,
      phone_number: c.phone_number,
      name: c.name || 'Valued Client',
      blocked_at: c.attributes?.blocked_at || c.created_at,
      blocked_reason: c.attributes?.blocked_reason || 'Blocked by admin',
      blocked_by: c.attributes?.blocked_by || 'admin',
      created_at: c.created_at
    }));
  } catch (err) {
    console.error('Failed to get blocked contacts:', err);
    return [];
  }
}

/**
 * Check if a specific phone number is blocked.
 */
export async function isNumberBlocked(phone: string, orgId?: string): Promise<boolean> {
  if (!phone) return false;
  try {
    const { normalized, last10 } = getPhoneMatchKeys(phone);

    let query = supabaseAdmin
      .from('contacts')
      .select('id, phone_number, attributes')
      .contains('attributes', { is_blocked: true });

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data } = await query;
    if (!data || data.length === 0) return false;

    return data.some((c: any) => {
      const cKeys = getPhoneMatchKeys(c.phone_number || '');
      return cKeys.last10 === last10 || cKeys.normalized === normalized;
    });
  } catch {
    return false;
  }
}

/**
 * Filter an array of phone numbers or contact IDs, removing any blocked numbers.
 * Guaranteed guardrail for campaign broadcasts and Excel uploads.
 */
export async function filterOutBlockedNumbers(
  phoneNumbers: string[],
  orgId?: string
): Promise<{ allowed: string[]; blocked: string[] }> {
  if (!phoneNumbers || phoneNumbers.length === 0) {
    return { allowed: [], blocked: [] };
  }

  try {
    const blockedList = await getBlockedContacts(orgId);
    if (blockedList.length === 0) {
      return { allowed: phoneNumbers, blocked: [] };
    }

    const blockedLast10Set = new Set<string>();
    const blockedNormSet = new Set<string>();

    blockedList.forEach(b => {
      const keys = getPhoneMatchKeys(b.phone_number);
      if (keys.last10) blockedLast10Set.add(keys.last10);
      if (keys.normalized) blockedNormSet.add(keys.normalized);
    });

    const allowed: string[] = [];
    const blocked: string[] = [];

    for (const phone of phoneNumbers) {
      const keys = getPhoneMatchKeys(phone);
      if (blockedLast10Set.has(keys.last10) || blockedNormSet.has(keys.normalized)) {
        blocked.push(phone);
      } else {
        allowed.push(phone);
      }
    }

    return { allowed, blocked };
  } catch (err) {
    console.error('Error filtering blocked numbers:', err);
    return { allowed: phoneNumbers, blocked: [] };
  }
}

/**
 * Block a contact by phone number or contact ID.
 * Sets is_blocked=true, opted_in=false, and stores the audit timestamp and reason.
 */
export async function blockContact(input: {
  phone_number: string;
  name?: string;
  reason?: string;
  source?: 'inbox' | 'admin' | 'manual';
  orgId?: string;
}): Promise<{ success: boolean; contact?: any; error?: string }> {
  try {
    const { normalized } = getPhoneMatchKeys(input.phone_number);
    let resolvedOrgId = input.orgId;

    if (!resolvedOrgId) {
      const { data: defaultOrg } = await supabaseAdmin.from('organizations').select('id').limit(1).single();
      resolvedOrgId = defaultOrg?.id;
    }

    if (!resolvedOrgId) {
      return { success: false, error: 'Organization ID not found.' };
    }

    // Check if contact already exists
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id, attributes, name')
      .eq('organization_id', resolvedOrgId)
      .eq('phone_number', normalized)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const newAttributes = {
      ...(existing?.attributes || {}),
      is_blocked: true,
      blocked_at: nowIso,
      blocked_reason: input.reason?.trim() || 'Blocked by admin',
      blocked_by: input.source || 'admin',
      bot_active: false // Disable AI bots for blocked contacts
    };

    let resultContact: any = null;

    if (existing) {
      const { data: updated, error } = await supabaseAdmin
        .from('contacts')
        .update({
          name: input.name?.trim() || existing.name,
          opted_in: false,
          attributes: newAttributes
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      resultContact = updated;
    } else {
      const { data: created, error } = await supabaseAdmin
        .from('contacts')
        .insert({
          organization_id: resolvedOrgId,
          phone_number: normalized,
          name: input.name?.trim() || 'Blocked Contact',
          opted_in: false,
          attributes: newAttributes
        })
        .select()
        .single();

      if (error) throw error;
      resultContact = created;
    }

    return { success: true, contact: resultContact };
  } catch (err: any) {
    console.error('Failed to block contact:', err);
    return { success: false, error: err.message || 'Failed to block contact' };
  }
}

/**
 * Unblock a contact. Can ONLY be executed from the Blocked Contacts management interface.
 */
export async function unblockContact(input: {
  contact_id?: string;
  phone_number?: string;
  orgId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    let query = supabaseAdmin.from('contacts').select('id, attributes');

    if (input.contact_id) {
      query = query.eq('id', input.contact_id);
    } else if (input.phone_number) {
      const { normalized } = getPhoneMatchKeys(input.phone_number);
      query = query.eq('phone_number', normalized);
      if (input.orgId) query = query.eq('organization_id', input.orgId);
    } else {
      return { success: false, error: 'Must provide contact_id or phone_number.' };
    }

    const { data: targetContact, error: findErr } = await query.maybeSingle();
    if (findErr || !targetContact) {
      return { success: false, error: 'Contact not found.' };
    }

    const currentAttrs = (targetContact.attributes as any) || {};
    const updatedAttrs = {
      ...currentAttrs,
      is_blocked: false,
      unblocked_at: new Date().toISOString()
    };

    const { error: updateErr } = await supabaseAdmin
      .from('contacts')
      .update({
        attributes: updatedAttrs,
        opted_in: true // Restore eligible status upon explicit admin unblock
      })
      .eq('id', targetContact.id);

    if (updateErr) throw updateErr;

    return { success: true };
  } catch (err: any) {
    console.error('Failed to unblock contact:', err);
    return { success: false, error: err.message || 'Failed to unblock contact' };
  }
}
