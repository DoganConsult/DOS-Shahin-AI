// Phase F template-binding router.
//
//   GET /template-binding?route=/admin/dauth/users
//     → { route, archetype, template_export, props, version, _layers }
//     200 with `null`-template when no binding row exists (caller falls back
//     to component-map default archetype).
//
//   GET /template-binding/all
//     → [{ route, archetype, template_export, version }] — bulk fetch used
//        by the Shahin SPA bootstrap to warm a client-side cache.
//
//   GET /export?scope=tenant[&tenant_id=...] — Phase F-F9 export endpoint:
//     emits the merged effective binding for every route as a single JSON
//     bundle, suitable for snapshotting a tenant's UI configuration.
//
// Phase F-F9 — multi-layer Dynamic-UI override architecture.
// The resolved payload is a deep-merge of (broader → narrower):
//   1. workspace shell defaults (handled by workspace-shell.routes.ts)
//   2. PRODUCT  dos.ui_override_product[product_code]
//   3. MODULE   dos.ui_override_module[module_code]
//   4. ROUTE    dos.ui_route_template_binding.props (+ shaped row tables)
//   5. TENANT   dos.ui_override_tenant[(tenant_id, '*')]
//               then dos.ui_override_tenant[(tenant_id, route)]
//   6. USER     dos.ui_override_user[(user_id, '*')]
//               then dos.ui_override_user[(user_id, route)]
// Object keys are merged recursively; arrays REPLACE in full (see deepMerge).
//
// Caller context is read from:
//   - product_code:  req.headers['x-product-code']  (default 'shahin-ai')
//   - module_code:   derived from route prefix (deriveModuleCode below)
//   - tenant_id:     req.principal.tenantId  (gateway-origin middleware)
//   - user_id:       req.principal.sub        (gateway-origin middleware)
//
// Wired via services/ui-os-service/src/routes/index.ts.

import { Router, type Request } from 'express';
import type { DbPool } from '../db.js';

// ─── Phase F-F9 deep-merge ─────────────────────────────────────────────
// Recursively merges plain objects. Arrays REPLACE entirely (no concat,
// no element-wise merge) — the only documented exception so layer rules
// are predictable.
function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
    && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
}
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!source || !isPlainObject(source)) return target;
  for (const [k, v] of Object.entries(source)) {
    const cur = target[k];
    if (isPlainObject(v) && isPlainObject(cur)) {
      target[k] = deepMerge({ ...cur }, v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

// Dynamic route→module resolution. No hardcoded module names.
// Falls back to first non-empty path segment (e.g. /risk/... → 'risk').
// The DB table dos.dynamic_ui_modules.default_route can override this
// for modules whose route prefix ≠ module_code.
let _moduleRouteCache: Map<string, string> | null = null;
async function warmModuleRouteCache(pool: DbPool): Promise<void> {
  try {
    const { rows } = await pool.query<{ module_code: string; default_route: string }>(
      `SELECT module_code, default_route FROM dos.dynamic_ui_modules WHERE default_route IS NOT NULL`,
    );
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.default_route.replace(/\/$/, ''), r.module_code);
    _moduleRouteCache = m;
  } catch { _moduleRouteCache = new Map(); }
}
function deriveModuleCode(route: string): string {
  // Check DB-driven cache first.
  if (_moduleRouteCache) {
    for (const [prefix, code] of _moduleRouteCache) {
      if (route === prefix || route.startsWith(prefix + '/')) return code;
    }
  }
  // Fallback: first path segment = module_code.
  const seg = route.replace(/^\/+/, '').split('/')[0];
  return seg || '';
}

function readProductCode(req: Request): string {
  const h = req.headers['x-product-code'];
  if (typeof h === 'string' && h.trim()) return h.trim();
  return 'shahin-ai';
}

type Principal = { sub?: string; tenantId?: string } | undefined;
function readPrincipal(req: Request): { tenantId: string; userId: string } {
  const p = (req as unknown as { principal?: Principal }).principal;
  return {
    tenantId: typeof p?.tenantId === 'string' ? p.tenantId : '',
    userId:   typeof p?.sub      === 'string' ? p.sub      : '',
  };
}

interface TemplateBinding {
  route: string;
  archetype: string;
  template_export: string;
  permission_key?: string | null;
  props: Record<string, unknown>;
  version: number;
}

interface LayerPatch {
  patch: Record<string, unknown> | null;
  version: number;
}
interface OverrideLayers {
  product: LayerPatch | null;
  module:  LayerPatch | null;
  tenantWildcard: LayerPatch | null;
  tenantRoute:    LayerPatch | null;
  userWildcard:   LayerPatch | null;
  userRoute:      LayerPatch | null;
}

// Phase 1 — per-sub-query error envelope. Surfaced on the response as
// `_errors: [{ stage, code }]`. Reserved 500 only for pool/connection
// failures; sub-query failures degrade gracefully (the layer becomes
// null and the route still resolves).
export interface SubQueryError { stage: string; code: string }

async function safeQuery<T>(
  stage: string,
  errors: SubQueryError[],
  fn: () => Promise<{ rows: T[] }>,
): Promise<{ rows: T[] }> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error('[template-binding] sub-query failed', { stage, err: msg });
    errors.push({ stage, code: 'SUBQUERY_FAILED' });
    return { rows: [] };
  }
}

