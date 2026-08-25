const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: recs, error } = await supabaseAdmin.from('campaign_recipients').select('*');
  console.log('Recipients:', recs?.length);
  if (recs?.length > 0) {
    console.log(recs[0]);
  }
}
run();
