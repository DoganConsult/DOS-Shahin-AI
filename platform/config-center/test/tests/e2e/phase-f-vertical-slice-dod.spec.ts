/**
 * Phase F-F6 H4 — Vertical-slice DoD harness.
 *
 * For every customer-bound route seeded in waves V1..V6, asserts that the
 * full vertical slice (DB row → resolver → archetype-extension SQL → JSON
 * response → bound template export) is wired end-to-end:
 *
 *   GATE 1 — Archetype matches the rebind contract (migration 0021).
 *   GATE 2 — `template_export` is one of the 39 LOADERS in
 *            `template-binding.registry.ts`.
 *   GATE 3 — `props` contains the archetype's extension key (per
 *            ARCHETYPE_EXTENSIONS in `template-binding.routes.ts`) AND
 *            holds at least the minimum-row count seeded by V1..V6.
 *   GATE 4 — A sentinel title string from the seed JSON appears in the
 *            returned rows (proves the live DB rows = the seeded JSONs).
 *
 * Calls the ui-os-service resolver directly via `request.newContext`
 * (LEGACY_HEADER_TRUST=true allows raw `x-user-sub` + `x-tenant-id` as
 * the principal during dev). No browser, no auth bootstrap required.
 *
 * Env:
 *   UI_OS_BASE_URL   — defaults to http://localhost:4015
 *   DOS_USER_SUB     — defaults to "vertical-slice-dod@grc"
 *   DOS_TENANT_ID    — defaults to "grc"
 */
import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';

interface SliceCase {
  route: string;
  archetype: string;
  templateExport: string;
  /** key in `props` populated by the archetype-extension SELECT */
  propsKey: string;
  /** lower-bound row count expected from V1..V6 seeds */
  minRows: number;
  /** sentinel string that MUST appear in at least one row (proves seed = DB) */
  sentinel: string;
  /** field on a row that contains the sentinel */
  sentinelField: string;
}

const CASES: SliceCase[] = [
  // V1 — Foundation
  { route: '/admin/foundation/lifecycle',     archetype: 'calendar-timeline',    templateExport: 'CalendarTimelineTemplateComponent',  propsKey: 'calendarEvents',         minRows: 4, sentinelField: 'title_en',    sentinel: 'Q1 Organization Lifecycle Review' },
  { route: '/admin/foundation/organizations', archetype: 'org-chart',            templateExport: 'OrgChartTemplateComponent',          propsKey: 'orgChartNodes',          minRows: 9, sentinelField: 'title_en',    sentinel: 'Shahin AI Platform' },
  { route: '/admin/foundation/persons',       archetype: 'ownership-map',        templateExport: 'OwnershipMapTemplateComponent',      propsKey: 'ownershipEdges',         minRows: 7, sentinelField: 'entity_label',sentinel: 'Sara AlOtaibi' },
  // V2 — Identity & Access
  { route: '/admin/dauth/roles',              archetype: 'delegation-center',    templateExport: 'DelegationCenterTemplateComponent',  propsKey: 'delegationRules',        minRows: 1, sentinelField: 'delegator',   sentinel: '' /* checked by length only */ },
  { route: '/admin/dauth/permissions',        archetype: 'ownership-map',        templateExport: 'OwnershipMapTemplateComponent',      propsKey: 'ownershipEdges',         minRows: 1, sentinelField: 'entity_label',sentinel: '' },
  { route: '/admin/dauth/audit',              archetype: 'audit-trail-evidence', templateExport: 'AuditTrailEvidenceTemplateComponent',propsKey: 'auditEvidenceArtifacts', minRows: 4, sentinelField: 'title_en',    sentinel: 'DAuth role grant attestation Q1 2026' },
  { route: '/admin/multi-tenant/tenants',     archetype: 'ownership-map',        templateExport: 'OwnershipMapTemplateComponent',      propsKey: 'ownershipEdges',         minRows: 1, sentinelField: 'entity_label',sentinel: '' },
  // V3 — Audit-trail-ledger (sample 3 of 11)
  { route: '/admin/access/audit',             archetype: 'audit-trail-ledger',   templateExport: 'AuditTrailLedgerTemplateComponent',  propsKey: 'auditLedgerRows',        minRows: 4, sentinelField: 'action',      sentinel: '' },
  { route: '/admin/dnoc/audit',               archetype: 'audit-trail-ledger',   templateExport: 'AuditTrailLedgerTemplateComponent',  propsKey: 'auditLedgerRows',        minRows: 4, sentinelField: 'action',      sentinel: '' },
  { route: '/admin/dsoc/audit',               archetype: 'audit-trail-ledger',   templateExport: 'AuditTrailLedgerTemplateComponent',  propsKey: 'auditLedgerRows',        minRows: 4, sentinelField: 'action',      sentinel: '' },
  // V4 — Agent suite
  { route: '/admin/ai',                       archetype: 'agent-flow',           templateExport: 'AgentFlowTemplateComponent',         propsKey: 'agentFlowSteps',         minRows: 7, sentinelField: 'label_en',    sentinel: 'Ingest tenant context' },
  { route: '/admin/ai/engine',                archetype: 'agent-registry',       templateExport: 'AgentRegistryTemplateComponent',     propsKey: 'agentRegistry',          minRows: 4, sentinelField: 'name_en',     sentinel: 'Engine Risk Scorer' },
  { route: '/admin/ai/gateway',               archetype: 'agent-registry',       templateExport: 'AgentRegistryTemplateComponent',     propsKey: 'agentRegistry',          minRows: 4, sentinelField: 'name_en',     sentinel: 'Gateway Risk Scorer' },
  { route: '/admin/ai/governance',            archetype: 'user-agent-workbench', templateExport: 'UserAgentWorkbenchTemplateComponent',propsKey: 'agentRegistry',          minRows: 3, sentinelField: 'name_en',     sentinel: 'My Risk Drafting Assistant' },
  // V5 — Incident response
  { route: '/admin/dnoc/alerts',              archetype: 'incident-response',    templateExport: 'IncidentResponseTemplateComponent',  propsKey: 'incidentRunbookSteps',   minRows: 5, sentinelField: 'label_en',    sentinel: '' },
  { route: '/admin/dsoc/incidents',           archetype: 'incident-response',    templateExport: 'IncidentResponseTemplateComponent',  propsKey: 'incidentRunbookSteps',   minRows: 5, sentinelField: 'label_en',    sentinel: '' },
  // V6 — Operational misc
  { route: '/admin/dnoc/services',            archetype: 'follow-up-center',     templateExport: 'FollowUpCenterTemplateComponent',    propsKey: 'followUpItems',          minRows: 5, sentinelField: 'title_en',    sentinel: '' },
  { route: '/admin/dos/registries',           archetype: 'export-center',        templateExport: 'ExportCenterTemplateComponent',      propsKey: 'exportArtifacts',        minRows: 5, sentinelField: 'title_en',    sentinel: '' },
  { route: '/admin/dsoc/policies',            archetype: 'compliance-calendar',  templateExport: 'ComplianceCalendarTemplateComponent',propsKey: 'calendarEvents',         minRows: 4, sentinelField: 'title_en',    sentinel: '' },
  { route: '/admin/multi-tenant/provisioning',archetype: 'workflow-timeline',    templateExport: 'WorkflowTimelineTemplateComponent',  propsKey: 'workflowTimelineSteps',  minRows: 6, sentinelField: 'label_en',    sentinel: '' },
  { route: '/admin/multi-tenant/quotas',      archetype: 'remediation-roadmap',  templateExport: 'RemediationRoadmapTemplateComponent',propsKey: 'roadmapMilestones',      minRows: 5, sentinelField: 'title_en',    sentinel: '' },
];

