import { fetchMetaAPI } from './client';

export interface SendMessageOptions {
  phoneNumberId: string;
  accessToken: string;
  to: string;
}

export type MediaHeaderType = 'image' | 'video' | 'document';

export interface TemplateMediaHeader {
  type: MediaHeaderType;
  url?: string;
  id?: string;
  filename?: string;
}

export interface TemplateVariableParam {
  type: 'text';
  text: string;
}

/**
 * Builds Meta-compliant template components payload
 */
export function buildTemplateComponents(
  mediaHeader?: TemplateMediaHeader,
  bodyVariables?: string[],
  buttonParams?: any[]
): any[] {
  const components: any[] = [];

  // 1. Media or Text Header
  if (mediaHeader && (mediaHeader.url || mediaHeader.id)) {
    const mediaObj: any = {};
    if (mediaHeader.id) {
      mediaObj.id = mediaHeader.id;
    } else if (mediaHeader.url && mediaHeader.url.startsWith('http')) {
      mediaObj.link = mediaHeader.url;
    } else {
      // If no valid ID or HTTP URL (e.g., local blob), skip or handle error
      // But we must provide something if we claim to have a media header.
      // A local blob URL will crash Meta API.
    }

    if (mediaHeader.type === 'document' && mediaHeader.filename) {
      mediaObj.filename = mediaHeader.filename;
    }

    components.push({
      type: 'header',
      parameters: [
        {
          type: mediaHeader.type,
          [mediaHeader.type]: mediaObj
        }
      ]
    });
  }

  // 2. Body Variables ({{1}}, {{2}}, etc.)
  if (bodyVariables && bodyVariables.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyVariables.map(val => ({
        type: 'text',
        text: String(val ?? '')
      }))
    });
  }

  // 3. Dynamic Button parameters (e.g. quick reply payload or dynamic url)
  if (buttonParams && buttonParams.length > 0) {
    components.push(...buttonParams);
  }

  return components;
}

/**
 * Sends a plain text message via WhatsApp Cloud API
 */
export async function sendWhatsAppText(
  options: SendMessageOptions,
  text: string,
  previewUrl: boolean = false
) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: options.to,
    type: 'text',
    text: {
      preview_url: previewUrl,
      body: text,
    },
  };

  return fetchMetaAPI(`/${options.phoneNumberId}/messages`, 'POST', payload, options.accessToken);
}

/**
 * Sends a direct media message (Image, Video, Document, Audio) via WhatsApp Cloud API
 */
export async function sendWhatsAppMedia(
  options: SendMessageOptions,
  mediaType: 'image' | 'video' | 'document' | 'audio',
  mediaUrl: string,
  caption?: string,
  filename?: string
) {
  const mediaPayload: any = { link: mediaUrl };
  if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
    mediaPayload.caption = caption;
  }
  if (filename && mediaType === 'document') {
    mediaPayload.filename = filename;
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: options.to,
    type: mediaType,
    [mediaType]: mediaPayload
  };

  return fetchMetaAPI(`/${options.phoneNumberId}/messages`, 'POST', payload, options.accessToken);
}

/**
 * Sends an approved template message with optional media header and variable interpolation
 */
export async function sendWhatsAppTemplate(
  options: SendMessageOptions,
  templateName: string,
  languageCode: string = 'en_US',
  components: any[] = []
) {
  const payload = {
    messaging_product: 'whatsapp',
    to: options.to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: components,
    },
  };

  return fetchMetaAPI(`/${options.phoneNumberId}/messages`, 'POST', payload, options.accessToken);
}
