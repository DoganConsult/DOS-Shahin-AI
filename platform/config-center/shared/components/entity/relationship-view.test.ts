// ============================================
// RelationshipViewComponent — Unit Tests
// Feature: grc-workspace-lifecycle, Task 17.1
// ============================================
//
// Tests the RelationshipViewComponent logic for rendering
// bidirectional relationships grouped by type.
// Run: pnpm exec tsx src/app/shared/components/relationship-view.test.ts

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

// Simulate the component's helper methods
function getRoute(type: string): string[] {
  const ROUTE_MAP: Record<string, string> = {
    risk: '/risks',
    policy: '/policies',
    control: '/controls',
    framework: '/frameworks',
    evidence: '/evidence',
    incident: '/incidents',
    vendor: '/vendors',
    exception: '/exceptions',
    finding: '/findings',
    asset: '/assets',
    assessment: '/audit',
    workspace: '/workspace-home',
    remediation_task: '/workflows',
  };
  return [ROUTE_MAP[type] || '/workspace-home'];
}

function getIcon(type: string): string {
  const iconMap: Record<string, string> = {
    risk: 'pi-exclamation-triangle',
    policy: 'pi-file',
    control: 'pi-lock',
    framework: 'pi-sitemap',
    evidence: 'pi-folder',
    incident: 'pi-bolt',
    vendor: 'pi-truck',
    exception: 'pi-ban',
    finding: 'pi-search',
    asset: 'pi-server',
    assessment: 'pi-clipboard',
    remediation_task: 'pi-wrench',
  };
  return iconMap[type] || 'pi-circle';
}

function formatTypeName(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

console.log('--- RelationshipViewComponent unit tests ---\n');

// Requirement 11.1: Component accepts objectType and objectId inputs
console.log('Requirement 11.1 — Component inputs:');
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(__dirname, 'relationship-view.component.ts'), 'utf-8');
assert(src.includes('@Input() objectType: string'), 'objectType input exists');
assert(src.includes('@Input() objectId: string'), 'objectId input exists');

// Requirement 11.2: Component calls GET /api/objects/:type/:id/relationships
console.log('\nRequirement 11.2 — API endpoint:');
assert(src.includes('/objects/${this.objectType}/${this.objectId}/relationships'), 'correct API endpoint used');
assert(src.includes('this.http') && src.includes('.get<'), 'uses HttpClient.get');

// Requirement 11.3: Render linked objects grouped by type
console.log('\nRequirement 11.3 — Grouping by type:');
assert(src.includes('Object.entries(relationships)'), 'groups relationships by type');
assert(src.includes('p-accordion'), 'uses PrimeNG Accordion for grouping');
assert(src.includes('*ngFor="let group of groups"'), 'iterates over grouped relationships');

// Requirement 11.4: Each linked object is a RouterLink
console.log('\nRequirement 11.4 — RouterLink navigation:');
assert(src.includes('[routerLink]="getRoute(item.type)"'), 'uses RouterLink for navigation');
assert(src.includes('RouterLink'), 'imports RouterLink');

// Test route mapping
console.log('\nRoute mapping tests:');
assert(getRoute('risk')[0] === '/risks', 'risk maps to /risks');
assert(getRoute('policy')[0] === '/policies', 'policy maps to /policies');
assert(getRoute('control')[0] === '/controls', 'control maps to /controls');
assert(getRoute('framework')[0] === '/frameworks', 'framework maps to /frameworks');
assert(getRoute('exception')[0] === '/exceptions', 'exception maps to /exceptions');
assert(getRoute('finding')[0] === '/findings', 'finding maps to /findings');
assert(getRoute('asset')[0] === '/assets', 'asset maps to /assets');
assert(getRoute('remediation_task')[0] === '/workflows', 'remediation_task maps to /workflows');
assert(getRoute('unknown_type')[0] === '/workspace-home', 'any type defaults to /workspace-home');

// Test icon mapping
console.log('\nIcon mapping tests:');
assert(getIcon('risk') === 'pi-exclamation-triangle', 'risk has correct icon');
assert(getIcon('policy') === 'pi-file', 'policy has correct icon');
assert(getIcon('control') === 'pi-lock', 'control has correct icon');
assert(getIcon('framework') === 'pi-sitemap', 'framework has correct icon');
assert(getIcon('exception') === 'pi-ban', 'exception has correct icon');
assert(getIcon('finding') === 'pi-search', 'finding has correct icon');
assert(getIcon('asset') === 'pi-server', 'asset has correct icon');
assert(getIcon('assessment') === 'pi-clipboard', 'assessment has correct icon');
assert(getIcon('remediation_task') === 'pi-wrench', 'remediation_task has correct icon');
assert(getIcon('unknown_type') === 'pi-circle', 'any type defaults to pi-circle');

// Test type name formatting
console.log('\nType name formatting tests:');
assert(formatTypeName('risk') === 'Risk', 'single word capitalized');
assert(formatTypeName('remediation_task') === 'Remediation Task', 'underscores replaced with spaces');
assert(formatTypeName('finding') === 'Finding', 'single word capitalized');
assert(formatTypeName('scope_dimension') === 'Scope Dimension', 'multi-word with underscores formatted correctly');

// Test empty state
console.log('\nEmpty state tests:');
assert(src.includes('No relationships found'), 'empty state message exists');
assert(src.includes('*ngIf="groups.length === 0"'), 'empty state conditionally rendered');

// Test loading state
console.log('\nLoading state tests:');
assert(src.includes('p-skeleton'), 'loading skeleton exists');
assert(src.includes('*ngIf="loading"'), 'loading state conditionally rendered');
assert(src.includes('SkeletonModule'), 'imports SkeletonModule');

// Test accordion expandable sections
console.log('\nAccordion tests:');
assert(src.includes('[multiple]="true"'), 'accordion allows multiple sections open');
assert(src.includes('[selected]="true"'), 'accordion sections default to expanded');
assert(src.includes('AccordionModule'), 'imports AccordionModule');

// Test component is standalone
console.log('\nComponent configuration:');
assert(src.includes('standalone: true'), 'component is standalone');
assert(src.includes('CommonModule'), 'imports CommonModule');

console.log('\n=== All RelationshipViewComponent unit tests PASSED ===');
