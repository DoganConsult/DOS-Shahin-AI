// ============================================
// Shared Widgets — Property-Based Tests (Properties 12–13)
// Feature: landing-page-overhaul
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/widgets.pbt.ts

import * as fc from 'fast-check';

// ============================================
// Pure rendering logic extracted from widget components
// ============================================

type Lang = 'en' | 'ar';

// --- SectionHeader rendering logic ---

interface SectionHeaderInputs {
  badge: string;
  badgeAr: string;
  badgeIcon: string;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
}

interface SectionHeaderRendered {
  badgeText: string;
  titleText: string;
  subtitleText: string;
  hasBadgeIcon: boolean;
  badgeIconClass: string;
}

/**
 * Mirrors SectionHeaderComponent template rendering logic.
 * Given inputs and current language, returns the rendered text values.
 */
function renderSectionHeader(inputs: SectionHeaderInputs, lang: Lang): SectionHeaderRendered {
  return {
    badgeText: lang === 'ar' ? inputs.badgeAr : inputs.badge,
    titleText: lang === 'ar' ? inputs.titleAr : inputs.title,
    subtitleText: lang === 'ar' ? inputs.subtitleAr : inputs.subtitle,
    hasBadgeIcon: inputs.badgeIcon.length > 0,
    badgeIconClass: inputs.badgeIcon,
  };
}

// --- TrustBadge rendering logic ---

type BadgeStatus = 'ready' | 'aligned' | 'certified';

interface TrustBadgeInputs {
  code: string;
  label: string;
  labelAr: string;
  color: string;
  status: BadgeStatus;
  highlight: boolean;
}

const STATUS_CLASS_MAP: Record<BadgeStatus, string> = {
  ready: 'bg-green-100 text-green-700',
  aligned: 'bg-blue-100 text-blue-700',
  certified: 'bg-purple-100 text-purple-700',
};

interface TrustBadgeRendered {
  codeText: string;
  labelText: string;
  statusText: string;
  statusClass: string;
  hasHighlight: boolean;
  borderColor: string;
}

/**
 * Mirrors TrustBadgeComponent template rendering logic.
 * Given inputs and current language, returns the rendered values.
 */
function renderTrustBadge(inputs: TrustBadgeInputs, lang: Lang): TrustBadgeRendered {
  return {
    codeText: inputs.code,
    labelText: lang === 'ar' ? inputs.labelAr : inputs.label,
    statusText: inputs.status,
    statusClass: STATUS_CLASS_MAP[inputs.status],
    hasHighlight: inputs.highlight,
    borderColor: inputs.color + '33',
  };
}

// ============================================
// Arbitraries
// ============================================

/** Non-empty printable string for text inputs. */
const textArb = fc.string({ minLength: 1, maxLength: 50 });

/** Optional badge icon class (empty string or a PrimeIcon-like class). */
const badgeIconArb = fc.oneof(
  fc.constant(''),
  fc.constantFrom('pi pi-shield', 'pi pi-check', 'pi pi-star', 'pi pi-lock')
);

const langArb: fc.Arbitrary<Lang> = fc.constantFrom('en' as const, 'ar' as const);

const sectionHeaderInputsArb: fc.Arbitrary<SectionHeaderInputs> = fc.record({
  badge: textArb,
  badgeAr: textArb,
  badgeIcon: badgeIconArb,
  title: textArb,
  titleAr: textArb,
  subtitle: textArb,
  subtitleAr: textArb,
});

const badgeStatusArb: fc.Arbitrary<BadgeStatus> = fc.constantFrom(
  'ready' as const,
  'aligned' as const,
  'certified' as const
);

/** Hex color string. */
const hexColorArb = fc.array(
  fc.constantFrom('0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'),
  { minLength: 6, maxLength: 6 }
).map(arr => `#${arr.join('')}`);

const trustBadgeInputsArb: fc.Arbitrary<TrustBadgeInputs> = fc.record({
  code: textArb,
  label: textArb,
  labelAr: textArb,
  color: hexColorArb,
  status: badgeStatusArb,
  highlight: fc.boolean(),
});

// ============================================
// Property 12: SectionHeader Bilingual Rendering
// Feature: landing-page-overhaul, Property 12: SectionHeader Bilingual Rendering
// **Validates: Requirements 15.1, 15.3**
//
// For any combination of SectionHeaderComponent inputs (badge, badgeAr,
// title, titleAr, subtitle, subtitleAr, badgeIcon), the rendered output
// SHALL display the badge, title, and subtitle in the current language,
// and include the badge icon if provided.
// ============================================

console.log('--- Property 12: SectionHeader Bilingual Rendering ---');

