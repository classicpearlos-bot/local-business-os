import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gupuitxccytwakcscnmi.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable__N76nG2yDTCZXUyvoGoiIA_wv4jm7HR';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
