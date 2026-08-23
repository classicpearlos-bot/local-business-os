import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'classic_pearls_verify_token_2026';

/**
 * Meta Webhook Verification Handshake (GET)
 * Meta calls this when you click 'Verify and save' in Developer Dashboard
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verification successful!');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[WhatsApp Webhook] Verification token mismatch or invalid mode');
  return new NextResponse('Verification failed', { status: 403 });
}

/**
 * Incoming WhatsApp Messages & Status Updates (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[WhatsApp Webhook] Received event payload:', JSON.stringify(body, null, 2));

    // Acknowledge receipt to Meta immediately with 200 OK
    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error) {
    console.error('[WhatsApp Webhook Error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
