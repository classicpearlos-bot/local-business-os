import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, key);

async function test() {
  console.log('Testing Supabase connection...');
  const { data, error } = await supabase.from('organizations').select('id, name').limit(5);
  if (error) {
    console.error('Error fetching organizations:', error);
  } else {
    console.log('Organizations data:', data);
  }

  const { data: campaigns, error: campErr } = await supabase.from('campaigns').select('id, name').limit(5);
  if (campErr) {
    console.error('Error fetching campaigns:', campErr);
  } else {
    console.log('Campaigns data:', campaigns);
  }
}

test();
