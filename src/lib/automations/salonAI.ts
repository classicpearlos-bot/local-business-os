import servicesData from './services.json';
import learnedPlaybookData from './salonLearnedPlaybook.json';

export interface ServiceItem {
  ID: number;
  Service: string;
  Category: string;
  'Regular Price': number;
  'Member Price': number;
}

// Clean and categorize services (excluding combos from standard lists)
export const salonCatalog = {
  men: (servicesData.Men as ServiceItem[]).filter(s => !s.Category.toLowerCase().includes('combo')),
  women: (servicesData.Women as ServiceItem[]).filter(s => !s.Category.toLowerCase().includes('combo')),
  both: (servicesData.Both as ServiceItem[]).filter(s => !s.Category.toLowerCase().includes('combo')),
};

export const SALON_INFO = {
  name: 'Classic Pearl Unisex Salon',
  mapsUrl: 'https://share.google/jJemgk5XuiTanHc7P',
  hours: 'Monday to Sunday, 10:00 AM – 9:00 PM (All 7 Days)',
  phone: '+91 83107 30322',
  bookingPhone: '+91 83107 30322',
};

export function formatPriceList(title: string, items: ServiceItem[], note?: string): string {
  let text = `✨ *${title}* ✨\n\n`;
  for (const item of items) {
    text += `• *${item.Service}*\n  Regular: ₹${item['Regular Price']} | Member: ₹${item['Member Price']}\n\n`;
  }
  if (note) {
    text += `${note}\n\n`;
  }
  text += `📍 *Classic Pearl Unisex Salon*\n🕒 Open 10:00 AM – 9:00 PM (All 7 Days)\n📞 *Call / Booking:* ${SALON_INFO.phone}\nWould you like to book an appointment or visit us today? 💛`;
  return text.trim();
}

/**
 * Deterministic Salon Knowledge Engine:
 * Handles direct, casual, and nuanced queries with high conversion accuracy.
 */
