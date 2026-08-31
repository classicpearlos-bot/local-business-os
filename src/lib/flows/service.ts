import { FlowRecord, FlowDefinition } from './types';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Default salon flows to seed when the table is empty
export const DEFAULT_SALON_FLOWS: Array<{
  name: string;
  description: string;
  trigger_type: any;
  trigger_config: any;
  definition: FlowDefinition;
}> = [
  {
    name: 'Welcome & Services Explorer',
    description: 'Auto-greets new clients and presents service menu when they say Hi or Menu',
    trigger_type: 'KEYWORD',
    trigger_config: { keywords: ['hi', 'hello', 'menu', 'services', 'price', 'hai'] },
    definition: {
      nodes: [
        {
          id: 'trigger_1',
          type: 'trigger',
          position: { x: 300, y: 50 },
          data: {
            label: 'Keyword Trigger',
            node_type: 'trigger',
            config: { keywords: ['hi', 'hello', 'menu', 'services', 'price', 'hai'] }
          }
        },
        {
          id: 'msg_welcome',
          type: 'message_text',
          position: { x: 300, y: 200 },
          data: {
            label: 'Welcome Greeting',
            node_type: 'message_text',
            config: {
              text: '✨ Welcome to Classic Pearl Unisex Salon, {{name}}!\n\nWe specialize in premium Hair Transformations, Luxury Facials, Bridal Makeovers, and Keratin/Botox treatments.\n\nHow can we pamper you today? 💛'
            }
          }
        },
        {
          id: 'msg_buttons',
          type: 'message_buttons',
          position: { x: 300, y: 380 },
          data: {
            label: 'Quick Reply Buttons',
            node_type: 'message_buttons',
            config: {
              text: 'Choose an option below:',
              buttons: [
                { id: 'btn_services', title: '💇 View Services' },
                { id: 'btn_book', title: '📅 Book Appointment' },
                { id: 'btn_offers', title: '🎁 Today\'s Offers' }
              ]
            }
          }
        },
        {
          id: 'end_1',
          type: 'end',
          position: { x: 300, y: 560 },
          data: { label: 'End Flow', node_type: 'end', config: {} }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger_1', target: 'msg_welcome' },
        { id: 'e2-3', source: 'msg_welcome', target: 'msg_buttons' },
        { id: 'e3-4', source: 'msg_buttons', target: 'end_1' }
      ]
    }
  },
  {
    name: '45-Day Winback Campaign',
    description: 'Re-engages clients who have not visited in 45 days with an exclusive voucher',
    trigger_type: '45_DAY_INACTIVE',
    trigger_config: { days: 45 },
    definition: {
      nodes: [
        {
          id: 'trigger_rfm_45',
          type: 'trigger',
          position: { x: 300, y: 50 },
          data: {
            label: '45-Day Inactive Trigger',
            node_type: 'trigger',
            config: { days: 45 }
          }
        },
        {
          id: 'check_opt_in',
          type: 'logic_condition',
          position: { x: 300, y: 200 },
          data: {
            label: 'Check Marketing Consent',
            node_type: 'logic_condition',
            config: { field: 'opted_in', operator: 'is_true', value: true }
          }
        },
        {
          id: 'send_winback_offer',
          type: 'message_text',
          position: { x: 120, y: 400 },
          data: {
            label: 'Send ₹500 Winback Voucher',
            node_type: 'message_text',
            config: {
              text: '💛 We miss you at Classic Pearl Salon, {{name}}!\n\nIt\'s been a while since your last visit. We\'d love to pamper you again with an exclusive *₹500 Privilege Voucher* on your next Hair Spa or Facial.\n\nUse Code: *MISSYOU500* when booking this week!'
            }
          }
        },
        {
          id: 'end_no_consent',
          type: 'end',
          position: { x: 480, y: 400 },
          data: { label: 'Skip (No Consent)', node_type: 'end', config: {} }
        },
        {
          id: 'end_winback',
          type: 'end',
          position: { x: 120, y: 580 },
          data: { label: 'End Flow', node_type: 'end', config: {} }
        }
      ],
      edges: [
        { id: 'e_t_c', source: 'trigger_rfm_45', target: 'check_opt_in' },
        { id: 'e_c_t', source: 'check_opt_in', target: 'send_winback_offer', sourceHandle: 'true' },
        { id: 'e_c_f', source: 'check_opt_in', target: 'end_no_consent', sourceHandle: 'false' },
        { id: 'e_w_e', source: 'send_winback_offer', target: 'end_winback' }
      ]
    }
  },
  {
    name: 'Birthday Club Celebration',
    description: 'Sends automated birthday wishes with a 20% celebration discount on their special day',
    trigger_type: 'BIRTHDAY',
    trigger_config: { timing: 'same_day' },
    definition: {
      nodes: [
        {
          id: 'trigger_bday',
          type: 'trigger',
          position: { x: 300, y: 50 },
          data: {
            label: 'Birthday Trigger',
            node_type: 'trigger',
            config: { timing: 'same_day' }
          }
        },
        {
          id: 'msg_bday',
          type: 'message_text',
          position: { x: 300, y: 200 },
          data: {
            label: 'Birthday Greeting & 20% Gift',
            node_type: 'message_text',
            config: {
              text: '🎂 Happy Birthday, {{name}}! 🎉\n\nThe team at Classic Pearl Unisex Salon wishes you a fabulous year ahead!\n\nCelebrate your special day with a flat *20% Birthday Discount* on any luxury hair, skin, or beauty treatment.\n\nValid for 7 days. Show this message at the counter! 💛'
            }
          }
        },
        {
          id: 'end_bday',
          type: 'end',
          position: { x: 300, y: 400 },
          data: { label: 'End Flow', node_type: 'end', config: {} }
        }
      ],
      edges: [
        { id: 'e_b_1', source: 'trigger_bday', target: 'msg_bday' },
        { id: 'e_b_2', source: 'msg_bday', target: 'end_bday' }
      ]
    }
  }
];

/**
 * Get all flows for an organization. Auto-seeds defaults if table is empty.
 */
export async function getOrganizationFlows(orgId: string): Promise<FlowRecord[]> {
  const { data: flows, error } = await supabaseAdmin
    .from('flows')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    // Table might not exist yet — return empty array gracefully
    console.error('Error fetching flows (table may not exist yet):', error.message);
    return [];
  }

  // Auto-seed defaults on first load
  if (!flows || flows.length === 0) {
    try {
      const seeded = await seedDefaultFlows(orgId);
      return seeded;
    } catch (seedErr) {
      console.error('Failed to seed default flows:', seedErr);
      return [];
    }
  }

  return flows as FlowRecord[];
}

