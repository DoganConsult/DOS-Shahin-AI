/**
 * bilingual-prompt.service — minimal in-engine implementation.
 *
 * @owner AI
 * Provides a stable signature for language-aware prompt augmentation so callers
 * compile and degrade safely until the canonical platform service replaces it.
 * Returns an empty string when no augmentation is available; callers fall back
 * to the original system prompt unchanged.
 */

const ARABIC_RE = /[\u0600-\u06FF]/;

export function getLanguageAwarePrompt(_agentId: string, userMessage: string): string {
  if (!userMessage) return '';
  if (ARABIC_RE.test(userMessage)) {
    return 'You are a helpful GRC assistant. Respond in Modern Standard Arabic when the user writes in Arabic.';
  }
  return '';
}