export function getSalonDeterministicReply(
  inboundText: string,
  chatHistory: string = '',
  buttonId?: string
): string | null {
  const text = (inboundText || '').trim().toLowerCase();
  const bid = (buttonId || '').toLowerCase();
  const historyLower = (chatHistory || '').toLowerCase();

  // 1. Button Actions & Quick Replies
  if (bid === 'btn_offers' || text.includes("today's offer") || text.includes('todays offer') || text.includes('today offer')) {
    return `Special discounts and exclusive offers are always running at Classic Pearl Unisex Salon! 🎉\n\nThe exact discount details and personalized packages are provided when you visit the salon so our stylists can suggest the best offer for your chosen services. We warmly invite you to visit us!\n\n📍 *Location:* ${SALON_INFO.mapsUrl}\n🕒 *Hours:* ${SALON_INFO.hours}\n📞 *Call Us:* ${SALON_INFO.phone}\n\nWould you like our location or to schedule a visit? 💛`;
  }

  if (bid === 'btn_services' || text === 'view services' || text === 'services') {
    return `✨ *Welcome to Classic Pearl Unisex Salon!* ✨\n\nWe provide luxury grooming & transformation services for both Men and Women:\n\n💇 *Hair Care & Hair Spa* (Haircut, Spa, Keratin, Botox, Color)\n💆 *Relaxing Head Massage* (Almond, Olive, Coconut)\n🧖 *Luxury Facials & Cleanups* (O3+, Korean Glass, Hydra, Fruit)\n💅 *Manicure & Pedicure* (Classic, Crystal, Lotus, De-Tan)\n✨ *Waxing, Threading & Grooming* (Rica, Brazilian, Beard Styling)\n\nWhich service would you like to know more about? 😊`;
  }

  if (bid === 'btn_book' || text === 'book appointment') {
    return `📅 *Book an Appointment at Classic Pearl!* ✨\n\nWe'd love to pamper you! Please share:\n1️⃣ Your preferred service (e.g. Hair Spa, Facial, Haircut)\n2️⃣ Preferred date & time\n3️⃣ Name & number of guests\n\nOur team will reserve your slot right away, or call us at *${SALON_INFO.phone}* for instant confirmation! 💛`;
  }

  // 2. High-Intent Questions: "Is it free now?" / "Are you free right now?" / "Can I come now?"
  if (
    text.includes('free now') || 
    text.includes('free right now') || 
    text.includes('available now') || 
    text.includes('available right now') || 
    text.includes('can i come now') || 
    text.includes('can i come right now') || 
    text.includes('seat free') || 
    text.includes('chair free') ||
    text.includes('slot free') ||
    (text.includes('free') && (text.includes('today') || text.includes('now')))
  ) {
    return `To check real-time chair availability or immediately hold your slot without waiting, please call our salon desk directly at *${SALON_INFO.phone}*! 📞\n\nOur team will hold a stylist for you right away so you can walk in smoothly. We look forward to pampering you! 💛`;
  }

  // 3. Salon Name / Identity: "What is your salon name?" / "Who is this?" / "May I know you?"
  if (
    text.includes('salon name') || 
    text.includes('name of your salon') || 
    text.includes('what is your name') || 
    text.includes('who is this') || 
    text.includes('may i know u') || 
    text.includes('may i know you') ||
    text.includes('which salon')
  ) {
    return `✨ Our salon name is *Classic Pearl Unisex Salon*! ✨\n\nWe are a premier unisex destination specializing in luxury hair transformations, hair spa, skin treatments, hydra facials, pedicures, and grooming.\n\n📍 *Location:* ${SALON_INFO.mapsUrl}\n🕒 *Hours:* ${SALON_INFO.hours}\n📞 *Contact:* ${SALON_INFO.phone}\n\nHow can we pamper you today? 💛`;
  }

  // 4. Location & Directions: "Where is your salon?" / "Where are you located?" / "Location?" / "Where to come?" / "Address?"
  if (
    text.includes('where is') || 
    text.includes('where are you') || 
    text.includes('where to come') || 
    text.includes('where is the salon') || 
    text.includes('location') || 
    text.includes('located') || 
    text.includes('address') || 
    text.includes('which place') ||
    text.includes('where located')
  ) {
    return `📍 *Classic Pearl Unisex Salon Location:*\n${SALON_INFO.mapsUrl}\n\n🕒 *Working Hours:* ${SALON_INFO.hours}\n📞 *Contact / Guidance:* ${SALON_INFO.phone}\n\nWe warmly invite you to visit us! Would you like to reserve a time or need help navigating? 💛`;
  }

  // 5. How to reach / route guidance: "How can I reach?" / "Can someone guide me?" / "How do I get there?"
  if (
    text.includes('how can i reach') || 
    text.includes('how to reach') || 
    text.includes('how do i get there') || 
    text.includes('guide me') || 
    text.includes('directions') || 
    text.includes('route') || 
    text.includes('landmark')
  ) {
    return `You can easily reach us via Google Maps:\n📍 ${SALON_INFO.mapsUrl}\n\nIf you need any guidance on the route or nearby landmarks, please call our front desk directly at *${SALON_INFO.phone}* and our expert will guide you step-by-step! 💛`;
  }

  // 6. Timing & When to come: "When can I come?" / "Closing time?" / "What time open?" / "Can I come today?"
  if (
    text.includes('when can i come') || 
    text.includes('closing time') || 
    text.includes('opening time') || 
    text.includes('what time open') || 
    text.includes('can i come today') || 
    text.includes('are you open') || 
    text.includes('working hours') || 
    text.includes('timings') ||
    text.includes('timing')
  ) {
    return `You can visit us anytime between *10:00 AM to 9:00 PM*, open all 7 days of the week (Monday to Sunday)! 🕒\n\nBoth appointments and walk-ins are warmly welcomed.\n📍 *Location:* ${SALON_INFO.mapsUrl}\n📞 *Direct Call:* ${SALON_INFO.phone}\n\nWhat time would you prefer to visit today? 💛`;
  }

  // 7. Discounts & Offers: "Is there any offer going on?" / "Tomorrow offer continue?" / "Discounts?"
  if (
    text.includes('discount') || 
    text.includes('discounts') || 
    text.includes('offer') || 
    text.includes('offers') || 
    text.includes('deal') || 
    text.includes('deals') ||
    text.includes('tmr is this offer') ||
    text.includes('offer continue')
  ) {
    return `Special discounts and exclusive offers are always running at Classic Pearl Unisex Salon! 🎉\n\nThe exact discount details and personalized packages are provided when you visit the salon so our stylists can suggest the best offer for your chosen services. We warmly invite you to visit us!\n\n📍 *Location:* ${SALON_INFO.mapsUrl}\n🕒 *Hours:* ${SALON_INFO.hours}\n📞 *Contact:* ${SALON_INFO.phone}\n\nWould you like our location or to schedule a visit? 💛`;
  }

  // 8. Combos Inquiry (Strict rule: Ask what services they want to combine)
  if (text.includes('combo') || text.includes('combos') || text.includes('package')) {
    return `Yes! We offer customized combo packages tailored to your needs. ✨\n\nCould you please let us know which specific services you are looking to combine so we can offer you the best possible tailored package?`;
  }

  // Detect gender intent in current message or recent context
  const isMenExplicit = /\b(men|male|gents|man|guy|for men|for male)\b/i.test(text);
  const isWomenExplicit = /\b(women|female|ladies|woman|girl|for women|for female)\b/i.test(text);

  // Check if previous assistant message asked "Men or Women?"
  const contextWasHairSpa = historyLower.includes('hair spa') || historyLower.includes('spa');
  const contextWasHaircut = historyLower.includes('haircut') || historyLower.includes('hair cut');
  const contextWasHeadMassage = historyLower.includes('head massage') || historyLower.includes('massage');
  const contextWasColor = historyLower.includes('color') || historyLower.includes('colour') || historyLower.includes('highlight');

  // Handle single-word answer "men" or "women" following a question
  if (text === 'men' || text === 'for men' || (isMenExplicit && !isWomenExplicit && text.length <= 15)) {
    if (contextWasHairSpa) {
      const menSpa = salonCatalog.men.filter(s => s.Category === 'Men - Hair Spa');
      return formatPriceList(
        'Men Hair Spa Services',
        menSpa,
        '💡 *Stylist Recommendation:* For dry, damaged, or unmanageable hair, we also offer Advanced Chemical Treatments for Men (Keratin, Botox & Nanoplastia starting from ₹3,999).'
      );
    }
    if (contextWasHaircut) {
      const menCuts = salonCatalog.men.filter(s => s.Category === 'Men - Haircut');
      return formatPriceList(
        'Men Haircut Services',
        menCuts,
        '💡 *Most Popular:* Upgrade to *Men Hair Cut with Wash & Blast Dry (₹349)* for a refreshing shampoo scalp cleanse and salon styling!'
      );
    }
    if (contextWasHeadMassage) {
      const menMassage = salonCatalog.men.filter(s => s.Category === 'Men - Head Massage');
      return formatPriceList('Men Head Massage Services', menMassage);
    }
    if (contextWasColor) {
      const menColor = salonCatalog.men.filter(s => s.Category === 'Men - Hair Color');
      return formatPriceList('Men Hair Color Services', menColor);
    }
  }

  if (text === 'women' || text === 'for women' || (isWomenExplicit && !isMenExplicit && text.length <= 15)) {
    if (contextWasHairSpa) {
      const womenSpa = salonCatalog.women.filter(s => s.Category === 'Women - Hair Spa');
      return formatPriceList(
        'Women Hair Spa Services',
        womenSpa,
        '💡 *Senior Stylist Tip:* For frizzy, dull, or colored hair, our restorative Keratin & Botox infusions deeply strengthen and add mirror-shine!'
      );
    }
    if (contextWasHaircut) {
      const womenCuts = salonCatalog.women.filter(s => s.Category === 'Women - Haircut');
      return formatPriceList(
        'Women Haircut Services',
        womenCuts,
        '💡 *Signature Service:* Women Basic Hair Cut with Wash, Blast Dry & Setting (₹599) gives you the perfect runway blowout!'
      );
    }
    if (contextWasHeadMassage) {
      const womenMassage = salonCatalog.women.filter(s => s.Category === 'Women - Head Massage');
      return formatPriceList('Women Head Massage Services', womenMassage);
    }
    if (contextWasColor) {
      const womenColor = salonCatalog.women.filter(s => s.Category === 'Women - Hair Color');
      return formatPriceList('Women Hair Color Services', womenColor);
    }
  }

  // 9. BOTH / UNISEX SERVICES (No gender question asked!)
  // Pedicure
  if (text.includes('pedicure') || text.includes('pedi')) {
    const pedicures = salonCatalog.both.filter(s => s.Category === 'Both - Pedicure');
    return formatPriceList(
      'Pedicure Services (For Both Men & Women)',
      pedicures,
      '💡 *Pampering Upgrade:* For tired or tanned feet, try our *Chocolate Crystal Pedicure (₹1,099)* or *De-Tan Pedicure (₹799)* for deep exfoliation and massage!'
    );
  }

  // Manicure
  if (text.includes('manicure') || text.includes('mani')) {
    const manicures = salonCatalog.both.filter(s => s.Category === 'Both - Manicure');
    return formatPriceList('Manicure Services (For Both Men & Women)', manicures);
  }

  // Facial
  if (text.includes('facial') || text.includes('facials')) {
    const facials = salonCatalog.both.filter(s => s.Category === 'Both - Facial');
    return formatPriceList(
      'Facial Treatments (For Both Men & Women)',
      facials,
      '💡 *Celebrity Favorites:* Experience our *Korean Glass Facial (₹2,199)* or *Hydra Facial (₹2,899)* for immediate glass-skin radiance and deep pore cleansing!'
    );
  }

  // Clean Up
  if (text.includes('clean up') || text.includes('cleanup')) {
    const cleanups = salonCatalog.both.filter(s => s.Category === 'Both - Clean Up');
    return formatPriceList(
      'Clean Up Services (For Both Men & Women)',
      cleanups,
      '💡 *Glow Upgrade:* For deeper pore hydration and lasting glass radiance, ask about our signature Korean Glass Facial when you visit!'
    );
  }

  // De-Tan
  if (text.includes('detan') || text.includes('de-tan') || text.includes('tan')) {
    const detans = salonCatalog.both.filter(s => s.Category === 'Both - De-Tan');
    return formatPriceList('De-Tan Services (For Both Men & Women)', detans);
  }

  // 10. GENDER-SPECIFIC SERVICES
  // Hair Spa
  if (text.includes('hair spa') || text.includes('spa')) {
    if (isMenExplicit && !isWomenExplicit) {
      const menSpa = salonCatalog.men.filter(s => s.Category === 'Men - Hair Spa');
      return formatPriceList(
        'Men Hair Spa Services',
        menSpa,
        '💡 *Advanced Treatments for Men:* Keratin, Botox, and Smoothening / Straightening available from ₹3,999.'
      );
    }
    if (isWomenExplicit && !isMenExplicit) {
      const womenSpa = salonCatalog.women.filter(s => s.Category === 'Women - Hair Spa');
      return formatPriceList('Women Hair Spa Services', womenSpa);
    }
    return `We offer wonderful hair spa and hair rejuvenation treatments for both men and women! ✨\n\nWould you like to know the options and prices for *Men* or *Women*?`;
  }

  // Haircut / Hair Trim
  if (text.includes('haircut') || text.includes('hair cut') || text.includes('hair trim') || text.includes('cut')) {
    if (isMenExplicit && !isWomenExplicit) {
      const menCuts = salonCatalog.men.filter(s => s.Category === 'Men - Haircut');
      return formatPriceList(
        'Men Haircut Services',
        menCuts,
        '💡 *Popular Upgrade:* Upgrade to *Men Hair Cut with Wash & Blast Dry (₹349)* for a fresh scalp cleanse and styling!'
      );
    }
    if (isWomenExplicit && !isMenExplicit) {
      const womenCuts = salonCatalog.women.filter(s => s.Category === 'Women - Haircut');
      return formatPriceList('Women Haircut Services', womenCuts);
    }
    return `We offer professional haircut and styling services for both men and women! 💇\n\nWould you like to see our haircut options for *Men* or *Women*?`;
  }

  // Head Massage
  if (text.includes('head massage') || text.includes('massage')) {
    if (isMenExplicit && !isWomenExplicit) {
      const menMassage = salonCatalog.men.filter(s => s.Category === 'Men - Head Massage');
      return formatPriceList('Men Head Massage Services', menMassage);
    }
    if (isWomenExplicit && !isMenExplicit) {
      const womenMassage = salonCatalog.women.filter(s => s.Category === 'Women - Head Massage');
      return formatPriceList('Women Head Massage Services', womenMassage);
    }
    return `We offer relaxing head massages for both men and women! 💆\n\nWould you like to see our head massage options for *Men* or *Women*?`;
  }

  // Beard / Shave (Men specific)
  if (text.includes('beard') || text.includes('shave') || text.includes('mustache') || text.includes('moustache')) {
    const menBeard = salonCatalog.men.filter(s => s.Category === 'Men - Beard');
    return formatPriceList('Men Beard Grooming & Shaving', menBeard);
  }

  // Waxing / Threading (Women specific)
  if (text.includes('wax') || text.includes('waxing') || text.includes('threading')) {
    const womenWax = salonCatalog.women.filter(s => 
      s.Category === 'Women - Rica Waxing' || 
      s.Category === 'Women - Brazilian Waxing' || 
      s.Category === 'Women - Face Waxing' ||
      s.Category === 'Women - Threading'
    ).slice(0, 10);
    return formatPriceList('Women Waxing & Threading Services', womenWax);
  }

  // Hair Color
  if (text.includes('color') || text.includes('colour') || text.includes('highlights') || text.includes('streaks') || text.includes('balayage')) {
    if (isMenExplicit && !isWomenExplicit) {
      const menColor = salonCatalog.men.filter(s => s.Category === 'Men - Hair Color');
      return formatPriceList('Men Hair Color Services', menColor);
    }
    if (isWomenExplicit && !isMenExplicit) {
      const womenColor = salonCatalog.women.filter(s => s.Category === 'Women - Hair Color').slice(0, 8);
      return formatPriceList('Women Hair Color & Highlights', womenColor);
    }
    return `We offer premium hair coloring, highlights, and global colors for both men and women! 🎨\n\nWould you like to see the options and prices for *Men* or *Women*?`;
  }

  // Chemical Treatments / Advanced Hair Treatments (Botox, Keratin, Nanoplastia)
  if (text.includes('keratin') || text.includes('botox') || text.includes('nanoplastia') || text.includes('smoothen') || text.includes('straighten')) {
    const womenAdv = salonCatalog.women.filter(s => s.Category === 'Women - Advanced Hair Treatment');
    return formatPriceList('Advanced Hair Treatments (Botox / Keratin / Nanoplastia)', womenAdv);
  }

  // Generic greeting or default fallback
  return `✨ *Welcome to Classic Pearl Unisex Salon!* ✨\n\nHow can we pamper you today? We specialize in:\n• Hair Spa, Haircuts & Hair Color\n• Keratin, Botox & Protein Treatments\n• Luxury Facials & Cleanups\n• Pedicure & Manicure\n• Waxing & Head Massage\n\n📍 *Location:* ${SALON_INFO.mapsUrl}\n🕒 *Hours:* ${SALON_INFO.hours}\n📞 *Call Us:* ${SALON_INFO.phone}\n\nPlease let us know what service you are looking for, or if you'd like to book an appointment! 💛`;
}