/**
 * Seed default flows into the DB for a new organization
 */
async function seedDefaultFlows(orgId: string): Promise<FlowRecord[]> {
  const toInsert = DEFAULT_SALON_FLOWS.map(f => ({
    organization_id: orgId,
    name: f.name,
    description: f.description,
    status: 'PUBLISHED',
    trigger_type: f.trigger_type,
    trigger_config: f.trigger_config,
    definition: f.definition
  }));

  const { data, error } = await supabaseAdmin
    .from('flows')
    .insert(toInsert)
    .select();

  if (error) throw error;
  return (data || []) as FlowRecord[];
}

/**
 * Save (create or update) a flow.
 * IMPORTANT: Only use a real DB UUID as the ID — fake IDs like "flow_123" should be treated as new.
 */
export async function saveFlow(orgId: string, flow: Partial<FlowRecord>): Promise<FlowRecord | null> {
  // Detect if this is a REAL database UUID (36 chars with dashes) or a fake local ID
  const isRealUUID = flow.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(flow.id);

  if (isRealUUID) {
    // UPDATE existing flow
    const { data, error } = await supabaseAdmin
      .from('flows')
      .update({
        name: flow.name,
        description: flow.description,
        status: flow.status,
        trigger_type: flow.trigger_type,
        trigger_config: flow.trigger_config || {},
        definition: flow.definition,
        updated_at: new Date().toISOString(),
        version: (flow.version || 1) + 1
      })
      .eq('id', flow.id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('Error updating flow:', error);
      return null;
    }
    return data as FlowRecord;
  } else {
    // INSERT new flow (ignore any fake local ID)
    const { data, error } = await supabaseAdmin
      .from('flows')
      .insert({
        organization_id: orgId,
        name: flow.name,
        description: flow.description,
        status: flow.status || 'DRAFT',
        trigger_type: flow.trigger_type || 'KEYWORD',
        trigger_config: flow.trigger_config || {},
        definition: flow.definition || { nodes: [], edges: [] }
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting flow:', error);
      return null;
    }
    return data as FlowRecord;
  }
}

/**
 * Delete a flow by ID
 */
export async function deleteFlow(orgId: string, flowId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('flows')
    .delete()
    .eq('id', flowId)
    .eq('organization_id', orgId);

  if (error) {
    console.error('Error deleting flow:', error);
    return false;
  }
  return true;
}
