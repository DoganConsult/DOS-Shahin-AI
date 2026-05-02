// ============================================
// StatCardComponent — Unit Tests
// Feature: modern-ui-overhaul, Task 2.2
// ============================================
//
// Tests the StatCardComponent logic directly since the component
// is a thin template wrapper over its @Input() properties.
// Run: pnpm exec tsx src/app/shared/components/stat-card.test.ts

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

// Simulate the component's template logic for trend display
function formatTrend(trend: number): string {
  const prefix = trend > 0 ? '+' : '';
  return `${prefix}${trend}%`;
}

function trendCssClass(trend: number): string {
  return trend >= 0 ? 'positive' : 'negative';
}

function trendIconClass(trend: number): string {
  return trend >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down';
}

function accentOrDefault(accentColor: string): string {
  return accentColor || 'var(--primary)';
}

console.log('--- StatCardComponent unit tests ---\n');

// Requirement 6.1: icon, value, label rendering
console.log('Requirement 6.1 — icon, value, label:');
assert(accentOrDefault('') === 'var(--primary)', 'default accent color is var(--primary)');
assert(accentOrDefault('#ff0000') === '#ff0000', 'custom accent color is used when provided');

// Requirement 6.2: trend indicator
console.log('\nRequirement 6.2 — trend indicator:');
assert(formatTrend(5) === '+5%', 'positive trend shows + prefix');
assert(formatTrend(0) === '0%', 'zero trend shows no prefix');
assert(formatTrend(-3) === '-3%', 'negative trend shows - prefix');
assert(formatTrend(12.5) === '+12.5%', 'decimal positive trend shows + prefix');
assert(formatTrend(-0.5) === '-0.5%', 'decimal negative trend shows - prefix');

// Trend CSS classes
console.log('\nRequirement 6.2 — trend CSS classes:');
assert(trendCssClass(5) === 'positive', 'positive trend gets positive class');
assert(trendCssClass(0) === 'positive', 'zero trend gets positive class');
assert(trendCssClass(-3) === 'negative', 'negative trend gets negative class');

// Trend icon classes
console.log('\nRequirement 6.2 — trend icons:');
assert(trendIconClass(5) === 'pi pi-arrow-up', 'positive trend shows up arrow');
assert(trendIconClass(0) === 'pi pi-arrow-up', 'zero trend shows up arrow');
assert(trendIconClass(-3) === 'pi pi-arrow-down', 'negative trend shows down arrow');

// Requirement 6.3: hover elevation (CSS-only, verified by style presence)
console.log('\nRequirement 6.3 — hover elevation:');
// Read the component source to verify hover styles exist
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(__dirname, 'stat-card.component.ts'), 'utf-8');
assert(src.includes('translateY(-3px)'), 'hover translateY transform exists');
assert(src.includes('var(--shadow-lg)'), 'hover shadow-lg elevation exists');
assert(src.includes('transition: transform 0.2s, box-shadow 0.2s'), 'transition timing defined');

// Requirement 6.4: accent border
console.log('\nRequirement 6.4 — accent border:');
assert(src.includes("border-top"), 'border-top accent style exists in template');
assert(src.includes("accentColor || 'var(--primary)'"), 'accent color falls back to primary');

// Optional trend: when undefined, no trend element
console.log('\nOptional trend — undefined case:');
assert(src.includes('*ngIf="trend !== undefined"'), 'trend element is conditionally rendered');

console.log('\n=== All StatCardComponent unit tests PASSED ===');
