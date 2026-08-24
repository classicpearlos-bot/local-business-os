const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const records = [{
    organization_id: 'cb330f69-d9d1-447f-8703-9d0b6159c3cb', // get correct org id later if needed
    name: 'Test Manual',
    phone_number: '+917483654138',
    opted_in: true
  }];

  const { data: contacts } = await supabaseAdmin.from('contacts').select('organization_id').limit(1);
  const orgId = contacts[0].organization_id;
  records[0].organization_id = orgId;

  console.log('Upserting...', records);
  const { error } = await supabaseAdmin
    .from('contacts')
    .upsert(records, {
      onConflict: 'organization_id,phone_number',
      ignoreDuplicates: false
    });
  
  if (error) {
    console.error('Upsert Error:', error);
    return;
  }

  const { data: finalContacts } = await supabaseAdmin
    .from('contacts')
    .select('id, name, phone_number, opted_in')
    .eq('organization_id', orgId)
    .in('phone_number', ['+917483654138']);

  console.log('Final Returned Contacts:', finalContacts);
}

test();
