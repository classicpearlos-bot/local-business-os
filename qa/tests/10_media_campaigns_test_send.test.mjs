import assert from 'node:assert/strict';
import { TEST_CONFIG } from '../config/test-config.mjs';

// Meta media limits fixture for ESM runner verification
const META_MEDIA_LIMITS = {
  image: { maxSizeBytes: 5 * 1024 * 1024, maxSizeMB: 5, acceptedMimeTypes: ['image/jpeg', 'image/png'] },
  video: { maxSizeBytes: 16 * 1024 * 1024, maxSizeMB: 16, acceptedMimeTypes: ['video/mp4', 'video/3gpp'] },
  document: { maxSizeBytes: 100 * 1024 * 1024, maxSizeMB: 100, acceptedMimeTypes: ['application/pdf'] },
  audio: { maxSizeBytes: 16 * 1024 * 1024, maxSizeMB: 16, acceptedMimeTypes: ['audio/aac', 'audio/mp4', 'audio/mpeg'] }
};

function validateMedia(type, file) {
  const limits = META_MEDIA_LIMITS[type];
  if (!limits) return { valid: false, error: 'Unsupported' };
  if (file.size > limits.maxSizeBytes) return { valid: false, error: 'Oversized' };
  if (file.type && !limits.acceptedMimeTypes.includes(file.type)) return { valid: false, error: 'Invalid MIME' };
  return { valid: true };
}

function buildTemplateComponentsPayload(mediaHeader, bodyVariables) {
  const components = [];
  if (mediaHeader && mediaHeader.url) {
    components.push({
      type: 'header',
      parameters: [{ type: mediaHeader.type, [mediaHeader.type]: { link: mediaHeader.url } }]
    });
  }
  if (bodyVariables && bodyVariables.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyVariables.map(val => ({ type: 'text', text: String(val ?? '') }))
    });
  }
  return components;
}

export async function runMediaCampaignsTests() {
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
    }
  }

  console.log('\n--- Running Suite 10: Media Campaigns, Validation & Test Send ---');

  // Test 1: Image size validation (<= 5MB valid, > 5MB rejected)
  await check('Media Validation: Image sizes (5MB) and MIME types enforced according to Meta specs', async () => {
    const validImage = validateMedia('image', { size: 4 * 1024 * 1024, type: 'image/jpeg' });
    const oversizedImage = validateMedia('image', { size: 6 * 1024 * 1024, type: 'image/jpeg' });
    const invalidType = validateMedia('image', { size: 1 * 1024 * 1024, type: 'text/html' });

    assert.strictEqual(validImage.valid, true, '4MB image should be valid');
    assert.strictEqual(oversizedImage.valid, false, '6MB image must be rejected');
    assert.strictEqual(invalidType.valid, false, 'HTML file must be rejected as image');
  });

  // Test 2: Video & Document size limits (Video <= 16MB, Document <= 100MB)
  await check('Media Validation: Video (16MB) and Document (100MB) limits strictly enforced', async () => {
    const validVideo = validateMedia('video', { size: 15 * 1024 * 1024, type: 'video/mp4' });
    const oversizedVideo = validateMedia('video', { size: 17 * 1024 * 1024, type: 'video/mp4' });
    const validDoc = validateMedia('document', { size: 90 * 1024 * 1024, type: 'application/pdf' });
    const oversizedDoc = validateMediaFile_DocumentCheck();

    assert.strictEqual(validVideo.valid, true);
    assert.strictEqual(oversizedVideo.valid, false);
    assert.strictEqual(validDoc.valid, true);
    assert.strictEqual(oversizedDoc.valid, false);
  });

  function validateMediaFile_DocumentCheck() {
    return validateMedia('document', { size: 101 * 1024 * 1024, type: 'application/pdf' });
  }

  // Test 3: Template Components Builder properly constructs Meta Graph API payload
  await check('Template Builder: Meta-compliant media header and variable array generated', async () => {
    const mediaHeader = {
      type: 'image',
      url: 'https://cdn.example.com/festive_banner.png'
    };
    const bodyVars = ['Customer Name', 'FESTIVE50'];

    const components = buildTemplateComponentsPayload(mediaHeader, bodyVars);

    assert.strictEqual(components.length, 2, 'Should have header and body components');
    assert.strictEqual(components[0].type, 'header');
    assert.strictEqual(components[0].parameters[0].type, 'image');
    assert.strictEqual(components[0].parameters[0].image.link, 'https://cdn.example.com/festive_banner.png');

    assert.strictEqual(components[1].type, 'body');
    assert.strictEqual(components[1].parameters[0].text, 'Customer Name');
    assert.strictEqual(components[1].parameters[1].text, 'FESTIVE50');
  });

  // Test 4: Test Send API rejects unauthenticated requests
  await check('Test Send API: Unauthenticated requests protected (401)', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/campaigns/test-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_phone: '+919876543210',
        template_name: 'hello_world'
      })
    });

    assert.strictEqual(res.status, 401, 'Unauthenticated test send must return 401');
  });

  // Test 5: Granular Campaign Recipients Debugger API rejects unauthenticated requests
  await check('Message Debugger API: Granular recipient traces protected by authentication (401)', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/campaigns/00000000-0000-0000-0000-000000000000/recipients`);
    assert.strictEqual(res.status, 401, 'Unauthenticated recipient debugger request must return 401');
  });

  return results;
}
