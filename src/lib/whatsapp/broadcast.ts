import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Sends a WhatsApp message to a batch of contacts with retry & exponential backoff.
 */
export async function sendChunk(
  contacts: { phone_number: string; contact_id: string }[],
  payload: any,
  orgId: string,
  campaignId: string,
  maxAttempts = 5
) {
  const attemptSend = async (attempt: number): Promise<void> => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contacts.map(c => c.phone_number),
          payload,
          organization_id: orgId,
          campaign_id: campaignId,
        }),
      });
    } catch (err) {
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise(res => setTimeout(res, delay));
        return attemptSend(attempt + 1);
      }
      // Record permanent failure
      await supabaseAdmin.from('broadcast_errors').insert({
        organization_id: orgId,
        campaign_id: campaignId,
        contact_ids: contacts.map(c => c.contact_id),
        error_message: (err as Error).message,
        attempts: attempt,
      });
    }
  };
  await attemptSend(1);
}

/**
 * Splits a large contact list into manageable chunks and sends each chunk sequentially.
 */
export async function chunkedBroadcast(
  allContacts: { phone_number: string; contact_id: string }[],
  payload: any,
  orgId: string,
  campaignId: string,
  chunkSize = 500
) {
  for (let i = 0; i < allContacts.length; i += chunkSize) {
    const chunk = allContacts.slice(i, i + chunkSize);
    await sendChunk(chunk, payload, orgId, campaignId);
    // Optional pause to respect rate limits (default ~5 QPS)
    await new Promise(res => setTimeout(res, 200));
  }
}
