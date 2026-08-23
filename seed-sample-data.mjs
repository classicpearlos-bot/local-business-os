import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, key);

async function seed() {
  console.log('Seeding initial organization and demo data...');

  // 1. Create or get Default Organization
  let { data: orgs } = await supabase.from('organizations').select('id, name').limit(1);
  let orgId;
  if (!orgs || orgs.length === 0) {
    const { data: newOrg, error } = await supabase.from('organizations').insert({
      name: 'Acme Global Corp'
    }).select().single();
    if (error) throw error;
    orgId = newOrg.id;
    console.log('Created Organization:', orgId);
  } else {
    orgId = orgs[0].id;
    console.log('Using existing Organization:', orgId);
  }

  // 2. Seed Contacts
  const contactsData = [
    { organization_id: orgId, name: 'Rahul Sharma', phone_number: '+919876543210', attributes: { city: 'Mumbai', vip: true } },
    { organization_id: orgId, name: 'Priya Patel', phone_number: '+919876543211', attributes: { city: 'Ahmedabad', vip: false } },
    { organization_id: orgId, name: 'Ananya Roy', phone_number: '+919876543212', attributes: { city: 'Bangalore', vip: true } },
    { organization_id: orgId, name: 'David Smith', phone_number: '+14155552671', attributes: { city: 'San Francisco', vip: false } },
    { organization_id: orgId, name: 'Fatima Al-Mansoor', phone_number: '+971501234567', attributes: { city: 'Dubai', vip: true } }
  ];

  for (const c of contactsData) {
    await supabase.from('contacts').upsert(c, { onConflict: 'organization_id, phone_number' });
  }
  console.log('Seeded Contacts');

  // Fetch contacts
  const { data: contacts } = await supabase.from('contacts').select('id, name, phone_number').eq('organization_id', orgId);

  // 3. Seed Conversations & Messages
  if (contacts && contacts.length > 0) {
    for (let i = 0; i < Math.min(3, contacts.length); i++) {
      const contact = contacts[i];
      const { data: conv } = await supabase.from('conversations').upsert({
        organization_id: orgId,
        contact_id: contact.id,
        status: 'OPEN',
        unread_count: i === 0 ? 2 : 0,
        last_message_at: new Date(Date.now() - i * 3600000).toISOString()
      }, { onConflict: 'organization_id, contact_id' }).select().single();

      if (conv) {
        // Inbound message
        await supabase.from('messages').insert({
          organization_id: orgId,
          contact_id: contact.id,
          conversation_id: conv.id,
          direction: 'INBOUND',
          type: 'text',
          content: { text: { body: i === 0 ? 'Hi, I need assistance with my order #4829.' : 'What are your enterprise subscription pricing plans?' } },
          status: 'DELIVERED',
          created_at: new Date(Date.now() - (i * 3600000 + 1800000)).toISOString()
        });

        // Outbound reply
        await supabase.from('messages').insert({
          organization_id: orgId,
          contact_id: contact.id,
          conversation_id: conv.id,
          direction: 'OUTBOUND',
          type: 'text',
          content: { text: { body: 'Hello! Thank you for reaching out to NexChat. Let me pull up your account details.' } },
          status: 'READ',
          created_at: new Date(Date.now() - (i * 3600000 + 900000)).toISOString()
        });
      }
    }
    console.log('Seeded Conversations & Messages');
  }

  // 4. Seed Campaigns
  const { data: camp } = await supabase.from('campaigns').insert([
    {
      organization_id: orgId,
      name: 'Summer Flash Sale 2026',
      template_name: 'summer_promo_v2',
      status: 'PROCESSING',
      total_recipients: 1200,
      total_sent: 850,
      total_delivered: 790,
      total_read: 520,
      total_failed: 12,
      scheduled_at: new Date().toISOString()
    },
    {
      organization_id: orgId,
      name: 'Product Launch Webinar Announcement',
      template_name: 'webinar_invite_en',
      status: 'SCHEDULED',
      total_recipients: 3400,
      total_sent: 0,
      total_delivered: 0,
      total_read: 0,
      total_failed: 0,
      scheduled_at: new Date(Date.now() + 86400000).toISOString()
    },
    {
      organization_id: orgId,
      name: 'Customer Satisfaction NPS Survey',
      template_name: 'nps_feedback_request',
      status: 'COMPLETED',
      total_recipients: 500,
      total_sent: 500,
      total_delivered: 495,
      total_read: 410,
      total_failed: 5,
      completed_at: new Date(Date.now() - 172800000).toISOString()
    }
  ]).select();
  console.log('Seeded Campaigns');

  // 5. Seed Automations
  await supabase.from('automations').insert([
    {
      organization_id: orgId,
      name: 'Pricing & Plans Auto-Responder',
      active: true,
      priority: 10,
      trigger_type: 'CONTAINS',
      trigger_config: { keywords: ['price', 'pricing', 'cost', 'rate', 'plans'] },
      action_type: 'TEXT',
      action_config: { text: 'Hello! Our pricing starts at $49/mo for standard and $199/mo for pro. Check out our full tier breakdown at https://nexchat.io/pricing.' },
      cooldown_seconds: 300
    },
    {
      organization_id: orgId,
      name: 'Customer Support Working Hours Bot',
      active: true,
      priority: 5,
      trigger_type: 'CONTAINS',
      trigger_config: { keywords: ['help', 'support', 'human', 'agent', 'ticket'] },
      action_type: 'TEXT',
      action_config: { text: 'A dedicated support specialist has been assigned to your chat and will respond shortly!' },
      cooldown_seconds: 600
    },
    {
      organization_id: orgId,
      name: 'Order Tracking Query',
      active: true,
      priority: 8,
      trigger_type: 'CONTAINS',
      trigger_config: { keywords: ['order', 'track', 'status', 'shipping'] },
      action_type: 'TEXT',
      action_config: { text: 'Please provide your 6-digit Order ID so we can look up your real-time tracking details.' },
      cooldown_seconds: 120
    }
  ]);
  console.log('Seeded Automations');

  // 6. Seed API Keys & Webhooks
  await supabase.from('api_keys').insert({
    organization_id: orgId,
    name: 'Production Server Backend Key',
    key_prefix: 'nx_live_9f82',
    key_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8' // dummy sha256
  });

  await supabase.from('tenant_webhooks').insert({
    organization_id: orgId,
    url: 'https://api.yourcompany.com/webhooks/whatsapp',
    secret: 'whsec_test_secret_key_88291',
    active: true,
    events: ['message.received', 'message.delivered', 'message.read']
  });
  console.log('Seeded API Keys & Webhooks');

  console.log('--- Database Seeding Complete! ---');
}

seed().catch(console.error);
