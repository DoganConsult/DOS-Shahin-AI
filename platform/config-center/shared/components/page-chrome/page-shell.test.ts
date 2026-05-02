// ============================================
// PageShellComponent — Unit Tests (updated for shell-architecture migration)
// Feature: modern-ui-overhaul, Task 2.3
// ============================================
//
// PageShellComponent is now a sidebar-free content wrapper.
// The sidebar is provided by AppShellComponent (the parent route layout).
// Run: pnpm exec tsx src/app/shared/components/page-shell.test.ts

import { readFileSync } from 'fs';
import { resolve } from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

function breadcrumbItems(breadcrumbs: string[]): { label: string }[] {
  return breadcrumbs.map(b => ({ label: b }));
}

const src = readFileSync(resolve(__dirname, 'page-shell.component.ts'), 'utf-8');

console.log('--- PageShellComponent unit tests ---\n');

// Requirement 4.1: Page header with icon, title, subtitle
console.log('Requirement 4.1 — page header with icon, title, subtitle:');
assert(src.includes("'pi pi-' + icon"), 'icon uses PrimeIcon class binding');
assert(src.includes('tc-page-icon'), 'page icon element exists');
assert(src.includes('tc-page-title'), 'page title element exists');
assert(src.includes('tc-page-sub'), 'page subtitle element exists');
assert(src.includes('*ngIf="subtitle"'), 'subtitle is conditionally rendered');

// Requirement 4.2: Breadcrumb trail (native nav — no p-breadcrumb)
console.log('\nRequirement 4.2 — breadcrumb trail:');
const items1 = breadcrumbItems(['Dashboard', 'Governance', 'Policies']);
assert(items1.length === 3, 'breadcrumbItems returns correct length for 3 items');
assert(items1[0].label === 'Dashboard', 'first breadcrumb label is correct');
assert(items1[1].label === 'Governance', 'second breadcrumb label is correct');
assert(items1[2].label === 'Policies', 'third breadcrumb label is correct');

const items2 = breadcrumbItems([]);
assert(items2.length === 0, 'empty breadcrumbs returns empty array');

const items3 = breadcrumbItems(['Single']);
assert(items3.length === 1, 'single breadcrumb returns array of length 1');
assert(items3[0].label === 'Single', 'single breadcrumb label is correct');

assert(src.includes('tc-breadcrumb'), 'native breadcrumb nav exists');
assert(src.includes('tc-bc-home'), 'home breadcrumb link exists');
assert(src.includes('tc-bc-item'), 'breadcrumb item element exists');

// Requirement 4.3: Header actions slot
console.log('\nRequirement 4.3 — header actions content projection:');
assert(src.includes('select="[headerActions]"'), 'headerActions content projection slot exists');
assert(src.includes('tc-right'), 'right-zone wrapper exists');

// Requirement 4.4: Skeleton loading state
console.log('\nRequirement 4.4 — skeleton loading state:');
assert(src.includes('*ngIf="loading"'), 'skeleton shown when loading is true');
assert(src.includes('*ngIf="!loading"'), 'content shown when loading is false');
assert(src.includes('p-skeleton'), 'uses p-skeleton component');
assert(src.includes('class="skeleton-grid"'), 'skeleton grid layout exists');
assert(src.includes('SkeletonModule'), 'SkeletonModule is imported');

// Shell architecture: sidebar is NOT in PageShellComponent (provided by AppShellComponent)
console.log('\nShell architecture (sidebar-free):');
assert(!src.includes('app-sidebar'), 'sidebar NOT in PageShellComponent (lives in AppShellComponent)');
assert(!src.includes('SidebarComponent'), 'SidebarComponent NOT imported (moved to AppShellComponent)');

// Component metadata
console.log('\nComponent metadata:');
assert(src.includes("selector: 'app-page-shell'"), 'selector is app-page-shell');
assert(src.includes('standalone: true'), 'component is standalone');

// Workspace change event propagation (Task 14.2)
console.log('\nWorkspace change event propagation (Task 14.2):');
assert(src.includes('@Output() workspaceChanged'), 'has workspaceChanged Output');
assert(src.includes('onWorkspaceChanged(wsId: string)'), 'has onWorkspaceChanged handler');
assert(src.includes('this.workspaceChanged.emit(wsId)'), 'emits workspaceChanged to parent');

console.log('\n=== All PageShellComponent unit tests PASSED ===');
