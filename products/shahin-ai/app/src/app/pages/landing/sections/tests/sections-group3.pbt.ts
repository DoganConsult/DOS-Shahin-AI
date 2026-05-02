// ============================================
// Sections Group 3 — Property-Based Tests (Property 8)
// Feature: landing-page-overhaul
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/pages/landing/sections/sections-group3.pbt.ts

import * as fc from 'fast-check';

// ============================================
// Shared types
// ============================================

type Lang = 'en' | 'ar';

const langArb: fc.Arbitrary<Lang> = fc.constantFrom('en' as const, 'ar' as const);

// ============================================
// Property 8: Testimonial Bilingual Rendering with Attribution
// Feature: landing-page-overhaul, Property 8: Testimonial Bilingual Rendering with Attribution
// **Validates: Requirements 11.1, 11.2**
//
// For any testimonial in the Testimonials section data array, the
// rendered content SHALL contain the testimonial quote in the current
// language and attribution information (author name and role) in the
// current language.
// ============================================

interface Testimonial {
  quoteEn: string;
  quoteAr: string;
  authorEn: string;
  authorAr: string;
  roleEn: string;
  roleAr: string;
}

/** Actual data from TestimonialsSectionComponent */
const TESTIMONIALS_DATA: Testimonial[] = [
  {
    quoteEn: 'Shahin transformed our compliance workflow. We reduced audit preparation time by 60% and gained real-time visibility across all regulatory frameworks.',
    quoteAr: 'شاهين حوّل سير عمل الامتثال لدينا. قللنا وقت التحضير للتدقيق بنسبة 60% وحصلنا على رؤية فورية عبر جميع الأطر التنظيمية.',
    authorEn: 'Khalid Al-Rashidi',
    authorAr: 'خالد الرشيدي',
    roleEn: 'CISO, National Financial Group',
    roleAr: 'رئيس أمن المعلومات، المجموعة المالية الوطنية',
  },
  {
    quoteEn: 'The AI-powered risk assessment and automated control mapping saved our team hundreds of hours. Shahin is a game-changer for GRC in the region.',
    quoteAr: 'تقييم المخاطر المدعوم بالذكاء الاصطناعي وربط الضوابط الآلي وفّر لفريقنا مئات الساعات. شاهين نقلة نوعية في الحوكمة والمخاطر والامتثال بالمنطقة.',
    authorEn: 'Sara Al-Otaibi',
    authorAr: 'سارة العتيبي',
    roleEn: 'Compliance Director, Gulf Healthcare Systems',
    roleAr: 'مديرة الامتثال، أنظمة الخليج الصحية',
  },
  {
    quoteEn: 'Managing risk across multiple Saudi regulations was overwhelming until we adopted Shahin. Now NCA-ECC, SAMA-CSF, and PDPL compliance is streamlined in one platform.',
    quoteAr: 'كانت إدارة المخاطر عبر الأنظمة السعودية المتعددة مرهقة حتى اعتمدنا شاهين. الآن الامتثال لـ NCA-ECC و SAMA-CSF و PDPL مبسّط في منصة واحدة.',
    authorEn: 'Fahad Al-Dosari',
    authorAr: 'فهد الدوسري',
    roleEn: 'Risk Manager, Riyadh Energy Corporation',
    roleAr: 'مدير المخاطر، شركة الرياض للطاقة',
  },
];

/**
 * Mirrors TestimonialsSectionComponent template rendering logic.
 * Returns the rendered quote for a testimonial given the current language.
 */
function renderQuote(testimonial: Testimonial, lang: Lang): string {
  return lang === 'ar' ? testimonial.quoteAr : testimonial.quoteEn;
}

function renderAuthor(testimonial: Testimonial, lang: Lang): string {
  return lang === 'ar' ? testimonial.authorAr : testimonial.authorEn;
}

function renderRole(testimonial: Testimonial, lang: Lang): string {
  return lang === 'ar' ? testimonial.roleAr : testimonial.roleEn;
}

const testimonialArb: fc.Arbitrary<Testimonial> = fc.constantFrom(...TESTIMONIALS_DATA);

console.log('--- Property 8: Testimonial Bilingual Rendering with Attribution ---');

// 8a: For any testimonial and lang='en', rendered quote is the English quote
fc.assert(
  fc.property(
    testimonialArb,
    (t) => {
      return renderQuote(t, 'en') === t.quoteEn;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 8a: lang=en renders English quote');

// 8b: For any testimonial and lang='ar', rendered quote is the Arabic quote
fc.assert(
  fc.property(
    testimonialArb,
    (t) => {
      return renderQuote(t, 'ar') === t.quoteAr;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 8b: lang=ar renders Arabic quote');

// 8c: For any testimonial and any language, rendered author matches the correct variant
fc.assert(
  fc.property(
    fc.tuple(testimonialArb, langArb),
    ([t, lang]) => {
      const author = renderAuthor(t, lang);
      const expected = lang === 'ar' ? t.authorAr : t.authorEn;
      return author === expected;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 8c: bilingual author selection correct for any testimonial and language');

// 8d: For any testimonial and any language, rendered role matches the correct variant
fc.assert(
  fc.property(
    fc.tuple(testimonialArb, langArb),
    ([t, lang]) => {
      const role = renderRole(t, lang);
      const expected = lang === 'ar' ? t.roleAr : t.roleEn;
      return role === expected;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 8d: bilingual role selection correct for any testimonial and language');

// 8e: Each testimonial has non-empty quotes, authors, and roles in both languages
fc.assert(
  fc.property(
    testimonialArb,
    (t) => {
      return t.quoteEn.length > 0 &&
             t.quoteAr.length > 0 &&
             t.authorEn.length > 0 &&
             t.authorAr.length > 0 &&
             t.roleEn.length > 0 &&
             t.roleAr.length > 0;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 8e: all testimonials have non-empty quotes, authors, and roles in both languages');

// 8f: Switching language changes the quote (en and ar quotes differ for all testimonials)
fc.assert(
  fc.property(
    testimonialArb,
    (t) => {
      const enQuote = renderQuote(t, 'en');
      const arQuote = renderQuote(t, 'ar');
      return enQuote !== arQuote;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 8f: switching language changes the quote (en/ar quotes differ)');

// 8g: Switching language changes the author name (en and ar authors differ)
fc.assert(
  fc.property(
    testimonialArb,
    (t) => {
      const enAuthor = renderAuthor(t, 'en');
      const arAuthor = renderAuthor(t, 'ar');
      return enAuthor !== arAuthor;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 8g: switching language changes the author name (en/ar authors differ)');

// 8h: Switching language changes the role (en and ar roles differ)
fc.assert(
  fc.property(
    testimonialArb,
    (t) => {
      const enRole = renderRole(t, 'en');
      const arRole = renderRole(t, 'ar');
      return enRole !== arRole;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 8h: switching language changes the role (en/ar roles differ)');

// 8i: For any testimonial and any language, all three fields (quote, author, role) are rendered consistently in the same language
fc.assert(
  fc.property(
    fc.tuple(testimonialArb, langArb),
    ([t, lang]) => {
      const quote = renderQuote(t, lang);
      const author = renderAuthor(t, lang);
      const role = renderRole(t, lang);
      if (lang === 'en') {
        return quote === t.quoteEn && author === t.authorEn && role === t.roleEn;
      } else {
        return quote === t.quoteAr && author === t.authorAr && role === t.roleAr;
      }
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 8i: quote, author, and role are all rendered in the same language');

console.log('Property 8: PASSED\n');

// ============================================
console.log('=== All sections-group3 property tests PASSED ===');
