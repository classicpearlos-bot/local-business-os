import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const DEFAULT_FAQS = [
  {
    id: 'faq_parking',
    question: 'Is parking available at your salon?',
    answer: 'Yes! Free dedicated car & two-wheeler parking is available right in front of Classic Pearl Unisex Salon.',
    category: 'Logistics',
    active: true
  },
  {
    id: 'faq_payment',
    question: 'What payment methods do you accept?',
    answer: 'We accept all payment modes: Google Pay, PhonePe, Paytm, all UPI, Debit Cards, Credit Cards, and Cash.',
    category: 'Billing',
    active: true
  },
  {
    id: 'faq_brands',
    question: 'Which product brands do you use for hair and skin?',
    answer: 'We exclusively use authentic international professional brands: L’Oréal Professional, Matrix, O3+ Professional, and Italian Rica Wax.',
    category: 'Quality',
    active: true
  },
  {
    id: 'faq_bridal',
    question: 'Do you offer bridal and pre-bridal packages?',
    answer: 'Yes! We create bespoke Bridal & Groom transformation packages. Please call +91 83107 30322 to book a private consultation with our head stylist.',
    category: 'Services',
    active: true
  }
];

export async function GET(req: NextRequest) {
  try {
    const orgId = 'f77576e5-ba1d-477e-83b5-67378919b7e1';

    const { data: record } = await supabaseAdmin
      .from('automations')
      .select('action_config')
      .eq('organization_id', orgId)
      .eq('name', 'SALON_AI_CUSTOM_FAQS')
      .maybeSingle();

    const faqs = record?.action_config?.faqs || DEFAULT_FAQS;

    return NextResponse.json({
      success: true,
      data: {
        faqs,
        guardrails: [
          {
            id: 'g_body_massage',
            name: 'Strict Body Massage Boundary',
            description: 'Clarifies unisex salon boundary and pivots to Head Massages & Hair Spa. Never accepts body massage.',
            status: 'ACTIVE',
            type: 'SAFETY'
          },
          {
            id: 'g_men_exclusivity',
            name: 'Strict Men Exclusivity',
            description: 'Beard trim, beard styling, beard shave, and head shave directly return Men prices. Never asks gender.',
            status: 'ACTIVE',
            type: 'ROUTING'
          },
          {
            id: 'g_women_exclusivity',
            name: 'Strict Women Exclusivity',
            description: 'Waxing, threading, and perming directly return Women prices. Never asks gender.',
            status: 'ACTIVE',
            type: 'ROUTING'
          },
          {
            id: 'g_unisex_direct',
            name: 'Unisex Direct Pricing',
            description: 'Pedicure, Manicure, Facial, Clean Up, De-Tan provide regular & member prices without asking gender.',
            status: 'ACTIVE',
            type: 'PRICING'
          },
          {
            id: 'g_anti_hallucination',
            name: 'Zero Combo Hallucination',
            description: 'Never invents combos. Asks customer what services they wish to pair for custom discounts.',
            status: 'ACTIVE',
            type: 'COMMERCE'
          },
          {
            id: 'g_daily_learning',
            name: 'Autonomous Self-Learning Engine',
            description: 'Analyzes daily inbound conversations at 3:00 AM and adapts consultative playbook.',
            status: 'ACTIVE',
            type: 'AI_LEARNING'
          }
        ]
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = 'f77576e5-ba1d-477e-83b5-67378919b7e1';
    const body = await req.json();
    const { faqs } = body;

    if (!Array.isArray(faqs)) {
      return NextResponse.json({ error: 'faqs must be an array' }, { status: 400 });
    }

    const payload = {
      organization_id: orgId,
      name: 'SALON_AI_CUSTOM_FAQS',
      active: true,
      priority: 998,
      trigger_type: 'AI_KNOWLEDGE_BASE',
      action_type: 'JSON_DATA',
      action_config: { faqs, updated_at: new Date().toISOString() },
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabaseAdmin
      .from('automations')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', 'SALON_AI_CUSTOM_FAQS')
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from('automations').update(payload).eq('id', existing.id);
    } else {
      await supabaseAdmin.from('automations').insert(payload);
    }

    return NextResponse.json({ success: true, message: 'Knowledge base updated successfully', faqs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
