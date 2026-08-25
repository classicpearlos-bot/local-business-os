const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseAdmin = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data, error } = await supabaseAdmin.from('campaigns').update({ status: 'QUEUED' }).eq('status', 'SCHEDULED');
  console.log('Fixed campaigns:', error || 'Success');
}
run();
