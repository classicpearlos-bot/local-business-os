import * as XLSX from 'xlsx';
import { normalizePhoneNumber, isValidWhatsAppNumber } from './phone';

export interface ParsedContactRow {
  name: string;
  rawPhone: string;
  normalizedPhone: string;
  isValid: boolean;
  validationError?: string;
}

export interface ExcelParseResult {
  totalRows: number;
  validContacts: ParsedContactRow[];
  invalidContacts: ParsedContactRow[];
  duplicateCount: number;
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV File into normalized WhatsApp contacts
 */
export async function parseExcelOrCsvFile(file: File, defaultCountryCode: string = '91'): Promise<ExcelParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const validContacts: ParsedContactRow[] = [];
  const invalidContacts: ParsedContactRow[] = [];
  const seenPhones = new Set<string>();
  let duplicateCount = 0;

  for (const row of jsonData) {
    // Detect column names case-insensitively
    let name = '';
    let rawPhone = '';

    for (const [key, value] of Object.entries(row)) {
      const lowerKey = key.toLowerCase().trim();
      const valStr = String(value).trim();

      if (['name', 'customer', 'customer name', 'full name', 'client', 'client name'].includes(lowerKey)) {
        name = valStr;
      } else if (['phone', 'phone number', 'mobile', 'mobile number', 'contact', 'whatsapp', 'number', 'tel'].includes(lowerKey)) {
        rawPhone = valStr;
      } else if (!rawPhone && /^\+?\d{8,15}$/.test(valStr.replace(/[\s\-\(\)]/g, ''))) {
        // Fallback: value looks like a phone number
        rawPhone = valStr;
      } else if (!name && typeof value === 'string' && valStr.length > 1 && isNaN(Number(valStr))) {
        name = valStr;
      }
    }

    if (!rawPhone) continue;

    // Handle missing country code: if 10 digits (e.g. Indian number), prefix with defaultCountryCode
    let cleaned = rawPhone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        cleaned = `+${defaultCountryCode}${cleaned}`;
      } else {
        cleaned = `+${cleaned}`;
      }
    }

    const normalizedPhone = normalizePhoneNumber(cleaned);
    const isValid = isValidWhatsAppNumber(normalizedPhone);

    const contactEntry: ParsedContactRow = {
      name: name || 'Valued Customer',
      rawPhone,
      normalizedPhone,
      isValid,
      validationError: isValid ? undefined : 'Invalid WhatsApp number format (requires 8-15 digits with country code)'
    };

    if (isValid) {
      if (seenPhones.has(normalizedPhone)) {
        duplicateCount++;
      } else {
        seenPhones.add(normalizedPhone);
        validContacts.push(contactEntry);
      }
    } else {
      invalidContacts.push(contactEntry);
    }
  }

  return {
    totalRows: jsonData.length,
    validContacts,
    validCount: validContacts.length,
    invalidContacts,
    duplicateCount
  } as any;
}
