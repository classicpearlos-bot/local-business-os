import { FlowRecord, FlowDefinition } from './types';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const DEFAULT_SALON_FLOWS: Array<{ name: string; description: string; trigger_type: any; definition: FlowDefinition }> = [
  {
    name: 'Welcome & Salon Services Explorer',
    description: 'Auto-greets new clients and presents service menu with instant consultation buttons',
    trigger_type: 'KEYWORD',
    definition: {
      nodes: [
        {
          id: 'trigger_1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Keyword Trigger: HI / MENU',
            node_type: 'trigger',
            config: { keywords: ['hi', 'hello', 'menu', 'services', 'price'] }
          }
        },
        {
          id: 'msg_welcome',
          type: 'message_text',
          position: { x: 100, y: 250 },
          data: {
            label: 'Send Welcome Greeting',
            node_type: 'message_text',
            config: {
              text: '✨ Welcome to Classic Pearl Unisex Salon, {{name}}!\n\nWe specialize in premium Hair Transformations, Luxury Facials, Bridal Makeovers, and Keratin/Botox treatments.\n\nHow can we pamper you today?'
            }
          }
        },
        {
          id: 'msg_options',
          type: 'message_text',
          position: { x: 100, y: 400 },
          data: {
            label: 'Show Quick Options',
            node_type: 'message_text',
            config: {
              text: 'Reply with a number:\n1️⃣ View Weekday Offers (Up to 40% OFF)\n2️⃣ Hair Botox & Nanoplastia Prices\n3️⃣ Book an Appointment\n4️⃣ Talk to Senior Stylist'
            }
          }
        },
        {
          id: 'end_1',
          type: 'end',
          position: { x: 100, y: 550 },
          data: {
            label: 'Complete Interaction',
            node_type: 'end',
            config: {}
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger_1', target: 'msg_welcome' },
        { id: 'e2-3', source: 'msg_welcome', target: 'msg_options' },
        { id: 'e3-4', source: 'msg_options', target: 'end_1' }
      ]
    }
  },
  {
    name: 'Slipping Client 45-Day Winback Flow',
    description: 'Re-engages customers who have not visited the salon in 45 days with an exclusive privilege voucher',
    trigger_type: '45_DAY_INACTIVE',
    definition: {
      nodes: [
        {
          id: 'trigger_rfm_45',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: '45-Day Inactive Trigger',
            node_type: 'trigger',
            config: { days: 45 }
          }
        },
        {
          id: 'check_opt_in',
          type: 'logic_condition',
          position: { x: 100, y: 250 },
          data: {
            label: 'Check Marketing Consent',
            node_type: 'logic_condition',
            config: { field: 'opted_in', operator: 'is_true', value: true }
          }
        },
        {
          id: 'send_winback_offer',
          type: 'message_text',
          position: { x: 50, y: 420 },
          data: {
            label: 'Send ₹500 VIP Winback Voucher',
            node_type: 'message_text',
            config: {
              text: '🌸 We miss you at Classic Pearl Salon, {{name}}!\n\nIt’s been {{days_since_visit}} days since your last visit. We would love to pamper you again with an exclusive ₹500 Privilege Voucher on your next Hair Spa or Facial.\n\nUse Code: *MISSYOU500* when booking this week!'
            }
          }
        },
        {
          id: 'end_winback',
          type: 'end',
          position: { x: 100, y: 600 },
          data: {
            label: 'End Flow',
            node_type: 'end',
            config: {}
          }
        }
      ],
      edges: [
        { id: 'e_t_c', source: 'trigger_rfm_45', target: 'check_opt_in' },
        { id: 'e_c_t', source: 'check_opt_in', target: 'send_winback_offer', sourceHandle: 'true' },
        { id: 'e_c_f', source: 'check_opt_in', target: 'end_winback', sourceHandle: 'false' },
        { id: 'e_w_e', source: 'send_winback_offer', target: 'end_winback' }
      ]
    }
  },
  {
    name: 'Birthday Club Automated Celebration',
    description: 'Sends automated birthday wishes with a 20% celebration discount to qualifying clients',
    trigger_type: 'BIRTHDAY',
    definition: {
      nodes: [
        {
          id: 'trigger_bday',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Birthday Date Trigger',
            node_type: 'trigger',
            config: { timing: 'same_day' }
          }
        },
        {
          id: 'msg_bday',
          type: 'message_text',
          position: { x: 100, y: 250 },
          data: {
            label: 'Send Birthday Greeting & Gift',
            node_type: 'message_text',
            config: {
              text: '🎂 Happy Birthday, {{name}}! 🎉\n\nThe team at Classic Pearl Unisex Salon wishes you a fabulous year ahead!\n\nCelebrate your special day with a flat *20% Birthday Discount* on any luxury hair, skin, or beauty treatment.\n\nValid for 7 days. Show this message at the counter!'
            }
          }
        },
        {
          id: 'end_bday',
          type: 'end',
          position: { x: 100, y: 400 },
          data: {
            label: 'End Flow',
            node_type: 'end',
            config: {}
          }
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
 * Get all flows for an organization
 */
export async function getOrganizationFlows(orgId: string): Promise<FlowRecord[]> {
  const { data: flows, error } = await supabaseAdmin
    .from('flows')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching flows:', error);
    return [];
  }

  // If no flows exist, we could optionally seed DEFAULT_SALON_FLOWS here,
  // but for now we just return the actual database state.
  return flows as FlowRecord[];
}

/**
 * Save a flow
 */
export async function saveFlow(orgId: string, flow: Partial<FlowRecord>): Promise<FlowRecord | null> {
  if (flow.id) {
    const { data, error } = await supabaseAdmin
      .from('flows')
      .update({
        name: flow.name,
        description: flow.description,
        status: flow.status,
        trigger_type: flow.trigger_type,
        trigger_config: flow.trigger_config,
        definition: flow.definition,
        updated_at: new Date().toISOString(),
        version: flow.version ? flow.version + 1 : 2
      })
      .eq('id', flow.id)
      .eq('organization_id', orgId)
      .select()
      .single();
    return data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('flows')
      .insert({
        organization_id: orgId,
        name: flow.name,
        description: flow.description,
        status: flow.status || 'DRAFT',
        trigger_type: flow.trigger_type,
        trigger_config: flow.trigger_config || {},
        definition: flow.definition || { nodes: [], edges: [] }
      })
      .select()
      .single();
    return data;
  }
}
