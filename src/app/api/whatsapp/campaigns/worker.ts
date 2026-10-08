import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { chunkedBroadcast } from '@/lib/whatsapp/broadcast';
import { WhatsappMessage } from '@/lib/whatsapp/types';

/**
 * Simple worker that processes pending campaign recipients.
 * It is invoked via a GET request with query params:
 *   ?campaign_id=123
 *   ?secret=YOUR_CRON_SECRET
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get('campaign_id');
  const secret = url.searchParams.get('secret');

  // Simple auth – protect the endpoint
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  if (!campaignId) {
    return new NextResponse('Missing campaign_id', { status: 400 });
  }

  // Fetch campaign info (to retrieve the message payload)
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('template_name, template_language, template_components')
    .eq('id', campaignId)
    .single();

  if (!campaign) {
    return new NextResponse('Campaign not found', { status: 404 });
  }

  // Build a generic WhatsApp message payload based on stored template data
  const payload: WhatsappMessage = {
    messaging_product: 'whatsapp',
    to: '', // will be populated per contact inside chunkedBroadcast
    type: 'template',
    template: {
      name: campaign.template_name,
      language: { code: campaign.template_language },
      components: campaign.template_components,
    },
  };

  // Retrieve pending recipients for this campaign
  const { data: recipients } = await supabaseAdmin
    .from('campaign_recipients')
    .select('contact_id, phone_number')
    .eq('campaign_id', campaignId)
    .eq('status', 'PENDING');

  if (!recipients || recipients.length === 0) {
    return new NextResponse('No pending recipients', { status: 200 });
  }

  // Mark them as sending to avoid duplicate processing
  const ids = recipients.map(r => r.contact_id);
  await supabaseAdmin
    .from('campaign_recipients')
    .update({ status: 'SENDING' })
    .in('contact_id', ids);

  // Execute chunked broadcast (async, fire‑and‑forget). Errors are logged inside the utility.
  await chunkedBroadcast(
    recipients as any,
    payload,
    campaign.organization_id as string,
    campaignId as string
  );

  // After processing, mark any still in SENDING as SENT (the utility logs failures)
  await supabaseAdmin
    .from('campaign_recipients')
    .update({ status: 'SENT' })
    .in('contact_id', ids);

  return NextResponse.json({ success: true, processed: recipients.length });
}
