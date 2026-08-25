const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const fetch = globalThis.fetch;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: accounts } = await supabaseAdmin.from('whatsapp_accounts').select('*').limit(1);
  if (!accounts || accounts.length === 0) return console.log('No accounts');
  
  const account = accounts[0];
  const wabaId = account.waba_id;
  const token = account.access_token;
  
  const url = 'https://graph.facebook.com/v19.0/' + wabaId + '/message_templates?limit=10';
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  const data = await res.json();
  if (data.data) {
    data.data.forEach(t => {
      console.log(t.name, '|', t.language, '|', t.status);
    });
  } else {
    console.log(data);
  }
}
run();
