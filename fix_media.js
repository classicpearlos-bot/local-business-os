const fs = require('fs');
let content = fs.readFileSync('src/lib/meta/media.ts', 'utf8');

const replacement = 
export async function downloadMediaFromMeta(mediaId: string, accessToken: string): Promise<{ buffer: Buffer, mimeType: string }> {
  const metaUrlRes = await fetch(\\/\\, {
    headers: { 'Authorization': \Bearer \\ }
  });
  const metaUrlData = await metaUrlRes.json();
  if (!metaUrlData.url) throw new Error(metaUrlData?.error?.message || 'Failed to get media URL');

  const downloadRes = await fetch(metaUrlData.url, {
    headers: { 'Authorization': \Bearer \\ }
  });
  if (!downloadRes.ok) throw new Error('Failed to download media bytes');
  
  const arrayBuffer = await downloadRes.arrayBuffer();
  const mimeType = downloadRes.headers.get('content-type') || metaUrlData.mime_type || 'application/octet-stream';
  
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}
;

content = content.replace(/export async function downloadMediaFromMeta[\s\S]*/, replacement.trim());
fs.writeFileSync('src/lib/meta/media.ts', content, 'utf8');
console.log('Fixed media.ts');