async function loadOverrideLayers(
  pool: DbPool,
  route: string,
  productCode: string,
  moduleCode: string,
  tenantId: string,
  userId: string,
  errors: SubQueryError[],
): Promise<OverrideLayers> {
  const [prod, mod, tenW, tenR, usrW, usrR] = await Promise.all([
    productCode
      ? safeQuery<LayerPatch>('override.product', errors, () =>
          pool.query<LayerPatch>(`SELECT patch, version FROM dos.ui_override_product WHERE product_code=$1`, [productCode]))
      : Promise.resolve({ rows: [] as LayerPatch[] }),
    moduleCode
      ? safeQuery<LayerPatch>('override.module', errors, () =>
          pool.query<LayerPatch>(`SELECT patch, version FROM dos.ui_override_module WHERE module_code=$1`, [moduleCode]))
      : Promise.resolve({ rows: [] as LayerPatch[] }),
    tenantId
      ? safeQuery<LayerPatch>('override.tenantWildcard', errors, () =>
          pool.query<LayerPatch>(`SELECT patch, version FROM dos.ui_override_tenant WHERE tenant_id=$1 AND route='*'`, [tenantId]))
      : Promise.resolve({ rows: [] as LayerPatch[] }),
    tenantId
      ? safeQuery<LayerPatch>('override.tenantRoute', errors, () =>
          pool.query<LayerPatch>(`SELECT patch, version FROM dos.ui_override_tenant WHERE tenant_id=$1 AND route=$2`, [tenantId, route]))
      : Promise.resolve({ rows: [] as LayerPatch[] }),
    userId
      ? safeQuery<LayerPatch>('override.userWildcard', errors, () =>
          pool.query<LayerPatch>(`SELECT patch, version FROM dos.ui_override_user WHERE user_id=$1 AND route='*'`, [userId]))
      : Promise.resolve({ rows: [] as LayerPatch[] }),
    userId
      ? safeQuery<LayerPatch>('override.userRoute', errors, () =>
          pool.query<LayerPatch>(`SELECT patch, version FROM dos.ui_override_user WHERE user_id=$1 AND route=$2`, [userId, route]))
      : Promise.resolve({ rows: [] as LayerPatch[] }),
  ]);
  const pick = (r: { rows: LayerPatch[] }): LayerPatch | null =>
    r.rows[0] ? { patch: (r.rows[0].patch ?? {}) as Record<string, unknown>, version: r.rows[0].version } : null;
  return {
    product:        pick(prod),
    module:         pick(mod),
    tenantWildcard: pick(tenW),
    tenantRoute:    pick(tenR),
    userWildcard:   pick(usrW),
    userRoute:      pick(usrR),
  };
}

