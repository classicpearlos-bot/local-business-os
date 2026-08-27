import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface Tag {
  id: string;
  organization_id: string;
  name: string;
  color?: string;
  description?: string;
  created_at?: string;
}

/**
 * Get all tags for an organization with contact counts
 */
export async function getOrganizationTags(orgId: string) {
  // 1. Fetch tags from contact_tags table
  const { data: tags, error } = await supabaseAdmin
    .from('contact_tags')
    .select('*')
    .eq('organization_id', orgId)
    .order('name', { ascending: true });

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching tags:', error);
  }

  // 2. Also count tag usages across contacts.attributes->'tags'
  const { data: contacts } = await supabaseAdmin
    .from('contacts')
    .select('attributes')
    .eq('organization_id', orgId);

  const tagUsageMap: Record<string, number> = {};
  (contacts || []).forEach(c => {
    const contactTags = (c.attributes as any)?.tags;
    if (Array.isArray(contactTags)) {
      contactTags.forEach((t: string) => {
        tagUsageMap[t] = (tagUsageMap[t] || 0) + 1;
      });
    }
  });

  const existingTags = tags || [];
  const allTagNames = new Set([...existingTags.map(t => t.name), ...Object.keys(tagUsageMap)]);

  const defaultColors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#3B82F6', '#14B8A6'];

  const enrichedTags = Array.from(allTagNames).map((tagName, idx) => {
    const existing = existingTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    return {
      id: existing?.id || `tag_${tagName.toLowerCase().replace(/\s+/g, '_')}`,
      organization_id: orgId,
      name: tagName,
      color: existing?.color || defaultColors[idx % defaultColors.length],
      count: tagUsageMap[tagName] || 0
    };
  });

  return enrichedTags;
}

/**
 * Create or update a tag
 */
export async function upsertTag(orgId: string, name: string, color: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Tag name is required');

  const { data, error } = await supabaseAdmin
    .from('contact_tags')
    .upsert({
      organization_id: orgId,
      name: cleanName,
      color: color || '#6366F1'
    }, { onConflict: 'organization_id,name' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a tag and remove from contacts
 */
export async function deleteTag(orgId: string, tagName: string) {
  // 1. Delete from contact_tags
  await supabaseAdmin
    .from('contact_tags')
    .delete()
    .eq('organization_id', orgId)
    .eq('name', tagName);

  // 2. Remove tag from contacts attributes in batch
  const { data: contacts } = await supabaseAdmin
    .from('contacts')
    .select('id, attributes')
    .eq('organization_id', orgId);

  for (const c of (contacts || [])) {
    const attrs = (c.attributes as any) || {};
    if (Array.isArray(attrs.tags) && attrs.tags.includes(tagName)) {
      const updatedTags = attrs.tags.filter((t: string) => t !== tagName);
      await supabaseAdmin
        .from('contacts')
        .update({ attributes: { ...attrs, tags: updatedTags } })
        .eq('id', c.id);
    }
  }

  return { success: true };
}

/**
 * Assign tag to a contact
 */
export async function assignTagToContact(orgId: string, contactId: string, tagName: string) {
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('attributes')
    .eq('id', contactId)
    .eq('organization_id', orgId)
    .single();

  if (!contact) throw new Error('Contact not found');

  const attrs = (contact.attributes as any) || {};
  const currentTags = Array.isArray(attrs.tags) ? attrs.tags : [];
  
  if (!currentTags.includes(tagName)) {
    const newTags = [...currentTags, tagName];
    await supabaseAdmin
      .from('contacts')
      .update({ attributes: { ...attrs, tags: newTags } })
      .eq('id', contactId);
  }

  return { success: true };
}

/**
 * Remove tag from a contact
 */
export async function removeTagFromContact(orgId: string, contactId: string, tagName: string) {
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('attributes')
    .eq('id', contactId)
    .eq('organization_id', orgId)
    .single();

  if (!contact) throw new Error('Contact not found');

  const attrs = (contact.attributes as any) || {};
  const currentTags = Array.isArray(attrs.tags) ? attrs.tags : [];
  const newTags = currentTags.filter((t: string) => t !== tagName);

  await supabaseAdmin
    .from('contacts')
    .update({ attributes: { ...attrs, tags: newTags } })
    .eq('id', contactId);

  return { success: true };
}
