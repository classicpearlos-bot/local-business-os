export interface AIIntent {
  id: string;
  name: string;
  category: 'PRICING' | 'BOOKING' | 'SERVICE_INFO' | 'HUMAN_SUPPORT' | 'LOCATION';
  description: string;
  training_phrases: string[];
  response_template: string;
  confidence_threshold: number; // e.g. 0.85
  auto_reply_enabled: boolean;
}

export const DEFAULT_SALON_AI_INTENTS: AIIntent[] = [
  {
    id: 'intent_botox_price',
    name: 'Hair Botox & Deep Repair Price',
    category: 'PRICING',
    description: 'Triggered when client inquires about Hair Botox cost or treatment duration',
    training_phrases: [
      'how much for hair botox',
      'hair botox price',
      'cost of botox treatment',
      'hair botox offers',
      'botox hair spa price'
    ],
    response_template: '✨ Our Luxury Hair Botox & Deep Repair treatment starts from ₹3,499 (depending on hair length). It restores damaged cuticles, eliminates frizz, and adds high-gloss shine for up to 4 months.\n\nWould you like to book a free hair consultation with our Senior Stylist?',
    confidence_threshold: 0.85,
    auto_reply_enabled: true
  },
  {
    id: 'intent_nanoplastia',
    name: 'Nanoplastia Smoothing Treatment',
    category: 'SERVICE_INFO',
    description: 'Triggered when client asks about Nanoplastia ingredients or benefits',
    training_phrases: [
      'what is nanoplastia',
      'nanoplastia cost',
      'difference between keratin and nanoplastia',
      'organic hair smoothing price'
    ],
    response_template: '🌿 Nanoplastia is an organic, formaldehyde-free amino acid smoothing treatment starting from ₹4,999. It provides 100% straight, silky hair while nourishing the inner cortex.\n\nShall I check slot availability for you today?',
    confidence_threshold: 0.85,
    auto_reply_enabled: true
  },
  {
    id: 'intent_human_handover',
    name: 'Talk to Human Stylist / Manager',
    category: 'HUMAN_SUPPORT',
    description: 'Transfers chat directly to salon reception desk',
    training_phrases: [
      'talk to human',
      'connect to manager',
      'call me back',
      'i want to talk to staff',
      'complaint about service'
    ],
    response_template: '👤 Connecting you directly with our Front Desk Manager. A senior team member will reply to you here shortly!',
    confidence_threshold: 0.70,
    auto_reply_enabled: true
  },
  {
    id: 'intent_timings_location',
    name: 'Salon Timings & Address',
    category: 'LOCATION',
    description: 'Provides salon working hours and Google Maps directions',
    training_phrases: [
      'what time do you open',
      'salon address',
      'working hours',
      'where is classic pearl salon located',
      'are you open today'
    ],
    response_template: '📍 Classic Pearl Unisex Salon is open all 7 days from 10:00 AM to 08:30 PM.\n\n📍 Landmark: Main High Street, Bengaluru.\n🚗 Free client parking available.',
    confidence_threshold: 0.85,
    auto_reply_enabled: true
  }
];

// Adversarial Injection Filter (Prompt Injection Defense)
const PROMPT_INJECTION_PATTERNS = [
  'ignore previous instructions',
  'ignore all instructions',
  'system prompt',
  'reveal prompt',
  'api key',
  'secret key',
  'developer mode',
  'jailbreak',
  'bypass',
  'sql injection',
  'drop table'
];

/**
 * Classify incoming customer message intent with prompt injection defense
 */
export function classifyIntent(messageText: string): { 
  intent: AIIntent | null; 
  confidence: number; 
  suggestedAction: 'AUTO_REPLY' | 'CLARIFY' | 'HUMAN_HANDOVER';
  isFlaggedInjection?: boolean;
} {
  const clean = (messageText || '').toLowerCase().trim();

  // 1. PROMPT INJECTION DEFENSE GUARD
  const hasInjection = PROMPT_INJECTION_PATTERNS.some(pat => clean.includes(pat));
  if (hasInjection) {
    return {
      intent: null,
      confidence: 0,
      suggestedAction: 'HUMAN_HANDOVER',
      isFlaggedInjection: true
    };
  }

  const inputWords = clean.split(/\s+/).filter(w => w.length > 2);

  let bestMatch: AIIntent | null = null;
  let highestScore = 0;

  for (const intent of DEFAULT_SALON_AI_INTENTS) {
    for (const phrase of intent.training_phrases) {
      const phraseLower = phrase.toLowerCase();
      // Exact substring match
      if (clean.includes(phraseLower)) {
        if (0.95 > highestScore) {
          highestScore = 0.95;
          bestMatch = intent;
        }
      } else {
        // Word token overlap match
        const phraseWords = phraseLower.split(/\s+/).filter(w => w.length > 2);
        const matchCount = phraseWords.filter(pw => inputWords.some(iw => iw.includes(pw) || pw.includes(iw))).length;
        if (phraseWords.length > 0) {
          const score = (matchCount / phraseWords.length) * 0.90;
          if (score > highestScore && score >= 0.60) {
            highestScore = score;
            bestMatch = intent;
          }
        }
      }
    }
  }

  // Evaluate Confidence Thresholds (Strict Routing)
  if (bestMatch && highestScore >= (bestMatch.confidence_threshold || 0.80)) {
    return {
      intent: bestMatch,
      confidence: Math.round(highestScore * 100) / 100,
      suggestedAction: bestMatch.category === 'HUMAN_SUPPORT' ? 'HUMAN_HANDOVER' : 'AUTO_REPLY'
    };
  } else if (bestMatch && highestScore >= 0.55) {
    return {
      intent: bestMatch,
      confidence: Math.round(highestScore * 100) / 100,
      suggestedAction: 'CLARIFY'
    };
  } else {
    return {
      intent: null,
      confidence: 0,
      suggestedAction: 'HUMAN_HANDOVER'
    };
  }
}