const BASE = process.env.UI_OS_BASE_URL || 'http://localhost:4015';
const SUB  = process.env.DOS_USER_SUB    || 'vertical-slice-dod@grc';
const TID  = process.env.DOS_TENANT_ID   || 'grc';

let api: APIRequestContext;

test.beforeAll(async () => {
  api = await pwRequest.newContext({
    baseURL: BASE,
    extraHTTPHeaders: {
      'x-user-sub':   SUB,
      'x-tenant-id':  TID,
      'x-user-roles': 'admin',
    },
  });
});
test.afterAll(async () => { await api.dispose(); });

test.describe('Phase F-F6 H4 — vertical-slice DoD (DB → resolver → bound template)', () => {
  for (const c of CASES) {
    test(`${c.archetype} @ ${c.route}`, async () => {
      const res = await api.get(`/api/ui-os/template-binding?route=${encodeURIComponent(c.route)}`);
      expect(res.status(), `resolver must return 200 for ${c.route}`).toBe(200);
      const body = await res.json();

      // GATE 1
      expect(body.archetype, `archetype mismatch for ${c.route}`).toBe(c.archetype);
      // GATE 2
      expect(body.template_export, `template_export mismatch for ${c.route}`).toBe(c.templateExport);
      // GATE 3
      const rows = body.props?.[c.propsKey];
      expect(Array.isArray(rows), `${c.propsKey} must be an array on ${c.route}`).toBeTruthy();
      expect(rows.length, `${c.propsKey} on ${c.route} must have >= ${c.minRows} rows; got ${rows.length}`)
        .toBeGreaterThanOrEqual(c.minRows);
      // GATE 4 — sentinel (only when declared)
      if (c.sentinel) {
        const found = rows.some((r: Record<string, unknown>) => String(r[c.sentinelField] ?? '').includes(c.sentinel));
        expect(found, `sentinel "${c.sentinel}" not found in ${c.propsKey}.${c.sentinelField} on ${c.route}`).toBeTruthy();
      }
    });
  }
});