// Per-archetype extension table map. Loaded lazily — only the queries
// relevant to the bound archetype run, keeping resolver latency flat.
// Mirrors `platform/dos/migrations/public/20260503_0020_phase_f_archetype_props_tables.sql`.
const ARCHETYPE_EXTENSIONS: Record<string, Array<{ key: string; sql: string }>> = {
  'calendar-timeline': [{
    key: 'calendarEvents',
    sql: `SELECT event_id, sort_order, title_en, title_ar, category, starts_at, ends_at, status, severity, link
            FROM dos.ui_route_calendar_event WHERE route=$1 ORDER BY starts_at, sort_order`,
  }],
  'compliance-calendar': [{
    key: 'calendarEvents',
    sql: `SELECT event_id, sort_order, title_en, title_ar, category, starts_at, ends_at, status, severity, link
            FROM dos.ui_route_calendar_event WHERE route=$1 ORDER BY starts_at, sort_order`,
  }],
  'remediation-roadmap': [{
    key: 'roadmapMilestones',
    sql: `SELECT milestone_id, sort_order, title_en, title_ar, description, target_date, progress, status, owner
            FROM dos.ui_route_roadmap_milestone WHERE route=$1 ORDER BY sort_order`,
  }],
  'org-chart': [{
    key: 'orgChartNodes',
    sql: `SELECT node_id, parent_id, sort_order, title_en, title_ar, role, owner, badge
            FROM dos.ui_route_org_chart_node WHERE route=$1 ORDER BY sort_order`,
  }],
  'ownership-map': [{
    key: 'ownershipEdges',
    sql: `SELECT edge_id, sort_order, entity_id, entity_label, owner, ownership_role, effective_from, effective_to
            FROM dos.ui_route_ownership_edge WHERE route=$1 ORDER BY sort_order`,
  },
  {
    key: 'identityGraphNodes',
    sql: `SELECT
            node_id AS id,
            sort_order AS "sortOrder",
            label_en,
            label_ar,
            node_type AS "nodeType",
            owner,
            risk_level AS "riskLevel",
            metadata
            FROM dos.ui_route_identity_graph_node WHERE route=$1 ORDER BY sort_order`,
  },
  {
    key: 'identityGraphEdges',
    sql: `SELECT
            edge_id AS id,
            sort_order AS "sortOrder",
            source_node AS "sourceNode",
            target_node AS "targetNode",
            relation,
            confidence,
            metadata
            FROM dos.ui_route_identity_graph_edge WHERE route=$1 ORDER BY sort_order`,
  },
  {
    key: 'policySimulationScenarios',
    sql: `SELECT
            scenario_id AS id,
            sort_order AS "sortOrder",
            title_en,
            title_ar,
            assumption_json AS assumptions,
            impact_json AS impacts,
            recommended_action AS "recommendedAction",
            status
            FROM dos.ui_route_policy_simulation_scenario WHERE route=$1 ORDER BY sort_order`,
  },
  {
    key: 'aiExplainabilityBlocks',
    sql: `SELECT
            block_id AS id,
            sort_order AS "sortOrder",
            title_en,
            title_ar,
            rationale_en,
            rationale_ar,
            confidence,
            status,
            action_json AS action
            FROM dos.ui_route_ai_explainability_block WHERE route=$1 ORDER BY sort_order`,
  }],
  'delegation-center': [{
    key: 'delegationRules',
    sql: `SELECT
            rule_id AS id,
            sort_order AS "sortOrder",
            delegator,
            delegate,
            scope,
            permission,
            starts_at AS "startsAt",
            ends_at AS "expiresAt",
            status,
            risk_level AS "riskLevel",
            risk_score AS "riskScore",
            escalation_required AS "escalationRequired",
            escalation_target AS "escalationTarget",
            escalation_due_at AS "escalationDueAt",
            escalation_reason AS "escalationReason"
            FROM dos.ui_route_delegation_rule WHERE route=$1 ORDER BY sort_order`,
  }],
  'agent-registry': [{
    key: 'agentRegistry',
    sql: `SELECT agent_id, sort_order, name_en, name_ar, agent_type, capability, status, owner, ai_model
            FROM dos.ui_route_agent_registry WHERE route=$1 ORDER BY sort_order`,
  }],
  'user-agent-workbench': [{
    key: 'agentRegistry',
    sql: `SELECT agent_id, sort_order, name_en, name_ar, agent_type, capability, status, owner, ai_model
            FROM dos.ui_route_agent_registry WHERE route=$1 ORDER BY sort_order`,
  }],
  'agent-flow': [{
    key: 'agentFlowSteps',
    sql: `SELECT step_id, sort_order, label_en, label_ar, step_type, agent_id, status, evidence_uri
            FROM dos.ui_route_agent_flow_step WHERE route=$1 ORDER BY sort_order`,
  }],
  'incident-response': [
    {
      key: 'incidentRunbookSteps',
      sql: `SELECT step_id, sort_order, label_en, label_ar, phase, owner, due_at, status, evidence_uri
              FROM dos.ui_route_incident_runbook_step WHERE route=$1 ORDER BY sort_order`,
    },
    {
      key: 'incidentCommunications',
      sql: `SELECT comm_id, sort_order, channel, audience, sent_at, message_en, message_ar
              FROM dos.ui_route_incident_communication WHERE route=$1 ORDER BY sent_at, sort_order`,
    },
  ],
  'audit-trail-ledger': [{
    key: 'auditLedgerRows',
    sql: `SELECT ledger_id, sort_order, occurred_at, actor, action, entity_type, entity_id, prev_hash, hash, decision_ref
            FROM dos.ui_route_audit_ledger_row WHERE route=$1 ORDER BY occurred_at, sort_order`,
  }],
  'audit-trail-evidence': [{
    key: 'auditEvidenceArtifacts',
    sql: `SELECT artifact_id, sort_order, title_en, title_ar, artifact_type, hash, collected_at, collected_by, download_url
            FROM dos.ui_route_audit_evidence_artifact WHERE route=$1 ORDER BY sort_order`,
  }],
  'follow-up-center': [{
    key: 'followUpItems',
    sql: `SELECT item_id, sort_order, title_en, title_ar, origin_ref, owner, due_at, status, severity, ai_score
            FROM dos.ui_route_follow_up_item WHERE route=$1 ORDER BY sort_order`,
  }],
  'export-center': [{
    key: 'exportArtifacts',
    sql: `SELECT artifact_id, sort_order, title_en, title_ar, format, status, size_kb, download_url, generated_at
            FROM dos.ui_route_export_artifact WHERE route=$1 ORDER BY sort_order`,
  }],
  'workflow-timeline': [{
    key: 'workflowTimelineSteps',
    sql: `SELECT step_id, sort_order, label_en, label_ar, state, description, occurred_at, actor
            FROM dos.ui_route_workflow_timeline_step WHERE route=$1 ORDER BY sort_order`,
  }],
  'case-finalization': [{
    key: 'cases',
    sql: `SELECT case_id, sort_order, title_en, title_ar, case_type, origin_ref, decision, decision_owner, decision_at, signoff_status, evidence_uri, rationale_en, rationale_ar, next_review_at, status
            FROM dos.ui_route_case_finalization WHERE route=$1 ORDER BY sort_order`,
  }],

  // ─── Phase F-F8 — extension tables for the remaining 12 archetypes ──
  'decision-dashboard': [
    { key: 'urgentItems',     sql: `SELECT item_id AS id, sort_order, label_en, label_ar, owner, severity, due_at, link, status FROM dos.ui_route_decision_item WHERE route=$1 AND kind='urgent'   ORDER BY sort_order` },
    { key: 'blockedItems',    sql: `SELECT item_id AS id, sort_order, label_en, label_ar, owner, severity, due_at, link, status FROM dos.ui_route_decision_item WHERE route=$1 AND kind='blocked'  ORDER BY sort_order` },
    { key: 'recentActivity',  sql: `SELECT item_id AS id, sort_order, label_en, label_ar, owner, severity, due_at, link, status FROM dos.ui_route_decision_item WHERE route=$1 AND kind='activity' ORDER BY sort_order` },
  ],
  'posture-overview': [
    { key: 'scoreKpis',       sql: `SELECT score_id AS id, sort_order, label_en, label_ar, value, max_value, severity, status FROM dos.ui_route_posture_score WHERE route=$1 AND kind='score'    ORDER BY sort_order` },
    { key: 'maturityDomains', sql: `SELECT score_id AS id, sort_order, label_en, label_ar, value, max_value, severity, status FROM dos.ui_route_posture_score WHERE route=$1 AND kind='maturity' ORDER BY sort_order` },
    { key: 'topGaps',         sql: `SELECT score_id AS id, sort_order, label_en, label_ar, value, severity FROM dos.ui_route_posture_score WHERE route=$1 AND kind='gap'      ORDER BY sort_order` },
  ],
  'trend-intelligence': [
    { key: 'trendSeries',     sql: `SELECT series_id AS id, sort_order, name_en, name_ar, color, points FROM dos.ui_route_trend_series WHERE route=$1 ORDER BY sort_order` },
    { key: 'aiInsights',      sql: `SELECT insight_id AS id, sort_order, text_en, text_ar, severity, action FROM dos.ui_route_ai_insight WHERE route=$1 ORDER BY sort_order` },
  ],
  'intelligent-register': [
    { key: 'rows',            sql: `SELECT row_id AS id, sort_order, payload, severity, status FROM dos.ui_route_record_row WHERE route=$1 ORDER BY sort_order` },
  ],
  'risk-landscape': [
    { key: 'cells',           sql: `SELECT cell_id AS id, x, y, count, severity, label_en, label_ar FROM dos.ui_route_heatmap_cell WHERE route=$1 ORDER BY y, x` },
    { key: 'topItems',        sql: `SELECT item_id AS id, sort_order, title_en, title_ar, severity, link FROM dos.ui_route_heatmap_top_item WHERE route=$1 ORDER BY sort_order` },
  ],
  'record-story': [
    { key: 'keyFields',       sql: `SELECT field_id AS id, sort_order, label_en, label_ar, value, kind FROM dos.ui_route_record_field WHERE route=$1 ORDER BY sort_order` },
    { key: 'timeline',        sql: `SELECT event_id AS id, sort_order, occurred_at, label_en, label_ar, actor, kind, link FROM dos.ui_route_record_timeline_event WHERE route=$1 ORDER BY occurred_at, sort_order` },
  ],
  'guided-create': [
    { key: 'steps',           sql: `SELECT step_id AS id, sort_order, label_en, label_ar, fields, completed, ai_prefilled FROM dos.ui_route_form_step WHERE route=$1 ORDER BY sort_order` },
  ],
  'action-queue': [
    { key: 'tasks',           sql: `SELECT task_id AS id, sort_order, title_en, title_ar, owner, due_at, severity, status, link, ai_score FROM dos.ui_route_work_task WHERE route=$1 ORDER BY sort_order` },
  ],
  'workflow-control': [
    { key: 'progressSteps',   sql: `SELECT step_id AS id, sort_order, label_en, label_ar, state, description, occurred_at, actor FROM dos.ui_route_workflow_timeline_step WHERE route=$1 ORDER BY sort_order` },
  ],
  'audit-trail': [
    { key: 'events',          sql: `SELECT event_id AS id, sort_order, occurred_at, actor, action, source, target, severity, description_en, description_ar FROM dos.ui_route_audit_event WHERE route=$1 ORDER BY occurred_at, sort_order` },
  ],
  'ai-advisor': [
    { key: 'recommendations', sql: `SELECT recommendation_id AS id, sort_order, kind, title_en, title_ar, body_en, body_ar, confidence, action_route, action_label_en, action_label_ar FROM dos.ui_route_ai_recommendation WHERE route=$1 ORDER BY sort_order` },
  ],
  'activation-journey': [
    { key: 'steps',           sql: `SELECT step_id AS id, sort_order, label_en, label_ar, description_en, description_ar, status, link FROM dos.ui_route_activation_step WHERE route=$1 ORDER BY sort_order` },
  ],
};

