const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabaseAdmin = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkCols() {
  const { data, error } = await supabaseAdmin.from('automation_executions').insert({
    organization_id: 'f77576e5-ba1d-477e-83b5-67378919b7e1',
    conversation_id: '0c8ce14a-3b62-4e9d-b324-9a9070e7e4d4',
    inbound_message_id: '03fedd04-8265-4368-9563-231e9760ef08',
    matched_keyword: 'DEBUG_TEST',
    action_type: 'TEXT',
    status: 'EXECUTED',
    error: 'test'
  });
  console.log(error);
}
checkCols();
