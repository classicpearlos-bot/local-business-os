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
  const displayItems = items.slice(0, 5);
  let text = `✨ *${title}* 🟢\n\n`;
  for (const item of displayItems) {
    text += `🟢 *${item.Service}:* ₹${item['Regular Price']} _(Member: ₹${item['Member Price']})_\n`;
  }
  if (items.length > 5) {
    text += `_...and more options available at the salon!_\n`;
  }
  if (note) {
    text += `\n${note}\n`;
  }
  text += `\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`;
  return text.trim();
}

/**
 * Deterministic Salon Knowledge Engine:
 * Handles direct, casual, and nuanced queries with high conversion accuracy.
 * Kept short, crisp, and highlighted with green bullets.
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
  if (
    bid === 'btn_offers' || 
    text.includes("today's offer") || text.includes('todays offer') || text.includes('today offer') ||
    text.includes('discount') || text.includes('discounts') || text.includes('offer') || text.includes('offers') ||
    text.includes('deal') || text.includes('deals') || text.includes('tmr is this offer') || text.includes('offer continue')
  ) {
    return `🎉 *Special Offers & Discounts Active!* 🟢\n\nWe have exciting in-salon offers running on *Hair Care*, *Facials* & *Grooming*! Personalized discounts are applied during your stylist consultation.\n\n📍 *Location:* ${SALON_INFO.mapsUrl}\n🕒 *Hours:* 10:00 AM – 9:00 PM (All 7 Days)\n📞 *Call / Hold Slot:* ${SALON_INFO.phone}\n\nWould you like to visit us today? 💛`;
  }

  if (bid === 'btn_services' || text === 'view services' || text === 'services') {
    return `✨ *Classic Pearl Unisex Salon Menu* 🟢\n\n🟢 *Hair Care & Hair Spa* (Haircut, Spa, Keratin, Color)\n🟢 *Relaxing Head Massage* (Almond, Olive, Coconut)\n🟢 *Luxury Facials & Cleanups* (O3+, Korean Glass, Hydra)\n🟢 *Manicure & Pedicure* (Crystal, Lotus, De-Tan)\n🟢 *Waxing, Threading & Beard Styling*\n\n📞 *Call / Book:* ${SALON_INFO.phone}\nWhich service would you like details on? 😊`;
  }

  if (bid === 'btn_book' || text === 'book appointment') {
    return `📅 *Book Your Slot at Classic Pearl!* 🟢\n\nPlease share:\n1️⃣ *Preferred Service* (e.g. Hair Spa, Facial, Haircut)\n2️⃣ *Preferred Date & Time*\n3️⃣ *Name & Number of Guests*\n\nOr call us directly at 📞 *${SALON_INFO.phone}* for instant slot reservation! 💛`;
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
    return `🟢 *Yes, walk-ins are warmly welcome!* 🕒\n\nTo hold your stylist with *zero waiting time*, please call our desk right now at 📞 *${SALON_INFO.phone}*. We'll keep a chair ready for you! 💛`;
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
    return `✨ *Classic Pearl Unisex Salon* 🟢\n\nWe are a premium salon specializing in luxury *Hair Care*, *Skin Aesthetics*, *Pedicure* & *Grooming*.\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n🕒 *Hours:* ${SALON_INFO.hours}\n📞 *Call:* ${SALON_INFO.phone}\nHow can we pamper you today? 💛`;
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
    return `📍 *Classic Pearl Unisex Salon Location:* 🟢\n${SALON_INFO.mapsUrl}\n\n🕒 *Hours:* 10:00 AM – 9:00 PM (All 7 Days)\n📞 *Call for Route Guidance:* ${SALON_INFO.phone}\n\nWould you like us to reserve a slot for your visit? 💛`;
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
    return `📍 *Navigate via Google Maps:* 🟢\n${SALON_INFO.mapsUrl}\n\nFor live landmark guidance, call our front desk directly at 📞 *${SALON_INFO.phone}* and our team will guide you step-by-step! 💛`;
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
    return `🕒 *We are open 10:00 AM to 9:00 PM every day (Monday to Sunday)!* 🟢\n\nWalk-ins and appointments are warmly welcome.\n📍 *Location:* ${SALON_INFO.mapsUrl}\n📞 *Call:* ${SALON_INFO.phone}\nWhat time would you prefer to visit today? 💛`;
  }

  // 7. Combos Inquiry (Strict rule: Ask what services they want to combine)
  if (text.includes('combo') || text.includes('combos') || text.includes('package')) {
    return `Yes! We offer customized combo packages tailored to your needs. ✨\n\nCould you please let us know which specific services you are looking to combine so we can offer you the best possible tailored package?`;
  }

  // 8. STRICT DOMAIN BOUNDARY: BODY SPA / BODY MASSAGE REJECTION & REDIRECTION
  // Classic Pearl is a unisex salon, NOT a body spa/massage parlor.
  // We NEVER offer body massage, body spa, full body massage, back massage, or hand massage.
  // We ONLY offer relaxing HEAD Massages and therapeutic HAIR Spa treatments.
  const isExplicitBodyMassageOrBodySpa = 
    text.includes('body spa') || 
    text.includes('body massage') || 
    text.includes('full body massage') || 
    text.includes('full body') || 
    text.includes('back massage') || 
    text.includes('hand massage') || 
    text.includes('swedish') || 
    text.includes('thai massage') || 
    text.includes('deep tissue') || 
    text.includes('body scrub') || 
    text.includes('body polish') || 
    text.includes('body polishing') ||
    text === 'massage' ||
    text === 'massages' ||
    text === 'body treatment' ||
    text === 'body treatments' ||
    (text.includes('massage') && !text.includes('head')) ||
    (text.includes('spa') && !text.includes('hair') && (text.includes('body') || text.includes('full')));

  if (isExplicitBodyMassageOrBodySpa) {
    return `✨ *Classic Pearl Unisex Salon* 🟢\n\nPlease note: We are a unisex salon focused on hair and skin aesthetics — we *do not offer body massages* or body spa.\n\n💆 *For deep relaxation, we recommend:*\n🟢 *Relaxing Head Massage* (Almond/Olive) – from *₹349*\n🟢 *Therapeutic Hair Spa* (Nourishing/Repair) – from *₹579*\n🟢 *Chocolate Crystal Pedicure* – *₹1,099*\n\n📞 *Call / Booking:* ${SALON_INFO.phone}\nWould you like to try our relaxing Head Massage or Hair Spa? 💛`;
  }

  // Detect explicit gender keywords in user query
  const isMenExplicit = /\b(men|male|gents|man|guy|for men|for male|boys|boy)\b/i.test(text);
  const isWomenExplicit = /\b(women|female|ladies|woman|girl|for women|for female|girls)\b/i.test(text);

  // 10. STRICT MEN-EXCLUSIVE SERVICES (NEVER ask Men or Women)
  // A. Men Head Shave
  if (text.includes('head shave') || text.includes('head shaving')) {
    const headShaveItem = salonCatalog.men.filter(s => s.Service.toLowerCase().includes('head shave'));
    return formatPriceList(
      'Men Head Shave Services',
      headShaveItem.length > 0 ? headShaveItem : [{
        ID: 5,
        Service: 'Men Head Shave',
        Category: 'Men - Haircut',
        'Regular Price': 249,
        'Member Price': 219
      }],
      '💡 *Complete Grooming:* Pair your head shave with our soothing *Men Almond / Olive Head Massage (₹399)* or *Men Beard Styling (₹119)* for complete refreshment!'
    );
  }

  // B. Men Beard Grooming, Shaving & Trimming
  if (
    text.includes('beard') || 
    text.includes('mustache') || 
    text.includes('moustache') || 
    text.includes('beard trim') || 
    text.includes('beard shave') || 
    text.includes('beard styling') ||
    text.includes('shave') ||
    text.includes('shaving')
  ) {
    const menBeard = salonCatalog.men.filter(s => s.Category === 'Men - Beard');
    return formatPriceList(
      'Men Beard Grooming & Shaving Services',
      menBeard,
      '💡 *Sharp Grooming Upgrade:* Add a sharp *Men Hair Cut (₹249)* or relaxing *Almond Head Massage (₹399)* to complete your look!'
    );
  }

  // 11. STRICT WOMEN-EXCLUSIVE SERVICES (NEVER ask Men or Women)
  // A. Waxing (Italian Rica Waxing, Brazilian Waxing, Face Waxing)
  if (
    text.includes('wax') || 
    text.includes('waxing') || 
    text.includes('rica') || 
    text.includes('brazilian') ||
    text.includes('bikini wax') ||
    text.includes('underarms wax')
  ) {
    const womenWax = salonCatalog.women.filter(s => 
      s.Category === 'Women - Rica Waxing' || 
      s.Category === 'Women - Brazilian Waxing' || 
      s.Category === 'Women - Face Waxing'
    ).slice(0, 10);
    return formatPriceList(
      'Women Waxing Services (Italian Rica & Brazilian)',
      womenWax,
      '💡 *Gentle & Smooth:* We use premium Italian Rica wax for ultra-smooth skin with zero irritation. Threading and face waxing also available!'
    );
  }

  // B. Threading (Eyebrows, Upper Lip, Chin, Full Face)
  if (
    text.includes('threading') || 
    text.includes('eyebrow') || 
    text.includes('eyebrows') || 
    text.includes('upper lip') || 
    text.includes('upperlip') || 
    text.includes('chin threading') || 
    text.includes('forehead threading')
  ) {
    const womenThreading = salonCatalog.women.filter(s => s.Category === 'Women - Threading');
    return formatPriceList(
      'Women Threading & Facial Hair Shaping',
      womenThreading,
      '💡 *Quick Glow:* Pair your threading with our quick *Fruit Clean Up (₹699)* or *De-Tan Pack (₹499)* for an instant radiant glow!'
    );
  }

  // C. Styling & Makeovers (Perming, Tongs, Ironing, Curls, Blow Dry)
  if (
    text.includes('perming') || 
    text.includes('tongs') || 
    text.includes('ironing') || 
    text.includes('crimping') || 
    text.includes('curls') ||
    text.includes('blow dry') ||
    text.includes('blowdry')
  ) {
    const womenStyling = salonCatalog.women.filter(s => s.Category === 'Women - Styling & Makeover');
    return formatPriceList(
      'Women Hair Styling & Blow Dry Services',
      womenStyling,
      '💡 *Event Styling:* Ask our senior stylists about personalized makeover styling and curls setting for special occasions!'
    );
  }

  // 12. BOTH / UNISEX SERVICES (No gender question asked!)
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

  // 13. CONTEXTUAL REPLIES (Single-word answer "men" or "women" following a question)
  const contextWasHairSpa = historyLower.includes('hair spa') || historyLower.includes('spa');
  const contextWasHaircut = historyLower.includes('haircut') || historyLower.includes('hair cut');
  const contextWasHeadMassage = historyLower.includes('head massage') || historyLower.includes('massage');
  const contextWasColor = historyLower.includes('color') || historyLower.includes('colour') || historyLower.includes('highlight');

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

  // 14. TRUE DUAL-GENDER SERVICES (Ask Men or Women ONLY when gender unstated)
  // A. Hair Spa (Anti-Dandruff, Damage Repair, Deep Nourishing, Deluxe)
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
    return `✨ *Hair Spa at Classic Pearl* 🟢\n\nWe offer therapeutic hair spa treatments for both men and women!\n\nWould you like to see options for *Men* or *Women*? 😊`;
  }

  // B. Haircut / Hair Trim
  if (text.includes('haircut') || text.includes('hair cut') || text.includes('hair trim') || text.includes('cut')) {
    if (isMenExplicit && !isWomenExplicit) {
      const menCuts = salonCatalog.men.filter(s => s.Category === 'Men - Haircut');
      return formatPriceList(
        'Men Haircut Services',
        menCuts,
        '💡 *Popular Upgrade:* Upgrade to *Men Hair Cut with Wash & Blast Dry (₹349)* for fresh styling!'
      );
    }
    if (isWomenExplicit && !isMenExplicit) {
      const womenCuts = salonCatalog.women.filter(s => s.Category === 'Women - Haircut');
      return formatPriceList('Women Haircut Services', womenCuts);
    }
    return `✨ *Haircut & Styling at Classic Pearl* 🟢\n\nWe offer professional haircut and styling for both men and women!\n\nWould you like to see options for *Men* or *Women*? 💇`;
  }

  // C. Head Massage
  if (text.includes('head massage') || text.includes('massage')) {
    if (isMenExplicit && !isWomenExplicit) {
      const menMassage = salonCatalog.men.filter(s => s.Category === 'Men - Head Massage');
      return formatPriceList('Men Head Massage Services', menMassage);
    }
    if (isWomenExplicit && !isMenExplicit) {
      const womenMassage = salonCatalog.women.filter(s => s.Category === 'Women - Head Massage');
      return formatPriceList('Women Head Massage Services', womenMassage);
    }
    return `✨ *Relaxing Head Massage* 🟢\n\nWe offer soothing head massages with nourishing oils for both men and women!\n\nWould you like options for *Men* or *Women*? 💆`;
  }

  // D. Hair Color
  if (text.includes('color') || text.includes('colour') || text.includes('highlights') || text.includes('streaks') || text.includes('balayage')) {
    if (isMenExplicit && !isWomenExplicit) {
      const menColor = salonCatalog.men.filter(s => s.Category === 'Men - Hair Color');
      return formatPriceList('Men Hair Color Services', menColor);
    }
    if (isWomenExplicit && !isMenExplicit) {
      const womenColor = salonCatalog.women.filter(s => s.Category === 'Women - Hair Color').slice(0, 5);
      return formatPriceList('Women Hair Color & Highlights', womenColor);
    }
    return `✨ *Hair Color & Highlights* 🟢\n\nWe offer premium global color and highlights for both men and women!\n\nWould you like to see options for *Men* or *Women*? 🎨`;
  }

  // E. Chemical Treatments / Advanced Hair Treatments (Botox, Keratin, Nanoplastia)
  if (text.includes('keratin') || text.includes('botox') || text.includes('nanoplastia') || text.includes('smoothen') || text.includes('straighten')) {
    if (isMenExplicit && !isWomenExplicit) {
      const menAdv = salonCatalog.men.filter(s => s.Category === 'Men - Advanced Hair Treatment');
      return formatPriceList('Men Advanced Hair Treatments (Botox / Keratin)', menAdv);
    }
    const womenAdv = salonCatalog.women.filter(s => s.Category === 'Women - Advanced Hair Treatment');
    return formatPriceList('Advanced Hair Treatments (Botox / Keratin / Nanoplastia)', womenAdv);
  }

  // Generic greeting or default fallback (Short & Crisp)
  return `✨ *Welcome to Classic Pearl Unisex Salon!* 🟢\n\nHow can we pamper you today? Our popular services:\n🟢 *Hair Spa & Haircuts*\n🟢 *Keratin & Botox Treatments*\n🟢 *Luxury Facials & Cleanups*\n🟢 *Pedicure & Head Massage*\n\n📍 ${SALON_INFO.mapsUrl} | 📞 *Call:* ${SALON_INFO.phone}\nWhich service would you like details on? 💛`;
}

/**
 * Builds the comprehensive system prompt for Gemini 2.5 Flash,
 * incorporating dynamic daily learnings, consultative upselling, and strict boundary rules.
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

RULE 1: STRICT DOMAIN BOUNDARY - NO BODY SPA OR BODY MASSAGE (ONLY HEAD MASSAGE & HAIR SPA):
- Classic Pearl is a unisex salon specializing in hair care, skin aesthetics, and grooming.
- We DO NOT offer body massages, full body massages, body spa, back massages, hand massages, or spa massage packages.
- If a customer asks about body massage, body spa, full body massage, or general massage:
  Politely inform them:
  "Classic Pearl is a unisex salon focused on luxury hair styling, restorative therapies, and skin grooming — we do not offer body spa or body massages.
  💆 However, for deep relaxation and stress relief, we do offer rejuvenating Head Massages (with nourishing Almond, Olive, Navarathna, or Coconut oils from ₹349 for Men and ₹399 for Women) and therapeutic Hair Spa treatments (Anti-Dandruff, Damage Repair, Deep Nourishing, Deluxe)! ✨"
  Then warmly invite them to experience our Head Massage or Hair Spa.

RULE 2: STRICT MEN-EXCLUSIVE SERVICES (NEVER ASK "MEN OR WOMEN?"):
- The following services are exclusively for MEN:
  • Beard Trim, Beard Shave, Beard Styling, Mustache grooming
  • Head Shave (Men Head Shave: Regular ₹249 | Member ₹219)
- Women do NOT have beards, shave beards, or do head shaves.
- When asked about beard trim, beard shave, beard styling, or head shave:
  DO NOT ask "Men or Women?". That feels awkward and unnatural.
  Directly provide the Men service options and exact prices with Regular and Member pricing!

RULE 3: STRICT WOMEN-EXCLUSIVE SERVICES (NEVER ASK "MEN OR WOMEN?"):
- The following services are exclusively for WOMEN:
  • Waxing (Italian Rica Waxing, Brazilian Waxing, Face Waxing)
  • Threading (Eyebrows, Upper Lip, Forehead, Chin, Full Face Threading)
  • Hair Styling & Makeovers (Perming, Tongs, Ironing, Crimping, Blow Dry with Setting)
- When asked about waxing, threading, perming, tongs, or ironing:
  DO NOT ask "Men or Women?".
  Directly provide the Women service options and exact prices with Regular and Member pricing!

RULE 4: BOTH / UNISEX SERVICES (NEVER ASK "MEN OR WOMEN?"):
- The following services are for BOTH Men and Women:
  • Pedicure (Both - Pedicure)
  • Manicure (Both - Manicure)
  • Facial (Both - Facial: O3+, Korean Glass, Hydra, Fruit)
  • Clean Up (Both - Clean Up)
  • De-Tan (Both - De-Tan)
- When asked about these services (e.g. "how much for pedicure?", "facial prices", "cleanup", "manicure price", "detan"):
  DO NOT ask "Men or Women?".
  Directly list the available options with Regular Price and Member Price!

RULE 5: TRUE DUAL-GENDER SERVICES ONLY (ONLY ASK IF GENDER NOT SPECIFIED):
- Genuinely dual services with distinct Men and Women offerings:
  • Haircut / Hair Trim
  • Hair Spa (Anti-Dandruff, Damage Repair, Deep Nourishing, Deluxe)
  • Head Massage (Almond, Olive, Coconut, Navarathna)
  • Hair Color / Highlights
  • Chemical Treatments (Keratin, Botox, Nanoplastia)
- IF GENDER IS NOT SPECIFIED in the query or recent context (e.g. "how much for hair spa?", "haircut price"):
  Politely ask:
  "We offer wonderful [service name] for both men and women! ✨ Would you like to know the options and prices for *Men* or *Women*?"
- IF GENDER IS SPECIFIED (or customer says "men hair spa" or replies "men"):
  Immediately list that gender's exact service options and prices.

RULE 6: CASUAL & HIGH-INTENT CONVERSATIONAL QUESTIONS:
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

RULE 7: CONSULTATIVE UPSELLING (LOW-COST TO PREMIUM VALUE):
- Gently introduce natural value upgrades without sounding pushy or aggressive:
  • Haircut: Mention the popular upgrade to Haircut with Wash & Blast Dry (₹349) for a complete fresh blowout.
  • Clean Up: Mention our radiant Korean Glass Facial or Hydra Facial for deep pore hydration.
  • Hair Spa: Mention that for frizzy/dry hair, stylists also evaluate for Keratin/Botox protein restoration.
  • Pedicure: Mention our soothing Chocolate Crystal or De-Tan pedicures for tired feet.
- Frame upgrades around the client's beauty, relaxation, and confidence!

RULE 8: ACCURATE PRICING & SINGLE SERVICES ONLY (STRICT NO COMBOS):
- ALWAYS display both *Regular Price* and *Member Price* in ₹ (e.g. • *Service*: Regular ₹XXX | Member ₹YYY).
- NEVER hallucinate prices.
- Do NOT list combo packages automatically. If explicitly asked "Do you have combos?", reply:
  "Yes! We offer customized combo packages tailored to your needs. What specific services are you looking to combine so we can offer you the best tailored package?"

RULE 9: SHORT, CRISP & GREEN-HIGHLIGHTED FORMATTING:
- Format text cleanly and compactly for WhatsApp:
  • STRICT BREVITY: Keep every response SHORT, CRISP, AND COMPACT (maximum 5 to 7 lines total). Never write long essays or 2-page text. People lose focus if messages are too long.
  • HIGHLIGHTED SERVICES IN BOLD WITH GREEN ACCENTS: Every service pushed or mentioned MUST be formatted in *bold* with a 🟢 green accent bullet (e.g. 🟢 *Men Deep Nourishing Hair Spa:* ₹579 _(Member: ₹521)_).
  • Do NOT dump more than 4-5 service items at once.
  • Do NOT use markdown headers (#, ##, ###).
  • Always finish with 1 brief, warm line and salon helpline: 📞 *+91 83107 30322*.
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
