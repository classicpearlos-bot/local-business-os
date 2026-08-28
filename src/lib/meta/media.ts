import { META_GRAPH_URL } from './client';

/**
 * Uploads a media file to Meta using the Resumable Upload API.
 * This is required for template header images — regular media upload IDs don't work for templates.
 * Returns { media_id } for regular message sends, or { handle } for template creation.
 */
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
    },
    body: formData as any
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Failed to upload media to Meta');
  }

  return response.json(); // returns { id: 'media_id' }
}

/**
 * Uploads an image using the Meta Resumable Upload API to get a template-compatible handle.
 * This handle (starts with "4:...") is required for IMAGE headers in message templates.
 * 
 * @param appId - Meta App ID (not phone number ID)
 * @param accessToken - System User Access Token
 * @param file - Image blob
 * @param mimeType - e.g. 'image/jpeg'
 * @param filename - e.g. 'salon.jpg'
 * @returns handle string like "4:c2Fs..."
 */
export async function uploadImageForTemplate(
  appId: string,
  accessToken: string,
  file: Blob,
  mimeType: string,
  filename: string
): Promise<string> {
  const fileBuffer = await file.arrayBuffer();
  const fileSize = fileBuffer.byteLength;

  // Step 1: Create upload session
  const sessionRes = await fetch(
    `${META_GRAPH_URL}/${appId}/uploads?file_name=${encodeURIComponent(filename)}&file_length=${fileSize}&file_type=${encodeURIComponent(mimeType)}&access_token=${accessToken}`,
    { method: 'POST' }
  );
  const sessionData = await sessionRes.json();
  if (!sessionData.id) {
    throw new Error(sessionData?.error?.message || 'Failed to create upload session');
  }

  // Step 2: Upload file bytes
  const uploadRes = await fetch(`${META_GRAPH_URL}/${sessionData.id}`, {
    method: 'POST',
    headers: {
      'Authorization': `OAuth ${accessToken}`,
      'file_offset': '0',
      'Content-Type': mimeType
    },
    body: fileBuffer
  });
  const uploadData = await uploadRes.json();
  if (!uploadData.h) {
    throw new Error(uploadData?.error?.message || 'Failed to upload file to Meta');
  }

  return uploadData.h; // This is the handle needed for template header
}
/**
 * Downloads a media file from Meta API given its ID
 */
export async function downloadMediaFromMeta(mediaId: string, accessToken: string): Promise<{ buffer: Buffer, mimeType: string }> {
  // 1. Get Media URL
  const metaUrlRes = await fetch(`${META_GRAPH_URL}/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const metaUrlData = await metaUrlRes.json();
  if (!metaUrlData.url) {
    throw new Error(metaUrlData?.error?.message || 'Failed to get media URL');
  }

  // 2. Download from Media URL
  const downloadRes = await fetch(metaUrlData.url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!downloadRes.ok) throw new Error('Failed to download media bytes');
  
  const arrayBuffer = await downloadRes.arrayBuffer();
  const mimeType = downloadRes.headers.get('content-type') || metaUrlData.mime_type || 'application/octet-stream';
  
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}
