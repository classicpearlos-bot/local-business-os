import { 
  getSalonDeterministicResponse, 
  getSalonDeterministicReply, 
  getLastInquiryContext, 
  normalizeSalonText,
  SALON_BUTTONS 
} from './src/lib/automations/salonAI';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('=== TEST SUITE: NATIVE BUTTONS, COMBO CONTEXT & TYPO TOLERANCE ===\n');

// 1. TYPO NORMALIZER
assert(normalizeSalonText('waxng') === 'waxing', 'waxng -> waxing');
assert(normalizeSalonText('hairct') === 'haircut', 'hairct -> haircut');
assert(normalizeSalonText('hairspa') === 'hair spa', 'hairspa -> hair spa');
assert(normalizeSalonText('womn') === 'women', 'womn -> women');
assert(normalizeSalonText('rika') === 'rica', 'rika -> rica');
assert(normalizeSalonText('bikni') === 'bikini', 'bikni -> bikini');
assert(normalizeSalonText('cmbo') === 'combo', 'cmbo -> combo');

// 2. COMBO CONTEXT TRACKING
const comboAssistantMsg = `Customer: do you have combos?
Assistant: ✨ *Classic Pearl Value Combos* 🟢

Yes! We offer customized money-saving combos on *Hair Care*, *Facials*, *Grooming* & *Waxing*!

Which service combo are you looking for?
• *Haircut Combo* 💇
• *Hair Spa Combo* 💆
• *Facial & Clean Up Combo* ✨
• *Waxing Combo* 🌸

Tell us your preference and we'll share the best package! 💛`;

const ctx = getLastInquiryContext(comboAssistantMsg);
assert(ctx === 'combo', `getLastInquiryContext identifies combo context (got: ${ctx})`);

// 3. COMBO FOLLOW-UP TYPED "waxing"
const resWaxFollowup = getSalonDeterministicResponse('waxing', comboAssistantMsg);
assert(resWaxFollowup !== null, 'resWaxFollowup is not null');
assert(resWaxFollowup!.reply.includes('Full Arms + Full Legs & Underarms') && resWaxFollowup!.reply.includes('1,499'), 'Contains arms+legs combo price');

// 4. COMBO FOLLOW-UP WITH TYPO "waxng"
const resWaxTypo = getSalonDeterministicResponse('waxng', comboAssistantMsg);
assert(resWaxTypo!.reply.includes('Women Waxing Value Combos'), 'waxng typo in combo context returns Waxing Combos');

// 5. COMBO FOLLOW-UP BUTTON CLICK "btn_combo_wax"
const resBtnComboWax = getSalonDeterministicResponse('', comboAssistantMsg, 'btn_combo_wax');
assert(resBtnComboWax!.reply.includes('Women Waxing Value Combos'), 'btn_combo_wax returns Waxing Combos');

// 6. COMBO FOLLOW-UP TYPED "haircut"
const resHaircutCombo = getSalonDeterministicResponse('haircut', comboAssistantMsg);
assert(resHaircutCombo!.reply.includes('Popular Haircut Value Combos'), 'haircut in combo context returns Haircut Combos, NOT single haircut gender question');

// 7. COMBO FOLLOW-UP BUTTON CLICK "btn_combo_haircut"
const resBtnHaircutCombo = getSalonDeterministicResponse('', comboAssistantMsg, 'btn_combo_haircut');
assert(resBtnHaircutCombo!.reply.includes('Popular Haircut Value Combos'), 'btn_combo_haircut returns Haircut Combos');

// 8. COMBO FOLLOW-UP "women"
const resWomenCombo = getSalonDeterministicResponse('women', comboAssistantMsg);
assert(resWomenCombo!.reply.includes('Women Haircut Value Combos'), 'women in combo context returns Women Haircut Combos');

// 9. COMBO OVERVIEW BUTTONS
const resComboOverview = getSalonDeterministicResponse('do you have combos?');
assert(resComboOverview!.reply.includes('Classic Pearl Value Combos'), 'Combos inquiry returns Value Combos overview');
assert(resComboOverview!.buttons?.length === 3, 'Returns 3 combo buttons');
assert(resComboOverview!.buttons?.[0].id === 'btn_combo_haircut', 'Button 1 is Haircut Combo');
assert(resComboOverview!.buttons?.[1].id === 'btn_combo_spa', 'Button 2 is Hair Spa Combo');
assert(resComboOverview!.buttons?.[2].id === 'btn_combo_wax', 'Button 3 is Waxing Combo');

// 10. SINGLE HAIRCUT INQUIRY WITHOUT GENDER
const resHaircutSingle = getSalonDeterministicResponse('haircut');
assert(resHaircutSingle!.reply.includes('Would you like to see options for *Men* or *Women*? 💇'), 'Haircut asks Men or Women');
assert(resHaircutSingle!.buttons?.length === 2, 'Returns 2 gender buttons');
assert(resHaircutSingle!.buttons?.[0].id === 'btn_men', 'Button 1 is Men');
assert(resHaircutSingle!.buttons?.[1].id === 'btn_women', 'Button 2 is Women');

