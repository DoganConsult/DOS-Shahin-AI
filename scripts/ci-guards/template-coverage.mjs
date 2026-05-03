#!/usr/bin/env node
/**
 * template-coverage.mjs — Phase A / W12b CI gate.
 *
 * Verifies that every active dynamic_ui_routes component_key in
 * platform/dos/registry/component-map.ts resolves (via lazy-import) to one
 * of the 31 canonical archetype templates exported from
 * platform/core/platform/shell/templates/index.ts.
 *
 * Allowed exemptions:
 *   - Concrete app pages enumerated in EXEMPT_KEYS (Shahin* user/tenant
 *     profile + settings) which intentionally pre-date the template doctrine.
 *   - Any component_key not present in active dynamic_ui_routes (those are
 *     not user-facing and must be policed by component-map-coverage).
 *
 * Set TEMPLATE_COVERAGE_ENFORCE=1 to fail CI; otherwise SHADOW.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG_DIR = join(REPO, 'platform/dos/migrations/public');
const COMPONENT_MAP_FILE = join(REPO, 'platform/dos/registry/component-map.ts');
const TEMPLATES_INDEX = join(REPO, 'platform/core/platform/shell/templates/index.ts');

const EXEMPT_KEYS = new Set([
  'ShahinProfilePage',
  'ShahinSettingsPage',
  'ShahinTenantProfilePage',
  'ShahinTenantSettingsPage',
]);

// Canonical 31-archetype export aliases — kept in lockstep with
// ARCHETYPE_REGISTRY in
// platform/core/platform/shell/templates/module-template.types.ts and
// scripts/ui-registry/lib/archetype-map.mjs. All 31 renderers are shipped
// (13 original + 18 added by the roster patch) and re-exported through
// platform/core/platform/shell/templates/index.ts.
const ARCHETYPE_EXPORTS = new Set([
  // Original 13 (existing renderers)
  'ModuleOverviewTemplateComponent',
  'CommandHomeTemplateComponent',
  'PostureOverviewTemplateComponent',
  'ModuleRecordsTemplateComponent',
  'IntelligentRegisterTemplateComponent',
  'ModuleHeatmapTemplateComponent',
  'RiskLandscapeTemplateComponent',
  'ModuleAssessmentsTemplateComponent',
  'WorkflowControlTemplateComponent',
  'TrendIntelligenceTemplateComponent',
  'ModuleReportsTemplateComponent',
  'EvidenceReportsTemplateComponent',
  'ModuleWorkQueueTemplateComponent',
  'ActionQueueTemplateComponent',
  'ModuleSettingsTemplateComponent',
  'ModuleControlSettingsTemplateComponent',
  'RecordStoryTemplateComponent',
  'GuidedCreateTemplateComponent',
  'AiAdvisorTemplateComponent',
  'ModuleOnboardingTemplateComponent',
  'ActivationJourneyTemplateComponent',
  // 18 new archetype renderers — shipped via templates/index.ts
  'DecisionDashboardTemplateComponent',
  'CommandDashboardTemplateComponent',
  'ExportCenterTemplateComponent',
  'CalendarTimelineTemplateComponent',
  'ComplianceCalendarTemplateComponent',
  'WorkflowTimelineTemplateComponent',
  'RemediationRoadmapTemplateComponent',
  'OrgChartTemplateComponent',
  'OwnershipMapTemplateComponent',
  'DelegationCenterTemplateComponent',
  'AgentFlowTemplateComponent',
  'AgentRegistryTemplateComponent',
  'UserAgentWorkbenchTemplateComponent',
  'AuditTrailTemplateComponent',
  'AuditTrailLedgerTemplateComponent',
  'AuditTrailEvidenceTemplateComponent',
  'FollowUpCenterTemplateComponent',
  'IncidentResponseTemplateComponent',
  // 32nd archetype (Phase WS-1b)
  'CaseFinalizationTemplateComponent',
]);

if (!existsSync(TEMPLATES_INDEX)) {
  console.error('[template-coverage] missing templates index — skipping');
  process.exit(0);
}

// ── Active route keys
function nextBoundary(s, i) {
  const m = s.slice(i).search(/\n(?:INSERT INTO dos\.|UPDATE dos\.)/i);
  return m === -1 ? s.length : i + m;
}
function blocks(whole, suffix) {
  const out = [];
  const n = `INSERT INTO dos.${suffix}`;
  let i = 0;
  while (true) {
    const j = whole.indexOf(n, i);
    if (j === -1) break;
    const end = nextBoundary(whole, j + n.length);
    out.push(whole.slice(j, end));
    i = end;
  }
  return out;
}
function activeRouteKeys(block) {
  const keys = new Set();
  for (const m of block.matchAll(
    /\(\s*NULL\s*,\s*'[^']+'\s*,\s*'(\/[^']*)'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*\d+\s*,\s*'(active)'/g,
  )) keys.add(m[2]);
  if (/SELECT[\s\S]*'active'/i.test(block) && /FROM\s*\(\s*VALUES/i.test(block)) {
    for (const m of block.matchAll(/\(\s*'(\/[^']*)'\s*,\s*'([^']+)'/g)) keys.add(m[2]);
  }
  return keys;
}

const routeKeys = new Set();
for (const f of readdirSync(MIG_DIR).filter(x => x.endsWith('.sql') && !x.includes('_down'))) {
  const w = readFileSync(join(MIG_DIR, f), 'utf8');
  for (const b of blocks(w, 'dynamic_ui_routes')) for (const k of activeRouteKeys(b)) routeKeys.add(k);
}

// ── Parse REGISTRY_COMPONENT_MAP entries: { key → exportName }
const mapSrc = readFileSync(COMPONENT_MAP_FILE, 'utf8');
const re = /['"]([a-zA-Z0-9_.\-:/]+)['"]\s*:\s*\(\s*\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)\s*\.then\(\s*m\s*=>\s*m\.([A-Za-z0-9_$]+)/g;
const keyToExport = new Map();
let m;
while ((m = re.exec(mapSrc))) keyToExport.set(m[1], m[3]);

const failures = [];
for (const k of routeKeys) {
  if (EXEMPT_KEYS.has(k)) continue;
  const exp = keyToExport.get(k);
  if (!exp) { failures.push({ key: k, reason: 'no-component-map-entry' }); continue; }
  if (!ARCHETYPE_EXPORTS.has(exp)) {
    failures.push({ key: k, reason: 'non-archetype-target', target: exp });
  }
}

console.log(`[template-coverage] ${routeKeys.size} active route keys · failures=${failures.length} · exempt=${[...EXEMPT_KEYS].filter(k => routeKeys.has(k)).length}`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f.key}  ← ${f.reason}${f.target ? ` (→ ${f.target})` : ''}`);
  if (process.env.TEMPLATE_COVERAGE_ENFORCE === '1') process.exit(1);
  console.error('[template-coverage] SHADOW (set TEMPLATE_COVERAGE_ENFORCE=1 to fail CI)');
  process.exit(0);
}
console.log('[template-coverage] PASS — every active route resolves to a canonical archetype template.');
process.exit(0);
