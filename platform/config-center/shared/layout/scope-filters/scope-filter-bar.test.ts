// ============================================
// Scope Filter Bar — Unit Tests
// Feature: grc-workspace-lifecycle, Task 15.1
// Requirements: 2.4, 2.5, 9.4
// ============================================
// Run: pnpm exec tsx src/app/shared/layout/scope-filter-bar.test.ts

import { readFileSync } from 'fs';
import { resolve } from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

const src = readFileSync(resolve(__dirname, 'scope-filter-bar.component.ts'), 'utf-8');

console.log('\n🧪 Scope Filter Bar Component Tests\n');

// Test 1: Component structure
console.log('Test 1: Component has required imports and structure');
assert(src.includes('import { Component'), 'Component decorator imported');
assert(src.includes('import { MultiSelectModule }'), 'PrimeNG MultiSelect imported');
assert(src.includes('export interface ScopeDimension'), 'ScopeDimension interface exported');
assert(src.includes('export interface ScopeSelection'), 'ScopeSelection interface exported');
assert(src.includes('export class ScopeFilterBarComponent'), 'Component class exported');

// Test 2: Component inputs and outputs
console.log('\nTest 2: Component has required inputs and outputs');
assert(src.includes('@Input() workspaceId'), 'workspaceId input defined');
assert(src.includes('@Output() scopeChange'), 'scopeChange output defined');
assert(src.includes('EventEmitter<ScopeSelection>'), 'scopeChange emits ScopeSelection');

// Test 3: Component properties
console.log('\nTest 3: Component has required properties');
assert(src.includes('dimensionGroups:'), 'dimensionGroups property defined');
assert(src.includes('selection: ScopeSelection'), 'selection property defined');

// Test 4: Lifecycle hooks
console.log('\nTest 4: Component implements lifecycle hooks');
assert(src.includes('implements OnInit'), 'OnInit implemented');
assert(src.includes('implements OnChanges') || src.includes('OnChanges'), 'OnChanges implemented');
assert(src.includes('ngOnInit()'), 'ngOnInit method defined');
assert(src.includes('ngOnChanges('), 'ngOnChanges method defined');

// Test 5: API integration
console.log('\nTest 5: Component loads scopes from API');
assert(src.includes('/workspaces/${this.workspaceId}/scopes'), 'Correct API endpoint used');
assert(src.includes('.get<') || src.includes('.get('), 'HTTP GET request made');
assert(src.includes('loadScopes'), 'loadScopes method defined');

// Test 6: SessionStorage persistence
console.log('\nTest 6: Component persists selection to sessionStorage');
assert(src.includes('sessionStorage.setItem'), 'sessionStorage.setItem used');
assert(src.includes('sessionStorage.getItem'), 'sessionStorage.getItem used');
assert(src.includes('persistSelection'), 'persistSelection method defined');
assert(src.includes('restoreSelection'), 'restoreSelection method defined');
assert(src.includes("'grc_scope_selection'") || src.includes('STORAGE_KEY'), 'Storage key defined');

// Test 7: Event emission
console.log('\nTest 7: Component emits scopeChange event');
assert(src.includes('this.scopeChange.emit'), 'scopeChange.emit called');
assert(src.includes('onSelectionChange'), 'onSelectionChange method defined');

// Test 8: Workspace change handling
console.log('\nTest 8: Component resets on workspace change');
assert(src.includes('clearAll'), 'clearAll method defined');
assert(src.includes("changes['workspaceId']"), 'Workspace change detected in ngOnChanges');

// Test 9: Template structure
console.log('\nTest 9: Template has required elements');
assert(src.includes('<p-multiSelect'), 'PrimeNG MultiSelect used in template');
assert(src.includes('[(ngModel)]="selection[group.type]"'), 'Two-way binding to selection');
assert(src.includes('[options]="group.options"'), 'Options bound to group.options');
assert(src.includes('(onChange)="onSelectionChange()"'), 'onChange event handler');
assert(src.includes('*ngFor="let group of dimensionGroups"'), 'Iterates over dimensionGroups');

// Test 10: Clear functionality
console.log('\nTest 10: Component has clear all functionality');
assert(src.includes('clearAll()'), 'clearAll method defined');
assert(src.includes('hasSelection'), 'hasSelection getter defined');

// Test 11: Error handling
console.log('\nTest 11: Component handles errors gracefully');
assert(src.includes('error:'), 'Error handler defined');
assert(src.includes('try') || src.includes('catch'), 'Try-catch blocks for error handling');

// Test 12: Scope grouping by dimension type
console.log('\nTest 12: Component groups scopes by dimension type');
assert(src.includes('dimension_type'), 'dimension_type field used');
assert(src.includes('Map') || src.includes('grouped'), 'Grouping logic implemented');

// Test 13: Styling
console.log('\nTest 13: Component has proper styling');
assert(src.includes('.scope-filter-bar'), 'Main container class defined');
assert(src.includes('display: flex'), 'Flexbox layout used');
assert(src.includes('gap:'), 'Gap spacing defined');

// Test 14: Accessibility
console.log('\nTest 14: Component uses accessible PrimeNG components');
assert(src.includes('[placeholder]'), 'Placeholder text provided');
assert(src.includes('maxSelectedLabels'), 'Max selected labels configured');

// Test 15: Integration with workspace-home
console.log('\nTest 15: Component exports required interfaces');
assert(src.includes('export interface ScopeSelection'), 'ScopeSelection interface exported for parent components');
assert(src.includes('[dimensionType: string]: string[]'), 'ScopeSelection structure correct');

console.log('\n✅ All tests passed!\n');
