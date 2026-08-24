import { fetchMetaAPI } from './client';

export interface GetTemplatesOptions {
  wabaId: string; // WhatsApp Business Account ID (not the phone number ID)
  accessToken: string;
}

/**
 * Fetches message templates from WhatsApp Business Account
 */
export async function getWhatsAppTemplates(options: GetTemplatesOptions) {
  // Use graph API to get message templates for the WABA
  return fetchMetaAPI(`/${options.wabaId}/message_templates?fields=name,status,category,language,components`, 'GET', undefined, options.accessToken);
}

/**
 * Creates a new message template in the WhatsApp Business Account
 */
export async function createWhatsAppTemplate(options: GetTemplatesOptions, payload: any) {
  return fetchMetaAPI(`/${options.wabaId}/message_templates`, 'POST', payload, options.accessToken);
}
