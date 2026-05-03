// Phase F template-binding router.
//
//   GET /template-binding?route=/admin/dauth/users
//     → { route, archetype, template_export, props, version }
//     200 with `null`-template when no binding row exists (caller falls back
//     to component-map default archetype).
//
//   GET /template-binding/all
//     → [{ route, archetype, template_export, version }] — bulk fetch used
//        by the Shahin SPA bootstrap to warm a client-side cache.
//
// Resolver merges:
//   - dos.ui_route_template_binding (primary)
//   - dos.ui_route_kpi / column / tab / nba / setting_section / report_card /
//     workqueue_group / heatmap_axis (joined into props.*)
//
// Wired via services/ui-os-service/src/routes/index.ts.

import { Router } from 'express';
import type { DbPool } from '../db.js';

interface TemplateBinding {
  route: string;
  archetype: string;
  template_export: string;
  props: Record<string, unknown>;
  version: number;
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
  }],
  'delegation-center': [{
    key: 'delegationRules',
    sql: `SELECT rule_id, sort_order, delegator, delegate, scope, permission, starts_at, ends_at, status
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

async function loadProps(
  pool: DbPool,
  route: string,
  archetype?: string | null,
): Promise<Record<string, unknown>> {
  const [kpis, cols, tabs, nbas, sections, reports, groups, axes] = await Promise.all([
    pool.query(`SELECT sort_order, label_en, label_ar, source_path, format, ai_insight, status, link
                  FROM dos.ui_route_kpi WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT sort_order, field_key, label_en, label_ar, type, sortable
                  FROM dos.ui_route_column WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT tab_id, sort_order, label_en, label_ar, permission
                  FROM dos.ui_route_tab WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity
                  FROM dos.ui_route_nba WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT section_id, sort_order, label_en, label_ar, icon
                  FROM dos.ui_route_setting_section WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT report_id, sort_order, title_en, title_ar, description, status, tag, ai_generated, download_url
                  FROM dos.ui_route_report_card WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT group_id, sort_order, label_en, label_ar, urgency, filter_expr
                  FROM dos.ui_route_workqueue_group WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT axis, sort_order, label_en, label_ar, bucket_key
                  FROM dos.ui_route_heatmap_axis WHERE route=$1 ORDER BY axis, sort_order`, [route]),
  ]);
  const base: Record<string, unknown> = {
    kpis: kpis.rows,
    columns: cols.rows,
    tabs: tabs.rows,
    nextBestActions: nbas.rows,
    settingsSections: sections.rows,
    reportCards: reports.rows,
    workqueueGroups: groups.rows,
    heatmapAxes: axes.rows,
  };
  const ext = archetype ? ARCHETYPE_EXTENSIONS[archetype] : undefined;
  if (ext && ext.length) {
    const results = await Promise.all(ext.map(e => pool.query(e.sql, [route])));
    ext.forEach((e, i) => { base[e.key] = results[i].rows; });
  }
  return base;
}

export function createTemplateBindingRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/template-binding/all', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT route, archetype, template_export, version
           FROM dos.ui_route_template_binding
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
    try {
      const { rows } = await pool.query(
        `SELECT route, archetype, template_export, props, version,
                title_en, title_ar, subtitle_en, subtitle_ar,
                eyebrow_en, eyebrow_ar, ai_headline_en, ai_headline_ar,
                status_tags, primary_action
           FROM dos.ui_route_template_binding WHERE route=$1`,
        [route],
      );
      if (rows.length === 0) {
        return res.json({
          route, archetype: null, template_export: null, props: {}, version: 0,
        } satisfies Partial<TemplateBinding>);
      }
      const row = rows[0] as TemplateBinding & {
        title_en?: string; title_ar?: string;
        subtitle_en?: string; subtitle_ar?: string;
        eyebrow_en?: string; eyebrow_ar?: string;
        ai_headline_en?: string; ai_headline_ar?: string;
        status_tags?: unknown; primary_action?: unknown;
      };
      const dynamicProps = await loadProps(pool, route, row.archetype);
      // Phase F-F7-2 — derive `masthead` object the host reads.
      const pick = (en?: string, ar?: string) =>
        (locale === 'ar' ? (ar ?? en) : (en ?? ar)) ?? undefined;
      const masthead = {
        title:        pick(row.title_en, row.title_ar),
        subtitle:     pick(row.subtitle_en, row.subtitle_ar),
        eyebrow:      pick(row.eyebrow_en, row.eyebrow_ar),
        aiHeadline:   pick(row.ai_headline_en, row.ai_headline_ar),
        statusTags:   row.status_tags ?? [],
        primaryAction: row.primary_action ?? null,
      };
      res.json({
        route: row.route,
        archetype: row.archetype,
        template_export: row.template_export,
        version: row.version,
        props: { ...(row.props ?? {}), ...dynamicProps, masthead },
      });
    } catch (e) {
      res.status(500).json({ error: 'template_binding_fetch_failed', detail: String(e) });
    }
  });

  return router;
}
