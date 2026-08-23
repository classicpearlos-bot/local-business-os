/**
 * Normalizes a WhatsApp phone number to E.164 format.
 * Meta sends numbers without the leading +, e.g., "919876543210"
 * This function ensures they are stored consistently as "+919876543210"
 * to prevent duplicate contacts due to format differences.
 */
export function normalizePhoneNumber(phone: string): string {
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it already starts with +, we strip it and re-add after normalization
  // This function expects digits only at this point.

  if (!digits) return phone; // Return original if no digits found

  // Add the + prefix back for E.164 format
  return `+${digits}`;
}

/**
 * Validates if a string looks like a plausible international phone number.
 * Meta WhatsApp requires E.164 format without the + prefix.
 */
export function isValidWhatsAppNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  // WhatsApp numbers are typically 7-15 digits (international format)
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Strips the + prefix for sending to Meta API.
 * Meta's Cloud API expects phone numbers without the + prefix.
 */
export function toMetaPhoneFormat(phone: string): string {
  return phone.replace(/^\+/, '');
}
