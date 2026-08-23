import { NextResponse } from 'next/server';

/**
 * POST /api/ai/generate-copy
 * Contextual AI Marketing Copy Generator for WhatsApp Campaigns
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { prompt, goal = 'Drive Sales', tone = 'Friendly', businessType = 'Business' } = payload;

    if (!prompt) {
      return NextResponse.json({ error: 'Promotion details required' }, { status: 400 });
    }

    // Dynamic intelligent copy variations based on tone and goal
    const emojis = tone === 'Festive' ? '🎉 ✨ 🪔 🎁' : tone === 'Urgent' ? '⚡ ⏳ 🔥' : tone === 'Premium' ? '💎 ✨ 🌟' : '👋 😊 🚀';
    const cta = goal === 'Get Bookings' ? '👉 Reply *BOOK* to reserve your slot now!' :
      goal === 'Drive Sales' ? '👉 Use code *FESTIVE20* at checkout today!' :
      goal === 'Collect Replies' ? '👉 Reply *YES* to claim your exclusive pass!' :
      '👉 Tap below or reply to this message for details!';

    const headline = tone === 'Festive' 
      ? `Special Celebration Offer Just for You ${emojis.split(' ')[0]}`
      : tone === 'Urgent'
      ? `Final Hours: Don't Miss Out! ${emojis.split(' ')[0]}`
      : tone === 'Premium'
      ? `An Exclusive Invitation for You ${emojis.split(' ')[0]}`
      : `Exciting News from ${businessType} ${emojis.split(' ')[0]}`;

    const sampleBody = `Hello {{1}} ${emojis.split(' ')[0]}\n\n${prompt.trim()}\n\n${cta}\n\n_Valid for a limited time only._`;

    const variations = [
      {
        tone: 'Balanced & Direct',
        copy: sampleBody,
        headline
      },
      {
        tone: 'Short & Punchy',
        copy: `Hi {{1}}! ${emojis.split(' ')[1] || '✨'} ${prompt.trim().slice(0, 120)}...\n\n${cta}`,
        headline: `Quick Update: ${prompt.trim().slice(0, 40)}`
      },
      {
        tone: 'High Urgency',
        copy: `⚡ *LAST CHANCE {{1}}!* ⚡\n\n${prompt.trim()}\n\n⏳ Offer ends tonight!\n${cta}`,
        headline: 'Ending Soon!'
      }
    ];

    return NextResponse.json({
      success: true,
      headline,
      generatedBody: sampleBody,
      variations,
      suggestedVariables: ['1'],
      recommendedMedia: 'image'
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to generate copy' }, { status: 500 });
  }
}
