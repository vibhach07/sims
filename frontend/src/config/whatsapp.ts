/// <reference types="vite/client" />

/**
 * WhatsApp Contact Configuration (Single source of truth)
 * 
 * Rules:
 * - WHATSAPP_NUMBER: digits only, country code included, no '+' or spaces.
 * - Current configured phone number: 918959774702 (SIMS Raipur)
 */

export const WHATSAPP_NUMBER = '918959774702';

export interface WhatsAppMessageOption {
  id: string;
  title: string;
  description: string;
  message: string;
  badge?: string;
}

export const WHATSAPP_MESSAGE_OPTIONS: WhatsAppMessageOption[] = [
  {
    id: 'admissions',
    title: 'Courses & Admissions',
    description: 'NIMCET, MCA, GATE & CUET batch admissions',
    message: 'Hello SIMS Raipur, I want to know more about your courses and admissions.',
    badge: 'Popular',
  },
  {
    id: 'fees',
    title: 'Fees & Scholarships',
    description: 'Fee structure, discount offers & installment options',
    message: 'Hello SIMS Raipur, I would like to inquire about course fees and scholarship options.',
  },
  {
    id: 'tests',
    title: 'Test Series & Demo Classes',
    description: 'Free demo lecture access & online CBT test series',
    message: 'Hello SIMS Raipur, I want to inquire about the test series and demo classes.',
  },
];

export const WHATSAPP_DEFAULT_MESSAGE = WHATSAPP_MESSAGE_OPTIONS[0].message;

export type WhatsAppButtonPosition = 'right' | 'left';
export const WHATSAPP_BUTTON_POSITION: WhatsAppButtonPosition = 'right';

/**
 * Returns true if WHATSAPP_NUMBER is a valid configured phone number (10-15 digits, no 'X').
 */
export function isWhatsAppConfigured(number: string = WHATSAPP_NUMBER): boolean {
  if (!number) return false;
  if (/x/i.test(number)) return false;
  const digits = number.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

let devWarningLogged = false;

/**
 * Logs a single dev console warning if the WhatsApp contact number is unconfigured.
 */
export function logWhatsAppDevWarning(): void {
  const isDev = Boolean(typeof import.meta !== 'undefined' && import.meta?.env?.DEV);
  if (isDev && !isWhatsAppConfigured() && !devWarningLogged) {
    console.warn(
      `[WhatsApp Config] Placeholder contact number in use ('${WHATSAPP_NUMBER}'). ` +
      `Update src/config/whatsapp.ts with the actual WhatsApp number.`
    );
    devWarningLogged = true;
  }
}

/**
 * Builds the WhatsApp click-to-chat URL, or returns '/contact' when unconfigured.
 */
export function buildWhatsAppUrl(message?: string): string {
  logWhatsAppDevWarning();
  const text = message || WHATSAPP_DEFAULT_MESSAGE;
  if (!isWhatsAppConfigured()) {
    return '/contact';
  }
  const cleanDigits = WHATSAPP_NUMBER.replace(/\D/g, '');
  return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(text)}`;
}
