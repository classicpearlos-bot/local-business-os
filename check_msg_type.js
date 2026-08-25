const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabaseAdmin = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkMsgDetails() {
  const { data } = await supabaseAdmin.from('messages').select('*').eq('direction', 'INBOUND').order('created_at', { ascending: false }).limit(1);
  console.log(JSON.stringify(data[0].content, null, 2));
}
checkMsgDetails();