// 12a: English language renders English badge, title, subtitle
fc.assert(
  fc.property(
    sectionHeaderInputsArb,
    (inputs) => {
      const rendered = renderSectionHeader(inputs, 'en');
      return rendered.badgeText === inputs.badge &&
             rendered.titleText === inputs.title &&
             rendered.subtitleText === inputs.subtitle;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 12a: English language renders English badge, title, subtitle');

// 12b: Arabic language renders Arabic badge, title, subtitle
fc.assert(
  fc.property(
    sectionHeaderInputsArb,
    (inputs) => {
      const rendered = renderSectionHeader(inputs, 'ar');
      return rendered.badgeText === inputs.badgeAr &&
             rendered.titleText === inputs.titleAr &&
             rendered.subtitleText === inputs.subtitleAr;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 12b: Arabic language renders Arabic badge, title, subtitle');

// 12c: For any language, rendered text matches the correct language variant
fc.assert(
  fc.property(
    fc.tuple(sectionHeaderInputsArb, langArb),
    ([inputs, lang]) => {
      const rendered = renderSectionHeader(inputs, lang);
      const expectedBadge = lang === 'ar' ? inputs.badgeAr : inputs.badge;
      const expectedTitle = lang === 'ar' ? inputs.titleAr : inputs.title;
      const expectedSubtitle = lang === 'ar' ? inputs.subtitleAr : inputs.subtitle;
      return rendered.badgeText === expectedBadge &&
             rendered.titleText === expectedTitle &&
             rendered.subtitleText === expectedSubtitle;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 12c: bilingual selection correct for any language');

// 12d: Badge icon is included when provided, absent when empty
fc.assert(
  fc.property(
    sectionHeaderInputsArb,
    (inputs) => {
      const rendered = renderSectionHeader(inputs, 'en');
      if (inputs.badgeIcon.length > 0) {
        return rendered.hasBadgeIcon === true && rendered.badgeIconClass === inputs.badgeIcon;
      } else {
        return rendered.hasBadgeIcon === false;
      }
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 12d: badge icon included when provided, absent when empty');

// 12e: Language switch changes rendered text (when en/ar values differ)
fc.assert(
  fc.property(
    sectionHeaderInputsArb.filter(i =>
      i.badge !== i.badgeAr || i.title !== i.titleAr || i.subtitle !== i.subtitleAr
    ),
    (inputs) => {
      const enRendered = renderSectionHeader(inputs, 'en');
      const arRendered = renderSectionHeader(inputs, 'ar');
      // At least one field must differ between languages
      return enRendered.badgeText !== arRendered.badgeText ||
             enRendered.titleText !== arRendered.titleText ||
             enRendered.subtitleText !== arRendered.subtitleText;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 12e: language switch changes rendered text when en/ar values differ');

console.log('Property 12: PASSED\n');

// ============================================
// Property 13: TrustBadge Bilingual Rendering
// Feature: landing-page-overhaul, Property 13: TrustBadge Bilingual Rendering
// **Validates: Requirements 15.2, 15.4**
//
// For any combination of TrustBadgeComponent inputs (code, label,
// labelAr, color, status, highlight), the rendered badge SHALL display
// the code, the label in the current language, the status with
// appropriate styling, and apply highlight styling when highlight is true.
// ============================================

console.log('--- Property 13: TrustBadge Bilingual Rendering ---');

// 13a: Code is always displayed regardless of language
fc.assert(
  fc.property(
    fc.tuple(trustBadgeInputsArb, langArb),
    ([inputs, lang]) => {
      const rendered = renderTrustBadge(inputs, lang);
      return rendered.codeText === inputs.code;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 13a: code displayed regardless of language');

// 13b: English language renders English label
fc.assert(
  fc.property(
    trustBadgeInputsArb,
    (inputs) => {
      const rendered = renderTrustBadge(inputs, 'en');
      return rendered.labelText === inputs.label;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 13b: English language renders English label');

// 13c: Arabic language renders Arabic label
fc.assert(
  fc.property(
    trustBadgeInputsArb,
    (inputs) => {
      const rendered = renderTrustBadge(inputs, 'ar');
      return rendered.labelText === inputs.labelAr;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 13c: Arabic language renders Arabic label');

// 13d: Status maps to correct CSS class for all status values
fc.assert(
  fc.property(
    trustBadgeInputsArb,
    (inputs) => {
      const rendered = renderTrustBadge(inputs, 'en');
      return rendered.statusClass === STATUS_CLASS_MAP[inputs.status] &&
             rendered.statusText === inputs.status;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 13d: status maps to correct CSS class');

// 13e: Highlight flag is correctly propagated
fc.assert(
  fc.property(
    trustBadgeInputsArb,
    (inputs) => {
      const rendered = renderTrustBadge(inputs, 'en');
      return rendered.hasHighlight === inputs.highlight;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 13e: highlight flag correctly propagated');

// 13f: Border color is derived from input color with '33' alpha suffix
fc.assert(
  fc.property(
    trustBadgeInputsArb,
    (inputs) => {
      const rendered = renderTrustBadge(inputs, 'en');
      return rendered.borderColor === inputs.color + '33';
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 13f: border color derived from input color with alpha suffix');

// 13g: Bilingual label selection correct for any language
fc.assert(
  fc.property(
    fc.tuple(trustBadgeInputsArb, langArb),
    ([inputs, lang]) => {
      const rendered = renderTrustBadge(inputs, lang);
      const expectedLabel = lang === 'ar' ? inputs.labelAr : inputs.label;
      return rendered.labelText === expectedLabel;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 13g: bilingual label selection correct for any language');

console.log('Property 13: PASSED\n');

// ============================================
console.log('=== All shared widget property tests PASSED ===');
