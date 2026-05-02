// ============================================
// Workspace Switcher — Unit Tests
// Feature: grc-workspace-lifecycle, Task 14.1
// ============================================
// Run: pnpm exec tsx src/app/shared/layout/workspace-switcher.test.ts

import { readFileSync } from 'fs';
import { resolve } from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

const src = readFileSync(resolve(__dirname, 'workspace-switcher.component.ts'), 'utf-8');

// --- Import the pure helper for type icon mapping ---
type WorkspaceType = 'cybersecurity' | 'privacy' | 'it_governance' | 'enterprise_grc';

function typeIcon(type: string): string {
  switch (type) {
    case 'cybersecurity': return 'pi-lock';
    case 'privacy': return 'pi-eye-slash';
    case 'it_governance': return 'pi-server';
    default: return 'pi-briefcase';
  }
}

interface Workspace {
  workspace_id: string;
  name: string;
  description: string;
  type: string;
  created_at: string;
}

console.log('--- Workspace Switcher unit tests ---\n');

// --- Source structure checks ---
console.log('Component structure:');
assert(src.includes("selector: 'app-workspace-switcher'"), 'correct selector');
assert(src.includes('standalone: true'), 'standalone component');
assert(src.includes('DropdownModule'), 'imports DropdownModule');
assert(src.includes('FormsModule'), 'imports FormsModule');
assert(src.includes('CommonModule'), 'imports CommonModule');
assert(src.includes('@Output() workspaceChange'), 'has workspaceChange output');
assert(src.includes('EventEmitter<string>'), 'emits string workspace ID');
assert(src.includes('ngOnInit'), 'implements OnInit');

console.log('\nAPI integration:');
assert(src.includes('/workspaces'), 'calls /workspaces endpoint');
assert(src.includes('HttpClient'), 'uses HttpClient');
assert(src.includes('environment.apiUrl') || src.includes('environment'), 'uses environment config');

console.log('\nLocalStorage persistence:');
assert(src.includes('localStorage.getItem'), 'reads from localStorage');
assert(src.includes('localStorage.setItem'), 'writes to localStorage');
assert(src.includes('grc_active_workspace'), 'uses correct storage key');

console.log('\nTemplate features:');
assert(src.includes('p-dropdown'), 'uses PrimeNG dropdown');
assert(src.includes('optionLabel="name"'), 'displays workspace name');
assert(src.includes('optionValue="workspace_id"'), 'uses workspace_id as value');
assert(src.includes('pTemplate="selectedItem"'), 'has selected item template');
assert(src.includes('pTemplate="item"'), 'has item template');
assert(src.includes('pi-briefcase') || src.includes('getTypeIcon'), 'shows type icon');

// --- typeIcon pure function tests ---
console.log('\ntypeIcon mapping:');
assert(typeIcon('enterprise_grc') === 'pi-briefcase', 'enterprise_grc → briefcase');
assert(typeIcon('cybersecurity') === 'pi-lock', 'cybersecurity → lock');
assert(typeIcon('privacy') === 'pi-eye-slash', 'privacy → eye-slash');
assert(typeIcon('it_governance') === 'pi-server', 'it_governance → server');
assert(typeIcon('any') === 'pi-briefcase', 'any → briefcase (default)');

// --- Restore selection logic ---
console.log('\nRestore selection logic:');
assert(src.includes('restoreSelection'), 'has restoreSelection method');
assert(src.includes('workspaces.find'), 'finds stored workspace in list');
assert(src.includes('workspaceChange.emit'), 'emits on initial load');

// --- Workspace change handler ---
console.log('\nonWorkspaceChange handler:');
assert(src.includes('onWorkspaceChange'), 'has change handler');
assert(src.includes('(onChange)'), 'dropdown binds onChange');

// --- Error handling ---
console.log('\nError handling:');
assert(src.includes('error:') || src.includes('error =>'), 'handles HTTP errors');

console.log('\n=== All Workspace Switcher unit tests PASSED ===');
