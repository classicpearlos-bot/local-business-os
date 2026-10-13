import { NextRequest, NextResponse } from 'next/server';
import { generateSalonReply, getSalonDeterministicReply, SALON_INFO } from '@/lib/automations/salonAI';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { message, chatHistory = '', buttonId } = body;

    if (!message && !buttonId) {
      return NextResponse.json({ error: 'Message or buttonId is required' }, { status: 400 });
    }

    const text = (message || '').trim().toLowerCase();

    // Determine intent category for diagnostic trace
    let detectedIntent = 'GENERAL_GREETING_INQUIRY';
    let guardrailsTriggered: string[] = [];

    if (
      text.includes('body spa') || 
      text.includes('body massage') || 
      text.includes('full body') || 
      (text.includes('massage') && !text.includes('head'))
    ) {
      detectedIntent = 'STRICT_DOMAIN_BOUNDARY_BODY_MASSAGE';
      guardrailsTriggered.push('Refused Body Spa / Body Massage (Salon Only)');
      guardrailsTriggered.push('Redirected to Head Massages & Hair Spa');
    } else if (
      text.includes('beard') || 
      text.includes('shave') || 
      text.includes('head shave') || 
      text.includes('mustache')
    ) {
      detectedIntent = 'STRICT_MEN_EXCLUSIVE';
      guardrailsTriggered.push('Men Exclusivity Enforced (No Gender Question Asked)');
    } else if (
      text.includes('wax') || 
      text.includes('waxing') || 
      text.includes('threading') || 
      text.includes('perming') || 
      text.includes('ironing') || 
      text.includes('tongs')
    ) {
      detectedIntent = 'STRICT_WOMEN_EXCLUSIVE';
      guardrailsTriggered.push('Women Exclusivity Enforced (No Gender Question Asked)');
    } else if (
      text.includes('pedicure') || 
      text.includes('manicure') || 
      text.includes('facial') || 
      text.includes('cleanup') || 
      text.includes('clean up') || 
      text.includes('detan')
    ) {
      detectedIntent = 'UNISEX_BOTH_SERVICE';
      guardrailsTriggered.push('Unisex Dual-Service Shared Directly (No Gender Question Asked)');
    } else if (
      text.includes('hair spa') || 
      text.includes('haircut') || 
      text.includes('hair cut') || 
      text.includes('head massage') || 
      text.includes('color')
    ) {
      detectedIntent = 'TRUE_DUAL_GENDER_AMBIGUITY';
      if (!text.includes('men') && !text.includes('women')) {
        guardrailsTriggered.push('Gender Clarification Prompt Triggered (Men vs Women)');
      } else {
        guardrailsTriggered.push('Explicit Gender Resolved Without Asking');
      }
    } else if (
      text.includes('free now') || 
      text.includes('available now') || 
      text.includes('can i come')
    ) {
      detectedIntent = 'HIGH_INTENT_WALK_IN_FREE_NOW';
      guardrailsTriggered.push('Immediate Front Desk Helpline Push (+91 83107 30322)');
    } else if (
      text.includes('where') || 
      text.includes('location') || 
      text.includes('address') || 
      text.includes('reach')
    ) {
      detectedIntent = 'LOCATION_AND_DIRECTIONS';
      guardrailsTriggered.push('Direct Google Maps Integration Provided');
    } else if (
      text.includes('discount') || 
      text.includes('offer') || 
      text.includes('deal')
    ) {
      detectedIntent = 'DISCOUNTS_AND_OFFERS';
      guardrailsTriggered.push('Salon Visit Incentive Policy Enforced');
    }

    // Call the production AI reply engine
    let engineUsed = 'Deterministic Salon Knowledge Engine (0ms Hallucination)';
    let reply = '';

    const deterministic = getSalonDeterministicReply(message, chatHistory, buttonId);
    if (deterministic) {
      reply = deterministic;
    } else {
      engineUsed = process.env.GEMINI_API_KEY ? 'Google Gemini 2.5 Flash' : 'Deterministic Fallback Engine';
      reply = await generateSalonReply({
        apiKey: process.env.GEMINI_API_KEY,
        contactName: 'Sandbox Tester',
        inboundText: message,
        buttonId,
        chatHistory
      });
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        reply,
        detectedIntent,
        engineUsed,
        latencyMs,
        guardrailsTriggered,
        salonInfo: {
          name: SALON_INFO.name,
          phone: SALON_INFO.phone,
          mapsUrl: SALON_INFO.mapsUrl
        }
      }
    });
  } catch (error: any) {
    console.error('AI Sandbox Simulation Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Simulation failed' },
      { status: 500 }
    );
  }
}
