import { createClient } from '@supabase/supabase-js';
import { TEST_CONFIG } from '../config/test-config.mjs';

export const adminClient = createClient(
  TEST_CONFIG.supabaseUrl,
  TEST_CONFIG.supabaseServiceKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const anonClient = createClient(
  TEST_CONFIG.supabaseUrl,
  TEST_CONFIG.supabaseAnonKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function createTestTenant(name = 'QA Test Org') {
  const { data: org, error: orgErr } = await adminClient
    .from('organizations')
    .insert({ name })
    .select('id, name')
    .single();

  if (orgErr) throw new Error(`Failed to create test organization: ${orgErr.message}`);
  return org;
}

export async function cleanupTestTenant(orgId) {
  if (!orgId) return;
  await adminClient.from('organizations').delete().eq('id', orgId);
}
