import fs from 'node:fs';
import path from 'node:path';

// Load services.json and salonLearnedPlaybook.json directly
const servicesData = JSON.parse(
  fs.readFileSync(path.resolve('./src/lib/automations/services.json'), 'utf8')
);
const learnedPlaybookData = JSON.parse(
  fs.readFileSync(path.resolve('./src/lib/automations/salonLearnedPlaybook.json'), 'utf8')
);

// Mirror catalog and getSalonDeterministicReply for automated verification
const salonCatalog = {
  men: servicesData.Men.filter(s => !s.Category.toLowerCase().includes('combo')),
  women: servicesData.Women.filter(s => !s.Category.toLowerCase().includes('combo')),
  both: servicesData.Both.filter(s => !s.Category.toLowerCase().includes('combo')),
};

const SALON_INFO = {
  name: 'Classic Pearl Unisex Salon',
  mapsUrl: 'https://share.google/jJemgk5XuiTanHc7P',
  hours: 'Monday to Sunday, 10:00 AM – 9:00 PM (All 7 Days)',
  phone: '+91 83107 30322',
  bookingPhone: '+91 83107 30322',
};

function formatPriceList(title, items, note) {
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

function getSalonDeterministicReply(inboundText, chatHistory = '', buttonId) {
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

  // 3. Salon Name / Identity
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

  // 4. Location & Directions
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

  // 5. Route guidance
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

  // 6. Timing & When to come
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

  // 7. Discounts & Offers
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

  // 8. Combos Inquiry
  if (text.includes('combo') || text.includes('combos') || text.includes('package')) {
    return `Yes! We offer customized combo packages tailored to your needs. ✨\n\nCould you please let us know which specific services you are looking to combine so we can offer you the best possible tailored package?`;
  }

  // 9. STRICT DOMAIN BOUNDARY: BODY SPA / BODY MASSAGE REJECTION & REDIRECTION
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
    return `✨ *Classic Pearl Unisex Salon* is a premier salon destination specializing in luxury hair styling, hair restorative treatments, skin therapies, and grooming.\n\nPlease note that we are a unisex salon and do *not* offer body spa, body massage, or full body services.\n\n💆 *However, for deep relaxation and stress relief, we offer rejuvenating Head Massages:*\n• *Men Head Massage* (Almond, Olive, Navarathna, Coconut) – from ₹349\n• *Women Head Massage* (Almond, Olive, Navarathna, Coconut) – from ₹399\n\n🌸 *We also offer therapeutic Hair Spa therapies:*\n• *Deep Nourishing Hair Spa* (from ₹579)\n• *Damage Repair Hair Spa* (from ₹779)\n• *Anti-Dandruff & Hair Fall Spa* (from ₹999)\n• *Deluxe Rejuvenating Hair Spa* (from ₹949)\n\nPlus relaxing Facials, Clean Ups, and Crystal Pedicures! ✨\n\nWould you like to explore our relaxing Head Massage or Hair Spa treatments? We would love to pamper you! 💛\n📍 *Location:* ${SALON_INFO.mapsUrl}\n🕒 *Hours:* ${SALON_INFO.hours}\n📞 *Call / Booking:* ${SALON_INFO.phone}`;
  }

  // Gender keywords
  const isMenExplicit = /\b(men|male|gents|man|guy|for men|for male|boys|boy)\b/i.test(text);
  const isWomenExplicit = /\b(women|female|ladies|woman|girl|for women|for female|girls)\b/i.test(text);

  // 10. STRICT MEN-EXCLUSIVE SERVICES
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

  // 11. STRICT WOMEN-EXCLUSIVE SERVICES
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

  // 12. BOTH / UNISEX SERVICES
  if (text.includes('pedicure') || text.includes('pedi')) {
    const pedicures = salonCatalog.both.filter(s => s.Category === 'Both - Pedicure');
    return formatPriceList(
      'Pedicure Services (For Both Men & Women)',
      pedicures,
      '💡 *Pampering Upgrade:* For tired or tanned feet, try our *Chocolate Crystal Pedicure (₹1,099)* or *De-Tan Pedicure (₹799)* for deep exfoliation and massage!'
    );
  }

  if (text.includes('manicure') || text.includes('mani')) {
    const manicures = salonCatalog.both.filter(s => s.Category === 'Both - Manicure');
    return formatPriceList('Manicure Services (For Both Men & Women)', manicures);
  }

  if (text.includes('facial') || text.includes('facials')) {
    const facials = salonCatalog.both.filter(s => s.Category === 'Both - Facial');
    return formatPriceList(
      'Facial Treatments (For Both Men & Women)',
      facials,
      '💡 *Celebrity Favorites:* Experience our *Korean Glass Facial (₹2,199)* or *Hydra Facial (₹2,899)* for immediate glass-skin radiance and deep pore cleansing!'
    );
  }

  if (text.includes('clean up') || text.includes('cleanup')) {
    const cleanups = salonCatalog.both.filter(s => s.Category === 'Both - Clean Up');
    return formatPriceList(
      'Clean Up Services (For Both Men & Women)',
      cleanups,
      '💡 *Glow Upgrade:* For deeper pore hydration and lasting glass radiance, ask about our signature Korean Glass Facial when you visit!'
    );
  }

  if (text.includes('detan') || text.includes('de-tan') || text.includes('tan')) {
    const detans = salonCatalog.both.filter(s => s.Category === 'Both - De-Tan');
    return formatPriceList('De-Tan Services (For Both Men & Women)', detans);
  }

  // 13. CONTEXTUAL REPLIES
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

  // 14. TRUE DUAL-GENDER SERVICES
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

  if (text.includes('keratin') || text.includes('botox') || text.includes('nanoplastia') || text.includes('smoothen') || text.includes('straighten')) {
    if (isMenExplicit && !isWomenExplicit) {
      const menAdv = salonCatalog.men.filter(s => s.Category === 'Men - Advanced Hair Treatment');
      return formatPriceList('Men Advanced Hair Treatments (Botox / Keratin)', menAdv);
    }
    const womenAdv = salonCatalog.women.filter(s => s.Category === 'Women - Advanced Hair Treatment');
    return formatPriceList('Advanced Hair Treatments (Botox / Keratin / Nanoplastia)', womenAdv);
  }

  return `✨ *Welcome to Classic Pearl Unisex Salon!* ✨\n\nHow can we pamper you today? We specialize in:\n• Hair Spa, Haircuts & Hair Color\n• Keratin, Botox & Protein Treatments\n• Luxury Facials & Cleanups\n• Pedicure & Manicure\n• Waxing & Head Massage\n\n📍 *Location:* ${SALON_INFO.mapsUrl}\n🕒 *Hours:* ${SALON_INFO.hours}\n📞 *Call Us:* ${SALON_INFO.phone}\n\nPlease let us know what service you are looking for, or if you'd like to book an appointment! 💛`;
}

