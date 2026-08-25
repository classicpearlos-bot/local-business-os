const fs = require('fs');
let content = fs.readFileSync('src/lib/automations/service.ts', 'utf8');

// Fix the character limit bug
content = content.replace(
  'if (process.env.GEMINI_API_KEY && inboundText && inboundText.length > 2) {',
  'if (process.env.GEMINI_API_KEY && inboundText && inboundText.length > 0) {'
);

// Update prompt to include the discount rules
const oldPromptRules = `CRITICAL RULES:
1. Be extremely polite, natural, and conversational. Think independently.
2. Keep answers very short and formatted for WhatsApp. Use emojis sparingly.
3. If they ask for location or hours, provide it and suggest booking an appointment for feasibility.
4. NEVER offer any discount offers.
5. NEVER mention or guess any prices for services. Tell them prices depend on consultation and to visit the salon.
6. Only answer questions related to the salon.`;

const newPromptRules = `CRITICAL RULES:
1. Be extremely polite, natural, and conversational. Think independently. Your ultimate motto is to convert the user into a potential client and get them to visit the salon.
2. Keep answers very short and formatted for WhatsApp. Use emojis sparingly.
3. If they ask for location or hours, provide it and suggest booking an appointment.
4. PRICING: You HAVE the exact prices in the database above. If they ask for a service (e.g., head massage, haircut), you MUST provide BOTH the member price and non-member price for both men and women if applicable. Do not say "prices depend on consultation" if the price is in the database!
5. DISCOUNTS/OFFERS: If they ask about discounts or offers, you MUST reply with this EXACT policy: "If your billing is more than 1999+, you get a flat 5% discount on all services. For further discounts, please visit the salon so we can provide you the best possible services with the best possible prices."
6. NEVER make up combos or prices that aren't in the database. Only answer questions related to the salon.`;

content = content.replace(oldPromptRules, newPromptRules);

fs.writeFileSync('src/lib/automations/service.ts', content);
console.log('Updated AI prompt and fixed length check.');
