import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppText, sendWhatsAppTemplate } from '@/lib/meta/whatsapp';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

    // Hash the incoming token
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    // 1. Authenticate the API Key
    const { data: apiKey } = await supabaseAdmin
      .from('api_keys')
      .select('organization_id, expires_at, revoked_at')
      .eq('key_hash', hash)
      .single();

    if (!apiKey) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
    }

    if (apiKey.revoked_at) {
      return NextResponse.json({ error: 'API Key revoked' }, { status: 401 });
    }

    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return NextResponse.json({ error: 'API Key expired' }, { status: 401 });
    }

    // 2. Process Request
    const payload = await request.json();
    const orgId = apiKey.organization_id;

    // Idempotency check (simplified: normally would check a Redis store or table)
    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey) {
      // Check if it already exists
      const { data: existingReq, error: fetchErr } = await supabaseAdmin
        .from('api_requests')
        .select('*')
        .eq('organization_id', orgId)
        .eq('idempotency_key', idempotencyKey)
        .single();
        
      if (existingReq) {
        if (existingReq.status === 'PROCESSING') {
          return NextResponse.json({ error: 'Request is already processing' }, { status: 409 });
        }
        return NextResponse.json(existingReq.response_body, { status: existingReq.response_status });
      }

      // Claim it
      const { error: insertErr } = await supabaseAdmin
        .from('api_requests')
        .insert({
          organization_id: orgId,
          idempotency_key: idempotencyKey,
          status: 'PROCESSING'
        });
      
      if (insertErr) {
        // If it failed because another request inserted the same key right at this moment (race condition),
        // postgres unique constraint will throw an error
        return NextResponse.json({ error: 'Concurrent request conflict' }, { status: 409 });
      }
    }

    // Fetch WA Account
    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('phone_number_id, access_token')
      .eq('organization_id', orgId)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Meta WhatsApp account not configured' }, { status: 400 });
    }

    let response;
    
    // 3. Dispatch to Meta
    if (payload.type === 'text') {
      response = await sendWhatsAppText({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: payload.to
      }, payload.text?.body || '');
    } else if (payload.type === 'template') {
      response = await sendWhatsAppTemplate({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: payload.to
      }, payload.template?.name, payload.template?.language?.code, payload.template?.components || []);
    } else {
      return NextResponse.json({ error: 'Unsupported message type. Use "text" or "template".' }, { status: 400 });
    }

    let finalResponse;
    let finalStatus = 200;

    if (response.error) {
       finalResponse = { error: response.error.message };
       finalStatus = 400;
    } else {
       finalResponse = { 
         success: true, 
         message_id: response.messages?.[0]?.id, 
         status: 'queued' 
       };
    }

    if (idempotencyKey) {
       await supabaseAdmin.from('api_requests').update({
         status: 'COMPLETED',
         response_status: finalStatus,
         response_body: finalResponse,
         updated_at: new Date().toISOString()
       }).eq('organization_id', orgId).eq('idempotency_key', idempotencyKey);
    }

    return NextResponse.json(finalResponse, { status: finalStatus });

  } catch (error: any) {
    console.error('API Send Error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
