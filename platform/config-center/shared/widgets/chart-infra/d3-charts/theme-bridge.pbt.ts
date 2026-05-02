// ============================================
// Theme Bridge — Property-Based Test (Property 4)
// Feature: premium-widget-overhaul, Property 4: Theme bridge completeness
// ============================================
//
// Standalone PBT file.
// Run: pnpm exec tsx src/app/shared/widgets/d3-charts/theme-bridge.pbt.ts

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Source File Parsing
// ============================================

const sourcePath = path.resolve(__dirname, 'theme-bridge.ts');
const sourceContent = fs.readFileSync(sourcePath, 'utf-8');

/**
 * Extract all property names from the D3Theme interface definition.
 * Matches lines like `  propertyName: string;` inside the interface block.
 */
function extractD3ThemeProperties(source: string): string[] {
  const interfaceMatch = source.match(/export\s+interface\s+D3Theme\s*\{([\s\S]*?)\}/);
  if (!interfaceMatch) {
    throw new Error('Could not find D3Theme interface in theme-bridge.ts');
  }
  const interfaceBody = interfaceMatch[1];
  const props: string[] = [];
  const propRegex = /^\s*(\w+)\s*:\s*string\s*;/gm;
  let match: RegExpExecArray | null;
  while ((match = propRegex.exec(interfaceBody)) !== null) {
    props.push(match[1]);
  }
  if (props.length === 0) {
    throw new Error('No properties found in D3Theme interface');
  }
  return props;
}

/**
 * Extract the return object from resolveTheme() and build a map of
 * property name → fallback value. Handles both:
 *   - v('--css-var', 'fallback')  patterns
 *   - direct string expressions like `isDark(root) ? '...' : '...'`
 *
 * For v() calls, extracts the fallback (second argument).
 * For ternary/direct expressions, just confirms the property exists.
 */
function extractResolveThemeEntries(source: string): Map<string, string> {
  // Match the return { ... } block inside resolveTheme
  const returnMatch = source.match(/function\s+resolveTheme[\s\S]*?return\s*\{([\s\S]*?)\};/);
  if (!returnMatch) {
    throw new Error('Could not find resolveTheme() return block in theme-bridge.ts');
  }
  const returnBody = returnMatch[1];
  const entries = new Map<string, string>();

  // Match property assignments like:  propertyName: v('--var', 'fallback'),
  // or:  propertyName: someExpression,
  const entryRegex = /(\w+)\s*:\s*(.+?)(?:,\s*$|,\s*\/\/|$)/gm;
  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(returnBody)) !== null) {
    const propName = match[1].trim();
    const valueExpr = match[2].trim();

    // Try to extract fallback from v('--name', 'fallback') pattern
    const vCallMatch = valueExpr.match(/v\(\s*'[^']+'\s*,\s*'([^']+)'\s*\)/);
    if (vCallMatch) {
      entries.set(propName, vCallMatch[1]);
    } else {
      // For ternary or other expressions, just record that the property exists
      // with a non-empty marker
      entries.set(propName, valueExpr);
    }
  }
  return entries;
}

const d3ThemeProperties = extractD3ThemeProperties(sourceContent);
const resolveThemeEntries = extractResolveThemeEntries(sourceContent);

console.log(`D3Theme interface has ${d3ThemeProperties.length} properties`);
console.log(`resolveTheme() return object has ${resolveThemeEntries.size} entries`);

// ============================================
// Property 4: Theme bridge completeness
// Feature: premium-widget-overhaul, Property 4: Theme bridge completeness
// **Validates: Requirements 3.1**
//
// For any property in the D3Theme interface, the resolveTheme() function
// SHALL return a non-empty string value, using the CSS custom property
// value if available or the specified fallback default.
// ============================================

console.log('--- Property 4: Theme bridge completeness ---');

const d3ThemePropertyArb = fc.constantFrom(...d3ThemeProperties);

// 4a: Every D3Theme interface property has a corresponding entry in resolveTheme()
fc.assert(
  fc.property(d3ThemePropertyArb, (propName) => {
    const hasEntry = resolveThemeEntries.has(propName);
    if (!hasEntry) {
      console.error(
        `  ✗ D3Theme property "${propName}" is missing from resolveTheme() return object`
      );
    }
    return hasEntry;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 4a: every D3Theme property has a corresponding resolveTheme() entry');

// 4b: Every resolveTheme() entry has a non-empty fallback value
fc.assert(
  fc.property(d3ThemePropertyArb, (propName) => {
    const value = resolveThemeEntries.get(propName);
    if (!value || value.trim().length === 0) {
      console.error(
        `  ✗ resolveTheme() entry "${propName}" has an empty fallback value`
      );
      return false;
    }
    return true;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 4b: every resolveTheme() entry has a non-empty fallback value');

// 4c: resolveTheme() does not contain extra properties not in D3Theme
// (ensures the interface and implementation stay in sync)
const resolveThemeKeys = Array.from(resolveThemeEntries.keys());
const extraKeys = resolveThemeKeys.filter(k => !d3ThemeProperties.includes(k));
if (extraKeys.length > 0) {
  throw new Error(
    `resolveTheme() contains properties not in D3Theme interface: ${extraKeys.join(', ')}`
  );
}
console.log('  ✓ 4c: resolveTheme() has no extra properties beyond D3Theme interface');

// 4d: D3Theme interface has no properties missing from resolveTheme()
// (inverse of 4a, as a direct set comparison sanity check)
const missingKeys = d3ThemeProperties.filter(k => !resolveThemeEntries.has(k));
if (missingKeys.length > 0) {
  throw new Error(
    `D3Theme interface properties missing from resolveTheme(): ${missingKeys.join(', ')}`
  );
}
console.log('  ✓ 4d: D3Theme and resolveTheme() are fully synchronized');

console.log('Property 4: PASSED\n');

// ============================================
console.log('=== Theme bridge property test PASSED ===');
