/**
 * Onboarding — Registration Constants (Frontend)
 *
 * Single source of truth for free-mail domain blocklist and e-mail validation
 * used by RegistrationHeroComponent and related form utilities.
 *
 * Keep in sync with backend/src/modules/onboarding/constants/registration.constants.ts
 */

export const FREEMAIL_DOMAINS = new Set<string>([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'mail.com',
  'zoho.com', 'yandex.com', 'gmx.com', 'fastmail.com', 'proton.me',
  'hey.com', 'pm.me', 'tutanota.com', 'tutamail.com', 'tuta.io',
]);

/**
 * RFC-5322 compliant e-mail regex.
 * Must remain identical to the pattern in the backend registration constants.
 */
export const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Returns true when the domain is a known free/consumer mail provider. */
export function isFreeMailDomain(domain: string): boolean {
  return FREEMAIL_DOMAINS.has(domain.toLowerCase());
}

/** Extracts the domain part of an e-mail address, lower-cased. */
export function extractEmailDomain(email: string): string {
  const idx = email.indexOf('@');
  return idx >= 0 ? email.slice(idx + 1).toLowerCase() : '';
}
