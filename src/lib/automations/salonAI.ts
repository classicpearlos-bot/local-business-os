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

export interface SalonReplyButton {
  id: string;
  title: string; // Meta WhatsApp strictly enforces max 20 chars
}

export interface SalonReplyResult {
  reply: string;
  buttons?: SalonReplyButton[];
}

export const SALON_BUTTONS = {
  GENDER: [
    { id: 'btn_men', title: '👨 Men' },
    { id: 'btn_women', title: '👩 Women' },
  ],
  WAXING: [
    { id: 'btn_rica', title: '🌿 Italian RICA' },
    { id: 'btn_brazilian', title: '✨ Brazilian Wax' },
  ],
  BIKINI: [
    { id: 'btn_bikini_rica', title: '🌿 RICA Bikini' },
    { id: 'btn_bikini_brazilian', title: '✨ Brazilian Bikini' },
  ],
  COMBOS: [
    { id: 'btn_combo_haircut', title: '💇 Haircut Combo' },
    { id: 'btn_combo_spa', title: '💆 Hair Spa Combo' },
    { id: 'btn_combo_wax', title: '🌸 Waxing Combo' },
  ],
  HAIR_SPA_LENGTH: [
    { id: 'btn_spa_small', title: '✨ Small Length' },
    { id: 'btn_spa_med', title: '✨ Medium Length' },
    { id: 'btn_spa_long', title: '✨ Long Length' },
  ],
  ACTION: [
    { id: 'btn_book', title: '📅 Book Slot' },
    { id: 'btn_offers', title: '🎉 Active Offers' },
  ],
  WELCOME: [
    { id: 'btn_services', title: '📋 Our Services' },
    { id: 'btn_offers', title: '🎉 Today\'s Offers' },
    { id: 'btn_book', title: '📅 Book Slot' },
  ],
};

/**
 * Normalizes customer text by fixing common spelling errors and typos
 */