/**
 * Builds the comprehensive system prompt for Gemini 2.5 Flash,
 * incorporating dynamic daily learnings and consultative upselling rules.
 */
export function buildGeminiPrompt(contactName: string, chatHistory: string, inboundText: string): string {
  const menJson = JSON.stringify(salonCatalog.men, null, 1);
  const womenJson = JSON.stringify(salonCatalog.women, null, 1);
  const bothJson = JSON.stringify(salonCatalog.both, null, 1);
  const playbook = learnedPlaybookData;

  return `You are "Pearl Assistant", the intelligent 24/7 AI WhatsApp concierge for "Classic Pearl Unisex Salon".
Your supreme motto is to CONVERT every inquiry into a salon visit or booking, while keeping the conversation deeply polite, warm, consultative, and professional.

--- SALON DETAILS ---
• Name: ${SALON_INFO.name}
• Location / Maps Link: ${SALON_INFO.mapsUrl}
• Operating Hours: ${SALON_INFO.hours}
• Front Desk & Booking Helpline: ${SALON_INFO.phone}

--- COMPLETE SALON SERVICES & PRICING DATABASE (EXACT PRICES IN ₹) ---

1. MEN SERVICES:
${menJson}

2. WOMEN SERVICES:
${womenJson}

3. BOTH / UNISEX SERVICES (Available for everyone):
${bothJson}

--- DYNAMIC SALON INDUSTRY CONVERSION PLAYBOOK & STRATEGIES ---
${JSON.stringify(playbook.upsellStrategies, null, 2)}

--- STRICT MANDATORY CONVERSATION & CONVERSION RULES ---

RULE 1: GENDER-SPECIFIC SERVICES (Haircut, Hair Spa, Head Massage, Hair Color, Shave/Beard, Waxing, Threading, Chemical Treatments):
- IF GENDER IS NOT SPECIFIED:
  When a customer asks about any of these services without mentioning whether it is for Men or Women (for example: "how much for hair spa?", "haircut price", "head massage cost"):
  You MUST ask them politely:
  "We offer wonderful [service name] for both men and women! ✨ Would you like to know the options and prices for *Men* or *Women*?"
- IF SPECIFIED FOR MEN (or they asked "men hair spa", "men haircut", or replied "men"):
  List the exact Men's service options and prices. (For hair spa/hair treatment, also highlight chemical treatments like Keratin, Botox, Nanoplastia).
- IF SPECIFIED FOR WOMEN (or they asked "women hair spa", "women haircut", or replied "women"):
  List the exact Women's service options and prices.

RULE 2: BOTH / UNISEX SERVICES (Pedicure, Manicure, Facial, Clean Up, De-Tan):
- These services are for BOTH men and women.
- When asked about these services (e.g. "how much for pedicure?", "facial prices", "cleanup", "manicure price", "detan"):
  DO NOT ask "Men or Women?".
  Directly list the available options and prices with Regular Price and Member Price!

RULE 3: CASUAL & HIGH-INTENT CONVERSATIONAL QUESTIONS:
- "Where is your salon located?" / "Where is your salon?" / "Where to come?" / "Address?":
  Share our Google Maps location (${SALON_INFO.mapsUrl}), operating hours (10:00 AM – 9:00 PM, 7 days), and warmly invite them to visit!
- "What is your salon name?" / "Who is this?" / "May I know you?":
  State that our salon is *Classic Pearl Unisex Salon*, provide a brief overview of our luxury hair & beauty services, and share the Maps link!
- "Is it free now?" / "Are you free right now?" / "Can I come now?":
  This is an immediate walk-in intent! Politely tell them:
  "To check real-time chair availability or immediately hold your slot without waiting, please call our salon desk directly at *${SALON_INFO.phone}*! 📞 Our team will hold a stylist for you right away."
- "How can I reach?" / "Can someone guide me?" / "How do I get there?":
  Share the Google Maps link (${SALON_INFO.mapsUrl}) AND give the phone number *${SALON_INFO.phone}* so our front desk can guide them step-by-step!
- "When can I come?" / "Closing time?" / "What time open?":
  Confirm we are open all 7 days from 10:00 AM to 9:00 PM. Both walk-ins and appointments are welcome. Ask what time they plan to visit!
- "Is there any offer going on?" / "Any discounts?":
  Special discounts and exclusive offers are always running at Classic Pearl! The exact discount details and personalized packages are provided when you visit the salon so our stylists can suggest the best offer for your chosen services. Warmly invite them to visit.

RULE 4: CONSULTATIVE UPSELLING (LOW-COST TO PREMIUM VALUE):
- Gently introduce natural value upgrades without sounding pushy or aggressive:
  • Haircut: Mention the popular upgrade to Haircut with Wash & Blast Dry (₹349) for a complete fresh blowout.
  • Clean Up: Mention our radiant Korean Glass Facial or Hydra Facial for deep pore hydration.
  • Hair Spa: Mention that for frizzy/dry hair, stylists also evaluate for Keratin/Botox protein restoration.
  • Pedicure: Mention our soothing Chocolate Crystal or De-Tan pedicures for tired feet.
- Frame upgrades around the client's beauty, relaxation, and confidence!

RULE 5: ACCURATE PRICING & SINGLE SERVICES ONLY (STRICT NO COMBOS):
- ALWAYS display both *Regular Price* and *Member Price* in ₹ (e.g. • *Service*: Regular ₹XXX | Member ₹YYY).
- NEVER hallucinate prices.
- Do NOT list combo packages automatically. If explicitly asked "Do you have combos?", reply:
  "Yes! We offer customized combo packages tailored to your needs. What specific services are you looking to combine so we can offer you the best tailored package?"

RULE 6: WHATSAPP FORMATTING & TONE:
- Format text cleanly for WhatsApp:
  • Use *bold* for service names and prices (single asterisks: *text*).
  • Use bullets • for lists.
  • Do NOT use markdown headers (#, ##, ###).
  • Keep responses concise, clean, beautiful to read on mobile.
- Tone: Warm, welcoming, respectful, professional, always striving to convert them to visit the salon.

--- RECENT CONVERSATION HISTORY ---
${chatHistory}

--- CURRENT MESSAGE FROM CUSTOMER (${contactName}) ---
"${inboundText}"

Reply as Pearl Assistant to keep the customer engaged and convert them:`;
}

