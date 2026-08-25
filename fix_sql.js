const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseAdmin = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const sql = 
  CREATE OR REPLACE FUNCTION public.claim_campaign_recipients(batch_size INT)
  RETURNS TABLE (
    id UUID,
    organization_id UUID,
    campaign_id UUID,
    contact_id UUID,
    phone_number TEXT,
    attempts INT
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS \$\$
  BEGIN
    RETURN QUERY
    WITH claimed AS (
      SELECT cr.id
      FROM public.campaign_recipients cr
      JOIN public.campaigns c ON cr.campaign_id = c.id
      WHERE 
        cr.status IN ('PENDING', 'SCHEDULED')
        AND c.status IN ('QUEUED', 'PROCESSING', 'SCHEDULED') -- FIXED HERE
        AND (cr.scheduled_at IS NULL OR cr.scheduled_at <= NOW())
        AND (cr.next_retry_at IS NULL OR cr.next_retry_at <= NOW())
      ORDER BY cr.scheduled_at ASC NULLS LAST, cr.created_at ASC
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.campaign_recipients u
    SET 
      status = 'PROCESSING',
      processing_at = NOW(),
      attempts = u.attempts + 1,
      last_attempt_at = NOW(),
      updated_at = NOW()
    FROM claimed
    WHERE u.id = claimed.id
    RETURNING 
      u.id, 
      u.organization_id, 
      u.campaign_id, 
      u.contact_id, 
      u.phone_number, 
      u.attempts;
  END;
  \$\$;
  ;
  
  const { error } = await supabaseAdmin.rpc('exec_sql', { query: sql }).catch(() => ({}));
  // Since we don't have exec_sql easily available without a wrapper, I will just create a migration file and run it with postgres client or write a small route handler to execute it.
}
run();
