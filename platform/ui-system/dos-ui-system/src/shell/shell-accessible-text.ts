/**
 * Shared trim + poison guards for shell chrome accessibility strings.
 * Prevents empty strings, whitespace-only, and JS coercion leaks ("undefined", "null")
 * from becoming DOM aria-label / Carbon label inputs.
 */

const POISON_LOWER = new Set([
  'undefined',
  'null',
  'nan',
  '[object object]',
]);

/**
 * Returns a safe trimmed display/accessibility string, or '' if absent or poison.
 */
export function sanitizeAccessibleText(value: string | null | undefined): string {
  if (value == null) return '';
  const s = String(value).trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (POISON_LOWER.has(lower)) return '';
  return s;
}