// 11. BUTTON CLICK "btn_women" AFTER HAIRCUT
const haircutAssistantMsg = `Customer: haircut\nAssistant: Would you like to see options for *Men* or *Women*? 💇`;
const resBtnWomenHaircut = getSalonDeterministicResponse('👩 Women', haircutAssistantMsg, 'btn_women');
assert(resBtnWomenHaircut!.reply.includes('Women Haircut Services'), 'btn_women after haircut returns pure Women Haircuts');
assert(!resBtnWomenHaircut!.reply.includes('Hair Spa'), 'Women Haircuts NEVER contain Hair Spa');

// 12. BUTTON CLICK "btn_men" AFTER HAIRCUT
const resBtnMenHaircut = getSalonDeterministicResponse('👨 Men', haircutAssistantMsg, 'btn_men');
assert(resBtnMenHaircut!.reply.includes('Men Hair Cut') && resBtnMenHaircut!.reply.includes('249'), 'Men Haircut contains Men Hair Cut ₹249');

// 13. SINGLE HAIR SPA INQUIRY
const resSpaSingle = getSalonDeterministicResponse('hair spa');
assert(resSpaSingle!.reply.includes('Would you like to see options for *Men* or *Women*? 😊'), 'Hair Spa asks Men or Women');
assert(resSpaSingle!.buttons?.length === 2, 'Returns 2 gender buttons');

// 14. HAIR SPA -> WOMEN RETURNS LENGTH TIERS & LENGTH BUTTONS
const resWomenSpa = getSalonDeterministicResponse('women', 'Customer: hair spa\nAssistant: Would you like to see options for *Men* or *Women*?');
assert(resWomenSpa!.reply.includes('Women Hair Spa Services (By Length)'), 'Women hair spa returns length-based breakdown');
assert(resWomenSpa!.reply.includes('Small ₹699 | Med ₹849 | Long ₹999'), 'Deep Nourishing Spa has Small, Med, Long breakdown');
assert(resWomenSpa!.buttons?.length === 3, 'Returns 3 length buttons');
assert(resWomenSpa!.buttons?.[0].id === 'btn_spa_small', 'Length button small');
assert(resWomenSpa!.buttons?.[1].id === 'btn_spa_med', 'Length button medium');
assert(resWomenSpa!.buttons?.[2].id === 'btn_spa_long', 'Length button long');

// 15. LENGTH BUTTON CLICK "btn_spa_med"
const resSpaMed = getSalonDeterministicResponse('', '', 'btn_spa_med');
assert(resSpaMed!.reply.includes('Women Hair Spa Services (Medium Length)'), 'btn_spa_med returns Medium Length pricing');
assert(resSpaMed!.reply.includes('Deep Nourishing Spa:* ₹849'), 'Medium length Deep Nourishing is ₹849');

// 16. WAXING INQUIRY WITHOUT GENDER
const resWaxingOverview = getSalonDeterministicResponse('waxing');
assert(resWaxingOverview!.reply.includes('Would you prefer *Italian RICA Waxing* or *Brazilian Waxing*?'), 'Waxing asks RICA vs Brazilian');
assert(!resWaxingOverview!.reply.toLowerCase().includes('bikini'), 'Strict privacy: Waxing overview NEVER mentions bikini');
assert(resWaxingOverview!.buttons?.length === 2, 'Returns 2 waxing buttons');
assert(resWaxingOverview!.buttons?.[0].id === 'btn_rica', 'Button 1 is Italian RICA');
assert(resWaxingOverview!.buttons?.[1].id === 'btn_brazilian', 'Button 2 is Brazilian Wax');

// 17. BUTTON CLICK "btn_rica"
const resBtnRica = getSalonDeterministicResponse('', '', 'btn_rica');
assert(resBtnRica!.reply.includes('Italian RICA Waxing Services'), 'btn_rica returns RICA Waxing Services');
assert(resBtnRica!.reply.includes('Full Arms RICA:* ₹549'), 'Full Arms RICA is ₹549');
assert(!resBtnRica!.reply.toLowerCase().includes('bikini'), 'RICA waxing NEVER mentions bikini');

// 18. STRICT BIKINI PRIVACY
const resBikini = getSalonDeterministicResponse('bikini waxing');
assert(resBikini!.reply.includes('Bikini Waxing Services (Women)'), 'Explicit bikini query confirms bikini');
assert(resBikini!.buttons?.length === 2, 'Returns 2 bikini buttons');
assert(resBikini!.buttons?.[0].id === 'btn_bikini_rica', 'Bikini RICA button');
assert(resBikini!.buttons?.[1].id === 'btn_bikini_brazilian', 'Bikini Brazilian button');

// 19. BIKINI BUTTON CLICK "btn_bikini_rica"
const resBikiniRica = getSalonDeterministicResponse('', '', 'btn_bikini_rica');
assert(resBikiniRica!.reply.includes('Bikini Italian RICA Waxing:* ₹2,699'), 'Bikini RICA price ₹2,699');

// 20. META BUTTON CONSTRAINT VERIFICATION (Title <= 20 chars, max 3 buttons)
for (const [key, btns] of Object.entries(SALON_BUTTONS)) {
  assert(btns.length >= 1 && btns.length <= 3, `Group ${key} has 1-3 buttons (has ${btns.length})`);
  for (const b of btns) {
    assert(b.title.length <= 20, `Button "${b.title}" title length <= 20 chars (is ${b.title.length})`);
    assert(b.id.length <= 256, `Button "${b.id}" id length <= 256 chars`);
  }
}

console.log('\n🎉 ALL 20 TEST CASES PASSED WITH 100% ACCURACY!');