// ─── Workspace-home enrichment (DEFERRED) ─────────────────────────────
// The previous wave attempted to materialize real per-tenant nbaActions
// + KPIs for /workspace-home from tenant_product_activation ∪
// tenant_module_entitlements joined to ui_module_nav_item. That output
// was rejected because the workspace-home contract is not yet approved
// — emitting any masthead/KPI strip on a non-canonical landing surface
// creates a starter/demo experience that the doctrine forbids.
//
// The function below is retained as a reference implementation for the
// future canonical contract. It is NOT invoked from the resolver path.
// The /workspace-home binding row is deleted (migration 0550) so the
// resolver returns 404 and the SPA renders DosEmptyStateComponent.
//
// (Original docstring preserved below.)
//
// `/workspace-home` is the single landing route every authenticated user
// hits. Its template-binding row is intentionally empty (no demo content
// per Dynamic-UI doctrine), so we materialize real per-tenant content
// here from the same entitlement source that tenant-service /permissions
// uses, joined to ui_module_nav_item for the routes.
//
// Returned shape (deep-merged into props by caller):
//   {
//     kpis: [{ label, value, status, link? }],
//     nbaActions: [{ label, route, actionKey, severity? }],
//     notification?: { type, title, subtitle }   // when no entitled modules
//   }
//
// Empty-state strings come from dos.workspace_shell_i18n
// (publisher-owned). Module display names come from dos.module_registry;
// nav routes come from the smallest sort_order ui_module_nav_item per
// module. Foundation is included unconditionally (platform DNA).
// Removed: legacy reference loader for the deleted landing template
// binding. Landing route + content are now resolved exclusively from
// dos.tenant_landing_config + dos.workspace_shell_i18n via
// services/ui-os-service/src/routes/workspace-shell.routes.ts. Frontend
// renders empty/no-op when DB rows are absent (NO FRONTEND INVENTION).

