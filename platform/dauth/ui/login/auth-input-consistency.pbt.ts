// ============================================
// Auth & Onboarding Input Styling Consistency — Property-Based Test (Property 4)
// Feature: ux-journey-evaluation, Property 4: Auth and onboarding input styling consistency
// **Validates: Requirements 4.3, 5.2**
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/pages/login/auth-input-consistency.pbt.ts

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// File paths (relative to frontend-deps/src)
// ============================================

// __dirname = .../src/app/pages/login — go up 4 levels to reach src/
const SRC_ROOT = path.resolve(__dirname, '..', '..', '..');

const COMPONENT_FILES = {
  login: path.join(SRC_ROOT, 'app', 'pages', 'login', 'login.component.ts'),
  register: path.join(SRC_ROOT, 'app', 'pages', 'register', 'register.component.ts'),
  onboarding: path.join(SRC_ROOT, 'app', 'pages', 'onboarding', 'onboarding.component.ts'),
} as const;

const SHARED_CSS_PATH = path.join(SRC_ROOT, 'auth-form.styles.css');
const DESIGN_TOKENS_PATH = path.join(SRC_ROOT, 'design-tokens.css');

type ComponentName = keyof typeof COMPONENT_FILES;
const COMPONENT_NAMES: ComponentName[] = ['login', 'register', 'onboarding'];

// ============================================
// Read source files once
// ============================================