/**
 * Main AI Engine Entrypoint:
 * Tries Gemini first, falls back gracefully to the Deterministic Engine.
 */
export async function generateSalonReply(params: {
  apiKey?: string;
  contactName: string;
  inboundText: string;
  buttonId?: string;
  chatHistory?: string;
}): Promise<string> {
  const { apiKey, contactName, inboundText, buttonId, chatHistory = '' } = params;

  // If Gemini key is available, attempt Gemini generation via direct REST API
  if (apiKey && apiKey.length > 5) {
    try {
      const prompt = buildGeminiPrompt(contactName, chatHistory, inboundText);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const candidate = data?.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;

        if (text) {
          let reply = text.trim();

          if (reply.includes('HUMAN_HANDOVER')) {
            return `I'm connecting you with our salon team right away. You can also reach us directly at *${SALON_INFO.phone}*! 💛`;
          }

          // WhatsApp markdown formatting cleanup
          reply = reply
            .replace(/\*\*(.*?)\*\*/g, '*$1*') // Bold: **text** -> *text*
            .replace(/__(.*?)__/g, '_$1_') // Italic: __text__ -> _text_
            .replace(/###\s*(.*)/g, '*$1*') // H3 -> *Header*
            .replace(/##\s*(.*)/g, '*$1*') // H2 -> *Header*
            .replace(/#\s*(.*)/g, '*$1*'); // H1 -> *Header*

          return reply;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error('Gemini API HTTP Error:', res.status, errJson);
      }
    } catch (err) {
      console.error('Gemini AI Generation Error, using deterministic fallback:', err);
    }
  }

  // Deterministic Engine Fallback (Guaranteed 100% 24/7 reliability)
  const deterministicReply = getSalonDeterministicReply(inboundText, chatHistory, buttonId);
  return deterministicReply || `✨ *Welcome to Classic Pearl Unisex Salon!* ✨\n\nHow can we pamper you today? Please let us know which service you are interested in (Haircut, Hair Spa, Facials, Pedicure, Waxing, etc.) or if you'd like to book an appointment!\n\n📍 *Location:* ${SALON_INFO.mapsUrl}\n📞 *Call Us:* ${SALON_INFO.phone} 💛`;
}
