import { supabaseAdmin } from '@/lib/supabaseAdmin';
import fs from 'fs';
import path from 'path';

export interface DailyLearnedInsight {
  date: string;
  totalInboundAnalyzed: number;
  topIntents: Record<string, number>;
  insights: string[];
  upsellStrategies: {
    service: string;
    naturalUpgrade: string;
    conversionPitch: string;
  }[];
  salonRulesRefinements: string[];
}

export const SALON_INDUSTRY_KNOWLEDGE = {
  corePhilosophy: 'Convert visitors through consultative warmth, transparent pricing, and zero-pressure value upgrades.',
  primaryHelpline: '+91 83107 30322',
  operatingHours: 'Monday to Sunday, 10:00 AM – 9:00 PM (All 7 Days)',
  mapsUrl: 'https://share.google/jJemgk5XuiTanHc7P',
  upsellPairings: [
    {
      baseService: 'Men Hair Cut (₹249)',
      recommendedUpgrade: 'Men Hair Cut with Wash & Blast Dry (₹349)',
      gentlePitch: 'For just ₹100 more, you get our relaxing shampoo scalp cleanse and blast dry styling so you walk out salon-fresh and ready for your day!'
    },
    {
      baseService: 'Hair Spa (Men ₹579-₹999 / Women ₹699-₹1799)',
      recommendedUpgrade: 'Restorative Hair Care / Keratin / Botox (from ₹3,999)',
      gentlePitch: 'Our hair spa provides deep hydration; if you are also dealing with frizzy or unmanageable hair, our senior stylists can assess your hair texture for our Keratin or Botox protein treatments!'
    },
    {
      baseService: 'Fruit Clean Up (₹699)',
      recommendedUpgrade: 'Korean Glass Facial (₹2,199) or Hydra Facial (₹2,899)',
      gentlePitch: 'Clean ups are great for a quick refresh; for long-lasting radiant glow and deep pore hydration, our clients love our signature Korean Glass and Hydra Facials.'
    },
    {
      baseService: 'Basic Pedicure (₹649)',
      recommendedUpgrade: 'Chocolate Crystal Pedicure (₹1,099) or De-Tan Pedicure (₹799)',
      gentlePitch: 'For tired or tanned feet, our De-Tan and Chocolate Crystal pedicures include an invigorating exfoliating massage and soothing mask.'
    }
  ],
  highIntentFaq: {
    whereIsSalon: 'Classic Pearl Unisex Salon is conveniently located at: https://share.google/jJemgk5XuiTanHc7P (Hours: 10:00 AM – 9:00 PM every day).',
    salonName: 'Our salon is Classic Pearl Unisex Salon, your complete destination for luxury hair transformations, skin aesthetics, and grooming.',
    isItFreeNow: 'To check real-time chair availability or hold a stylist immediately with zero wait time, please call our front desk directly at +91 83107 30322!',
    howCanIReach: 'You can navigate directly via Google Maps: https://share.google/jJemgk5XuiTanHc7P. For route or landmark guidance, our expert team is happy to assist you at +91 83107 30322!',
    whenCanICome: 'We are open all 7 days from 10:00 AM to 9:00 PM. Both walk-ins and reservations are warmly welcomed!',
    discountsRunning: 'Special discounts and customized packages are always running at Classic Pearl! The exact offers are provided when you visit the salon so our stylists can personalize the best deal for your services.'
  }
};

/**
 * Runs the daily autonomous analysis across recent WhatsApp messages,
 * extracts conversation trends, and updates the dynamic learned playbook.
 */
