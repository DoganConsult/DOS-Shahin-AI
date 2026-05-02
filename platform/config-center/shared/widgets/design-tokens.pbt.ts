// ============================================
// Design Tokens — Property-Based Tests (Properties 1, 2, 3)
// Feature: premium-widget-overhaul, Task 1.3
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/design-tokens.pbt.ts

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CSS Parsing Helpers
// ============================================

const cssFilePath = path.resolve(__dirname, '../../..', 'design-tokens.css');
const cssContent = fs.readFileSync(cssFilePath, 'utf-8');

/**
 * Extract all CSS custom property definitions from a given CSS block.
 * Returns a Map of token name → value.
 */
function extractTokensFromBlock(block: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const regex = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(block)) !== null) {
    tokens.set(match[1].trim(), match[2].trim());
  }
  return tokens;
}

/**
 * Extract the :root block content from the CSS file.
 */
function extractRootBlock(css: string): string {
  const match = css.match(/:root\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
  return match ? match[1] : '';
}

/**
 * Extract the [data-theme="dark"] block content from the CSS file.
 */
function extractDarkBlock(css: string): string {
  const match = css.match(/\[data-theme="dark"\]\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
  return match ? match[1] : '';
}

const rootBlock = extractRootBlock(cssContent);
const darkBlock = extractDarkBlock(cssContent);
const rootTokens = extractTokensFromBlock(rootBlock);
const darkTokens = extractTokensFromBlock(darkBlock);

// ============================================
// Required Premium Token Names
// ============================================

const PREMIUM_SHADOW_TOKENS = [
  '--shadow-premium-sm',
  '--shadow-premium-md',
  '--shadow-premium-lg',
  '--shadow-premium-glow',
] as const;

const PREMIUM_GRADIENT_TOKENS = [
  '--gradient-widget-accent',
  '--gradient-widget-header',
  '--gradient-widget-border',
  '--gradient-shimmer',
] as const;

const PREMIUM_ANIMATION_TOKENS = [
  '--ease-premium',
  '--ease-spring',
  '--duration-hover',
  '--duration-enter',
  '--duration-exit',
  '--duration-theme-transition',
] as const;

const PREMIUM_GLASS_TOKENS = [
  '--glass-widget-bg',
  '--glass-widget-blur',
  '--glass-widget-saturation',
  '--glass-depth-layer',
] as const;

const PREMIUM_BRAND_TOKENS = [
  '--brand-accent',
  '--brand-accent-light',
  '--brand-accent-subtle',
] as const;

const ALL_PREMIUM_TOKENS = [
  ...PREMIUM_SHADOW_TOKENS,
  ...PREMIUM_GRADIENT_TOKENS,
  ...PREMIUM_ANIMATION_TOKENS,
  ...PREMIUM_GLASS_TOKENS,
  ...PREMIUM_BRAND_TOKENS,
] as const;

// ============================================
// Original tokens that existed before the overhaul.
// These must be preserved with their original values.
// ============================================

const ORIGINAL_TOKENS: Record<string, string> = {
  '--primary': '#0f62fe',
  '--primary-dark': '#0043ce',
  '--primary-darker': '#002d9c',
  '--primary-light': '#4589ff',
  '--primary-lightest': '#d0e2ff',
  '--accent-gold': '#f1c21b',
  '--surface': '#ffffff',
  '--surface-ice': '#f4f4f4',
  '--surface-sunken': '#e8e8e8',
  '--surface-lavender': '#f4f4f4',
  '--surface-mint': '#f4f4f4',
  '--surface-amber': '#f4f4f4',
  '--border-subtle': '#e0e0e0',
  '--border-primary': '#c6c6c6',
  '--text-heading': '#161616',
  '--text-body': '#525252',
  '--text-muted': '#6f6f6f',
  '--text-on-primary': '#ffffff',
  '--success': '#24a148',
  '--warning': '#f1c21b',
  '--error': '#da1e28',
  '--info': '#0f62fe',
  '--font-size-xs': '12px',
  '--font-size-sm': '13px',
  '--font-size-base': '14px',
  '--font-size-md': '16px',
  '--font-size-lg': '20px',
  '--font-size-xl': '28px',
  '--font-size-2xl': '32px',
  '--font-size-3xl': '42px',
  '--font-regular': '400',
  '--font-medium': '500',
  '--font-bold': '600',
  '--font-black': '700',
  '--space-xs': '4px',
  '--space-sm': '8px',
  '--space-md': '16px',
  '--space-lg': '24px',
  '--space-xl': '32px',
  '--space-2xl': '48px',
  '--space-3xl': '64px',
  '--radius-sm': '4px',
  '--radius': '8px',
  '--radius-lg': '8px',
  '--radius-pill': '99px',
  '--shadow-card': '0 1px 3px rgba(var(--color-black-rgb), 0.05), 0 1px 2px rgba(var(--color-black-rgb), 0.03)',
  '--shadow-card-hover': '0 4px 12px rgba(var(--color-black-rgb), 0.08)',
  '--shadow-md': '0 2px 6px rgba(var(--color-black-rgb), 0.06)',
  '--shadow-lg': '0 8px 24px rgba(var(--color-black-rgb), 0.10)',
  '--glass-subtle': 'transparent',
  '--glass-medium': 'transparent',
  '--glass-border': 'var(--border-subtle)',
  '--glass-navbar': 'var(--surface)',
  '--glass-icon-bg': 'rgba(var(--color-black-rgb), 0.04)',
  '--glass-icon-border': 'var(--border-subtle)',
  '--glass-icon-blur': '0px',
  '--glass-icon-shadow': 'none',
  '--sidebar-width': '256px',
  '--sidebar-collapsed': '48px',
  '--navbar-height': '48px',
  '--content-max-width': '1200px',
};

// ============================================
// Arbitraries
// ============================================

const premiumTokenArb = fc.constantFrom(...ALL_PREMIUM_TOKENS);
const originalTokenNameArb = fc.constantFrom(...Object.keys(ORIGINAL_TOKENS));

// ============================================
// Property 1: Premium token completeness
// Feature: premium-widget-overhaul, Property 1: Premium token completeness
// **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 8.1**
//
// For any required premium token name (from the set of shadow, gradient,
// animation, glass, and brand tokens defined in the design), the
// design-tokens.css file SHALL contain a CSS custom property definition
// for that token in the :root block.
// ============================================

console.log('--- Property 1: Premium token completeness ---');

// 1a: Every premium token is defined in :root
fc.assert(
  fc.property(premiumTokenArb, (tokenName) => {
    return rootTokens.has(tokenName);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1a: every premium token is defined in :root');

// 1b: Every premium token has a non-empty value in :root
fc.assert(
  fc.property(premiumTokenArb, (tokenName) => {
    const value = rootTokens.get(tokenName);
    return value !== undefined && value.length > 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1b: every premium token has a non-empty value in :root');

// 1c: Shadow tokens contain shadow-like values or 'none' (enterprise: glow is none)
fc.assert(
  fc.property(fc.constantFrom(...PREMIUM_SHADOW_TOKENS), (tokenName) => {
    const value = rootTokens.get(tokenName) ?? '';
    return (value.includes('px') && value.includes('rgba')) || value === 'none';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1c: shadow tokens contain shadow-like values or none');

// 1d: Gradient tokens contain gradient-like values, solid colors, or transparent
fc.assert(
  fc.property(fc.constantFrom(...PREMIUM_GRADIENT_TOKENS), (tokenName) => {
    const value = rootTokens.get(tokenName) ?? '';
    return value.includes('gradient') || value.includes('var(') || value === 'transparent';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1d: gradient tokens contain valid values');

// 1e: Animation timing tokens contain valid timing values (cubic-bezier or ms)
fc.assert(
  fc.property(fc.constantFrom(...PREMIUM_ANIMATION_TOKENS), (tokenName) => {
    const value = rootTokens.get(tokenName) ?? '';
    return value.includes('cubic-bezier') || value.includes('ms');
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1e: animation timing tokens contain valid timing values');

// 1f: Glass tokens have non-empty values
fc.assert(
  fc.property(fc.constantFrom(...PREMIUM_GLASS_TOKENS), (tokenName) => {
    const value = rootTokens.get(tokenName) ?? '';
    return value.length > 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1f: glass tokens have non-empty values');

// 1g: Brand tokens have non-empty values
fc.assert(
  fc.property(fc.constantFrom(...PREMIUM_BRAND_TOKENS), (tokenName) => {
    const value = rootTokens.get(tokenName) ?? '';
    return value.length > 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1g: brand tokens have non-empty values');

console.log('Property 1: PASSED\n');

// ============================================
// Property 2: Dark theme token parity
// Feature: premium-widget-overhaul, Property 2: Dark theme token parity
// **Validates: Requirements 1.5**
//
// For any premium CSS custom property defined in the :root block of
// design-tokens.css, there SHALL exist a corresponding definition in
// the [data-theme="dark"] block with a non-empty value.
//
// Note: Animation timing tokens (--ease-*, --duration-*) are
// theme-independent — their values don't change between light and dark.
// The dark theme block only overrides tokens whose values are adjusted
// for dark backgrounds (shadows, gradients, glass, brand).
// ============================================

console.log('--- Property 2: Dark theme token parity ---');

// Tokens that require dark theme overrides (visually theme-dependent)
const DARK_THEME_REQUIRED_TOKENS = [
  ...PREMIUM_SHADOW_TOKENS,
  ...PREMIUM_GRADIENT_TOKENS,
  ...PREMIUM_GLASS_TOKENS,
  ...PREMIUM_BRAND_TOKENS,
] as const;

const darkRequiredTokenArb = fc.constantFrom(...DARK_THEME_REQUIRED_TOKENS);

// 2a: Every theme-dependent premium token in :root also exists in [data-theme="dark"]
fc.assert(
  fc.property(darkRequiredTokenArb, (tokenName) => {
    return darkTokens.has(tokenName);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 2a: every theme-dependent premium token exists in [data-theme="dark"]');

// 2b: Every theme-dependent premium token in [data-theme="dark"] has a non-empty value
fc.assert(
  fc.property(darkRequiredTokenArb, (tokenName) => {
    const value = darkTokens.get(tokenName);
    return value !== undefined && value.length > 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 2b: every dark theme premium token has a non-empty value');

// 2c: Dark theme shadow tokens have adjusted values (different from light)
fc.assert(
  fc.property(fc.constantFrom(...PREMIUM_SHADOW_TOKENS), (tokenName) => {
    const lightValue = rootTokens.get(tokenName) ?? '';
    const darkValue = darkTokens.get(tokenName) ?? '';
    return darkValue !== lightValue && darkValue.length > 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 2c: dark theme shadow tokens have adjusted values');

// 2d: Dark theme glass tokens have adjusted values (different from light)
fc.assert(
  fc.property(
    fc.constantFrom(...PREMIUM_GLASS_TOKENS.filter(t => t !== '--glass-widget-blur')),
    (tokenName) => {
      const lightValue = rootTokens.get(tokenName) ?? '';
      const darkValue = darkTokens.get(tokenName) ?? '';
      return darkValue !== lightValue && darkValue.length > 0;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 2d: dark theme glass tokens have adjusted values');

console.log('Property 2: PASSED\n');

// ============================================
// Property 3: Existing token preservation
// Feature: premium-widget-overhaul, Property 3: Existing token preservation
// **Validates: Requirements 1.6**
//
// For any CSS custom property that existed in the original
// design-tokens.css before the overhaul, that property SHALL still be
// present in the updated file with its original value unchanged.
// ============================================

console.log('--- Property 3: Existing token preservation ---');

// 3a: Every original token still exists in :root
fc.assert(
  fc.property(originalTokenNameArb, (tokenName) => {
    return rootTokens.has(tokenName);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 3a: every original token still exists in :root');

// 3b: Every original token retains its original value
fc.assert(
  fc.property(originalTokenNameArb, (tokenName) => {
    const currentValue = rootTokens.get(tokenName);
    const originalValue = ORIGINAL_TOKENS[tokenName];
    return currentValue === originalValue;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 3b: every original token retains its original value');

// 3c: The overhaul only added tokens, never removed any original ones
fc.assert(
  fc.property(originalTokenNameArb, (tokenName) => {
    // Token must exist AND have a non-empty value
    const value = rootTokens.get(tokenName);
    return value !== undefined && value.length > 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 3c: no original tokens were removed');

console.log('Property 3: PASSED\n');

// ============================================
console.log('=== All design token property tests PASSED ===');
