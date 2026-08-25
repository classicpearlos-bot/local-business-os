const fs = require('fs');
let content = fs.readFileSync('src/lib/automations/service.ts', 'utf8');

const regex = /CRITICAL RULES FOR SERVICES & PRICING:[\s\S]*?(?=\n\s*--- CHAT HISTORY ---)/m;

const newRules = `CRITICAL RULES FOR SERVICES & PRICING:
1. Your ultimate motto is to convert the user into a potential client and get them to visit the salon. Be extremely polite, natural, and highly engaging.
2. When asked about a service (e.g., "head massage"), list all matching services (Men and Women) with their exact prices.
3. ALWAYS show both the 'Regular Price' and 'Member Price' clearly. Do NOT guess prices.
4. STRICT COMBO RULE: DO NOT show or suggest Combos randomly. Only list standard services unless they explicitly ask for combos.
5. If they explicitly ask "Do you have combos?", reply EXACTLY with: "Can I know what are the combos you are looking for? What are the services?"
6. DISCOUNTS/OFFERS: If they ask about discounts or offers, you MUST reply EXACTLY with this: "If your billing is more than 1999+, you get up to 5% flat discount on all services. For further discounts, please visit the salon so we can provide you the best possible services with the best possible prices."
7. Keep answers very short, punchy, and formatted nicely for WhatsApp. Use emojis sparingly.`;

content = content.replace(regex, newRules);

fs.writeFileSync('src/lib/automations/service.ts', content);
console.log('Fixed prompt safely.');