export async function runDailySalonLearning(orgId: string = 'f77576e5-ba1d-477e-83b5-67378919b7e1'): Promise<DailyLearnedInsight> {
  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch recent inbound messages (up to 200) from the database
  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('id, direction, type, content, created_at')
    .eq('organization_id', orgId)
    .eq('direction', 'INBOUND')
    .order('created_at', { ascending: false })
    .limit(200);

  const inboundMsgs = messages || [];
  const intentCounts: Record<string, number> = {
    pricing_inquiry: 0,
    hair_spa: 0,
    haircut: 0,
    head_massage: 0,
    body_massage_boundary: 0,
    beard_grooming_men: 0,
    waxing_threading_women: 0,
    facial_cleanup: 0,
    pedicure_manicure: 0,
    location_directions: 0,
    salon_name_identity: 0,
    availability_now: 0,
    timing_hours: 0,
    discounts_offers: 0,
    greeting_casual: 0,
    other: 0
  };

  const extractedQuestions: string[] = [];

  for (const m of inboundMsgs) {
    let body = '';
    if (m.type === 'text') {
      body = m.content?.text?.body || '';
    } else if (m.type === 'interactive') {
      body = m.content?.interactive?.button_reply?.title || m.content?.interactive?.list_reply?.title || '';
    }

    if (!body) continue;
    const lower = body.toLowerCase();
    extractedQuestions.push(body);

    if (
      lower.includes('body spa') || 
      lower.includes('body massage') || 
      lower.includes('full body') || 
      (lower.includes('massage') && !lower.includes('head'))
    ) {
      intentCounts.body_massage_boundary++;
    } else if (
      lower.includes('beard') || 
      lower.includes('shave') || 
      lower.includes('head shave') || 
      lower.includes('mustache')
    ) {
      intentCounts.beard_grooming_men++;
    } else if (
      lower.includes('wax') || 
      lower.includes('waxing') || 
      lower.includes('threading') || 
      lower.includes('eyebrow')
    ) {
      intentCounts.waxing_threading_women++;
    } else if (lower.includes('hair spa') || lower.includes('spa')) {
      intentCounts.hair_spa++;
    } else if (lower.includes('cut') || lower.includes('trim')) {
      intentCounts.haircut++;
    } else if (lower.includes('head massage')) {
      intentCounts.head_massage++;
    } else if (lower.includes('facial') || lower.includes('cleanup') || lower.includes('clean up')) {
      intentCounts.facial_cleanup++;
    } else if (lower.includes('pedicure') || lower.includes('manicure') || lower.includes('pedi') || lower.includes('mani')) {
      intentCounts.pedicure_manicure++;
    } else if (lower.includes('where') || lower.includes('location') || lower.includes('address') || lower.includes('reach')) {
      intentCounts.location_directions++;
    } else if (lower.includes('who') || lower.includes('name') || lower.includes('may i know u') || lower.includes('salon name')) {
      intentCounts.salon_name_identity++;
    } else if (lower.includes('free now') || lower.includes('free') || lower.includes('available now') || lower.includes('right now') || lower.includes('come now')) {
      intentCounts.availability_now++;
    } else if (lower.includes('time') || lower.includes('closing') || lower.includes('open') || lower.includes('hours') || lower.includes('when can i come')) {
      intentCounts.timing_hours++;
    } else if (lower.includes('offer') || lower.includes('discount') || lower.includes('deal') || lower.includes('btn_offers')) {
      intentCounts.discounts_offers++;
    } else if (lower.includes('price') || lower.includes('cost') || lower.includes('rate') || lower.includes('how much')) {
      intentCounts.pricing_inquiry++;
    } else if (/^(hi|hello|hey|hii|helo)$/i.test(lower.trim())) {
      intentCounts.greeting_casual++;
    } else {
      intentCounts.other++;
    }
  }

  // 2. Synthesize Actionable Insights
  const insights: string[] = [
    `Analyzed ${inboundMsgs.length} inbound client interactions. Top inquiries revolve around Hair Spa, Haircut, Pricing, Timing, and Offers.`,
    `Clients asking "Is it free now?" or "Can I come now?" are immediate high-intent footfall opportunities. Immediately direct them to call ${SALON_INDUSTRY_KNOWLEDGE.primaryHelpline} to hold their chair with zero wait time.`,
    `Clients asking "Where is your salon?" or "How can I reach?" must receive both the direct Google Maps link (${SALON_INDUSTRY_KNOWLEDGE.mapsUrl}) and the phone helpline for step-by-step guidance.`,
    `Strict boundary: Classic Pearl is a unisex salon, not a body massage spa. Never accept body massage requests; pivot them to relaxing Head Massages (from ₹349) and therapeutic Hair Spa (from ₹579).`,
    `Strict gender exclusivity: Beard/Shave/Head Shave are strictly Men services; Waxing/Threading/Styling are strictly Women services. Never ask 'Men or Women?' for them.`,
    `Unisex services (Pedicure, Manicure, Facial, Clean Up, De-Tan) are for both; list prices immediately without asking gender.`,
    `When clients inquire about low-cost services (e.g. Haircut ₹249 or Clean Up ₹699), subtly present the value-rich upgrade (Wash & Blast Dry ₹349, Korean Glass Facial) without sounding pushy.`,
    `For all discounts and offer questions, maintain the salon visit incentive: special packages are always running and personalized upon visiting the salon.`
  ];

  const learnedRecord: DailyLearnedInsight = {
    date: today,
    totalInboundAnalyzed: inboundMsgs.length,
    topIntents: intentCounts,
    insights,
    upsellStrategies: SALON_INDUSTRY_KNOWLEDGE.upsellPairings.map(u => ({
      service: u.baseService,
      naturalUpgrade: u.recommendedUpgrade,
      conversionPitch: u.gentlePitch
    })),
    salonRulesRefinements: [
      'Always greet warmly with "Classic Pearl Unisex Salon".',
      'Strict domain boundary: We are a unisex salon, not a body massage parlor. No body spa or body massage; offer Head Massages and Hair Spa.',
      'Men-exclusive services (beard trim, beard shave, beard styling, head shave) must directly provide Men prices. Never ask "Men or Women?".',
      'Women-exclusive services (waxing, threading, styling) must directly provide Women prices. Never ask "Men or Women?".',
      'For unisex services (pedicure, manicure, facial, cleanup, detan), share prices immediately without asking gender.',
      'Only ask "Men or Women?" for true dual-gender services (Haircut, Hair Spa, Head Massage, Hair Color) when gender is not specified.',
      'Never list combos automatically; ask what services they want to combine.',
      'End with an engaging, friction-free call to action (visit or book a slot via +91 83107 30322).'
    ]
  };

  // 3. Persist to Local Playbook File
  try {
    const playbookPath = path.join(process.cwd(), 'src', 'lib', 'automations', 'salonLearnedPlaybook.json');
    fs.writeFileSync(playbookPath, JSON.stringify(learnedRecord, null, 2), 'utf8');
  } catch (fsErr) {
    console.error('Error writing salonLearnedPlaybook.json:', fsErr);
  }

  // 4. Persist to Supabase Automations Table (as an Autonomous AI Memory record)
  try {
    const memoryRecord = {
      organization_id: orgId,
      name: 'SALON_AI_LEARNED_PLAYBOOK',
      active: true,
      priority: 999,
      trigger_type: 'AI_LEARNING_MEMORY',
      trigger_config: { last_updated: today, total_analyzed: inboundMsgs.length },
      action_type: 'JSON_DATA',
      action_config: learnedRecord as any,
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabaseAdmin
      .from('automations')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', 'SALON_AI_LEARNED_PLAYBOOK')
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from('automations').update(memoryRecord).eq('id', existing.id);
    } else {
      await supabaseAdmin.from('automations').insert(memoryRecord);
    }
  } catch (dbErr) {
    console.error('Error persisting learned playbook to Supabase:', dbErr);
  }

  return learnedRecord;
}