export function normalizeSalonText(input: string): string {
  let s = (input || '').toLowerCase().trim();
  s = s.replace(/[?.,!/\\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/\b(hairct|haricut|haircutt|hrcut|hairkut|harkut|haicutt|haircurt)\b/g, 'haircut');
  s = s.replace(/\b(hairspa|hair\\s*sap|har\\s*spa|hair\\s*spaa|harspa|hspa)\b/g, 'hair spa');
  s = s.replace(/\b(waxng|waxin|vaxing|vax|wzxing|waxting|waksing)\b/g, 'waxing');
  s = s.replace(/\b(rika|reca|ricaa|riqa)\b/g, 'rica');
  s = s.replace(/\b(brazilan|brazillian|brazilien)\b/g, 'brazilian');
  s = s.replace(/\b(bikni|bekini|bikny|biknii)\b/g, 'bikini');
  s = s.replace(/\b(wmn|womn|wmen|womem|ladis|grl|femal)\b/g, 'women');
  s = s.replace(/\b(gnts|mael)\b/g, 'men');
  s = s.replace(/\b(facil|fecial|faical|fashial|faceal)\b/g, 'facial');
  s = s.replace(/\b(pedicre|pedicur|pedicue|padicure)\b/g, 'pedicure');
  s = s.replace(/\b(manicre|manicur|manicue)\b/g, 'manicure');
  s = s.replace(/\b(cmbo|comobo|pakage|pakages|packeg|packege|pacage)\b/g, 'combo');
  s = s.replace(/\b(berd|beared|beerd|bred)\b/g, 'beard');
  s = s.replace(/\b(keratine|kreatin|kratin|keretin)\b/g, 'keratin');
  s = s.replace(/\b(botoc|botoxx|botx)\b/g, 'botox');
  s = s.replace(/\b(nanoplasta|nanoplasia|nanoplastica|nano\s*plastia)\b/g, 'nanoplastia');
  return s;
}

export function formatPriceList(title: string, items: ServiceItem[], note?: string, maxItems: number = 6): string {
  const displayItems = items.slice(0, maxItems);
  let text = `✨ *${title}* 🟢\n\n`;
  for (const item of displayItems) {
    text += `🟢 *${item.Service}:* ₹${item['Regular Price']} _(Member: ₹${item['Member Price']})_\n`;
  }
  if (items.length > maxItems) {
    text += `_...and more options available at the salon!_\n`;
  }
  if (note) {
    text += `\n${note}\n`;
  }
  text += `\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`;
  return text.trim();
}

/**
 * Searches backwards from the most recent turns to find the exact service context
 * being asked about (e.g. customer texted 'haircut', bot asked 'Men or Women?').
 */
export function getLastInquiryContext(
  chatHistory: string
): 'haircut' | 'hair_spa' | 'head_massage' | 'hair_color' | 'chemical' | 'hair_wash' | 'bikini_wax' | 'waxing' | 'combo' | null {
  if (!chatHistory) return null;

  // Split history into message turns or paragraphs so multi-line replies keep full context
  const turns = chatHistory.includes('Customer:') || chatHistory.includes('Assistant:')
    ? chatHistory.split(/(?=Customer:|Assistant:)/i).map(l => l.trim()).filter(Boolean).reverse()
    : chatHistory.split(/\n\s*\n/).map(l => l.trim()).filter(Boolean).reverse();

  for (const turn of turns) {
    const lower = normalizeSalonText(turn);

    // Skip generic greetings/menus that mention multiple categories together
    if (
      lower.includes('welcome to classic pearl') ||
      lower.includes('popular services:') ||
      lower.includes('classic pearl unisex salon menu') ||
      lower.includes('which service would you like') ||
      lower.includes('how can we pamper you today') ||
      lower.includes('hair care & hair spa (haircut')
    ) {
      continue;
    }

    // 0. Bikini Waxing (Strict privacy: check before generic waxing!)
    if (lower.includes('bikini')) {
      return 'bikini_wax';
    }

    // 1. Combos & Packages (Check BEFORE single services because combo prompts list 'Haircut Combo', 'Waxing Combo' etc.)
    if (
      lower.includes('combo') || 
      lower.includes('package') || 
      lower.includes('value combo') ||
      lower.includes('value combos')
    ) {
      return 'combo';
    }

    // 2. Haircut
    if (
      lower.includes('haircut') ||
      lower.includes('hair cut') ||
      lower.includes('hair trim') ||
      lower.includes('little champ') ||
      lower.includes('girls haircut') ||
      lower.includes('basic haircut') ||
      lower.includes('advance haircut') ||
      /\bcut\b/.test(lower)
    ) {
      return 'haircut';
    }

    // 3. Hair Spa
    if (lower.includes('hair spa') || (lower.includes('spa') && !lower.includes('body'))) {
      return 'hair_spa';
    }

    // 4. Head Massage
    if (lower.includes('head massage') || (lower.includes('massage') && !lower.includes('body'))) {
      return 'head_massage';
    }

    // 5. Hair Color
    if (
      lower.includes('color') ||
      lower.includes('colour') ||
      lower.includes('highlight') ||
      lower.includes('streaks') ||
      lower.includes('balayage')
    ) {
      return 'hair_color';
    }

    // 6. Chemical Treatments
    if (
      lower.includes('keratin') ||
      lower.includes('botox') ||
      lower.includes('nanoplastia') ||
      lower.includes('smoothen') ||
      lower.includes('straighten')
    ) {
      return 'chemical';
    }

    // 7. Hair Wash / Blow Dry
    if (
      lower.includes('hair wash') ||
      lower.includes('blow dry') ||
      lower.includes('blowdry') ||
      lower.includes('blast dry')
    ) {
      return 'hair_wash';
    }

    // 8. General Waxing
    if (
      lower.includes('waxing') ||
      lower.includes('wax') ||
      lower.includes('rica') ||
      lower.includes('brazilian')
    ) {
      return 'waxing';
    }
  }

  return null;
}

export function formatWomenHaircuts(): string {
  return `✨ *Women Haircut Services* 🟢

🟢 *Women Basic Haircut (Wash + Blast Dry):* ₹399 _(Member: ₹349)_
🟢 *Women Basic Haircut (Wash + Blow Dry & Setting):* ₹599 _(Member: ₹549)_
🟢 *Women Advance Haircut (Wash + Blast Dry):* ₹749 _(Member: ₹695)_
🟢 *Women Advance Haircut (Wash + Blow Dry & Setting):* ₹899 _(Member: ₹835)_
🟢 *Girl Basic Haircut (Below 10 yrs):* ₹329 _(Member: ₹299)_
🟢 *Girl Advanced Haircut (Below 10 yrs):* ₹399 _(Member: ₹369)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatMenHaircuts(): string {
  return `✨ *Men Haircut Services* 🟢

🟢 *Men Hair Cut:* ₹249 _(Member: ₹219)_
🟢 *Men Hair Cut with Wash & Blast Dry:* ₹349 _(Member: ₹329)_
🟢 *Basic Hair Cut for Little Champ:* ₹249 _(Member: ₹219)_
🟢 *Little Champ with Wash & Blast Dry:* ₹349 _(Member: ₹299)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatWomenHairSpa(): string {
  return `✨ *Women Hair Spa Services (By Length)* 🟢

🟢 *Deep Nourishing Spa:* Small ₹699 | Med ₹849 | Long ₹999
🟢 *Damage Repair Spa:* Small ₹899 | Med ₹1,199 | Long ₹1,399
🟢 *Anti-Dandruff / Hair Fall:* Small ₹1,199 | Med ₹1,399 | Long ₹1,599
🟢 *Deluxe Hair Spa:* Small ₹1,199 | Med ₹1,499 | Long ₹1,799
_(Member discounts up to 10% applied at salon)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
What is your hair length (Small / Medium / Long)? 💛`;
}

export function formatWomenHairSpaByLength(length: 'small' | 'medium' | 'long'): string {
  const lbl = length === 'small' ? 'Small Length' : length === 'medium' ? 'Medium Length' : 'Long Length';
  const prices = {
    small: { deep: '₹699 _(Mem: ₹665)_', damage: '₹899 _(Mem: ₹835)_', anti: '₹1,199 _(Mem: ₹1,115)_', deluxe: '₹1,199 _(Mem: ₹1,115)_' },
    medium: { deep: '₹849 _(Mem: ₹790)_', damage: '₹1,199 _(Mem: ₹1,115)_', anti: '₹1,399 _(Mem: ₹1,300)_', deluxe: '₹1,499 _(Mem: ₹1,395)_' },
    long: { deep: '₹999 _(Mem: ₹930)_', damage: '₹1,399 _(Mem: ₹1,300)_', anti: '₹1,599 _(Mem: ₹1,485)_', deluxe: '₹1,799 _(Mem: ₹1,675)_' }
  }[length];

  return `✨ *Women Hair Spa Services (${lbl})* 🟢

🟢 *Deep Nourishing Spa:* ${prices.deep}
🟢 *Damage Repair Spa:* ${prices.damage}
🟢 *Anti-Dandruff / Hair Fall Spa:* ${prices.anti}
🟢 *Deluxe Hair Spa:* ${prices.deluxe}

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatMenHairSpa(): string {
  return `✨ *Men Hair Spa Services* 🟢

🟢 *Deep Nourishing Hair Spa:* ₹579 _(Member: ₹521)_
🟢 *Damage Repair Hair Spa:* ₹659 _(Member: ₹599)_
🟢 *Anti-Dandruff Hair Spa:* ₹659 _(Member: ₹599)_
🟢 *Deluxe Hair Spa:* ₹769 _(Member: ₹699)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatWomenHeadMassage(): string {
  return `✨ *Women Head Massage Services* 🟢

🟢 *Almond / Olive Head Massage:* ₹399 _(Member: ₹379)_
🟢 *Navarathna / Coconut Head Massage:* ₹399 _(Member: ₹379)_
🟢 *Shampoo & Conditioner Wash (Add-on):* ₹249 _(Member: ₹235)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatMenHeadMassage(): string {
  return `✨ *Men Head Massage Services* 🟢

🟢 *Navarathna / Coconut Head Massage:* ₹349 _(Member: ₹319)_
🟢 *Almond / Olive Head Massage:* ₹399 _(Member: ₹369)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatWomenHairColor(): string {
  return `✨ *Women Hair Color & Highlights (By Length)* 🟢

🟢 *Global Ammonia-Free:* Small ₹2,999 | Med ₹3,999 | Long ₹4,999
🟢 *Global With Ammonia:* Small ₹2,999 | Med ₹3,999 | Long ₹4,999
🟢 *Balayage / Ombre:* Small ₹5,999 | Med ₹6,999 | Long ₹7,999
🟢 *Full Highlights (16 Streaks):* ₹3,999 _(Partial 8: ₹1,999)_
🟢 *Root Touch-Up:* from ₹1,149 _(Member: ₹1,070)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
What is your hair length (Small / Medium / Long)? 💛`;
}

export function formatMenHairColor(): string {
  return `✨ *Men Hair Color Services* 🟢

🟢 *Men Beard Color:* ₹249 _(Member: ₹229)_
🟢 *Men Hair Color (Standard):* ₹549 _(Member: ₹499)_
🟢 *Men Streaks Color:* ₹699 _(Member: ₹649)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatWomenChemical(): string {
  return `✨ *Women Advanced Treatments (By Length)* 🟢

🟢 *Hair Botox Therapy:* Small ₹3,999 | Med ₹5,999 | Long ₹6,999
🟢 *Keratin Protein:* Small ₹3,999 | Med ₹5,699 | Long ₹5,999
🟢 *Nanoplastia Treatment:* Small ₹5,999 | Med ₹6,999 | Long ₹7,999

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
What is your hair length (Small / Medium / Long)? 💛`;
}

export function formatKeratin(gender?: 'men' | 'women'): string {
  if (gender === 'men') {
    return `✨ *Men Keratin Protein Treatment* 🟢\n\n🟢 *Men Keratin Treatment:* ₹3,999 _(Member: ₹3,499)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`;
  }
  if (gender === 'women') {
    return `✨ *Women Keratin Protein (By Length)* 🟢\n\n🟢 *Small Length:* ₹3,999\n🟢 *Medium Length:* ₹5,699\n🟢 *Long Length:* ₹5,999\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWhat is your hair length? 💛`;
  }
  return `✨ *Keratin Treatment Options* 🟢\n\n🟢 *Men Keratin:* ₹3,999 _(Member: ₹3,499)_\n🟢 *Women Keratin:* Small ₹3,999 | Med ₹5,699 | Long ₹5,999\n\nWould you like options for *Men* or *Women*? ✨`;
}

export function formatBotox(gender?: 'men' | 'women'): string {
  if (gender === 'men') {
    return `✨ *Men Hair Botox Therapy* 🟢\n\n🟢 *Men Hair Botox:* ₹3,999 _(Member: ₹3,499)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`;
  }
  if (gender === 'women') {
    return `✨ *Women Hair Botox (By Length)* 🟢\n\n🟢 *Small Length:* ₹3,999\n🟢 *Medium Length:* ₹5,999\n🟢 *Long Length:* ₹6,999\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWhat is your hair length? 💛`;
  }
  return `✨ *Hair Botox Therapy Options* 🟢\n\n🟢 *Men Hair Botox:* ₹3,999 _(Member: ₹3,499)_\n🟢 *Women Hair Botox:* Small ₹3,999 | Med ₹5,999 | Long ₹6,999\n\nWould you like options for *Men* or *Women*? ✨`;
}

export function formatNanoplastia(): string {
  return `✨ *Women Nanoplastia Treatment (By Length)* 🟢

🟢 *Small Length:* ₹5,999
🟢 *Medium Length:* ₹6,999
🟢 *Long Length:* ₹7,999

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
What is your hair length? 💛`;
}

export function formatMenChemical(): string {
  return `✨ *Men Advanced Hair Treatments* 🟢

🟢 *Men Keratin Treatment:* ₹3,999 _(Member: ₹3,499)_
🟢 *Men Hair Botox Therapy:* ₹3,999 _(Member: ₹3,499)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatWomenHairWashAndBlowDry(): string {
  return `✨ *Women Hair Wash & Blow Dry (By Length)* 🟢

🟢 *Wash + Blast Dry:* Small ₹399 | Med ₹449 | Long ₹529
🟢 *Wash + Blow Dry & Setting:* Small ₹649 | Med ₹749 | Long ₹799
🟢 *Shampoo & Conditioner Wash (Add-on):* ₹249 _(Member: ₹235)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatMenHairWash(): string {
  return `✨ *Men Hair Wash Services* 🟢

🟢 *Men Shampoo & Conditioner Wash:* ₹129 _(Member: ₹109)_
🟢 *Men Hair Cut with Wash & Blast Dry:* ₹349 _(Member: ₹329)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatHairWashOverview(): string {
  return `✨ *Hair Wash & Blow Dry Services* 🟢

🟢 *Men Shampoo & Conditioner Wash:* ₹129 _(Member: ₹109)_
🟢 *Women Wash + Blast Dry:* Small ₹399 | Med ₹449 | Long ₹529
🟢 *Women Wash + Blow Dry & Setting:* Small ₹649 | Med ₹749 | Long ₹799

Would you like to see options for *Men* or *Women*? 💇`;
}

export function formatRicaWaxing(): string {
  return `✨ *Italian RICA Waxing Services* 🟢

🟢 *Full Arms RICA:* ₹549 _(Member: ₹529)_
🟢 *Half Arms RICA:* ₹319 _(Member: ₹299)_
🟢 *Full Legs RICA:* ₹699 _(Member: ₹679)_
🟢 *Half Legs RICA:* ₹549 _(Member: ₹529)_
🟢 *Underarms RICA:* ₹229 _(Member: ₹209)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatBrazilianWaxing(): string {
  return `✨ *Brazilian Waxing Services* 🟢

🟢 *Underarms Brazilian:* ₹349 _(Member: ₹329)_
🟢 *Full Arms Brazilian:* ₹799 _(Member: ₹745)_
🟢 *Half Arms Brazilian:* ₹499 _(Member: ₹475)_
🟢 *Full Legs Brazilian:* ₹1,199 _(Member: ₹1,115)_
🟢 *Half Legs Brazilian:* ₹799 _(Member: ₹745)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatWaxingOverview(): string {
  return `✨ *Waxing Services at Classic Pearl* 🟢

We offer premium Italian RICA Waxing and Brazilian Waxing for silky smooth skin!

Would you prefer *Italian RICA Waxing* or *Brazilian Waxing*? ✨`;
}

export function formatFaceWaxing(): string {
  return `✨ *Women Face Waxing Services* 🟢

🟢 *Full Face Waxing:* ₹449 _(Member: ₹399)_
🟢 *Upper Lip Waxing:* ₹99 _(Member: ₹79)_
🟢 *Chin Waxing:* ₹109 _(Member: ₹99)_
🟢 *Side Locks Waxing:* ₹149 _(Member: ₹139)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatThreading(): string {
  return `✨ *Women Threading Services* 🟢

🟢 *Eyebrow Threading:* ₹55 _(Member: ₹49)_
🟢 *Full Face Threading:* ₹399 _(Member: ₹369)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatArmsWaxing(): string {
  return `✨ *Arms Waxing Options* 🟢

🟢 *Full Arms RICA:* ₹549 _(Member: ₹529)_
🟢 *Half Arms RICA:* ₹319 _(Member: ₹299)_
🟢 *Full Arms Brazilian:* ₹799 _(Member: ₹745)_
🟢 *Half Arms Brazilian:* ₹499 _(Member: ₹475)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatLegsWaxing(): string {
  return `✨ *Legs Waxing Options* 🟢

🟢 *Full Legs RICA:* ₹699 _(Member: ₹679)_
🟢 *Half Legs RICA:* ₹549 _(Member: ₹529)_
🟢 *Full Legs Brazilian:* ₹1,199 _(Member: ₹1,115)_
🟢 *Half Legs Brazilian:* ₹799 _(Member: ₹745)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatUnderarmsWaxing(): string {
  return `✨ *Underarms Waxing Options* 🟢

🟢 *Underarms Italian RICA:* ₹229 _(Member: ₹209)_
🟢 *Underarms Brazilian:* ₹349 _(Member: ₹329)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a slot today? 💛`;
}

export function formatBikiniOverview(): string {
  return `✨ *Bikini Waxing Services (Women)* 🟢

Yes, we offer premium Bikini Waxing for women in both Italian RICA Wax and Brazilian Wax for gentle, hygienic care. ✨

Would you prefer *Italian RICA Wax* or *Brazilian Wax*?`;
}

export function formatBikiniRica(): string {
  return `✨ *Bikini Italian RICA Waxing* 🟢

🟢 *Bikini Italian RICA Waxing:* ₹2,699 _(Member: ₹2,510)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a private slot today? 💛`;
}

export function formatBikiniBrazilian(): string {
  return `✨ *Bikini Brazilian Waxing* 🟢

🟢 *Bikini Brazilian Waxing:* ₹2,999 _(Member: ₹2,799)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Would you like to reserve a private slot today? 💛`;
}

export function formatBikiniWaxing(): string {
  return `✨ *Bikini Waxing Options (Women)* 🟢

🟢 *Bikini Italian RICA Waxing:* ₹2,699 _(Member: ₹2,510)_
🟢 *Bikini Brazilian Waxing:* ₹2,999 _(Member: ₹2,799)_

📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}
Which one would you prefer to book? 💛`;
}

export function formatOffers(): string {
  return `🎉 *Special Offers Active at Classic Pearl!* 🟢

Yes, we run exciting special offers exclusively when you visit the salon! Our stylists personalize the best package discount for your chosen services during consultation.

For today's active offers, visit our salon or call our desk directly at 📞 *${SALON_INFO.phone}*!

📍 *Location:* ${SALON_INFO.mapsUrl}
🕒 *Hours:* 10:00 AM – 9:00 PM (All 7 Days)
Would you like to reserve a slot today? 💛`;
}

export function formatCombos(serviceKeyword?: string, gender?: 'men' | 'women'): string {
  const kw = (serviceKeyword || '').toLowerCase();

  // A. Haircut Combos
  if (kw.includes('haircut') || kw.includes('hair cut') || /\bcut\b/.test(kw)) {
    if (gender === 'men') {
      return `✨ *Men Haircut Value Combos* 🟢\n\n🟢 *Haircut + Beard + Hair Wash:* ₹439 _(Member: ₹399)_\n🟢 *Haircut + Head Massage + Hair Wash:* ₹659 _(Member: ₹599)_\n🟢 *Haircut + De-Tan (Face & Neck):* ₹849 _(Member: ₹799)_\n🟢 *Haircut + Hair Color + Hair Wash:* ₹1,099 _(Member: ₹999)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`;
    }
    if (gender === 'women') {
      return `✨ *Women Haircut Value Combos* 🟢\n\n🟢 *Hair Spa + Haircut + Blast Dry:* ₹1,449 _(Member: ₹1,350)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`;
    }
    return `✨ *Popular Haircut Value Combos* 🟢\n\n🟢 *Men Haircut + Beard + Hair Wash:* ₹439 _(Member: ₹399)_\n🟢 *Men Haircut + Head Massage + Hair Wash:* ₹659 _(Member: ₹599)_\n🟢 *Women Hair Spa + Haircut + Blast Dry:* ₹1,449 _(Member: ₹1,350)_\n\nWould you like combos for *Men* or *Women*? 💇`;
  }

  // B. Hair Spa Combos
  if (kw.includes('hair spa') || kw.includes('hairspa') || kw.includes('spa')) {
    return `✨ *Hair Spa Value Combos* 🟢\n\n🟢 *Women Hair Spa + Haircut + Blast Dry:* ₹1,449 _(Member: ₹1,350)_\n🟢 *Men Haircut + Anti-Dandruff Spa:* ₹1,209 _(Member: ₹1,125)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`;
  }

  // C. Waxing Combos
  if (kw.includes('wax') || kw.includes('waxing')) {
    return `✨ *Women Waxing Value Combos* 🟢\n\n🟢 *Full Arms + Full Legs & Underarms:* ₹1,499 _(Member: ₹1,395)_\n🟢 *Full Arms + Half Legs & Underarms:* ₹1,349 _(Member: ₹1,255)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`;
  }

  // D. Facial / Clean Up Combos
  if (kw.includes('facial') || kw.includes('clean up') || kw.includes('cleanup')) {
    return `✨ *Facial & Skin Value Combos* 🟢\n\n🟢 *Clean Up + Eyebrow + Upper Lip:* ₹749 _(Member: ₹695)_\n🟢 *Clean Up + Threading + Head Massage:* ₹1,049 _(Member: ₹975)_\n🟢 *Basic Facial + Threading + Head Massage:* ₹1,599 _(Member: ₹1,485)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`;
  }

  // E. Beard Combos
  if (kw.includes('beard') || kw.includes('shave')) {
    return `✨ *Men Beard Value Combos* 🟢\n\n🟢 *Men Haircut + Beard + Hair Wash:* ₹439 _(Member: ₹399)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`;
  }

  // F. Massage Combos
  if (kw.includes('massage')) {
    return `✨ *Relaxing Massage Combos* 🟢\n\n🟢 *Men Haircut + Head Massage + Hair Wash:* ₹659 _(Member: ₹599)_\n🟢 *Women Head Massage + Foot Massage:* ₹949 _(Member: ₹885)_\n🟢 *Women Head & Neck + Foot Massage:* ₹1,099 _(Member: ₹1,020)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`;
  }

  // G. Generic Combos Inquiry
  return `✨ *Classic Pearl Value Combos* 🟢\n\nYes! We offer customized money-saving combos on *Hair Care*, *Facials*, *Grooming* & *Waxing*!\n\nWhich service combo are you looking for?\n• *Haircut Combo* 💇\n• *Hair Spa Combo* 💆\n• *Facial & Clean Up Combo* ✨\n• *Waxing Combo* 🌸\n\nTell us your preference and we'll share the best package! 💛`;
}

/**
 * Deterministic Salon Knowledge Engine with Interactive Button Support:
 * Handles direct, casual, and nuanced queries with 100% catalog accuracy.
 * Kept short, crisp, highlighted with green bullets, and equipped with native WhatsApp one-tap buttons.
 */
export function getSalonDeterministicResponse(
  inboundText: string,
  chatHistory: string = '',
  buttonId?: string
): SalonReplyResult | null {
  const normalized = normalizeSalonText(inboundText);
  const text = normalized;
  const bid = (buttonId || '').toLowerCase().trim();
  const historyLower = normalizeSalonText(chatHistory);
  const lastContext = getLastInquiryContext(chatHistory);

  // Detect explicit gender keywords in user query
  const isMenExplicit = /\b(men|male|gents|man|guy|for men|for male|boys|boy)\b/i.test(text);
  const isWomenExplicit = /\b(women|female|ladies|woman|girl|for women|for female|girls)\b/i.test(text);

  // 0. DIRECT BUTTON DISPATCH & SPECIFIC ROUTING
  if (bid === 'btn_men') {
    if (lastContext === 'haircut') return { reply: formatMenHaircuts(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'hair_spa') return { reply: formatMenHairSpa(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'head_massage') return { reply: formatMenHeadMassage(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'hair_color') return { reply: formatMenHairColor(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'chemical') return { reply: formatMenChemical(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'hair_wash') return { reply: formatMenHairWash(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'combo') return { reply: formatCombos('haircut', 'men'), buttons: SALON_BUTTONS.ACTION };
    return {
      reply: `✨ *Classic Pearl Services for Men* 🟢\n\n🟢 *Haircut & Styling* (Men Cut & Little Champ)\n🟢 *Beard Shave, Trimming & Styling*\n🟢 *Relaxing Head Massage* (Almond & Olive)\n🟢 *Deep Nourishing Hair Spa*\n🟢 *Facials, De-Tan & Pedicure*\n\n📍 *Classic Pearl* | 📞 *Call:* ${SALON_INFO.phone}\nWhich service would you like details or prices for? 💛`,
      buttons: SALON_BUTTONS.ACTION
    };
  }

  if (bid === 'btn_women') {
    if (lastContext === 'bikini_wax') return { reply: formatBikiniOverview(), buttons: SALON_BUTTONS.BIKINI };
    if (lastContext === 'waxing') return { reply: formatWaxingOverview(), buttons: SALON_BUTTONS.WAXING };
    if (lastContext === 'haircut') return { reply: formatWomenHaircuts(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'hair_spa') return { reply: formatWomenHairSpa(), buttons: SALON_BUTTONS.HAIR_SPA_LENGTH };
    if (lastContext === 'head_massage') return { reply: formatWomenHeadMassage(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'hair_color') return { reply: formatWomenHairColor(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'chemical') return { reply: formatWomenChemical(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'hair_wash') return { reply: formatWomenHairWashAndBlowDry(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'combo') return { reply: formatCombos('haircut', 'women'), buttons: SALON_BUTTONS.ACTION };
    return {
      reply: `✨ *Classic Pearl Services for Women* 🟢\n\n🟢 *Haircut & Styling* (Basic & Advance with Blow Dry)\n🟢 *Therapeutic Hair Spa (By Length)* (Nourishing & Repair)\n🟢 *Keratin, Botox & Nanoplastia (By Length)*\n🟢 *Italian Rica Waxing & Threading*\n🟢 *Luxury Facials, Cleanups & Pedicure*\n\n📍 *Classic Pearl* | 📞 *Call:* ${SALON_INFO.phone}\nWhich service would you like details or prices for? 💛`,
      buttons: SALON_BUTTONS.ACTION
    };
  }

  if (bid === 'btn_rica' || bid === 'btn_bikini_rica') {
    if (bid === 'btn_bikini_rica' || lastContext === 'bikini_wax' || historyLower.includes('bikini')) {
      return { reply: formatBikiniRica(), buttons: SALON_BUTTONS.ACTION };
    }
    return { reply: formatRicaWaxing(), buttons: SALON_BUTTONS.ACTION };
  }

  if (bid === 'btn_brazilian' || bid === 'btn_bikini_brazilian') {
    if (bid === 'btn_bikini_brazilian' || lastContext === 'bikini_wax' || historyLower.includes('bikini')) {
      return { reply: formatBikiniBrazilian(), buttons: SALON_BUTTONS.ACTION };
    }
    return { reply: formatBrazilianWaxing(), buttons: SALON_BUTTONS.ACTION };
  }

  if (bid === 'btn_combo_haircut') {
    return { reply: formatCombos('haircut'), buttons: SALON_BUTTONS.ACTION };
  }
  if (bid === 'btn_combo_spa') {
    return { reply: formatCombos('spa'), buttons: SALON_BUTTONS.ACTION };
  }
  if (bid === 'btn_combo_wax') {
    return { reply: formatCombos('wax'), buttons: SALON_BUTTONS.ACTION };
  }

  if (bid === 'btn_spa_small') {
    return { reply: formatWomenHairSpaByLength('small'), buttons: SALON_BUTTONS.ACTION };
  }
  if (bid === 'btn_spa_med') {
    return { reply: formatWomenHairSpaByLength('medium'), buttons: SALON_BUTTONS.ACTION };
  }
  if (bid === 'btn_spa_long') {
    return { reply: formatWomenHairSpaByLength('long'), buttons: SALON_BUTTONS.ACTION };
  }

  // 1. Button Actions & Quick Replies
  if (
    bid === 'btn_offers' || 
    text.includes("today's offer") || text.includes('todays offer') || text.includes('today offer') ||
    text.includes('discount') || text.includes('discounts') || text.includes('offer') || text.includes('offers') ||
    text.includes('deal') || text.includes('deals') || text.includes('tmr is this offer') || text.includes('offer continue')
  ) {
    return {
      reply: formatOffers(),
      buttons: [
        { id: 'btn_book', title: '📅 Book Slot' },
        { id: 'btn_services', title: '📋 Our Services' }
      ]
    };
  }

  if (bid === 'btn_services' || text === 'view services' || text === 'services') {
    return {
      reply: `✨ *Classic Pearl Unisex Salon Menu* 🟢\n\n🟢 *Hair Care & Hair Spa* (Haircut, Spa, Keratin, Color)\n🟢 *Relaxing Head Massage* (Almond, Olive, Coconut)\n🟢 *Luxury Facials & Cleanups* (O3+, Korean Glass, Hydra)\n🟢 *Manicure & Pedicure* (Crystal, Lotus, De-Tan)\n🟢 *Waxing, Threading & Beard Styling*\n\n📞 *Call / Book:* ${SALON_INFO.phone}\nWhich service would you like details on? 😊`,
      buttons: [
        { id: 'btn_offers', title: '🎉 Today\'s Offers' },
        { id: 'btn_book', title: '📅 Book Slot' }
      ]
    };
  }

  if (bid === 'btn_book' || text === 'book appointment') {
    return {
      reply: `📅 *Book Your Slot at Classic Pearl!* 🟢\n\nPlease share:\n1️⃣ *Preferred Service* (e.g. Hair Spa, Facial, Haircut)\n2️⃣ *Preferred Date & Time*\n3️⃣ *Name & Number of Guests*\n\nOr call us directly at 📞 *${SALON_INFO.phone}* for instant slot reservation! 💛`,
      buttons: [
        { id: 'btn_offers', title: '🎉 Today\'s Offers' },
        { id: 'btn_services', title: '📋 Our Services' }
      ]
    };
  }

  // 1.5 CONVERSATIONAL COMBO CONTEXT OVERRIDE:
  // If the conversation is currently in combo context, single words like "waxing", "haircut", "spa"
  // MUST resolve to their respective Value Combo, NOT single services!
  if (lastContext === 'combo') {
    if (text.includes('wax') || text.includes('waxing')) {
      return { reply: formatCombos('wax'), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('haircut') || text.includes('hair cut') || /\bcut\b/.test(text)) {
      if (isMenExplicit && !isWomenExplicit) return { reply: formatCombos('haircut', 'men'), buttons: SALON_BUTTONS.ACTION };
      if (isWomenExplicit && !isMenExplicit) return { reply: formatCombos('haircut', 'women'), buttons: SALON_BUTTONS.ACTION };
      return { reply: formatCombos('haircut'), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('hair spa') || text.includes('spa')) {
      return { reply: formatCombos('spa'), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('facial') || text.includes('clean up') || text.includes('cleanup')) {
      return { reply: formatCombos('facial'), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('beard') || text.includes('shave')) {
      return { reply: formatCombos('beard'), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('massage')) {
      return { reply: formatCombos('massage'), buttons: SALON_BUTTONS.ACTION };
    }
    if (isMenExplicit && !isWomenExplicit) {
      return { reply: formatCombos('haircut', 'men'), buttons: SALON_BUTTONS.ACTION };
    }
    if (isWomenExplicit && !isMenExplicit) {
      return { reply: formatCombos('haircut', 'women'), buttons: SALON_BUTTONS.ACTION };
    }
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
    return {
      reply: `🟢 *Yes, walk-ins are warmly welcome!* 🕒\n\nTo hold your stylist with *zero waiting time*, please call our desk right now at 📞 *${SALON_INFO.phone}*. We'll keep a chair ready for you! 💛`,
      buttons: SALON_BUTTONS.ACTION
    };
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
    return {
      reply: `✨ *Classic Pearl Unisex Salon* 🟢\n\nWe are a premium salon specializing in luxury *Hair Care*, *Skin Aesthetics*, *Pedicure* & *Grooming*.\n\n📍 *Maps:* ${SALON_INFO.mapsUrl}\n🕒 *Hours:* ${SALON_INFO.hours}\n📞 *Call:* ${SALON_INFO.phone}\nHow can we pamper you today? 💛`,
      buttons: SALON_BUTTONS.WELCOME
    };
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
    return {
      reply: `📍 *Classic Pearl Unisex Salon Location:* 🟢\n${SALON_INFO.mapsUrl}\n\n🕒 *Hours:* 10:00 AM – 9:00 PM (All 7 Days)\n📞 *Call for Route Guidance:* ${SALON_INFO.phone}\n\nWould you like us to reserve a slot for your visit? 💛`,
      buttons: SALON_BUTTONS.ACTION
    };
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
    return {
      reply: `📍 *Navigate via Google Maps:* 🟢\n${SALON_INFO.mapsUrl}\n\nFor live landmark guidance, call our front desk directly at 📞 *${SALON_INFO.phone}* and our team will guide you step-by-step! 💛`,
      buttons: SALON_BUTTONS.ACTION
    };
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
    return {
      reply: `🕒 *We are open 10:00 AM to 9:00 PM every day (Monday to Sunday)!* 🟢\n\nWalk-ins and appointments are warmly welcome.\n📍 *Location:* ${SALON_INFO.mapsUrl}\n📞 *Call:* ${SALON_INFO.phone}\nWhat time would you prefer to visit today? 💛`,
      buttons: SALON_BUTTONS.ACTION
    };
  }

  // 7. Combos Inquiry (Smart Matching: Return matching combos if a specific service is requested)
  if (text.includes('combo') || text.includes('combos') || text.includes('package') || text.includes('packages')) {
    if (text.includes('haircut') || text.includes('hair cut') || /\bcut\b/.test(text)) {
      if (isMenExplicit && !isWomenExplicit) return { reply: formatCombos('haircut', 'men'), buttons: SALON_BUTTONS.ACTION };
      if (isWomenExplicit && !isMenExplicit) return { reply: formatCombos('haircut', 'women'), buttons: SALON_BUTTONS.ACTION };
      return { reply: formatCombos('haircut'), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('hair spa') || text.includes('spa')) {
      return { reply: formatCombos('spa'), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('wax') || text.includes('waxing')) {
      return { reply: formatCombos('wax'), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('facial') || text.includes('clean up') || text.includes('cleanup')) {
      return { reply: formatCombos('facial'), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('beard') || text.includes('shave')) {
      return { reply: formatCombos('beard'), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('massage')) {
      return { reply: formatCombos('massage'), buttons: SALON_BUTTONS.ACTION };
    }
    return {
      reply: formatCombos(),
      buttons: SALON_BUTTONS.COMBOS
    };
  }

  // 8. STRICT DOMAIN BOUNDARY: BODY SPA / BODY MASSAGE REJECTION & REDIRECTION
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
    return {
      reply: `✨ *Classic Pearl Unisex Salon* 🟢\n\nPlease note: We are a unisex salon focused on hair and skin aesthetics — we *do not offer body massages* or body spa.\n\n💆 *For deep relaxation, we recommend:*\n🟢 *Relaxing Head Massage* (Almond/Olive) – from *₹349*\n🟢 *Therapeutic Hair Spa* (Nourishing/Repair) – from *₹579*\n🟢 *Chocolate Crystal Pedicure* – *₹1,099*\n\n📞 *Call / Booking:* ${SALON_INFO.phone}\nWould you like to try our relaxing Head Massage or Hair Spa? 💛`,
      buttons: SALON_BUTTONS.GENDER
    };
  }

  // 10. STRICT MEN-EXCLUSIVE SERVICES (NEVER ask Men or Women)
  // A. Men Head Shave
  if (text.includes('head shave') || text.includes('head shaving')) {
    const headShaveItem = salonCatalog.men.filter(s => s.Service.toLowerCase().includes('head shave'));
    return {
      reply: formatPriceList(
        'Men Head Shave Services',
        headShaveItem.length > 0 ? headShaveItem : [{
          ID: 5,
          Service: 'Men Head Shave',
          Category: 'Men - Haircut',
          'Regular Price': 249,
          'Member Price': 219
        }],
        '💡 *Complete Grooming:* Pair your head shave with our soothing *Men Almond / Olive Head Massage (₹399)* or *Men Beard Styling (₹119)* for complete refreshment!'
      ),
      buttons: SALON_BUTTONS.ACTION
    };
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
    return {
      reply: formatPriceList(
        'Men Beard Grooming & Shaving Services',
        menBeard,
        '💡 *Sharp Grooming Upgrade:* Add a sharp *Men Hair Cut (₹249)* or relaxing *Almond Head Massage (₹399)* to complete your look!'
      ),
      buttons: SALON_BUTTONS.ACTION
    };
  }

  // 11. STRICT WOMEN-EXCLUSIVE SERVICES (NEVER ask Men or Women)
  // A. Specific Face Waxing (Full Face, Chin, Upper Lip, Sidelocks, Forehead)
  if (
    text.includes('face wax') || 
    text.includes('face waxing') || 
    text.includes('chin wax') || 
    text.includes('chin waxing') || 
    text.includes('upper lip wax') || 
    text.includes('upper lip waxing') || 
    text.includes('upperlip wax') || 
    text.includes('upperlip waxing') || 
    text.includes('lip wax') || 
    text.includes('lip waxing') || 
    text.includes('side lock') || 
    text.includes('side locks') ||
    text.includes('forehead wax') ||
    text.includes('facial wax') ||
    text.includes('full face wax')
  ) {
    return { reply: formatFaceWaxing(), buttons: SALON_BUTTONS.ACTION };
  }

  // B. Threading (Eyebrows, Upper Lip, Chin, Full Face)
  if (
    text.includes('threading') || 
    text.includes('eyebrow') || 
    text.includes('eyebrows') || 
    text.includes('chin threading') || 
    text.includes('forehead threading') ||
    text.includes('face threading')
  ) {
    return { reply: formatThreading(), buttons: SALON_BUTTONS.ACTION };
  }

  // C. Bikini Waxing (STRICT PRIVACY: ONLY when explicitly asked!)
  if (text.includes('bikini')) {
    if (text.includes('rica')) {
      return { reply: formatBikiniRica(), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('brazilian')) {
      return { reply: formatBikiniBrazilian(), buttons: SALON_BUTTONS.ACTION };
    }
    if (
      text.includes('price') || 
      text.includes('cost') || 
      text.includes('rate') || 
      text.includes('how much') ||
      text.includes('options')
    ) {
      return { reply: formatBikiniWaxing(), buttons: SALON_BUTTONS.BIKINI };
    }
    return { reply: formatBikiniOverview(), buttons: SALON_BUTTONS.BIKINI };
  }

  // D. Specific Body Part Waxing (Underarms, Arms, Legs)
  if (text.includes('underarm') || text.includes('under arm') || text.includes('under-arm')) {
    return { reply: formatUnderarmsWaxing(), buttons: SALON_BUTTONS.ACTION };
  }
  if (text.includes('full arm') || text.includes('half arm') || (text.includes('arm') && text.includes('wax'))) {
    return { reply: formatArmsWaxing(), buttons: SALON_BUTTONS.ACTION };
  }
  if (text.includes('full leg') || text.includes('half leg') || (text.includes('leg') && text.includes('wax'))) {
    return { reply: formatLegsWaxing(), buttons: SALON_BUTTONS.ACTION };
  }

  // E. RICA Waxing (Specific or Contextual)
  if (
    text === 'rica' || 
    text === 'rica wax' || 
    text === 'rica waxing' || 
    text === 'italian rica' ||
    text.includes('rica wax') ||
    text.includes('italian rica')
  ) {
    if (lastContext === 'bikini_wax' || historyLower.includes('bikini')) {
      return { reply: formatBikiniRica(), buttons: SALON_BUTTONS.ACTION };
    }
    return { reply: formatRicaWaxing(), buttons: SALON_BUTTONS.ACTION };
  }

  // F. Brazilian Waxing (Specific or Contextual)
  if (
    text === 'brazilian' || 
    text === 'brazilian wax' || 
    text === 'brazilian waxing' || 
    text.includes('brazilian wax') ||
    text.includes('brazilian waxing')
  ) {
    if (lastContext === 'bikini_wax' || historyLower.includes('bikini')) {
      return { reply: formatBikiniBrazilian(), buttons: SALON_BUTTONS.ACTION };
    }
    return { reply: formatBrazilianWaxing(), buttons: SALON_BUTTONS.ACTION };
  }

  // G. General Waxing Inquiry -> Ask RICA or Brazilian (Strictly NO Bikini!)
  if (
    text.includes('waxing') || 
    text.includes('wax') ||
    text.includes('body wax')
  ) {
    return { reply: formatWaxingOverview(), buttons: SALON_BUTTONS.WAXING };
  }

  // C. Styling & Makeovers (Perming, Tongs, Ironing, Curls)
  if (
    text.includes('perming') || 
    text.includes('tongs') || 
    text.includes('ironing') || 
    text.includes('crimping') || 
    text.includes('curls')
  ) {
    const womenStyling = salonCatalog.women.filter(s => s.Category === 'Women - Styling & Makeover');
    return {
      reply: formatPriceList('Women Hair Styling Services', womenStyling),
      buttons: SALON_BUTTONS.ACTION
    };
  }

  // 12. BOTH / UNISEX SERVICES (No gender question asked!)
  // Pedicure
  if (text.includes('pedicure') || text.includes('pedi')) {
    const pedicures = salonCatalog.both.filter(s => s.Category === 'Both - Pedicure');
    return {
      reply: formatPriceList(
        'Pedicure Services (For Both Men & Women)',
        pedicures,
        '💡 *Pampering Upgrade:* For tired or tanned feet, try our *Chocolate Crystal Pedicure (₹1,099)* or *De-Tan Pedicure (₹799)* for deep exfoliation and massage!'
      ),
      buttons: SALON_BUTTONS.ACTION
    };
  }

  // Manicure
  if (text.includes('manicure') || text.includes('mani')) {
    const manicures = salonCatalog.both.filter(s => s.Category === 'Both - Manicure');
    return {
      reply: formatPriceList('Manicure Services (For Both Men & Women)', manicures),
      buttons: SALON_BUTTONS.ACTION
    };
  }

  // Facial
  if (text.includes('facial') || text.includes('facials')) {
    const facials = salonCatalog.both.filter(s => s.Category === 'Both - Facial');
    return {
      reply: formatPriceList(
        'Facial Treatments (For Both Men & Women)',
        facials,
        '💡 *Celebrity Favorites:* Experience our *Korean Glass Facial (₹2,199)* or *Hydra Facial (₹2,899)* for immediate glass-skin radiance and deep pore cleansing!'
      ),
      buttons: SALON_BUTTONS.ACTION
    };
  }

  // Clean Up
  if (text.includes('clean up') || text.includes('cleanup')) {
    const cleanups = salonCatalog.both.filter(s => s.Category === 'Both - Clean Up');
    return {
      reply: formatPriceList(
        'Clean Up Services (For Both Men & Women)',
        cleanups,
        '💡 *Glow Upgrade:* For deeper pore hydration and lasting glass radiance, ask about our signature Korean Glass Facial when you visit!'
      ),
      buttons: SALON_BUTTONS.ACTION
    };
  }

  // De-Tan
  if (text.includes('detan') || text.includes('de-tan') || text.includes('tan')) {
    const detans = salonCatalog.both.filter(s => s.Category === 'Both - De-Tan');
    return {
      reply: formatPriceList('De-Tan Services (For Both Men & Women)', detans),
      buttons: SALON_BUTTONS.ACTION
    };
  }

  // 13. CONTEXTUAL REPLIES (Single-word answer "men" or "women" following a question)
  const hasServiceKeyword = 
    text.includes('haircut') || 
    text.includes('hair cut') || 
    text.includes('hair trim') || 
    /\bcut\b/.test(text) ||
    text.includes('spa') || 
    text.includes('massage') || 
    text.includes('color') || 
    text.includes('colour') || 
    text.includes('wash') || 
    text.includes('dry') || 
    text.includes('keratin') || 
    text.includes('botox') || 
    text.includes('nanoplastia') || 
    text.includes('beard') || 
    text.includes('shave') || 
    text.includes('wax') || 
    text.includes('rica') || 
    text.includes('brazilian') || 
    text.includes('threading') || 
    text.includes('eyebrow') || 
    text.includes('facial') || 
    text.includes('clean') || 
    text.includes('pedicure') || 
    text.includes('manicure') ||
    text.includes('champ');

  const isShortMenReply = 
    bid === 'btn_men' ||
    (!hasServiceKeyword && (
      text === 'men' || 
      text === 'for men' || 
      text === 'gents' || 
      text === 'for gents' || 
      text === 'man' || 
      text === 'male' || 
      text === 'for male' || 
      text === 'boy' || 
      text === 'boys' || 
      (isMenExplicit && !isWomenExplicit && text.length <= 15)
    ));

  const isShortWomenReply = 
    bid === 'btn_women' ||
    (!hasServiceKeyword && (
      text === 'women' || 
      text === 'for women' || 
      text === 'ladies' || 
      text === 'for ladies' || 
      text === 'woman' || 
      text === 'female' || 
      text === 'for female' || 
      text === 'girl' || 
      text === 'girls' || 
      (isWomenExplicit && !isMenExplicit && text.length <= 15)
    ));

  if (isShortMenReply) {
    if (lastContext === 'haircut') return { reply: formatMenHaircuts(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'hair_spa') return { reply: formatMenHairSpa(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'head_massage') return { reply: formatMenHeadMassage(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'hair_color') return { reply: formatMenHairColor(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'chemical') return { reply: formatMenChemical(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'hair_wash') return { reply: formatMenHairWash(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'combo') return { reply: formatCombos('haircut', 'men'), buttons: SALON_BUTTONS.ACTION };
    return {
      reply: `✨ *Classic Pearl Services for Men* 🟢\n\n🟢 *Haircut & Styling* (Men Cut & Little Champ)\n🟢 *Beard Shave, Trimming & Styling*\n🟢 *Relaxing Head Massage* (Almond & Olive)\n🟢 *Deep Nourishing Hair Spa*\n🟢 *Facials, De-Tan & Pedicure*\n\n📍 *Classic Pearl* | 📞 *Call:* ${SALON_INFO.phone}\nWhich service would you like details or prices for? 💛`,
      buttons: SALON_BUTTONS.ACTION
    };
  }

  if (isShortWomenReply) {
    if (lastContext === 'bikini_wax') return { reply: formatBikiniOverview(), buttons: SALON_BUTTONS.BIKINI };
    if (lastContext === 'waxing') return { reply: formatWaxingOverview(), buttons: SALON_BUTTONS.WAXING };
    if (lastContext === 'haircut') return { reply: formatWomenHaircuts(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'hair_spa') return { reply: formatWomenHairSpa(), buttons: SALON_BUTTONS.HAIR_SPA_LENGTH };
    if (lastContext === 'head_massage') return { reply: formatWomenHeadMassage(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'hair_color') return { reply: formatWomenHairColor(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'chemical') return { reply: formatWomenChemical(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'hair_wash') return { reply: formatWomenHairWashAndBlowDry(), buttons: SALON_BUTTONS.ACTION };
    if (lastContext === 'combo') return { reply: formatCombos('haircut', 'women'), buttons: SALON_BUTTONS.ACTION };
    return {
      reply: `✨ *Classic Pearl Services for Women* 🟢\n\n🟢 *Haircut & Styling* (Basic & Advance with Blow Dry)\n🟢 *Therapeutic Hair Spa (By Length)* (Nourishing & Repair)\n🟢 *Keratin, Botox & Nanoplastia (By Length)*\n🟢 *Italian Rica Waxing & Threading*\n🟢 *Luxury Facials, Cleanups & Pedicure*\n\n📍 *Classic Pearl* | 📞 *Call:* ${SALON_INFO.phone}\nWhich service would you like details or prices for? 💛`,
      buttons: SALON_BUTTONS.ACTION
    };
  }

  // 14. SPECIFIC SUB-SERVICE QUERIES (Instant direct matching)
  // Little Champ (Kids) Haircut
  if (text.includes('little champ')) {
    return {
      reply: `✨ *Little Champ Haircut (Kids)* 🟢\n\n🟢 *Basic Hair Cut for Little Champ:* ₹249 _(Member: ₹219)_\n🟢 *Little Champ with Wash & Blast Dry:* ₹349 _(Member: ₹299)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`,
      buttons: SALON_BUTTONS.ACTION
    };
  }

  // Girls Haircut
  if (text.includes('girl haircut') || text.includes('girls haircut') || text.includes('girl basic') || text.includes('girl advance')) {
    return {
      reply: `✨ *Girl Haircut Services (Below 10 yrs)* 🟢\n\n🟢 *Girl Basic Hair Cut:* ₹329 _(Member: ₹299)_\n🟢 *Girl Advanced Hair Cut:* ₹399 _(Member: ₹369)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`,
      buttons: SALON_BUTTONS.ACTION
    };
  }

  // Advance Haircut
  if (text.includes('advance haircut') || text.includes('advanced haircut') || text.includes('advance cut') || text.includes('advanced cut')) {
    return {
      reply: `✨ *Advance Haircut Services* 🟢\n\n🟢 *Women Advance Haircut (Wash + Blast Dry):* ₹749 _(Member: ₹695)_\n🟢 *Women Advance Haircut (Wash + Blow Dry & Setting):* ₹899 _(Member: ₹835)_\n🟢 *Girl Advanced Hair Cut:* ₹399 _(Member: ₹369)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`,
      buttons: SALON_BUTTONS.ACTION
    };
  }

  // Basic Haircut
  if (text.includes('basic haircut') || text.includes('basic cut')) {
    if (isMenExplicit && !isWomenExplicit) {
      return {
        reply: `✨ *Men Basic Haircut* 🟢\n\n🟢 *Men Hair Cut:* ₹249 _(Member: ₹219)_\n🟢 *Men Hair Cut with Wash & Blast Dry:* ₹349 _(Member: ₹329)_\n🟢 *Basic Hair Cut for Little Champ:* ₹249 _(Member: ₹219)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`,
        buttons: SALON_BUTTONS.ACTION
      };
    }
    if (isWomenExplicit && !isMenExplicit) {
      return {
        reply: `✨ *Women Basic Haircut* 🟢\n\n🟢 *Women Basic Haircut (Wash + Blast Dry):* ₹399 _(Member: ₹349)_\n🟢 *Women Basic Haircut (Wash + Blow Dry & Setting):* ₹599 _(Member: ₹549)_\n🟢 *Girl Basic Hair Cut (Below 10 yrs):* ₹329 _(Member: ₹299)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`,
        buttons: SALON_BUTTONS.ACTION
      };
    }
    return {
      reply: `✨ *Basic Haircut Options* 🟢\n\n🟢 *Men Hair Cut:* ₹249 _(Member: ₹219)_\n🟢 *Women Basic Haircut (Wash + Blast Dry):* ₹399 _(Member: ₹349)_\n🟢 *Women Basic Haircut (Wash + Blow Dry & Setting):* ₹599 _(Member: ₹549)_\n🟢 *Little Champ Hair Cut:* ₹249 _(Member: ₹219)_\n\nWould you like options for *Men* or *Women*? 💇`,
      buttons: SALON_BUTTONS.GENDER
    };
  }

  // Hair Wash, Blow Dry & Blast Dry
  if (
    text.includes('hair wash') || 
    text.includes('hairwash') || 
    text.includes('blow dry') || 
    text.includes('blowdry') || 
    text.includes('blast dry') || 
    text.includes('wash and blow dry') ||
    text.includes('wash & blow dry')
  ) {
    if (isMenExplicit && !isWomenExplicit) {
      return { reply: formatMenHairWash(), buttons: SALON_BUTTONS.ACTION };
    }
    if (isWomenExplicit && !isMenExplicit) {
      return { reply: formatWomenHairWashAndBlowDry(), buttons: SALON_BUTTONS.ACTION };
    }
    return { reply: formatHairWashOverview(), buttons: SALON_BUTTONS.GENDER };
  }

  // 15. TRUE DUAL-GENDER SERVICES (Ask Men or Women ONLY when gender unstated)
  // A. Haircut / Hair Trim
  if (
    text.includes('haircut') || 
    text.includes('hair cut') || 
    text.includes('hair trim') || 
    text.includes('hair cutting') || 
    text.includes('hair styling') || 
    /\bcut\b/.test(text)
  ) {
    if (isMenExplicit && !isWomenExplicit) {
      return { reply: formatMenHaircuts(), buttons: SALON_BUTTONS.ACTION };
    }
    if (isWomenExplicit && !isMenExplicit) {
      return { reply: formatWomenHaircuts(), buttons: SALON_BUTTONS.ACTION };
    }
    return {
      reply: `✨ *Haircut & Styling at Classic Pearl* 🟢\n\nWe offer professional haircut and styling for both men and women!\n\nWould you like to see options for *Men* or *Women*? 💇`,
      buttons: SALON_BUTTONS.GENDER
    };
  }

  // B. Specific Hair Spa Sub-Types (Deep Nourishing, Damage Repair, Anti-Dandruff, Deluxe)
  if (text.includes('deep nourishing')) {
    if (isMenExplicit && !isWomenExplicit) {
      return {
        reply: `✨ *Men Deep Nourishing Hair Spa* 🟢\n\n🟢 *Deep Nourishing Hair Spa:* ₹579 _(Member: ₹521)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`,
        buttons: SALON_BUTTONS.ACTION
      };
    }
    return {
      reply: `✨ *Deep Nourishing Hair Spa (Women)* 🟢\n\n🟢 *Small Length:* ₹699 _(Member: ₹665)_\n🟢 *Medium Length:* ₹849 _(Member: ₹790)_\n🟢 *Long Length:* ₹999 _(Member: ₹930)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWhat length is your hair? 💛`,
      buttons: SALON_BUTTONS.HAIR_SPA_LENGTH
    };
  }

  if (text.includes('damage repair')) {
    if (isMenExplicit && !isWomenExplicit) {
      return {
        reply: `✨ *Men Damage Repair Hair Spa* 🟢\n\n🟢 *Damage Repair Hair Spa:* ₹659 _(Member: ₹599)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`,
        buttons: SALON_BUTTONS.ACTION
      };
    }
    return {
      reply: `✨ *Damage Repair Hair Spa (Women)* 🟢\n\n🟢 *Small Length:* ₹899 _(Member: ₹835)_\n🟢 *Medium Length:* ₹1,199 _(Member: ₹1,115)_\n🟢 *Long Length:* ₹1,399 _(Member: ₹1,300)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWhat length is your hair? 💛`,
      buttons: SALON_BUTTONS.HAIR_SPA_LENGTH
    };
  }

  if (text.includes('anti dandruff') || text.includes('anti-dandruff') || text.includes('hair fall') || text.includes('hairfall')) {
    if (isMenExplicit && !isWomenExplicit) {
      return {
        reply: `✨ *Men Anti-Dandruff Hair Spa* 🟢\n\n🟢 *Anti-Dandruff / Hair Fall Spa:* ₹659 _(Member: ₹599)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`,
        buttons: SALON_BUTTONS.ACTION
      };
    }
    return {
      reply: `✨ *Anti-Dandruff / Hair Fall Spa (Women)* 🟢\n\n🟢 *Small Length:* ₹1,199 _(Member: ₹1,115)_\n🟢 *Medium Length:* ₹1,399 _(Member: ₹1,300)_\n🟢 *Long Length:* ₹1,599 _(Member: ₹1,485)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWhat length is your hair? 💛`,
      buttons: SALON_BUTTONS.HAIR_SPA_LENGTH
    };
  }

  if (text.includes('deluxe hair spa') || text.includes('deluxe spa')) {
    if (isMenExplicit && !isWomenExplicit) {
      return {
        reply: `✨ *Men Deluxe Hair Spa* 🟢\n\n🟢 *Deluxe Hair Spa:* ₹769 _(Member: ₹699)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWould you like to reserve a slot today? 💛`,
        buttons: SALON_BUTTONS.ACTION
      };
    }
    return {
      reply: `✨ *Deluxe Hair Spa (Women)* 🟢\n\n🟢 *Small Length:* ₹1,199 _(Member: ₹1,115)_\n🟢 *Medium Length:* ₹1,499 _(Member: ₹1,395)_\n🟢 *Long Length:* ₹1,799 _(Member: ₹1,675)_\n\n📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}\nWhat length is your hair? 💛`,
      buttons: SALON_BUTTONS.HAIR_SPA_LENGTH
    };
  }

  // B2. Hair Spa General (Anti-Dandruff, Damage Repair, Deep Nourishing, Deluxe)
  if (text.includes('hair spa') || text.includes('hairspa') || (text.includes('spa') && !text.includes('body'))) {
    if (text.includes('small') || text.includes('short')) {
      if (isMenExplicit && !isWomenExplicit) return { reply: formatMenHairSpa(), buttons: SALON_BUTTONS.ACTION };
      return { reply: formatWomenHairSpaByLength('small'), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('medium') || text.includes('med') || text.includes('shoulder')) {
      if (isMenExplicit && !isWomenExplicit) return { reply: formatMenHairSpa(), buttons: SALON_BUTTONS.ACTION };
      return { reply: formatWomenHairSpaByLength('medium'), buttons: SALON_BUTTONS.ACTION };
    }
    if (text.includes('long') || text.includes('waist')) {
      if (isMenExplicit && !isWomenExplicit) return { reply: formatMenHairSpa(), buttons: SALON_BUTTONS.ACTION };
      return { reply: formatWomenHairSpaByLength('long'), buttons: SALON_BUTTONS.ACTION };
    }

    if (isMenExplicit && !isWomenExplicit) {
      return { reply: formatMenHairSpa(), buttons: SALON_BUTTONS.ACTION };
    }
    if (isWomenExplicit && !isMenExplicit) {
      return { reply: formatWomenHairSpa(), buttons: SALON_BUTTONS.HAIR_SPA_LENGTH };
    }
    return {
      reply: `✨ *Hair Spa at Classic Pearl* 🟢\n\nWe offer therapeutic hair spa treatments for both men and women!\n\nWould you like to see options for *Men* or *Women*? 😊`,
      buttons: SALON_BUTTONS.GENDER
    };
  }

  // C. Head Massage
  if (text.includes('head massage') || text.includes('head oil massage')) {
    if (isMenExplicit && !isWomenExplicit) {
      return { reply: formatMenHeadMassage(), buttons: SALON_BUTTONS.ACTION };
    }
    if (isWomenExplicit && !isMenExplicit) {
      return { reply: formatWomenHeadMassage(), buttons: SALON_BUTTONS.ACTION };
    }
    return {
      reply: `✨ *Relaxing Head Massage* 🟢\n\nWe offer soothing head massages with nourishing oils for both men and women!\n\nWould you like options for *Men* or *Women*? 💆`,
      buttons: SALON_BUTTONS.GENDER
    };
  }

  // D. Hair Color
  if (text.includes('color') || text.includes('colour') || text.includes('highlights') || text.includes('streaks') || text.includes('balayage')) {
    if (isMenExplicit && !isWomenExplicit) {
      return { reply: formatMenHairColor(), buttons: SALON_BUTTONS.ACTION };
    }
    if (isWomenExplicit && !isMenExplicit) {
      return { reply: formatWomenHairColor(), buttons: SALON_BUTTONS.ACTION };
    }
    return {
      reply: `✨ *Hair Color & Highlights* 🟢\n\nWe offer premium global color and highlights for both men and women!\n\nWould you like to see options for *Men* or *Women*? 🎨`,
      buttons: SALON_BUTTONS.GENDER
    };
  }

  // E. Chemical Treatments / Advanced Hair Treatments (Botox, Keratin, Nanoplastia)
  if (text.includes('nanoplastia')) {
    return { reply: formatNanoplastia(), buttons: SALON_BUTTONS.ACTION };
  }
  if (text.includes('keratin')) {
    if (isMenExplicit && !isWomenExplicit) return { reply: formatKeratin('men'), buttons: SALON_BUTTONS.ACTION };
    if (isWomenExplicit && !isMenExplicit) return { reply: formatKeratin('women'), buttons: SALON_BUTTONS.ACTION };
    return { reply: formatKeratin(), buttons: SALON_BUTTONS.GENDER };
  }
  if (text.includes('botox')) {
    if (isMenExplicit && !isWomenExplicit) return { reply: formatBotox('men'), buttons: SALON_BUTTONS.ACTION };
    if (isWomenExplicit && !isMenExplicit) return { reply: formatBotox('women'), buttons: SALON_BUTTONS.ACTION };
    return { reply: formatBotox(), buttons: SALON_BUTTONS.GENDER };
  }
  if (text.includes('smoothen') || text.includes('straighten')) {
    if (isMenExplicit && !isWomenExplicit) return { reply: formatMenChemical(), buttons: SALON_BUTTONS.ACTION };
    if (isWomenExplicit && !isMenExplicit) return { reply: formatWomenChemical(), buttons: SALON_BUTTONS.ACTION };
    return { reply: formatWomenChemical(), buttons: SALON_BUTTONS.ACTION };
  }

  // Generic greeting or default fallback (Short & Crisp)
  return {
    reply: `✨ *Welcome to Classic Pearl Unisex Salon!* 🟢\n\nHow can we pamper you today? Our popular services:\n🟢 *Hair Spa & Haircuts*\n🟢 *Keratin & Botox Treatments*\n🟢 *Luxury Facials & Cleanups*\n🟢 *Pedicure & Head Massage*\n\n📍 ${SALON_INFO.mapsUrl} | 📞 *Call:* ${SALON_INFO.phone}\nWhich service would you like details on? 💛`,
    buttons: SALON_BUTTONS.WELCOME
  };
}

/**
 * Backward-compatible helper returning reply string directly
 */
export function getSalonDeterministicReply(
  inboundText: string,
  chatHistory: string = '',
  buttonId?: string
): string | null {
  const res = getSalonDeterministicResponse(inboundText, chatHistory, buttonId);
  return res ? res.reply : null;
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
- WAXING INTELLIGENCE & STRICT BIKINI PRIVACY:
  • If asked generally about Waxing: Ask whether they want Italian RICA Waxing or Brazilian Waxing! (NEVER mention Bikini!)
  • If asked for RICA Wax (or customer replies RICA): Provide Italian RICA Waxing services (Full Arms: ₹549/₹529, Half Arms: ₹319/₹299, Full Legs: ₹699/₹679, Half Legs: ₹549/₹529, Underarms: ₹229/₹209). DO NOT mention Bikini in RICA waxing lists!
  • If asked for Brazilian Wax (or customer replies Brazilian): Provide Brazilian Waxing services (Underarms: ₹349/₹329, Full Arms: ₹799/₹745, Half Arms: ₹499/₹475, Full Legs: ₹1199/₹1115, Half Legs: ₹799/₹745). DO NOT mention Bikini in Brazilian waxing lists!
  • BIKINI WAXING STRICT PRIVACY: NEVER mention Bikini Waxing until and unless the client explicitly asks for "bikini". When asked, confirm politely and offer Italian RICA (₹2,699 / Member: ₹2,510) or Brazilian (₹2,999 / Member: ₹2,799)!
  • If asked for Face Waxing (Full Face, Chin, Upper Lip, Side Locks): Provide Face Waxing services (Full Face: ₹449/₹399, Upper Lip: ₹99/₹79, Chin: ₹109/₹99, Side Locks: ₹149/₹139)!
  • If asked for Threading (Eyebrows, Upper Lip, Full Face): Provide Threading services (Eyebrows: ₹55/₹49, Full Face: ₹399/₹369)!

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

RULE 5: TRUE DUAL-GENDER SERVICES & LENGTH-BASED PRICING:
- Genuinely dual services with distinct Men and Women offerings:
  • Haircut / Hair Trim
  • Hair Spa (Anti-Dandruff, Damage Repair, Deep Nourishing, Deluxe)
  • Head Massage (Almond, Olive, Coconut, Navarathna)
  • Hair Color / Highlights
  • Chemical Treatments (Keratin, Botox, Nanoplastia)
  • Hair Wash & Blow Dry / Blast Dry
- STRICT ISOLATION OF HAIRCUT INQUIRIES:
  • When a customer asks about Haircut, list ONLY haircut options. NEVER mix Hair Spa, Keratin, Botox, or Nanoplastia into Haircut replies!
  • Women Haircuts: Women Basic Haircut (Wash + Blast Dry: ₹399/₹349), Women Basic Haircut (Wash + Blow Dry & Setting: ₹599/₹549), Women Advance Haircut (Wash + Blast Dry: ₹749/₹695), Women Advance Haircut (Wash + Blow Dry & Setting: ₹899/₹835), Girl Basic Haircut (₹329/₹299), Girl Advanced Haircut (₹399/₹369).
  • Men Haircuts: Men Hair Cut (₹249/₹219), Men Hair Cut with Wash & Blast Dry (₹349/₹329), Little Champ Hair Cut (₹249/₹219), Little Champ with Wash & Blast Dry (₹349/₹299). DO NOT include head shaves, beard, or chemical treatments in Men haircut replies!
- LENGTH-BASED PRICING FOR WOMEN HAIR SERVICES:
  • For Women Hair Spa, Hair Color, Chemical Treatments (Botox, Keratin, Nanoplastia), and Blow Dry / Blast Dry, pricing varies by hair length (Small, Medium, Long).
  • NEVER quote only "Small" length as a single flat rate, because customers feel misled when charged more for long hair in the salon.
  • ALWAYS present the length-wise breakdown: Small ₹X | Med ₹Y | Long ₹Z.
  • Women Hair Spa: Deep Nourishing (Small ₹699 | Med ₹849 | Long ₹999), Damage Repair (Small ₹899 | Med ₹1,199 | Long ₹1,399), Anti-Dandruff (Small ₹1,199 | Med ₹1,399 | Long ₹1,599), Deluxe (Small ₹1,199 | Med ₹1,499 | Long ₹1,799).
  • Women Chemical: Hair Botox (Small ₹3,999 | Med ₹5,999 | Long ₹6,999), Keratin (Small ₹3,999 | Med ₹5,699 | Long ₹5,999), Nanoplastia (Small ₹5,999 | Med ₹6,999 | Long ₹7,999).
  • Women Color: Global Ammonia-Free (Small ₹2,999 | Med ₹3,999 | Long ₹4,999), Global With Ammonia (Small ₹2,999 | Med ₹3,999 | Long ₹4,999), Balayage (Small ₹5,999 | Med ₹6,999 | Long ₹7,999).
- STRICT CONTEXT TRACKING ON GENDER REPLIES ("men" or "women"):
  • When a customer replies with "men" or "women", inspect the most recent previous question!
  • If the previous turn was about Haircut, return ONLY that gender's haircut options!
  • If the previous turn was about Hair Spa, return ONLY that gender's hair spa options with length-wise breakdown!
  • If the previous turn was about Head Massage, return ONLY that gender's head massage options!
  • NEVER confuse Haircut with Hair Spa!
- IF GENDER IS NOT SPECIFIED in the query or recent context (e.g. "how much for hair spa?", "haircut price"):
  Politely ask:
  "We offer wonderful [service name] for both men and women! ✨ Would you like to know the options and prices for *Men* or *Women*?"

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
  Yes, we run exciting special offers exclusively when you visit the salon! Our stylists personalize the best package discount for your chosen services during consultation. For details, invite them to visit or call ${SALON_INFO.phone}.

RULE 7: CRISP & FOCUSED RESPONSES (DO NOT CLUTTER WITH UNRELATED UPSELLS):
- Focus 100% on answering what the customer asked for.
- Do NOT clutter replies with long promotional paragraphs about Keratin or other treatments when they only asked for Haircut or Hair Spa.
- Keep answers ultra-clean so what they asked for is immediately visible!

RULE 8: ACCURATE PRICING & SMART VALUE COMBOS:
- ALWAYS display both *Regular Price* and *Member Price* in ₹ (e.g. 🟢 *Service:* ₹XXX _(Member: ₹YYY)_).
- NEVER hallucinate prices.
- Do NOT list combo packages automatically. If explicitly asked about combos (e.g. "haircut combo", "hair spa combo", "waxing combo"), search and return ONLY the combos matching that specific service. If generally asked "do you have combos?", ask which specific service they want a combo for.

RULE 9: SHORT, CRISP & GREEN-HIGHLIGHTED FORMATTING:
- Format text cleanly and compactly for WhatsApp:
  • STRICT BREVITY: Keep every response SHORT, CRISP, AND COMPACT (under 8 to 10 lines total). Never write long essays or 2-page text. People lose focus if messages are too long.
  • HIGHLIGHTED SERVICES IN BOLD WITH GREEN ACCENTS: Every service pushed or mentioned MUST be formatted in *bold* with a 🟢 green accent bullet (e.g. 🟢 *Women Basic Haircut (Wash + Blast Dry):* ₹399 _(Member: ₹349)_).
  • Do NOT use markdown headers (#, ##, ###).
  • Always finish with 1 brief line: 📍 *Classic Pearl* | 📞 *Book/Call:* ${SALON_INFO.phone}.
- Tone: Warm, welcoming, respectful, professional, always striving to convert them to visit the salon.

--- RECENT CONVERSATION HISTORY ---
${chatHistory}

--- CURRENT MESSAGE FROM CUSTOMER (${contactName}) ---
"${inboundText}"

Reply as Pearl Assistant to keep the customer engaged and convert them:`;
}

/**
 * Main AI Engine Entrypoint returning structured reply + interactive buttons
 */
export async function generateSalonResponse(params: {
  apiKey?: string;
  contactName: string;
  inboundText: string;
  buttonId?: string;
  chatHistory?: string;
}): Promise<SalonReplyResult> {
  const { apiKey, contactName, inboundText, buttonId, chatHistory = '' } = params;

  // 1. Check deterministic salon knowledge engine first (0ms, 100% catalog-accurate, enforces length-based pricing, privacy, buttons & combo rules)
  const deterministic = getSalonDeterministicResponse(inboundText, chatHistory, buttonId);
  if (deterministic) {
    return deterministic;
  }

  // 2. If not caught by deterministic patterns, use Gemini 2.5 Flash for conversational handling
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
            return {
              reply: `I'm connecting you with our salon team right away. You can also reach us directly at *${SALON_INFO.phone}*! 💛`,
              buttons: SALON_BUTTONS.ACTION
            };
          }

          // WhatsApp markdown formatting cleanup
          reply = reply
            .replace(/\*\*(.*?)\*\*/g, '*$1*') // Bold: **text** -> *text*
            .replace(/__(.*?)__/g, '_$1_') // Italic: __text__ -> _text_
            .replace(/###\s*(.*)/g, '*$1*') // H3 -> *Header*
            .replace(/##\s*(.*)/g, '*$1*') // H2 -> *Header*
            .replace(/#\s*(.*)/g, '*$1*'); // H1 -> *Header*

          return {
            reply,
            buttons: SALON_BUTTONS.ACTION
          };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error('Gemini API HTTP Error:', res.status, errJson);
      }
    } catch (err) {
      console.error('Gemini AI Generation Error, using fallback:', err);
    }
  }

  // Fallback greeting if neither matched
  return {
    reply: `✨ *Welcome to Classic Pearl Unisex Salon!* 🟢\n\nHow can we pamper you today? Our popular services:\n🟢 *Hair Spa & Haircuts*\n🟢 *Keratin & Botox Treatments*\n🟢 *Luxury Facials & Cleanups*\n🟢 *Pedicure & Head Massage*\n\n📍 ${SALON_INFO.mapsUrl} | 📞 *Call:* ${SALON_INFO.phone}\nWhich service would you like details on? 💛`,
    buttons: SALON_BUTTONS.WELCOME
  };
}

/**
 * Backward-compatible helper returning reply string directly
 */
export async function generateSalonReply(params: {
  apiKey?: string;
  contactName: string;
  inboundText: string;
  buttonId?: string;
  chatHistory?: string;
}): Promise<string> {
  const res = await generateSalonResponse(params);
  return res.reply;
}
