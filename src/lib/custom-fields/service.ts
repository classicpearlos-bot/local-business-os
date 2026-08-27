import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type CustomFieldType = 
  | 'TEXT' 
  | 'NUMBER' 
  | 'DATE' 
  | 'DATETIME' 
  | 'BOOLEAN' 
  | 'DROPDOWN' 
  | 'MULTISELECT' 
  | 'CURRENCY' 
  | 'PHONE' 
  | 'EMAIL' 
  | 'URL';

export interface CustomFieldDefinition {
  id: string;
  organization_id: string;
  name: string;
  key: string;
  field_type: CustomFieldType;
  options?: string[];
  description?: string;
  created_at?: string;
}

// Default Salon Custom Fields
export const DEFAULT_SALON_CUSTOM_FIELDS: Omit<CustomFieldDefinition, 'id' | 'organization_id' | 'created_at'>[] = [
  { name: 'Birthday', key: 'birthday', field_type: 'DATE', description: 'Customer date of birth' },
  { name: 'Gender', key: 'gender', field_type: 'DROPDOWN', options: ['Female', 'Male', 'Other'], description: 'Customer gender' },
  { name: 'Last Visit Date', key: 'last_visit', field_type: 'DATE', description: 'Date of most recent salon visit' },
  { name: 'Total Visits', key: 'total_visits', field_type: 'NUMBER', description: 'Lifetime count of completed appointments' },
  { name: 'Lifetime Spend', key: 'lifetime_spend', field_type: 'CURRENCY', description: 'Total revenue generated from client in INR' },
  { name: 'Favorite Service', key: 'favorite_service', field_type: 'TEXT', description: 'Most frequently booked salon service' },
  { name: 'Preferred Stylist', key: 'preferred_stylist', field_type: 'TEXT', description: 'Preferred salon staff member' },
  { name: 'Membership Level', key: 'membership_level', field_type: 'DROPDOWN', options: ['None', 'Silver', 'Gold', 'Platinum', 'VIP'], description: 'Salon membership tier' },
  { name: 'Reward Balance', key: 'reward_balance', field_type: 'NUMBER', description: 'Current loyalty points balance' },
  { name: 'Hair Type / Texture', key: 'hair_type', field_type: 'DROPDOWN', options: ['Straight', 'Wavy', 'Curly', 'Coily', 'Chemically Treated', 'Bleached'], description: 'Hair diagnosis profile' }
];

/**
 * Get all custom fields for an organization
 */
export async function getCustomFieldDefinitions(orgId: string): Promise<CustomFieldDefinition[]> {
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('id', orgId)
    .single();

  if (!org) throw new Error('Organization not found');

  return DEFAULT_SALON_CUSTOM_FIELDS.map((f, i) => ({
    id: `cf_${f.key}`,
    organization_id: orgId,
    name: f.name,
    key: f.key,
    field_type: f.field_type,
    options: f.options,
    description: f.description,
    created_at: new Date().toISOString()
  }));
}

/**
 * Update contact custom field value
 */
export async function updateContactCustomFields(
  orgId: string, 
  contactId: string, 
  fields: Record<string, any>
) {
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('attributes')
    .eq('id', contactId)
    .eq('organization_id', orgId)
    .single();

  if (!contact) throw new Error('Contact not found');

  const attrs = (contact.attributes as any) || {};
  const currentCustom = attrs.custom_fields || {};
  const updatedCustom = { ...currentCustom, ...fields };

  const { error } = await supabaseAdmin
    .from('contacts')
    .update({
      attributes: {
        ...attrs,
        custom_fields: updatedCustom
      }
    })
    .eq('id', contactId);

  if (error) throw error;
  return { success: true };
}