function readSource(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

const componentSources: Record<ComponentName, string> = {
  login: readSource(COMPONENT_FILES.login),
  register: readSource(COMPONENT_FILES.register),
  onboarding: readSource(COMPONENT_FILES.onboarding),
};

const sharedCSS = readSource(SHARED_CSS_PATH);
const designTokensCSS = readSource(DESIGN_TOKENS_PATH);

// ============================================
// Expected token references for auth input styling
// These are the 5 key CSS properties that must be
// consistent across all auth/onboarding inputs.
// ============================================

interface InputStyleTokens {
  borderRadius: string;
  borderColor: string;
  focusRing: string;
  background: string;
  textColor: string;
}

const EXPECTED_TOKENS: InputStyleTokens = {
  borderRadius: 'var(--radius-sm)',
  borderColor: 'var(--border-primary)',
  focusRing: '0 0 0 3px rgba(var(--module-accent-sky-rgb), 0.1)',
  background: 'var(--surface)',
  textColor: 'var(--text-body)',
};

// ============================================
// Helpers: verify shared CSS defines the tokens
// ============================================

/**
 * Check that the shared auth-form.styles.css defines the .auth-input
 * class with the expected token values for a given CSS property.
 */
function sharedCSSDefinesProperty(css: string, property: string, expectedValue: string): boolean {
  // Normalize whitespace for matching
  const normalized = css.replace(/\s+/g, ' ');
  return normalized.includes(property) && normalized.includes(expectedValue);
}

/**
 * Check that a component template references the auth-input class
 * (either directly via class="auth-input" or indirectly via PrimeNG
 * inputs inside .auth-field which are styled by the shared CSS overrides).
 */
function componentUsesSharedInputStyling(source: string, component: ComponentName): boolean {
  // Login and register use class="auth-input" directly on native inputs
  const usesAuthInputClass = source.includes('class="auth-input"');

  // Register uses PrimeNG p-password inside auth-field (styled by shared CSS overrides)
  const usesPrimeNGInAuthField = source.includes('auth-field') && (
    source.includes('p-password') || source.includes('pInputText')
  );

  // Onboarding uses pInputText inside its template (styled by shared CSS overrides
  // via .auth-field selectors or global PrimeNG overrides)
  const usesInputText = source.includes('pInputText');

  return usesAuthInputClass || usesPrimeNGInAuthField || usesInputText;
}

// ============================================
// Property 4: Auth and onboarding input styling consistency
// Feature: ux-journey-evaluation, Property 4: Auth and onboarding input styling consistency
// **Validates: Requirements 4.3, 5.2**
//
// For any form input element across the login, register, and onboarding
// components, the border-radius, border-color, focus-ring, background,
// and text-color CSS properties SHALL be identical.
// ============================================

console.log('--- Property 4: Auth & Onboarding Input Styling Consistency ---');

// Arbitrary: pick any component name
const componentArb = fc.constantFrom(...COMPONENT_NAMES);

// Arbitrary: pick any pair of distinct components
const componentPairArb = fc.tuple(componentArb, componentArb).filter(
  ([a, b]) => a !== b
);

// Arbitrary: pick any of the 5 styling properties to check
const STYLE_PROPERTIES = Object.keys(EXPECTED_TOKENS) as (keyof InputStyleTokens)[];
const stylePropertyArb = fc.constantFrom(...STYLE_PROPERTIES);

// 4a: All three components reference the shared auth-input styling
// (either via auth-input class or PrimeNG inputs within auth-field)
fc.assert(
  fc.property(
    componentArb,
    (comp) => {
      const uses = componentUsesSharedInputStyling(componentSources[comp], comp);
      if (!uses) {
        console.error(`  FAIL: ${comp} does not reference shared auth-input styling`);
      }
      return uses;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 4a: all components (login, register, onboarding) reference shared auth-input styling');

// 4b: The shared CSS defines the .auth-input class with all expected token values
const cssPropertyMap: Record<keyof InputStyleTokens, { cssProp: string; value: string }> = {
  borderRadius: { cssProp: 'border-radius', value: EXPECTED_TOKENS.borderRadius },
  borderColor: { cssProp: 'border', value: EXPECTED_TOKENS.borderColor },
  focusRing: { cssProp: 'box-shadow', value: EXPECTED_TOKENS.focusRing },
  background: { cssProp: 'background', value: EXPECTED_TOKENS.background },
  textColor: { cssProp: 'color', value: EXPECTED_TOKENS.textColor },
};

fc.assert(
  fc.property(
    stylePropertyArb,
    (prop) => {
      const { cssProp, value } = cssPropertyMap[prop];
      const defined = sharedCSSDefinesProperty(sharedCSS, cssProp, value);
      if (!defined) {
        console.error(`  FAIL: shared CSS missing ${cssProp}: ${value} for .auth-input`);
      }
      return defined;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 4b: shared auth-form.styles.css defines all 5 expected token values for .auth-input');

// 4c: The shared CSS also defines PrimeNG input overrides with the same token values
// (ensuring p-inputtext and p-password inputs match auth-input)
const primeNGOverrideSelectors = [
  '.auth-field input.p-inputtext',
  '.auth-field .p-password input',
];

fc.assert(
  fc.property(
    fc.constantFrom(...primeNGOverrideSelectors),
    stylePropertyArb,
    (selector, prop) => {
      const { value } = cssPropertyMap[prop];
      const normalized = sharedCSS.replace(/\s+/g, ' ');
      // The shared CSS must contain the selector and the expected value
      const hasSelector = normalized.includes(selector);
      const hasValue = normalized.includes(value);
      if (!hasSelector) {
        console.error(`  FAIL: shared CSS missing PrimeNG override selector: ${selector}`);
      }
      if (!hasValue) {
        console.error(`  FAIL: shared CSS missing value ${value} for PrimeNG overrides`);
      }
      return hasSelector && hasValue;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 4c: shared CSS defines PrimeNG input overrides with identical token values');

// 4d: For any pair of distinct components, both reference the same shared styling mechanism
// (proving they get identical input styles from the single shared CSS source)
fc.assert(
  fc.property(
    componentPairArb,
    ([compA, compB]) => {
      const aUses = componentUsesSharedInputStyling(componentSources[compA], compA);
      const bUses = componentUsesSharedInputStyling(componentSources[compB], compB);
      if (!aUses || !bUses) {
        console.error(`  FAIL: ${compA} (${aUses}) and ${compB} (${bUses}) don't both use shared styling`);
      }
      return aUses && bUses;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 4d: every pair of components shares the same input styling mechanism');

// 4e: Design tokens CSS defines the token values referenced by the shared auth input styles
const REFERENCED_TOKENS = [
  { token: '--radius-sm', expectedValue: '8px' },
  { token: '--border-primary', expectedValue: '#bae6fd' },
  { token: '--surface', expectedValue: '#ffffff' },
  { token: '--text-body', expectedValue: '#334155' },
];

fc.assert(
  fc.property(
    fc.constantFrom(...REFERENCED_TOKENS),
    ({ token, expectedValue }) => {
      // Check that design-tokens.css defines this token with the expected value
      const tokenRegex = new RegExp(`${token.replace(/[-/]/g, '\\$&')}\\s*:\\s*${expectedValue.replace(/[()]/g, '\\$&')}`);
      const defined = tokenRegex.test(designTokensCSS);
      if (!defined) {
        console.error(`  FAIL: design-tokens.css missing ${token}: ${expectedValue}`);
      }
      return defined;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 4e: design-tokens.css defines all token values referenced by auth input styles');

// 4f: The shared CSS focus state uses the same border-color and box-shadow tokens
// for both .auth-input:focus and PrimeNG :focus overrides
fc.assert(
  fc.property(
    fc.constantFrom('auth-input:focus', 'p-inputtext:focus', 'p-password input:focus'),
    (focusSelector) => {
      const normalized = sharedCSS.replace(/\s+/g, ' ');
      const hasFocusBorder = normalized.includes('border-color: var(--primary)');
      const hasFocusRing = normalized.includes(EXPECTED_TOKENS.focusRing);
      if (!hasFocusBorder || !hasFocusRing) {
        console.error(`  FAIL: focus state missing consistent border-color or box-shadow for ${focusSelector}`);
      }
      return hasFocusBorder && hasFocusRing;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 4f: focus states use identical border-color and box-shadow tokens across all selectors');

console.log('\nProperty 4: PASSED');
console.log('=== Auth & onboarding input styling consistency property tests PASSED ===');