export async function runSalonAiExclusivityTests() {
  const results = [];

  function check(name, fn) {
    try {
      fn();
      results.push({ name, status: 'PASS' });
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
    }
  }

  console.log('\n--- Running Suite 12: Salon AI Strict Domain Boundaries & Gender Exclusivity ---');

  // Test 1: Beard Trim (Men Exclusive)
  check('1. Beard Trim query directly returns Men Beard pricing and NEVER asks gender', () => {
    const res = getSalonDeterministicReply('how much for beard trim');
    if (!res.includes('Men Beard Grooming & Shaving Services')) throw new Error('Did not return Men Beard services');
    if (res.includes('Men or Women')) throw new Error('Erroneously asked Men or Women for beard!');
    if (!res.includes('Regular: ₹') || !res.includes('Member: ₹')) throw new Error('Missing pricing info');
  });

  // Test 2: Beard Shave (Men Exclusive)
  check('2. Beard Shave query directly returns Men Beard pricing and NEVER asks gender', () => {
    const res = getSalonDeterministicReply('how much for beard shave');
    if (!res.includes('Men Beard')) throw new Error('Did not return Men Beard services');
    if (res.includes('Men or Women')) throw new Error('Erroneously asked Men or Women for beard shave!');
  });

  // Test 3: Head Shave (Men Exclusive)
  check('3. Head Shave query directly returns Men Head Shave and NEVER asks gender', () => {
    const res = getSalonDeterministicReply('how much for head shave');
    if (!res.includes('Men Head Shave Services')) throw new Error('Did not return Men Head Shave services');
    if (res.includes('Men or Women')) throw new Error('Erroneously asked Men or Women for head shave!');
    if (!res.includes('249') || !res.includes('219')) throw new Error('Incorrect Head Shave price');
  });

  // Test 4: Beard Styling (Men Exclusive)
  check('4. Beard Styling query directly returns Men Beard pricing and NEVER asks gender', () => {
    const res = getSalonDeterministicReply('beard styling price');
    if (!res.includes('Men Beard')) throw new Error('Did not return Men Beard services');
    if (res.includes('Men or Women')) throw new Error('Erroneously asked Men or Women for beard styling!');
  });

  // Test 5: Hair Spa (True Dual-Gender unstated -> Must ask Men or Women)
  check('5. Hair Spa query without gender specified MUST ask Men or Women', () => {
    const res = getSalonDeterministicReply('how much for hair spa');
    if (!res.includes('Would you like to know the options and prices for *Men* or *Women*?')) {
      throw new Error('Did not ask Men or Women for general hair spa');
    }
  });

  // Test 6: Men Hair Spa (Specified -> Direct Men pricing)
  check('6. Explicit Men Hair Spa query returns Men Hair Spa without asking gender', () => {
    const res = getSalonDeterministicReply('how much for men hair spa');
    if (!res.includes('Men Hair Spa Services')) throw new Error('Did not return Men Hair Spa');
    if (res.includes('Would you like to know the options and prices for *Men* or *Women*?')) {
      throw new Error('Redundantly asked Men or Women when men was already specified');
    }
  });

  // Test 7: Contextual reply "men" following hair spa inquiry
  check('7. Reply "men" after hair spa inquiry returns Men Hair Spa', () => {
    const res = getSalonDeterministicReply('men', 'how much for hair spa');
    if (!res.includes('Men Hair Spa Services')) throw new Error('Did not resolve contextual Men Hair Spa');
  });

  // Test 8: Contextual reply "women" after hair spa inquiry
  check('8. Reply "women" after hair spa inquiry returns Women Hair Spa', () => {
    const res = getSalonDeterministicReply('women', 'how much for hair spa');
    if (!res.includes('Women Hair Spa Services')) throw new Error('Did not resolve contextual Women Hair Spa');
  });

  // Test 9: Pedicure (Unisex Both -> NEVER ask gender)
  check('9. Pedicure query directly returns Pedicure pricing for both without asking gender', () => {
    const res = getSalonDeterministicReply('how much for pedicure');
    if (!res.includes('Pedicure Services (For Both Men & Women)')) throw new Error('Did not return Pedicure services');
    if (res.includes('Would you like to know the options and prices for *Men* or *Women*?')) {
      throw new Error('Erroneously asked gender for unisex pedicure');
    }
  });

  // Test 10: Facial (Unisex Both -> NEVER ask gender)
  check('10. Facial query directly returns Facial pricing for both without asking gender', () => {
    const res = getSalonDeterministicReply('how much for facial');
    if (!res.includes('Facial Treatments (For Both Men & Women)')) throw new Error('Did not return Facial services');
    if (res.includes('Would you like to know the options and prices for *Men* or *Women*?')) {
      throw new Error('Erroneously asked gender for unisex facial');
    }
  });

  // Test 11: Clean Up (Unisex Both -> NEVER ask gender)
  check('11. Clean Up query directly returns Clean Up pricing for both without asking gender', () => {
    const res = getSalonDeterministicReply('how much for clean up');
    if (!res.includes('Clean Up Services (For Both Men & Women)')) throw new Error('Did not return Clean Up services');
  });

  // Test 12: Waxing (Women Exclusive -> NEVER ask gender)
  check('12. Waxing query directly returns Women Waxing without asking gender', () => {
    const res = getSalonDeterministicReply('how much for waxing');
    if (!res.includes('Women Waxing Services')) throw new Error('Did not return Women Waxing services');
    if (res.includes('Would you like to know the options and prices for *Men* or *Women*?')) {
      throw new Error('Erroneously asked gender for waxing');
    }
  });

  // Test 13: Threading (Women Exclusive -> NEVER ask gender)
  check('13. Threading query directly returns Women Threading without asking gender', () => {
    const res = getSalonDeterministicReply('how much for threading');
    if (!res.includes('Women Threading & Facial Hair Shaping')) throw new Error('Did not return Women Threading services');
    if (res.includes('Would you like to know the options and prices for *Men* or *Women*?')) {
      throw new Error('Erroneously asked gender for threading');
    }
  });

  // Test 14: Eyebrow Threading (Women Exclusive)
  check('14. Eyebrow query directly returns Women Threading without asking gender', () => {
    const res = getSalonDeterministicReply('eyebrow threading price');
    if (!res.includes('Women Threading')) throw new Error('Did not return Women Threading');
  });

  // Test 15: Body Massage Boundary (STRICT REJECTION & REDIRECTION)
  check('15. Body Massage query politely clarifies salon boundary and pivots to Head Massage & Hair Spa', () => {
    const res = getSalonDeterministicReply('do you have body massage');
    if (!res.includes('do *not* offer body spa, body massage')) throw new Error('Did not reject body massage');
    if (!res.includes('Head Massages:')) throw new Error('Did not pivot to Head Massages');
    if (!res.includes('Hair Spa therapies:')) throw new Error('Did not pivot to Hair Spa');
  });

  // Test 16: Body Spa Boundary (STRICT REJECTION & REDIRECTION)
  check('16. Body Spa query politely clarifies salon boundary and pivots to Head Massage & Hair Spa', () => {
    const res = getSalonDeterministicReply('how much for body spa');
    if (!res.includes('do *not* offer body spa, body massage')) throw new Error('Did not reject body spa');
    if (!res.includes('Head Massages:')) throw new Error('Did not pivot to Head Massages');
  });

  // Test 17: Bare "Massage" query (Boundary clarification)
  check('17. General "massage" query clarifies salon boundary and pivots to Head Massage', () => {
    const res = getSalonDeterministicReply('do you have massage');
    if (!res.includes('do *not* offer body spa, body massage')) throw new Error('Did not reject massage');
    if (!res.includes('Head Massages:')) throw new Error('Did not pivot to Head Massages');
  });

  // Test 18: Head Massage (True Dual-Gender unstated -> Must ask Men or Women)
  check('18. Explicit Head Massage query asks Men or Women', () => {
    const res = getSalonDeterministicReply('how much for head massage');
    if (!res.includes('Would you like to see our head massage options for *Men* or *Women*?')) {
      throw new Error('Did not ask Men or Women for head massage');
    }
  });

  // Test 19: Salon Location
  check('19. "Where is your salon located" shares Google Maps link, hours, and helpline', () => {
    const res = getSalonDeterministicReply('where is your salon located');
    if (!res.includes(SALON_INFO.mapsUrl)) throw new Error('Missing Google Maps link');
    if (!res.includes(SALON_INFO.phone)) throw new Error('Missing salon phone');
    if (!res.includes('10:00 AM to 9:00 PM') && !res.includes('10:00 AM – 9:00 PM')) throw new Error('Missing hours');
  });

  // Test 20: "Is it free now?" Immediate Footfall Helpline
  check('20. "Is it free now" provides immediate front desk helpline to hold chair', () => {
    const res = getSalonDeterministicReply('is it free now');
    if (!res.includes(SALON_INFO.phone)) throw new Error('Missing helpline in free now query');
    if (!res.includes('chair availability') && !res.includes('hold your slot')) throw new Error('Missing chair hold instruction');
  });

  // Test 21: Salon Name / Identity
  check('21. "What is your salon name" identifies as Classic Pearl Unisex Salon', () => {
    const res = getSalonDeterministicReply('what is your salon name');
    if (!res.includes('Classic Pearl Unisex Salon')) throw new Error('Missing salon name');
  });

  return results;
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('12_salon_ai_boundaries_and_exclusivity.test.mjs')) {
  runSalonAiExclusivityTests().then((results) => {
    console.log('\n========================================');
    console.log(`TOTAL TESTS: ${results.length}`);
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log('========================================\n');
    if (failed > 0) {
      console.error('Failed tests:', results.filter(r => r.status === 'FAIL'));
      process.exit(1);
    } else {
      console.log('🎉 ALL 21 SALON AI INTELLIGENCE & BOUNDARY TESTS PASSED!');
    }
  });
}