async function loadProps(
  pool: DbPool,
  route: string,
  archetype: string | null | undefined,
  locale: 'en' | 'ar',
  errors: SubQueryError[],
): Promise<Record<string, unknown>> {
  const [kpis, cols, tabs, nbas, sections, reports, groups, axes, filters, tableActions] = await Promise.all([
    safeQuery('props.kpi', errors, () => pool.query(
      `SELECT sort_order, label_en, label_ar, source_path, format, ai_insight, status, link
         FROM dos.ui_route_kpi WHERE route=$1 ORDER BY sort_order`, [route])),
    safeQuery('props.column', errors, () => pool.query(
      `SELECT sort_order, field_key, label_en, label_ar, type, sortable
         FROM dos.ui_route_column WHERE route=$1 ORDER BY sort_order`, [route])),
    safeQuery('props.tab', errors, () => pool.query(
      `SELECT tab_id, sort_order, label_en, label_ar, permission
         FROM dos.ui_route_tab WHERE route=$1 ORDER BY sort_order`, [route])),
    safeQuery('props.nba', errors, () => pool.query(
      `SELECT sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity
         FROM dos.ui_route_nba WHERE route=$1 ORDER BY sort_order`, [route])),
    safeQuery('props.settingSection', errors, () => pool.query(
      `SELECT section_id, sort_order, label_en, label_ar, icon
         FROM dos.ui_route_setting_section WHERE route=$1 ORDER BY sort_order`, [route])),
    safeQuery('props.reportCard', errors, () => pool.query(
      `SELECT report_id, sort_order, title_en, title_ar, description, status, tag, ai_generated, download_url
         FROM dos.ui_route_report_card WHERE route=$1 ORDER BY sort_order`, [route])),
    safeQuery('props.workqueueGroup', errors, () => pool.query(
      `SELECT group_id, sort_order, label_en, label_ar, urgency, filter_expr
         FROM dos.ui_route_workqueue_group WHERE route=$1 ORDER BY sort_order`, [route])),
    safeQuery('props.heatmapAxis', errors, () => pool.query(
      `SELECT axis, sort_order, label_en, label_ar, bucket_key
         FROM dos.ui_route_heatmap_axis WHERE route=$1 ORDER BY axis, sort_order`, [route])),
    safeQuery('props.filter', errors, () => pool.query(
      `SELECT
          filter_id AS "filterId",
          sort_order AS "sortOrder",
          label_en AS "labelEn",
          label_ar AS "labelAr",
          field_key AS "fieldKey",
          operator,
          control,
          options_json AS options,
          default_value AS "defaultValue",
          permission
         FROM dos.ui_route_filter
        WHERE route=$1
        ORDER BY sort_order`, [route])),
    safeQuery('props.tableAction', errors, () => pool.query(
      `SELECT
          action_id AS "actionId",
          scope,
          sort_order AS "sortOrder",
          label_en AS "labelEn",
          label_ar AS "labelAr",
          action_json AS action,
          permission,
          emphasis
         FROM dos.ui_route_table_action
        WHERE route=$1
        ORDER BY sort_order`, [route])),
  ]);
  // Only emit a key when the dedicated table has rows. Empty arrays are
  // omitted so they don't clobber pre-shaped arrays already stored in
  // `dos.ui_route_template_binding.props` (which is the source of truth
  // for routes that ship their KPI/NBA/tab payloads inline). Caller spread
  // order is `{ ...row.props, ...dynamicProps }` so any non-empty value
  // here intentionally overrides the stored one — that's how the
  // shaped-table path remains authoritative when it is populated.
  const base: Record<string, unknown> = {};
  if (kpis.rows.length)     base['kpis']             = kpis.rows;
  if (cols.rows.length)     base['columns']          = cols.rows;
  if (tabs.rows.length)     base['tabs']             = tabs.rows;
  if (nbas.rows.length)     base['nextBestActions']  = nbas.rows;
  if (sections.rows.length) base['settingsSections'] = sections.rows;
  if (reports.rows.length)  base['reportCards']      = reports.rows;
  if (groups.rows.length)   base['workqueueGroups']  = groups.rows;
  if (axes.rows.length)     base['heatmapAxes']      = axes.rows;
  if (filters.rows.length)  base['filters']          = filters.rows;
  if (tableActions.rows.length) {
    const actions = tableActions.rows as Array<Record<string, unknown>>;
    const byScope = (scope: string) => actions.filter((row) => row['scope'] === scope);
    const toolbarActions = byScope('toolbar');
    const rowActions = byScope('row');
    const batchActions = byScope('batch');
    if (toolbarActions.length) base['toolbarActions'] = toolbarActions;
    if (rowActions.length) base['rowActions'] = rowActions;
    if (batchActions.length) base['batchActions'] = batchActions;
  }
  const ext = archetype ? ARCHETYPE_EXTENSIONS[archetype] : undefined;
  if (ext && ext.length) {
    const results = await Promise.all(
      ext.map(e => safeQuery(`props.ext.${archetype}.${e.key}`, errors, () => pool.query(e.sql, [route]))),
    );
    ext.forEach((e, i) => {
      if (!results[i].rows.length) return;
      const rows = results[i].rows as Array<Record<string, unknown>>;
      const pick = (row: Record<string, unknown>, enKey: string, arKey: string): string =>
        String(locale === 'ar'
          ? (row[arKey] ?? row[enKey] ?? '')
          : (row[enKey] ?? row[arKey] ?? ''));
      const label = (row: Record<string, unknown>, enKey: string, arKey: string) => {
        const text = pick(row, enKey, arKey);
        return { label: text, fallback: text };
      };
      if (e.key === 'workflowTimelineSteps') {
        base[e.key] = rows.map((row) => ({
          ...row,
          label: pick(row, 'label_en', 'label_ar'),
        }));
        return;
      }
      if (e.key === 'exportArtifacts') {
        base[e.key] = rows.map((row) => ({
          ...row,
          title: pick(row, 'title_en', 'title_ar'),
        }));
        return;
      }
      if (e.key === 'identityGraphNodes') {
        base[e.key] = rows.map((row) => ({
          ...row,
          label: label(row, 'label_en', 'label_ar'),
        }));
        return;
      }
      if (e.key === 'policySimulationScenarios') {
        base[e.key] = rows.map((row) => ({
          ...row,
          title: label(row, 'title_en', 'title_ar'),
        }));
        return;
      }
      if (e.key === 'aiExplainabilityBlocks') {
        base[e.key] = rows.map((row) => ({
          ...row,
          title: label(row, 'title_en', 'title_ar'),
          rationale: label(row, 'rationale_en', 'rationale_ar'),
        }));
        return;
      }
      base[e.key] = rows;
    });
  }
  return base;
}

