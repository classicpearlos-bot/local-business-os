import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let waStatus = 'configured';

  try {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) dbStatus = `unhealthy: ${error.message}`;
  } catch (e: any) {
    dbStatus = `error: ${e.message}`;
  }

  try {
    const { data: accounts } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('phone_number_id')
      .limit(1);

    if (!accounts || accounts.length === 0) {
      waStatus = 'unconfigured';
    }
  } catch {
    waStatus = 'unknown';
  }

  const durationMs = Date.now() - startTime;
  const isHealthy = dbStatus === 'healthy';

  return NextResponse.json({
    status: isHealthy ? 'ok' : 'degraded',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    response_time_ms: durationMs,
    services: {
      database: dbStatus,
      whatsapp: waStatus,
      edge_middleware: 'active',
      campaign_worker: 'ready',
      rfm_engine: 'ready',
      flow_builder: 'ready'
    }
  }, { status: isHealthy ? 200 : 503 });
}
