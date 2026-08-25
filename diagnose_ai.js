const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabaseAdmin = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function diagnose() {
  console.log('--- RECENT AUTOMATION EXECUTIONS ---');
  const { data: execs } = await supabaseAdmin.from('automation_executions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log(execs);

  console.log('\n--- RECENT MESSAGES ---');
  const { data: msgs } = await supabaseAdmin.from('messages')
    .select('id, direction, type, content, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log(msgs);
}
diagnose();
