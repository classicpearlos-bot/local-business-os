/**
 * AI Campaign CoPilot & Quality Health Diagnostic Engine
 */

export interface CampaignHealthReport {
  score: number; // 0 to 100
  status: 'OPTIMAL' | 'GOOD' | 'NEEDS_ATTENTION';
  checks: Array<{
    title: string;
    passed: boolean;
    importance: 'critical' | 'recommended' | 'optional';
  }>;
  aiRecommendations: string[];
}

export function calculateCampaignHealth(params: {
  name: string;
  recipientCount: number;
  templateSelected: boolean;
  headerType: string;
  hasMedia: boolean;
  bodyText: string;
  variablesPopulated: boolean;
  hasVariables: boolean;
}): CampaignHealthReport {
  let score = 100;
  const checks: CampaignHealthReport['checks'] = [];
  const aiRecommendations: string[] = [];

  // Check 1: Campaign Name
  const hasName = Boolean(params.name?.trim());
  checks.push({
    title: 'Campaign Name defined',
    passed: hasName,
    importance: 'critical'
  });
  if (!hasName) score -= 15;

  // Check 2: Audience verification
  const hasAudience = params.recipientCount > 0;
  checks.push({
    title: `${params.recipientCount} Opted-in recipients validated`,
    passed: hasAudience,
    importance: 'critical'
  });
  if (!hasAudience) {
    score -= 30;
    aiRecommendations.push('Audience is empty. Upload an Excel file or select CRM contacts to proceed.');
  }

  // Check 3: Template selection
  checks.push({
    title: 'Meta WhatsApp Template approved',
    passed: params.templateSelected,
    importance: 'critical'
  });
  if (!params.templateSelected) {
    score -= 25;
    aiRecommendations.push('Select a pre-approved Meta Template before broadcasting.');
  }

  // Check 4: Media Header completeness
  const requiresMedia = ['image', 'video', 'document'].includes(params.headerType);
  if (requiresMedia) {
    const mediaValid = params.hasMedia;
    checks.push({
      title: `${params.headerType.toUpperCase()} media header attached`,
      passed: mediaValid,
      importance: 'critical'
    });
    if (!mediaValid) {
      score -= 20;
      aiRecommendations.push(`This template requires a ${params.headerType} header attachment.`);
    } else {
      aiRecommendations.push(`Visual ${params.headerType} attached. Visual offers generate 3x higher click-through rates.`);
    }
  }

  // Check 5: Personalization / Variables
  if (params.hasVariables) {
    checks.push({
      title: 'Dynamic personalization variables populated',
      passed: params.variablesPopulated,
      importance: 'recommended'
    });
    if (!params.variablesPopulated) {
      score -= 10;
      aiRecommendations.push('Fill in default values for variables to ensure no missing text placeholders.');
    } else {
      aiRecommendations.push('Personalized campaigns have a 28% higher response rate.');
    }
  } else {
    aiRecommendations.push('Tip: Templates with customer name (e.g. {{1}}) yield significantly higher engagement.');
  }

  // Check 6: Message length
  if (params.bodyText && params.bodyText.length > 350) {
    aiRecommendations.push('Your message is over 350 characters. Concise offers under 250 characters convert faster on mobile.');
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const status = finalScore >= 85 ? 'OPTIMAL' : finalScore >= 60 ? 'GOOD' : 'NEEDS_ATTENTION';

  return {
    score: finalScore,
    status,
    checks,
    aiRecommendations
  };
}
