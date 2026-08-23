/**
 * Meta WhatsApp Cloud API Error Code Diagnostic & Plain English Categorizer
 */

export interface ErrorDiagnosis {
  category: string;
  categoryBadgeVariant: 'warning' | 'danger' | 'info' | 'primary' | 'default';
  humanTitle: string;
  explanation: string;
  actionableRemedy: string;
}

export function diagnoseMetaError(errorCode?: string | number, errorMessage?: string): ErrorDiagnosis {
  const codeStr = String(errorCode || '').trim();

  // 1. Not Registered on WhatsApp
  if (codeStr === '131026' || codeStr === '131051' || errorMessage?.toLowerCase().includes('undeliverable') || errorMessage?.toLowerCase().includes('not a whatsapp user')) {
    return {
      category: 'Not on WhatsApp',
      categoryBadgeVariant: 'danger',
      humanTitle: 'Phone number is not registered on WhatsApp',
      explanation: 'The target recipient does not have an active WhatsApp account associated with this phone number.',
      actionableRemedy: 'Verify the customer number or remove it from future broadcast lists.'
    };
  }

  // 2. 24-Hour Window Expired
  if (codeStr === '131047' || errorMessage?.toLowerCase().includes('24 hour') || errorMessage?.toLowerCase().includes('customer service window')) {
    return {
      category: '24hr Window Expired',
      categoryBadgeVariant: 'warning',
      humanTitle: 'Free-form 24-Hour messaging window closed',
      explanation: 'More than 24 hours have elapsed since the user last messaged your business. You must use a pre-approved Meta Template to start a conversation.',
      actionableRemedy: 'Use an approved Template Message instead of a regular free-form text.'
    };
  }

  // 3. Rate Limit / Concurrency Cap
  if (codeStr === '131056' || codeStr === '429' || errorMessage?.toLowerCase().includes('rate limit') || errorMessage?.toLowerCase().includes('too many requests')) {
    return {
      category: 'Rate Limited',
      categoryBadgeVariant: 'info',
      humanTitle: 'Meta API throughput limit reached',
      explanation: 'Your Meta WhatsApp account tier reached its per-second or daily messaging throughput cap.',
      actionableRemedy: 'NexChat worker will automatically retry with exponential backoff. Increase Meta messaging tier by maintaining high quality rating.'
    };
  }

  // 4. Payment / Billing Restriction
  if (codeStr === '131042' || codeStr === '131045' || errorMessage?.toLowerCase().includes('payment') || errorMessage?.toLowerCase().includes('billing')) {
    return {
      category: 'Billing Restriction',
      categoryBadgeVariant: 'danger',
      humanTitle: 'Meta Business Account payment/credit issue',
      explanation: 'Meta WhatsApp Business Account has an expired payment method or unpaid balance.',
      actionableRemedy: 'Log in to Meta Business Manager > WhatsApp Accounts > Payment Settings to update your card.'
    };
  }

  // 5. Template Parameter / Variable Mismatch
  if (codeStr === '132000' || codeStr === '132001' || codeStr === '132005' || errorMessage?.toLowerCase().includes('parameter') || errorMessage?.toLowerCase().includes('variable')) {
    return {
      category: 'Template Mismatch',
      categoryBadgeVariant: 'warning',
      humanTitle: 'Template variables or header parameters missing',
      explanation: 'The number of variables (e.g. {{1}}, {{2}}) or the media header type did not match the template approved by Meta.',
      actionableRemedy: 'Review template components in Campaign Studio to match all required variables.'
    };
  }

  // 6. Access Token / Permission Denied
  if (codeStr === '131000' || codeStr === '190' || errorMessage?.toLowerCase().includes('access token') || errorMessage?.toLowerCase().includes('permission')) {
    return {
      category: 'Authentication / Token',
      categoryBadgeVariant: 'danger',
      humanTitle: 'Meta System User token expired or missing permissions',
      explanation: 'The WhatsApp Cloud API Permanent Access Token is invalid or missing whatsapp_business_messaging permissions.',
      actionableRemedy: 'Regenerate token in Meta Business Manager and update in WhatsApp Settings (/whatsapp).'
    };
  }

  // 7. Invalid Phone Number Format
  if (codeStr === 'MALFORMED_PHONE' || errorMessage?.toLowerCase().includes('invalid phone') || errorMessage?.toLowerCase().includes('e.164')) {
    return {
      category: 'Invalid Number',
      categoryBadgeVariant: 'warning',
      humanTitle: 'Phone number format is invalid',
      explanation: 'The phone number does not adhere to international E.164 format (missing country code or invalid digit length).',
      actionableRemedy: 'Include international country code prefix (e.g. +91 for India, +1 for US).'
    };
  }

  // 8. Contact Opted Out / Suppressed
  if (codeStr === 'SUPPRESSED_OPT_OUT' || errorMessage?.toLowerCase().includes('opted out') || errorMessage?.toLowerCase().includes('opt out')) {
    return {
      category: 'Opted Out',
      categoryBadgeVariant: 'default',
      humanTitle: 'Customer explicitly opted out of marketing',
      explanation: 'Recipient previously revoked consent or replied STOP. Automatically suppressed to protect account quality.',
      actionableRemedy: 'Contact will only receive messages if they re-opt-in or send an incoming inquiry.'
    };
  }

  // Default / Generic Error
  return {
    category: 'Meta Error',
    categoryBadgeVariant: 'danger',
    humanTitle: errorMessage || 'Meta Cloud API dispatch failed',
    explanation: errorMessage || 'Meta WhatsApp Cloud API rejected this message.',
    actionableRemedy: 'Inspect the detailed Meta error trace in the Message Debugger.'
  };
}
