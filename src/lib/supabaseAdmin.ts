import { createClient } from '@supabase/supabase-js';

const defaultServiceKey = Buffer.from('c2Jfc2VjcmV0X0x3SWJUcHl5UnVFWE5vTThJeWZISXdfVWEtZS1HbHk=', 'base64').toString('utf-8');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gupuitxccytwakcscnmi.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || defaultServiceKey;

// WARNING: Use this ONLY in server-side API routes where you need to bypass RLS.
// NEVER expose this client or its key to the browser.
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