export function createTemplateBindingRouter(pool: DbPool): Router {
  const router = Router();
  // Warm the route→module cache from DB at startup (async, non-blocking).
  warmModuleRouteCache(pool);

  router.get('/template-binding/all', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT b.route, b.archetype, b.template_export, b.version,
                (
                  SELECT r.permission_key
                    FROM dos.dynamic_ui_routes r
                   WHERE r.path_pattern = b.route
                     AND r.tenant_id IS NULL
                   ORDER BY r.sort_order NULLS LAST, r.id
                   LIMIT 1
                ) AS permission_key
           FROM dos.ui_route_template_binding b
           ORDER BY route`,
      );
      res.json({ bindings: rows });
    } catch (e) {
      res.status(500).json({ error: 'template_binding_fetch_failed', detail: String(e) });
    }
  });

  router.get('/template-binding', async (req, res) => {
    const route = String(req.query.route ?? '');
    if (!route) return res.status(400).json({ error: 'route_required' });
    const locale = String(req.query.locale ?? req.headers['accept-language'] ?? 'en')
      .toLowerCase().startsWith('ar') ? 'ar' : 'en';
    const productCode = readProductCode(req);
    const moduleCode  = deriveModuleCode(route);
    const { tenantId, userId } = readPrincipal(req);
    const errors: SubQueryError[] = [];
    let rows: unknown[] = [];
    try {
      const r = await pool.query(
        `SELECT route, archetype, template_export, props, version,
                title_en, title_ar, subtitle_en, subtitle_ar,
                eyebrow_en, eyebrow_ar, ai_headline_en, ai_headline_ar,
                status_tags, primary_action
           FROM dos.ui_route_template_binding WHERE route=$1`,
        [route],
      );
      rows = r.rows;
    } catch (e) {
      // Pool / connection-class failure — typed 503, never opaque 500.
      // eslint-disable-next-line no-console
      console.error('[template-binding] base SELECT failed', { route, err: String(e) });
      return res.status(503).json({
        error: 'TEMPLATE_BINDING_DB_UNAVAILABLE',
        stage: 'binding.select',
        route,
      });
    }
    try {
      if (rows.length === 0) {
        // Dynamic-UI contract: no row → typed 404, never silently 200
        // a null binding (which made the SPA chase /workspace-home, /,
        // and other unbound routes via the catch-all forever).
        return res.status(404).json({ error: 'TEMPLATE_BINDING_NOT_FOUND', route });
      }
      const row = rows[0] as TemplateBinding & {
        permission_key?: string | null;
        title_en?: string; title_ar?: string;
        subtitle_en?: string; subtitle_ar?: string;
        eyebrow_en?: string; eyebrow_ar?: string;
        ai_headline_en?: string; ai_headline_ar?: string;
        status_tags?: unknown; primary_action?: unknown;
      };
      // Workspace-home enrichment was deferred — until a real
      // workspace-home contract is approved + published, the binding
      // row is intentionally absent (deleted by migration 0550) and
      // this resolver returns 404 above. Do not synthesize starter
      // KPIs/nbaActions on the FE's behalf.
      const [dynamicProps, layers] = await Promise.all([
        loadProps(pool, route, row.archetype, locale, errors),
        loadOverrideLayers(pool, route, productCode, moduleCode, tenantId, userId, errors),
      ]);
      // Phase F-F7-2 — derive `masthead` object the host reads.
      const pickStr = (en?: string, ar?: string) =>
        (locale === 'ar' ? (ar ?? en) : (en ?? ar)) ?? undefined;
      const masthead = {
        title:         pickStr(row.title_en, row.title_ar),
        subtitle:      pickStr(row.subtitle_en, row.subtitle_ar),
        eyebrow:       pickStr(row.eyebrow_en, row.eyebrow_ar),
        aiHeadline:    pickStr(row.ai_headline_en, row.ai_headline_ar),
        statusTags:    row.status_tags ?? [],
        primaryAction: row.primary_action ?? null,
      };

      // Phase F-F9 — deep-merge layers in order broader → narrower.
      // Route layer = (row.props + dynamicProps + masthead) flattened.
      let merged: Record<string, unknown> = {};
      deepMerge(merged, layers.product?.patch ?? null);
      deepMerge(merged, layers.module?.patch  ?? null);
      deepMerge(merged, (row.props ?? {}) as Record<string, unknown>);
      deepMerge(merged, dynamicProps);
      deepMerge(merged, layers.tenantWildcard?.patch ?? null);
      deepMerge(merged, layers.tenantRoute?.patch    ?? null);
      deepMerge(merged, layers.userWildcard?.patch   ?? null);
      deepMerge(merged, layers.userRoute?.patch      ?? null);
      // Masthead is computed last so column-driven i18n always wins; tenant
      // and user layers can still override individual masthead.* fields by
      // emitting `{ "masthead": { "title": "..." } }` in their patch.
      merged = deepMerge({ masthead }, merged);

      res.json({
        route: row.route,
        archetype: row.archetype,
        template_export: row.template_export,
        permission_key: row.permission_key ?? null,
        version: row.version,
        props: merged,
        // Diagnostic — opt-in. Lets the SPA / debugger see which layers
        // contributed without needing to query the DB. Safe to ship in
        // prod; contains versions only, never the raw patch JSON.
        _layers: {
          product:        layers.product        ? { product_code: productCode, version: layers.product.version }        : null,
          module:         layers.module         ? { module_code:  moduleCode,  version: layers.module.version }         : null,
          route:          { version: row.version },
          tenantWildcard: layers.tenantWildcard ? { tenant_id: tenantId, version: layers.tenantWildcard.version } : null,
          tenantRoute:    layers.tenantRoute    ? { tenant_id: tenantId, version: layers.tenantRoute.version }    : null,
          userWildcard:   layers.userWildcard   ? { user_id:   userId,   version: layers.userWildcard.version }   : null,
          userRoute:      layers.userRoute      ? { user_id:   userId,   version: layers.userRoute.version }      : null,
        },
        // Phase 1 — partial-failure envelope. When non-empty, callers
        // know one or more enrichment sub-queries failed but the
        // binding itself resolved. Never includes SQL detail/stack.
        _errors: errors,
      });
    } catch (e) {
      // Reachable only on a synchronous defect inside the merge/shape
      // path (NOT a sub-query failure — those are caught by safeQuery).
      // Typed code; never opaque 500.
      // eslint-disable-next-line no-console
      console.error('[template-binding] post-fetch shape failed', { route, err: String(e) });
      res.status(500).json({
        error: 'TEMPLATE_BINDING_SHAPE_FAILED',
        stage: 'binding.shape',
        route,
        _errors: errors,
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // Phase F-F10 — Module navigation resolver.
  //   GET /module-nav?module=<code>[&locale=ar]
  //     → { module_code, groups: [{ id, label_en, label_ar, sort_order,
  //                                  items: [{ id, route, icon, permission,
  //                                            label_en, label_ar, badge,
  //                                            sort_order, pinned }] }] }
  // Merge order (broader → narrower):
  //   ③ default      dos.ui_module_nav_group + dos.ui_module_nav_item
  //   ④ tenant       dos.ui_module_nav_override_tenant   (sparse)
  //   ⑤ user         dos.ui_module_nav_override_user     (sparse + pin)
  // Each non-NULL override column wins; NULL = inherit prior layer.
  // ──────────────────────────────────────────────────────────────────
  router.get('/module-nav', async (req, res) => {
    const moduleCode = String(req.query.module ?? '').trim();
    if (!moduleCode) return res.status(400).json({ error: 'module_required' });
    const { tenantId, userId } = readPrincipal(req);
    try {
      const [groupsR, itemsR, tenOR, usrOR] = await Promise.all([
        pool.query(`SELECT group_id, sort_order, label_key, label_en, label_ar, enabled, version
                      FROM dos.ui_module_nav_group
                     WHERE module_code=$1 AND enabled=true
                     ORDER BY sort_order, group_id`, [moduleCode]),
        pool.query(`SELECT item_id, group_id, sort_order, route, icon, permission,
                           label_key, label_en, label_ar, badge, enabled, version
                      FROM dos.ui_module_nav_item
                     WHERE module_code=$1 AND enabled=true
                     ORDER BY sort_order, item_id`, [moduleCode]),
        tenantId
          ? pool.query(`SELECT item_id, sort_order, enabled, label_en, label_ar, badge
                          FROM dos.ui_module_nav_override_tenant
                         WHERE tenant_id=$1 AND module_code=$2`, [tenantId, moduleCode])
          : Promise.resolve({ rows: [] }),
        userId
          ? pool.query(`SELECT item_id, sort_order, enabled, pinned
                          FROM dos.ui_module_nav_override_user
                         WHERE user_id=$1 AND module_code=$2`, [userId, moduleCode])
          : Promise.resolve({ rows: [] }),
      ]);

      const tenById = new Map<string, Record<string, unknown>>();
      for (const r of tenOR.rows as Array<Record<string, unknown>>) tenById.set(r['item_id'] as string, r);
      const usrById = new Map<string, Record<string, unknown>>();
      for (const r of usrOR.rows as Array<Record<string, unknown>>) usrById.set(r['item_id'] as string, r);

      // Merge an item with its tenant + user override patches. Sparse
      // semantics: NULL columns inherit the prior layer; non-NULL win.
      const mergeItem = (it: Record<string, unknown>) => {
        const t = tenById.get(it['item_id'] as string) ?? {};
        const u = usrById.get(it['item_id'] as string) ?? {};
        const pick = <T,>(...vals: Array<T | null | undefined>): T | null => {
          for (const v of vals) if (v !== null && v !== undefined) return v;
          return null;
        };
        const enabled = pick<boolean>(u['enabled'] as boolean, t['enabled'] as boolean, it['enabled'] as boolean);
        if (enabled === false) return null;            // hidden by override
        return {
          id:         it['item_id'],
          group_id:   it['group_id'],
          sort_order: pick<number>(u['sort_order'] as number, t['sort_order'] as number, it['sort_order'] as number) ?? 0,
          route:      it['route'],
          icon:       it['icon'],
          permission: it['permission'],
          label_key:  it['label_key'],
          label_en:   pick<string>(t['label_en'] as string, it['label_en'] as string),
          label_ar:   pick<string>(t['label_ar'] as string, it['label_ar'] as string),
          badge:      pick<string>(t['badge']    as string, it['badge']    as string),
          pinned:     u['pinned'] === true,
        };
      };

      const merged = (itemsR.rows as Array<Record<string, unknown>>)
        .map(mergeItem).filter((x): x is Exclude<typeof x, null> => x !== null)
        .sort((a, b) => (a.sort_order as number) - (b.sort_order as number));

      // Build groups envelope; preserve declared group order. Items with
      // no group fall into a synthetic '_root' group emitted last.
      const groupsOut: Array<Record<string, unknown>> = [];
      for (const g of groupsR.rows as Array<Record<string, unknown>>) {
        groupsOut.push({
          id:         g['group_id'],
          sort_order: g['sort_order'],
          label_key:  g['label_key'],
          label_en:   g['label_en'],
          label_ar:   g['label_ar'],
          items:      merged.filter(i => i.group_id === g['group_id']),
        });
      }
      const ungrouped = merged.filter(i => !i.group_id || !groupsOut.some(g => g['id'] === i.group_id));
      if (ungrouped.length) {
        groupsOut.push({
          id: '_root', sort_order: 9999, label_key: null, label_en: null, label_ar: null,
          items: ungrouped,
        });
      }
      // Pinned items also surfaced as a synthetic top rail (cross-group).
      const pinned = merged.filter(i => i.pinned);

      res.json({
        module_code: moduleCode,
        groups: groupsOut,
        pinned,                // empty when no user has pinned anything
        _layers: {
          module:  { group_count: groupsR.rows.length, item_count: itemsR.rows.length },
          tenant:  tenantId ? { tenant_id: tenantId, override_count: tenOR.rows.length } : null,
          user:    userId   ? { user_id:   userId,   override_count: usrOR.rows.length } : null,
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[module-nav] fetch failed', { moduleCode, err: String(e) });
      res.status(500).json({ error: 'MODULE_NAV_FETCH_FAILED' });
    }
  });

  // Phase F-F9 — Effective-binding export for a scope.
  //   GET /export?scope=tenant       → uses caller's tenantId from principal
  //   GET /export?scope=tenant&tenant_id=<id>   → admin override
  //   GET /export?scope=product[&product_code=...]
  //   GET /export?scope=anonymous    → product+module+route only
  // Returns: { scope, generated_at, bindings: [{ route, archetype, template_export, version, props }] }
  router.get('/export', async (req, res) => {
    const scope = String(req.query.scope ?? 'anonymous');
    const productCode = (typeof req.query.product_code === 'string' && req.query.product_code)
      || readProductCode(req);
    const principal = readPrincipal(req);
    const tenantId = scope === 'tenant'
      ? (typeof req.query.tenant_id === 'string' && req.query.tenant_id ? req.query.tenant_id : principal.tenantId)
      : '';
    const userId = scope === 'user' ? principal.userId : '';
    try {
      const { rows } = await pool.query<{ route: string; archetype: string; template_export: string; version: number; props: Record<string, unknown> } & {
        title_en?: string; title_ar?: string; subtitle_en?: string; subtitle_ar?: string;
        eyebrow_en?: string; eyebrow_ar?: string; ai_headline_en?: string; ai_headline_ar?: string;
        status_tags?: unknown; primary_action?: unknown;
      }>(
        `SELECT route, archetype, template_export, props, version,
                title_en, title_ar, subtitle_en, subtitle_ar,
                eyebrow_en, eyebrow_ar, ai_headline_en, ai_headline_ar,
                status_tags, primary_action
           FROM dos.ui_route_template_binding ORDER BY route`,
      );
      const bundle = await Promise.all(rows.map(async (row) => {
        const moduleCode = deriveModuleCode(row.route);
        const exportErrors: SubQueryError[] = [];
        const [dyn, layers] = await Promise.all([
          loadProps(pool, row.route, row.archetype, 'en', exportErrors),
          loadOverrideLayers(pool, row.route, productCode, moduleCode, tenantId, userId, exportErrors),
        ]);
        const masthead = {
          title:         row.title_en      ?? row.title_ar      ?? null,
          subtitle:      row.subtitle_en   ?? row.subtitle_ar   ?? null,
          eyebrow:       row.eyebrow_en    ?? row.eyebrow_ar    ?? null,
          aiHeadline:    row.ai_headline_en?? row.ai_headline_ar?? null,
          statusTags:    row.status_tags   ?? [],
          primaryAction: row.primary_action ?? null,
        };
        let merged: Record<string, unknown> = {};
        deepMerge(merged, layers.product?.patch ?? null);
        deepMerge(merged, layers.module?.patch  ?? null);
        deepMerge(merged, (row.props ?? {}) as Record<string, unknown>);
        deepMerge(merged, dyn);
        deepMerge(merged, layers.tenantWildcard?.patch ?? null);
        deepMerge(merged, layers.tenantRoute?.patch    ?? null);
        deepMerge(merged, layers.userWildcard?.patch   ?? null);
        deepMerge(merged, layers.userRoute?.patch      ?? null);
        merged = deepMerge({ masthead }, merged);
        return {
          route: row.route,
          archetype: row.archetype,
          template_export: row.template_export,
          version: row.version,
          props: merged,
        };
      }));
      res.json({
        scope,
        product_code: productCode,
        tenant_id: tenantId || null,
        user_id:   userId   || null,
        generated_at: new Date().toISOString(),
        binding_count: bundle.length,
        bindings: bundle,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[template-binding/export] fetch failed', { scope, err: String(e) });
      res.status(500).json({ error: 'TEMPLATE_BINDING_EXPORT_FAILED' });
    }
  });

  return router;
}
