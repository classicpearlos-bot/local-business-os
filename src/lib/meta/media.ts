import { META_GRAPH_URL } from './client';

export async function uploadMediaToMeta(phoneNumberId: string, accessToken: string, file: Blob, mimeType: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('messaging_product', 'whatsapp');
  formData.append('type', mimeType);

  const url = `${META_GRAPH_URL}/${phoneNumberId}/media`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
      // Note: Do NOT set Content-Type header when sending FormData, 
      // the browser/node fetch will set it automatically with the correct boundary
    },
    body: formData as any
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Failed to upload media to Meta');
  }

  return response.json(); // returns { id: 'media_id' }
}
