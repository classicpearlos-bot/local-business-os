import { supabaseAdmin } from '../supabaseAdmin';

export async function queueTenantWebhook(orgId: string, eventType: string, payload: any) {
  // 1. Fetch active webhooks for this organization that subscribe to this event
  const { data: webhooks } = await supabaseAdmin
    .from('tenant_webhooks')
    .select('id, events')
    .eq('organization_id', orgId)
    .eq('active', true);

  if (!webhooks || webhooks.length === 0) return;

  const webhooksToQueue = webhooks.filter(w => {
    // If events is empty or contains the eventType, we queue it
    if (!w.events || !Array.isArray(w.events) || w.events.length === 0) return true;
    return w.events.includes(eventType);
  });

  if (webhooksToQueue.length === 0) return;

  // 2. Insert into tenant_webhook_deliveries (the queue)
  const deliveries = webhooksToQueue.map(w => ({
    organization_id: orgId,
    webhook_id: w.id,
    event_id: eventType,
    payload: {
      event: eventType,
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      organization_id: orgId,
      data: payload
    },
    status: 'PENDING'
  }));

  const { error } = await supabaseAdmin.from('tenant_webhook_deliveries').insert(deliveries);
  if (error) console.error('Failed to queue tenant webhooks', error);
}
