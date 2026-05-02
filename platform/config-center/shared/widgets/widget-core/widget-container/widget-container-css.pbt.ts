// ============================================
// Widget Container CSS — Property-Based Test (Property 6)
// Feature: premium-widget-overhaul, Property 6: Logical CSS properties usage
// ============================================
//
// Standalone PBT file.
// Run: pnpm exec tsx src/app/shared/widgets/widget-container-css.pbt.ts

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CSS Extraction from Component
// ============================================

const componentPath = path.resolve(__dirname, 'widget-container.component.ts');
const componentContent = fs.readFileSync(componentPath, 'utf-8');

/**
 * Extract inline CSS from the Angular component's `styles: [...]` array.
 * The component uses a template literal inside styles: [`...`].
 */
function extractInlineStyles(source: string): string {
  // Match the styles: [`...`] block — Angular inline styles
  const stylesMatch = source.match(/styles\s*:\s*\[\s*`([\s\S]*?)`\s*\]/);
  if (!stylesMatch) {
    throw new Error('Could not extract inline styles from widget-container.component.ts');
  }
  return stylesMatch[1];
}

/**
 * Strip CSS comments (both block and line) from the CSS string.
 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Strip var() references from CSS values so that token names like
 * `--glass-widget-blur` inside `var(...)` are not false-positived.
 */
function stripVarReferences(css: string): string {
  // Recursively strip var(...) including nested var() calls
  let result = css;
  let prev = '';
  while (result !== prev) {
    prev = result;
    result = result.replace(/var\([^()]*\)/g, '');
  }
  return result;
}

const rawCSS = extractInlineStyles(componentContent);
const cleanCSS = stripVarReferences(stripComments(rawCSS));

/**
 * Parse CSS into individual declarations (property: value pairs).
 * Returns an array of { property, value, rule } objects.
 */
function parseDeclarations(css: string): Array<{ property: string; value: string; rule: string }> {
  const declarations: Array<{ property: string; value: string; rule: string }> = [];

  // Split into rule blocks by matching selectors + { ... }
  // We flatten all declarations regardless of nesting for this check.
  const declRegex = /(?:^|;|\{)\s*([\w-]+)\s*:\s*([^;{}]+)/g;
  let match: RegExpExecArray | null;
  while ((match = declRegex.exec(css)) !== null) {
    const prop = match[1].trim().toLowerCase();
    const value = match[2].trim();
    declarations.push({ property: prop, value, rule: match[0].trim() });
  }
  return declarations;
}

const allDeclarations = parseDeclarations(cleanCSS);

// ============================================
// Forbidden Physical Directional Properties
// ============================================

/**
 * Physical directional CSS properties that should NOT appear.
 * Only logical equivalents are allowed per Requirement 6.5.
 *
 * Note: `left` and `right` as standalone CSS properties are forbidden,
 * but they are acceptable as VALUES (e.g., `transform-origin: left`).
 * The check targets the property side of declarations only.
 */
const FORBIDDEN_PHYSICAL_PROPERTIES = [
  'padding-left',
  'padding-right',
  'margin-left',
  'margin-right',
  'border-left',
  'border-right',
  'border-left-width',
  'border-right-width',
  'border-left-color',
  'border-right-color',
  'border-left-style',
  'border-right-style',
  'left',
  'right',
] as const;

// ============================================
// Property 6: Logical CSS properties usage
// Feature: premium-widget-overhaul, Property 6: Logical CSS properties usage
// **Validates: Requirements 6.5**
//
// For any CSS rule in the premium Widget_Container component styles,
// no physical directional properties (padding-left, padding-right,
// margin-left, margin-right, border-left, border-right, left, right)
// SHALL be used — only logical equivalents (padding-inline-start,
// padding-inline-end, margin-inline-start, margin-inline-end,
// border-inline-start, border-inline-end, inset-inline-start,
// inset-inline-end) or non-directional properties.
// ============================================

console.log('--- Property 6: Logical CSS properties usage ---');

const forbiddenPropertyArb = fc.constantFrom(...FORBIDDEN_PHYSICAL_PROPERTIES);

// Extract just the property names from all declarations
const allPropertyNames = allDeclarations.map(d => d.property);

// 6a: No forbidden physical directional property appears in any CSS declaration
fc.assert(
  fc.property(forbiddenPropertyArb, (forbidden) => {
    const found = allPropertyNames.includes(forbidden);
    if (found) {
      const offending = allDeclarations.filter(d => d.property === forbidden);
      console.error(
        `  ✗ Found forbidden physical property "${forbidden}" in declarations:`,
        offending.map(d => d.rule)
      );
    }
    return !found;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 6a: no forbidden physical directional properties found');

// 6b: The component uses at least some logical properties (sanity check)
// This ensures the component actually has directional styling using logical props.
const EXPECTED_LOGICAL_PROPERTIES = [
  'padding-inline',
  'padding-block',
  'margin-inline',
  'margin-block',
  'inset-inline-start',
  'inset-inline-end',
  'inset-block-start',
  'inset-block-end',
  'padding-inline-start',
  'padding-inline-end',
  'margin-inline-start',
  'margin-inline-end',
  'border-inline-start',
  'border-inline-end',
] as const;

const logicalPropsFound = EXPECTED_LOGICAL_PROPERTIES.filter(lp =>
  allPropertyNames.some(p => p === lp)
);

if (logicalPropsFound.length === 0) {
  throw new Error(
    'Sanity check failed: no logical CSS properties found in the component. ' +
    'Expected at least some logical properties like padding-inline, inset-inline-start, etc.'
  );
}
console.log(`  ✓ 6b: found ${logicalPropsFound.length} logical properties (sanity check)`);

// 6c: For each forbidden property, verify it does not appear as a CSS property
// (not just in values). This is a stricter regex-based check on the raw clean CSS.
fc.assert(
  fc.property(forbiddenPropertyArb, (forbidden) => {
    // Build a regex that matches the property name at the start of a declaration
    // (after a newline, semicolon, or opening brace), NOT inside a value.
    // Pattern: property-name followed by colon (with optional whitespace)
    const propRegex = new RegExp(
      `(?:^|[;{\\n])\\s*${forbidden.replace('-', '\\-')}\\s*:`,
      'm'
    );
    return !propRegex.test(cleanCSS);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 6c: regex-based check confirms no forbidden properties');

console.log('Property 6: PASSED\n');

// ============================================
console.log('=== Widget container CSS property test PASSED ===');
