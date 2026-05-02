/**
 * Phase 2 audit — A13 intent classifier coverage.
 *
 * Locks down the regex-classifier behavior that decides when /public-chat
 * captures a row in public.copilot_leads. Phase 3 will replace this with
 * an LLM-graded classifier; until then the deterministic regex must
 * recognize the canonical EN + AR phrasings without false-positive on
 * generic Q&A.
 */
import { describe, expect, it } from 'vitest';

// Mirror of classifyA13Intent in copilot.routes.ts. Kept here so this test
// stays unit-pure (no app bootstrap). When the real classifier graduates
// to LLM-based, point this test at the new export.
function classifyA13Intent(message: string): 'demo' | 'contact' | 'pricing' | 'docs' | 'general' {
  const m = message.toLowerCase();
  const arabicGap = '[\\s\\u0621-\\u065F]*';
  if (new RegExp(`(demo|trial|see\\s+it\\s+work|walkthrough|عرض${arabicGap}توضيحي|تجربة)`).test(m)) return 'demo';
  if (new RegExp(`(price|pricing|cost|quote|سعر|تكلفة|عرض${arabicGap}أسعار)`).test(m)) return 'pricing';
  if (/(contact|sales|talk\s+to|اتصل|تواصل|مبيعات)/.test(m)) return 'contact';
  if (/(docs?|documentation|api|spec|توثيق|مستندات)/.test(m)) return 'docs';
  return 'general';
}

describe('A13 intent classifier', () => {
  it.each([
    ['I want a demo of your platform', 'demo'],
    ['Can I get a free trial?', 'demo'],
    ['Schedule a walkthrough', 'demo'],
    ['أريد عرضاً توضيحياً للمنصة', 'demo'],
    ['نحتاج تجربة قبل الشراء', 'demo'],
  ])('classifies "%s" → demo', (msg, expected) => {
    expect(classifyA13Intent(msg)).toBe(expected);
  });

  it.each([
    ['What is the pricing?', 'pricing'],
    ['Send me a quote', 'pricing'],
    ['How much does this cost', 'pricing'],
    ['ما هو سعر المنصة؟', 'pricing'],
    ['نحتاج عرض أسعار', 'pricing'],
  ])('classifies "%s" → pricing', (msg, expected) => {
    expect(classifyA13Intent(msg)).toBe(expected);
  });

  it.each([
    ['I want to talk to sales', 'contact'],
    ['Contact your team please', 'contact'],
    ['أريد التواصل مع فريق المبيعات', 'contact'],
  ])('classifies "%s" → contact', (msg, expected) => {
    expect(classifyA13Intent(msg)).toBe(expected);
  });

  it.each([
    ['Where are the docs?', 'docs'],
    ['Do you have an API spec?', 'docs'],
    ['أين توثيق API؟', 'docs'],
  ])('classifies "%s" → docs', (msg, expected) => {
    expect(classifyA13Intent(msg)).toBe(expected);
  });

  it.each([
    ['What is GRC?'],
    ['How do you handle compliance for banks?'],
    ['Tell me about your company'],
    ['ما هو الامتثال؟'],
  ])('keeps generic Q&A in "general" bucket: %s', (msg) => {
    expect(classifyA13Intent(msg)).toBe('general');
  });
});
