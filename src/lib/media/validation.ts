/**
 * Official Meta WhatsApp Cloud API Media Constraints & Validator
 */

export interface MediaConstraints {
  maxSizeBytes: number;
  maxSizeMB: number;
  acceptedMimeTypes: string[];
  acceptedExtensions: string[];
}

export const META_MEDIA_LIMITS: Record<'image' | 'video' | 'document' | 'audio', MediaConstraints> = {
  image: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    maxSizeMB: 5,
    acceptedMimeTypes: ['image/jpeg', 'image/png'],
    acceptedExtensions: ['.jpg', '.jpeg', '.png']
  },
  video: {
    maxSizeBytes: 16 * 1024 * 1024, // 16 MB
    maxSizeMB: 16,
    acceptedMimeTypes: ['video/mp4', 'video/3gpp'],
    acceptedExtensions: ['.mp4', '.3gp']
  },
  document: {
    maxSizeBytes: 100 * 1024 * 1024, // 100 MB
    maxSizeMB: 100,
    acceptedMimeTypes: [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain'
    ],
    acceptedExtensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt']
  },
  audio: {
    maxSizeBytes: 16 * 1024 * 1024, // 16 MB
    maxSizeMB: 16,
    acceptedMimeTypes: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'],
    acceptedExtensions: ['.aac', '.mp4', '.mp3', '.amr', '.ogg']
  }
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateMediaFile(
  type: 'image' | 'video' | 'document' | 'audio',
  file: { size: number; type: string; name?: string }
): ValidationResult {
  const limits = META_MEDIA_LIMITS[type];

  if (!limits) {
    return { valid: false, error: `Unsupported media category: ${type}` };
  }

  // Size validation
  if (file.size > limits.maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds Meta's maximum limit of ${limits.maxSizeMB}MB for ${type}s.`
    };
  }

  // Mime type validation
  if (file.type && !limits.acceptedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type}). Allowed formats: ${limits.acceptedExtensions.join(', ')}`
    };
  }

  return { valid: true };
}

export function isValidMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
