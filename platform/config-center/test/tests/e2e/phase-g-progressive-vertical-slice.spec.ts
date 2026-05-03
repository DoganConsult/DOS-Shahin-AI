/**
 * Phase G E2E spec C — progressive vertical-slice DoD across 13
 * props-bearing productive routes (mirrors H4 against the customer/
 * productive surfaces shipped in Phase G blocks A+B + tail 0030).
 *
 * For every customer-bound productive route this spec asserts FOUR gates
 * end-to-end against the live ui-os-service resolver:
 *
 *   GATE 1 — Resolver returns HTTP 200 with the expected archetype.
 *   GATE 2 — `template_export` matches the bound LOADERS export
 *            (template-binding.registry.ts).
 *   GATE 3 — `props` contains the archetype's extension key (per
 *            ARCHETYPE_EXTENSIONS in template-binding.routes.ts) AND
 *            holds at least the live minimum-row count.
 *   GATE 4 — Either a sentinel string is found OR (when no sentinel
 *            asserted) at least one row carries the archetype's primary
 *            label/title field. Proves the live DB rows reach the
 *            renderer.
 *
 * Calls the resolver directly via `request.newContext`
 * (LEGACY_HEADER_TRUST=true allows raw `x-user-sub` + `x-tenant-id` as
 * the principal during dev). No browser, no auth bootstrap required.
 *
 * Env:
 *   UI_OS_BASE_URL — defaults to http://localhost:4015
 *   DOS_USER_SUB   — defaults to "phase-g-progressive@grc"
 *   DOS_TENANT_ID  — defaults to "grc"
 */
import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';

interface SliceCase {
  route: string;
  archetype: string;
  templateExport: string;
  /** key in `props` populated by the archetype-extension SELECT */
  propsKey: string;
  /** lower-bound row count expected from current live seeds */
  minRows: number;
  /** field on a row that MUST contain a non-empty string value */
  labelField: string;
}

const CASES: SliceCase[] = [
  { route: '/audit/plan',                  archetype: 'calendar-timeline',    templateExport: 'CalendarTimelineTemplateComponent',  propsKey: 'calendarEvents',         minRows: 4, labelField: 'title_en' },
  { route: '/compliance/calendar',         archetype: 'compliance-calendar',  templateExport: 'ComplianceCalendarTemplateComponent',propsKey: 'calendarEvents',         minRows: 5, labelField: 'title_en' },
  { route: '/compliance/roadmap',          archetype: 'remediation-roadmap',  templateExport: 'RemediationRoadmapTemplateComponent',propsKey: 'roadmapMilestones',      minRows: 5, labelField: 'title_en' },
  { route: '/controls/mapping',            archetype: 'ownership-map',        templateExport: 'OwnershipMapTemplateComponent',      propsKey: 'ownershipEdges',         minRows: 5, labelField: 'entity_label' },
  { route: '/foundation/audit',            archetype: 'audit-trail-ledger',   templateExport: 'AuditTrailLedgerTemplateComponent',  propsKey: 'auditLedgerRows',        minRows: 4, labelField: 'action' },
  { route: '/foundation/business-units',   archetype: 'org-chart',            templateExport: 'OrgChartTemplateComponent',          propsKey: 'orgChartNodes',          minRows: 6, labelField: 'title_en' },
  { route: '/foundation/delegations',      archetype: 'delegation-center',    templateExport: 'DelegationCenterTemplateComponent',  propsKey: 'delegationRules',        minRows: 5, labelField: 'delegator' },
  { route: '/foundation/departments',      archetype: 'org-chart',            templateExport: 'OrgChartTemplateComponent',          propsKey: 'orgChartNodes',          minRows: 6, labelField: 'title_en' },
  { route: '/foundation/organization',     archetype: 'org-chart',            templateExport: 'OrgChartTemplateComponent',          propsKey: 'orgChartNodes',          minRows: 8, labelField: 'title_en' },
  { route: '/foundation/ownership-mapping',archetype: 'ownership-map',        templateExport: 'OwnershipMapTemplateComponent',      propsKey: 'ownershipEdges',         minRows: 6, labelField: 'entity_label' },
  { route: '/foundation/permissions',      archetype: 'ownership-map',        templateExport: 'OwnershipMapTemplateComponent',      propsKey: 'ownershipEdges',         minRows: 6, labelField: 'entity_label' },
  { route: '/foundation/teams',            archetype: 'org-chart',            templateExport: 'OrgChartTemplateComponent',          propsKey: 'orgChartNodes',          minRows: 6, labelField: 'title_en' },
  { route: '/workflow/executions',         archetype: 'workflow-timeline',    templateExport: 'WorkflowTimelineTemplateComponent',  propsKey: 'workflowTimelineSteps',  minRows: 6, labelField: 'label_en' },
];

const BASE = process.env.UI_OS_BASE_URL || 'http://localhost:4015';
const SUB  = process.env.DOS_USER_SUB    || 'phase-g-progressive@grc';
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

test.describe('Phase G E2E spec C — progressive vertical-slice (DB → resolver → bound template)', () => {
  for (const c of CASES) {
    test(`${c.archetype} @ ${c.route}`, async () => {
      const res = await api.get(`/api/ui-os/template-binding?route=${encodeURIComponent(c.route)}`);

      // GATE 1
      expect(res.status(), `resolver must return 200 for ${c.route}`).toBe(200);
      const body = await res.json();
      expect(body.archetype, `archetype mismatch for ${c.route}`).toBe(c.archetype);

      // GATE 2
      expect(body.template_export, `template_export mismatch for ${c.route}`).toBe(c.templateExport);

      // GATE 3
      const rows = body.props?.[c.propsKey];
      expect(Array.isArray(rows), `${c.propsKey} must be an array on ${c.route}`).toBeTruthy();
      expect(rows.length, `${c.propsKey} on ${c.route} must have >= ${c.minRows} rows; got ${rows.length}`)
        .toBeGreaterThanOrEqual(c.minRows);

      // GATE 4 — at least one row carries a non-empty label/title (proves
      // the seed JSON actually reached the renderer).
      const labelled = rows.some((r: Record<string, unknown>) => {
        const v = r[c.labelField];
        return typeof v === 'string' && v.trim().length > 0;
      });
      expect(labelled, `no row on ${c.route} carries a non-empty ${c.labelField}`).toBeTruthy();
    });
  }
});