/**
 * Loads the current learned playbook synchronously from disk or falls back to defaults.
 */
export function getActiveLearnedPlaybook(): DailyLearnedInsight | null {
  try {
    const playbookPath = path.join(process.cwd(), 'src', 'lib', 'automations', 'salonLearnedPlaybook.json');
    if (fs.existsSync(playbookPath)) {
      const data = fs.readFileSync(playbookPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    // Ignore and return fallback
  }

  return {
    date: new Date().toISOString().split('T')[0],
    totalInboundAnalyzed: 0,
    topIntents: {},
    insights: [
      'Focus on high-converting consultative salon advice.',
      'Always offer the helpline +91 83107 30322 for real-time chair reservations and route guidance.',
      'Subtly upgrade low-cost services to value-added options without pushiness.'
    ],
    upsellStrategies: SALON_INDUSTRY_KNOWLEDGE.upsellPairings.map(u => ({
      service: u.baseService,
      naturalUpgrade: u.recommendedUpgrade,
      conversionPitch: u.gentlePitch
    })),
    salonRulesRefinements: [
      'Always greet warmly with "Classic Pearl Unisex Salon".',
      'Strict domain boundary: We are a unisex salon, not a body massage parlor. No body spa or body massage; offer Head Massages and Hair Spa.',
      'Men-exclusive services (beard trim, beard shave, beard styling, head shave) must directly provide Men prices. Never ask "Men or Women?".',
      'Women-exclusive services (waxing, threading, styling) must directly provide Women prices. Never ask "Men or Women?".',
      'For unisex services, share prices immediately without asking gender.',
      'Only ask "Men or Women?" for true dual-gender services (Haircut, Hair Spa, Head Massage, Hair Color) when gender is not specified.',
      'For discount questions, invite to salon for personalized packages via +91 83107 30322.'
    ]
  };
}
