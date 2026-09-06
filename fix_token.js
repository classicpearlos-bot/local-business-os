
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('whatsapp_accounts')
    .update({ 
      app_id: '2566956740405929',
      access_token: 'EAAkeojCqaqkBSfh6saD2u1L2f29PQDikTCRZCA0R8OPu90NahKzx5WZBQdMh9ovXfPZBEPSMKUHz0OarZCPUZAdX0wODNDSS4sKWzZCx2C34UkvB6XC7Xt0Lt604C01oZCT9ow6oYrvVQ3Kvx5s5VmXhXCx1JV4ZBYakSoZBYQUAGOAnuXlCpVIrrwRPQjEMdmAZDZD'
    })
    .neq('waba_id', 'invalid_placeholder')
    .select();

  console.log('Update result:', data, error);
}

run();

