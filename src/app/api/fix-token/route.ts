
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_accounts')
    .update({ 
      access_token: 'EAAkeojCqaqkBSfh6saD2u1L2f29PQDikTCRZCA0R8OPu90NahKzx5WZBQdMh9ovXfPZBEPSMKUHz0OarZCPUZAdX0wODNDSS4sKWzZCx2C34UkvB6XC7Xt0Lt604C01oZCT9ow6oYrvVQ3Kvx5s5VmXhXCx1JV4ZBYakSoZBYQUAGOAnuXlCpVIrrwRPQjEMdmAZDZD'
    })
    .neq('waba_id', 'invalid')
    .select();

  return NextResponse.json({ data, error });
}

