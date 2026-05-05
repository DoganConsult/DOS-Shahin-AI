#!/usr/bin/env node
/**
 * template-only-routing.mjs
 *
 * Enforces rule §3.1 ("no pages outside the 32-template roster"):
 *
 *   1. Every dos.dynamic_ui_routes.component_key must be one of the 32
 *      canonical archetype keys exported by ARCHETYPE_REGISTRY in
 *      platform/core/platform/shell/templates/module-template.types.ts,
 *      OR appear in ALLOWLIST_PATHS (auth + marketing).
 *   2. Every dos.dynamic_ui_routes row must have a matching binding in
 *      dos.ui_route_template_binding (or appear in ALLOWLIST_PATHS).
 *   3. Every binding's `template_export` must exist in the FE LOADERS
 *      registry shipped by template-binding.registry.ts.
 *   4. Every workspace child route in
 *      platform/app/src/app.routes.ts MUST resolve to
 *      `DynamicTemplatePageComponent` — no bespoke `Foundation*Component`
 *      / `<Module>*Page` import is allowed inside a `loadComponent`.
 *
 * Set TEMPLATE_ONLY_ROUTING_ENFORCE=1 to fail the build; otherwise
 * the script reports findings and exits 0 (used during onboarding).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const ENFORCE = process.env.TEMPLATE_ONLY_ROUTING_ENFORCE === '1';

const ALLOWLIST_PATHS = new Set([
  // Auth pages — bespoke composers policed by auth-pages-coverage gate.
  '/login', '/register', '/forgot-password', '/reset-password', '/mfa',
  '/dauth', '/',
  // Marketing pages — UNIFIED_MOUNT_POLICY §2 (public, tenantless,
  // registry-seeded marketing.*.page keys, NOT workspace pages).
  '/about', '/contact', '/legal', '/platform', '/pricing', '/resources',
  '/resources/executive-kit', '/security', '/trust',
]);

// Mirror of ARCHETYPE_REGISTRY (32 entries) — must stay in sync with
// platform/core/platform/shell/templates/module-template.types.ts.
const ARCHETYPE_COMPONENT_KEYS = new Set([
  'module.entry.page','module.posture.page','module.trends.page',
  'module.dashboard.page','module.command_dashboard.page','module.records.page',
  'module.heatmap.page','module.record.detail.page','module.record.create.page',
  'module.work_queue','module.workflows.page','module.workflow_timeline.page',
  'module.followup_center.page','module.reports.page','module.export.page',
  'module.audit_trail','module.audit_trail_ledger.page','module.audit_evidence.page',
  'module.calendar.page','module.compliance_calendar.page','module.roadmap.page',
  'module.org_chart.page','module.ownership_map.page','module.delegation_center.page',
  'module.ai.advisor.page','module.agent_flow.page','module.agent_registry.page',
  'module.user_agent_workbench.page','module.settings.page','module.activation.page',
  'module.incident_response.page','module.case_finalization.page',
]);

const repo = process.cwd();
const findings = [];

// ── Probe 1+2+3: DB integrity ─────────────────────────────────────────
const conn = process.env.DATABASE_URL
  ?? 'postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';
const client = new pg.Client({ connectionString: conn });
await client.connect();

const { rows: routes } = await client.query(`
  SELECT r.path_pattern, r.component_key,
         b.archetype, b.template_export
    FROM dos.dynamic_ui_routes r
    LEFT JOIN dos.ui_route_template_binding b ON b.route = r.path_pattern
   ORDER BY r.path_pattern
`);

let nonArchetype = 0, missingBinding = 0;
for (const r of routes) {
  if (ALLOWLIST_PATHS.has(r.path_pattern)) continue;
  if (!ARCHETYPE_COMPONENT_KEYS.has(r.component_key)) {
    findings.push(`NON_ARCHETYPE  ${r.path_pattern} → ${r.component_key}`);
    nonArchetype++;
  }
  if (!r.template_export) {
    findings.push(`NO_BINDING     ${r.path_pattern}`);
    missingBinding++;
  }
}

// Loader registry membership.
const loaderSrc = readFileSync(
  resolve(repo, 'platform/core/platform/shell/template-binding.registry.ts'),
  'utf8',
);
const loaderKeys = new Set(
  [...loaderSrc.matchAll(/^\s+(?:([A-Z][A-Za-z0-9]+TemplateComponent)|['"]([^'"]+)['"])\s*:/gm)]
    .map(m => m[1] ?? m[2])
);
let unknownExport = 0;
const seenExports = new Set();
for (const r of routes) {
  if (!r.template_export || seenExports.has(r.template_export)) continue;
  seenExports.add(r.template_export);
  if (!loaderKeys.has(r.template_export)) {
    findings.push(`UNKNOWN_EXPORT ${r.template_export}`);
    unknownExport++;
  }
}

await client.end();

// ── Probe 4: SPA route file forbids bespoke loadComponents ────────────
const spa = readFileSync(
  resolve(repo, 'platform/app/src/app.routes.ts'),
  'utf8',
);

// SPA allowlist: auth pages, marketing, workspace shell, dna stub,
// compliance overview stub, risk pages (transitional — to be normalised
// in a follow-up wave once their archetypes are confirmed), admin
// dashboard, generic DynamicTemplatePageComponent.
const SPA_ALLOWED_COMPONENTS = new Set([
  'DynamicTemplatePageComponent', 'DnaPageComponent',
  'WorkspaceHomeComponent', 'WorkspaceShellComponent', 'ShellHostComponent',
  'LoginComponent', 'RegisterComponent', 'ForgotPasswordComponent',
  'MfaComponent', 'ResetPasswordComponent',
  'AuthBridgeComponent', 'AuthPageHostComponent',
  'MarketingLandingComponent',
  'ProfileComponent', 'TenantProfileComponent',
  'ComplianceOverviewPageComponent',
  // Risk module — pending follow-up wave.
  'RiskOverviewComponent','RiskRegisterPageComponent',
  'RiskAssessmentsPageComponent','RiskHeatmapPageComponent',
  'RiskTreatmentsPageComponent','RiskReportsPageComponent',
  'RiskSettingsPageComponent',
  // Compliance pages still hand-wired — pending follow-up wave.
  'ComplianceAssessmentsPageComponent','ComplianceAttestationsPageComponent',
  'ComplianceObligationsPageComponent','ObligationWorkspaceComponent',
  'ObligationDetailPageComponent','ComplianceHeatMapPageComponent',
  'AssertionDashboardComponent','RcsaCampaignsComponent',
  'RegulatoryReasoningStudioComponent','ComplianceEvidenceOpsPageComponent',
  'ComplianceReportsPageComponent',
  // Platform-admin console — internal super-admin tool, intentionally outside
  // the customer-facing archetype roster. Loaded as a lazy ROUTES array
  // (not a bespoke component), so the regex false-positive is expected.
  'PLATFORM_ADMIN_ROUTES',
]);
const importMatches = [...spa.matchAll(/then\(\s*m\s*=>\s*m\.([A-Z][A-Za-z0-9_]+)\s*\)/g)]
  .map(m => m[1]);
const spaViolations = importMatches.filter(c => !SPA_ALLOWED_COMPONENTS.has(c));
for (const v of spaViolations) {
  findings.push(`SPA_BYPASS     ${v}`);
}

// ── Report ────────────────────────────────────────────────────────────
const failures = nonArchetype + missingBinding + unknownExport + spaViolations.length;
console.log(
  `[template-only-routing] non-archetype=${nonArchetype} ` +
  `no-binding=${missingBinding} unknown-export=${unknownExport} ` +
  `spa-bypass=${spaViolations.length} (loaders=${loaderKeys.size}, routes=${routes.length})`
);
if (findings.length) for (const f of findings) console.log('  ' + f);

if (failures > 0 && ENFORCE) {
  console.error('[template-only-routing] FAIL');
  process.exit(1);
}
console.log('[template-only-routing] ' + (failures === 0 ? 'PASS' : 'WARN (non-enforced)'));
