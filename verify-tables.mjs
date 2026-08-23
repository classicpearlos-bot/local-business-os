import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, key);

async function testAll() {
  const tables = [
    'organizations',
    'organization_members',
    'whatsapp_accounts',
    'contacts',
    'conversations',
    'messages',
    'message_templates',
    'campaigns',
    'campaign_recipients',
    'automations',
    'automation_executions',
    'api_keys',
    'tenant_webhooks',
    'tenant_webhook_deliveries',
    'api_requests'
  ];

  console.log('--- Verifying Supabase Schema Tables ---');
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`❌ Table ${table}: Error ${error.message}`);
    } else {
      console.log(`✅ Table ${table}: OK (active)`);
    }
  }
}

testAll();
