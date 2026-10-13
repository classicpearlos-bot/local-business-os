/**
 * Meta WhatsApp Cloud API Error Code Diagnostic & Plain English Categorizer
 */

export interface ErrorDiagnosis {
  code: string;
  category: string;
  categoryBadgeVariant: 'warning' | 'danger' | 'info' | 'primary' | 'default';
  humanTitle: string;
  explanation: string;
  actionableRemedy: string;
  canRetryImmediately: boolean;
}

export function diagnoseMetaError(errorCode?: string | number | null, errorMessage?: string | null): ErrorDiagnosis {
  const codeStr = String(errorCode || '').trim();
  const msgLower = String(errorMessage || '').toLowerCase();

  // 1. Meta Ecosystem Protection / Per-User Marketing Frequency Cap (131049)
  if (
    codeStr === '131049' ||
    msgLower.includes('healthy ecosystem engagement') ||
    msgLower.includes('ecosystem')
  ) {
    return {
      code: '131049',
      category: 'Meta Frequency Cap (131049)',
      categoryBadgeVariant: 'warning',
      humanTitle: 'Blocked by Meta Per-User Marketing Frequency Limit',
      explanation:
        'Meta automatically limits how many Marketing template messages a single WhatsApp user can receive across businesses within a short period if the user has not recently opened or replied to marketing messages.',
      actionableRemedy:
        'Wait 48–72 hours before sending another Marketing broadcast to these numbers, or include interactive Quick Reply buttons in your templates so customers tap/reply (which resets Meta’s engagement score for that customer).',
      canRetryImmediately: false
    };
  }

  // 2. Spam / Quality Rate Limit Hit (131048)
  if (
    codeStr === '131048' ||
    msgLower.includes('spam rate limit')
  ) {
    return {
      code: '131048',
      category: 'Spam Rate Limit (131048)',
      categoryBadgeVariant: 'warning',
      humanTitle: 'Meta Quality / Spam Rate Limit Reached',
      explanation:
        'Meta temporarily throttled outgoing marketing messages because too many messages were sent too quickly or previous broadcasts had low read/reply rates.',
      actionableRemedy:
        'Wait 24 hours and retry these recipients using the "Retry Failed Recipients" button. Space large broadcasts into batches of 200–250 contacts.',
      canRetryImmediately: false
    };
  }

  // 3. Not Registered on WhatsApp / Undeliverable (131026 / 131051)
  if (
    codeStr === '131026' ||
    codeStr === '131051' ||
    msgLower.includes('undeliverable') ||
    msgLower.includes('not a whatsapp user')
  ) {
    return {
      code: codeStr && codeStr !== 'null' ? codeStr : '131026',
      category: 'Not on WhatsApp / Undeliverable',
      categoryBadgeVariant: 'danger',
      humanTitle: 'Phone number is not active on WhatsApp or cannot receive messages',
      explanation:
        'Either this phone number is not registered on WhatsApp, the customer is using an outdated device/app, or the customer has blocked business messages on WhatsApp.',
      actionableRemedy:
        'Verify with the client at salon reception if they use a different WhatsApp number, or remove/opt-out this number from future WhatsApp broadcasts.',
      canRetryImmediately: false
    };
  }

  // 4. Meta Experiment Holdout (130472)
  if (
    codeStr === '130472' ||
    msgLower.includes('part of an experiment')
  ) {
    return {
      code: '130472',
      category: 'Meta Experiment (130472)',
      categoryBadgeVariant: 'info',
      humanTitle: "Customer's number is in a temporary Meta platform holdout group",
      explanation:
        'Meta randomly places less than 1% of WhatsApp users into temporary platform A/B experiments where marketing templates from businesses are held back.',
      actionableRemedy:
        'This is controlled by Meta and resolves automatically after the experiment window ends. Reach out via normal phone call/SMS or include them in your next broadcast.',
      canRetryImmediately: false
    };
  }

  // 5. 24-Hour Window Expired (131047)
  if (
    codeStr === '131047' ||
    msgLower.includes('24 hour') ||
    msgLower.includes('re-engagement') ||
    msgLower.includes('customer service window')
  ) {
    return {
      code: '131047',
      category: '24hr Window Expired (131047)',
      categoryBadgeVariant: 'warning',
      humanTitle: 'Free-form 24-Hour messaging window closed',
      explanation:
        'More than 24 hours have passed since the customer last replied. Only approved Meta Template messages can be sent outside the 24-hour window.',
      actionableRemedy:
        'Send an approved Marketing or Utility Template message instead of a free-form text message.',
      canRetryImmediately: true
    };
  }

  // 6. Rate Limit / Concurrency Cap (131056 / 429)
  if (
    codeStr === '131056' ||
    codeStr === '429' ||
    msgLower.includes('rate limit') ||
    msgLower.includes('too many requests')
  ) {
    return {
      code: codeStr && codeStr !== 'null' ? codeStr : '131056',
      category: 'Throughput Rate Limit',
      categoryBadgeVariant: 'info',
      humanTitle: 'Meta API per-second throughput limit reached',
      explanation:
        'Your WhatsApp Business Account reached its per-second sending speed limit or pair rate limit to the same phone number.',
      actionableRemedy:
        'Click "Retry Failed Recipients" on this report page to re-dispatch these messages automatically.',
      canRetryImmediately: true
    };
  }

  // 7. Payment / Billing Restriction (131042 / 131045)
  if (
    codeStr === '131042' ||
    codeStr === '131045' ||
    msgLower.includes('payment') ||
    msgLower.includes('billing') ||
    msgLower.includes('eligibility payment')
  ) {
    return {
      code: '131042',
      category: 'Meta Billing Issue (131042)',
      categoryBadgeVariant: 'danger',
      humanTitle: 'Meta Business Account payment method or credit issue',
      explanation:
        'Meta paused paid template delivery because the credit/debit card or prepaid balance in Meta Business Manager had a payment hold or failed charge.',
      actionableRemedy:
        'Open Meta Business Settings > WhatsApp Accounts > Payment Settings, clear any pending balance, and then click "Retry Failed Recipients".',
      canRetryImmediately: true
    };
  }

  // 8. Template Parameter / Media Header Mismatch (132000 / 132001 / 132005 / #100)
  if (
    codeStr === '132000' ||
    codeStr === '132001' ||
    codeStr === '132005' ||
    codeStr === '100' ||
    msgLower.includes('parameter') ||
    msgLower.includes('variable') ||
    msgLower.includes('valid uri')
  ) {
    return {
      code: codeStr && codeStr !== 'null' ? codeStr : '132000',
      category: 'Template / Media Mismatch',
      categoryBadgeVariant: 'warning',
      humanTitle: 'Template variables or header image parameter missing/invalid',
      explanation:
        'The template requires an image header or body variables (like {{1}}) that did not match the structure approved by Meta.',
      actionableRemedy:
        'When launching a template with an Image Header, upload the campaign image in Step 3 of the Campaign Studio before sending.',
      canRetryImmediately: false
    };
  }

  // 9. Access Token / Permission Denied (131000 / 190)
  if (
    codeStr === '131000' ||
    codeStr === '190' ||
    msgLower.includes('access token') ||
    msgLower.includes('permission')
  ) {
    return {
      code: '190',
      category: 'Authentication / Token',
      categoryBadgeVariant: 'danger',
      humanTitle: 'Meta System User token expired or missing permissions',
      explanation:
        'The WhatsApp Cloud API Access Token is expired or missing whatsapp_business_messaging permissions.',
      actionableRemedy:
        'Update your Permanent Access Token in WhatsApp Settings (/whatsapp) and click "Retry Failed Recipients".',
      canRetryImmediately: true
    };
  }

  // 10. Invalid Phone Number Format
  if (
    codeStr === 'MALFORMED_PHONE' ||
    msgLower.includes('invalid phone') ||
    msgLower.includes('e.164')
  ) {
    return {
      code: 'MALFORMED_PHONE',
      category: 'Invalid Phone Format',
      categoryBadgeVariant: 'warning',
      humanTitle: 'Phone number format is invalid',
      explanation:
        'The phone number does not have a valid international country code (+91 followed by 10 digits).',
      actionableRemedy:
        'Ensure the phone number is formatted as +91XXXXXXXXXX in Contacts or your Excel sheet.',
      canRetryImmediately: false
    };
  }

  // 11. Contact Opted Out / Suppressed
  if (
    codeStr === 'OPTED_OUT' ||
    codeStr === 'SUPPRESSED_OPT_OUT' ||
    msgLower.includes('opted out') ||
    msgLower.includes('not opted-in')
  ) {
    return {
      code: 'OPTED_OUT',
      category: 'Customer Opted Out',
      categoryBadgeVariant: 'default',
      humanTitle: 'Customer is marked as Opted-Out in CRM',
      explanation:
        'This contact previously replied STOP or has marketing opt-in turned off in your CRM.',
      actionableRemedy:
        'If the customer gave consent to receive offers, enable Opt-In for their contact in the Contacts page and retry.',
      canRetryImmediately: false
    };
  }

  // Default / Generic Error
  return {
    code: codeStr && codeStr !== 'null' ? codeStr : 'META_ERR',
    category: 'Meta Delivery Error',
    categoryBadgeVariant: 'danger',
    humanTitle: errorMessage || 'Meta Cloud API could not deliver message',
    explanation:
      errorMessage || 'Meta WhatsApp Cloud API rejected or could not complete delivery to this number.',
    actionableRemedy:
      'Verify that the customer phone number has an active WhatsApp account and click "Retry Failed Recipients" to re-attempt delivery.',
    canRetryImmediately: true
  };
}
