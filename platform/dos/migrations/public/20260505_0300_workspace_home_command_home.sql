-- 20260505_0300_workspace_home_command_home.sql
-- Owner: ui-os-service.
--
-- Phase F-F8.1 — DB-driven enrolment for the post-login workspace home.
--
-- Symptom before this migration:
--   Visiting /workspace-home rendered the safe-shell fallback
--     "Phase F template-binding row missing — falling back to safe shell"
--     "No DB-driven content yet for this route"
--     "No template binding for /workspace-home"
--   because @platform/shell/DynamicTemplatePageComponent (the loadComponent
--   on this route in products/shahin-ai/app/src/app/app.routes.ts) called
--   /api/ui-os/template-binding?route=/workspace-home and got back a row
--   count of 0 — there was simply no binding for that path.
--
-- Fix:
--   Insert one row in dos.ui_route_template_binding for /workspace-home,
--   bound to the `command-home` archetype (template_export
--   ModuleOverviewTemplateComponent — present in
--   platform/core/platform/shell/template-binding.registry.ts) with rich
--   props that exercise the four rails the template renders today:
--     ① masthead (title / subtitle / eyebrow / aiHeadline / statusTags
--        / primaryAction) — assembled by the resolver from the columns
--        below and surfaced via props.masthead by the host.
--     ② kpis[]        → ModuleKpi[]    (4 cards: tasks, findings,
--                                       compliance score, AI confidence)
--     ③ nbaActions[]  → ModuleAction[] (3 next-best actions, route-keyed)
--     ④ tabs[]        → ModuleTab[]    (3 tabs: overview / queue / agents)
--     ⑤ workqueueGroups[] (3 buckets: my inbox / awaiting approval /
--                          overdue) — surfaced by the host even when the
--                          archetype doesn't render them, useful for
--                          downstream agent rails.
--
-- The kpi / nba / workqueue rows are intentionally NOT inserted into the
-- shaped tables (`dos.ui_route_kpi`, `dos.ui_route_nba`,
-- `dos.ui_route_workqueue_group`) because those tables emit
-- `label_en`/`label_ar`/`source_path`/… column names while the template
-- consumes `label`/`labelAr`/`value`/… (see
-- platform/core/platform/shell/templates/module-template.types.ts —
-- ModuleKpi/ModuleAction). Until the resolver learns to translate
-- `*_en/_ar → label/labelAr`, embedding the props directly in
-- `dos.ui_route_template_binding.props` is the single-source-of-truth
-- path that actually renders. This is the same pattern used by every
-- existing command-home row in the registry.
--
-- Forward-only and idempotent.

BEGIN;

INSERT INTO dos.ui_route_template_binding (
  route,
  archetype,
  template_export,
  props,
  title_en,                         title_ar,
  subtitle_en,                      subtitle_ar,
  eyebrow_en,                       eyebrow_ar,
  ai_headline_en,                   ai_headline_ar,
  status_tags,
  primary_action
) VALUES (
  '/workspace-home',
  'command-home',
  'ModuleOverviewTemplateComponent',
  jsonb_build_object(
    -- ── KPIs (ModuleKpi[]) ─────────────────────────────────────────────
    'kpis', jsonb_build_array(
      jsonb_build_object(
        'label',          'Open tasks',
        'labelAr',        'المهام المفتوحة',
        'value',          12,
        'delta',          '+3',
        'deltaDirection', 'up',
        'aiInsight',      '3 high-priority items added today',
        'status',         'warning',
        'link',           '/foundation/work-queue'
      ),
      jsonb_build_object(
        'label',          'Open findings',
        'labelAr',        'النتائج المفتوحة',
        'value',          4,
        'delta',          '-1',
        'deltaDirection', 'down',
        'aiInsight',      'Trending down vs last week',
        'status',         'info',
        'link',           '/compliance/findings'
      ),
      jsonb_build_object(
        'label',          'Compliance score',
        'labelAr',        'درجة الامتثال',
        'value',          '87%',
        'delta',          '+2%',
        'deltaDirection', 'up',
        'aiInsight',      'Above tenant baseline (84%)',
        'status',         'success',
        'link',           '/compliance/overview'
      ),
      jsonb_build_object(
        'label',          'AI confidence',
        'labelAr',        'ثقة الذكاء الاصطناعي',
        'value',          '92%',
        'delta',          '+1%',
        'deltaDirection', 'up',
        'aiInsight',      'Last 30 days · model v2.1',
        'status',         'success',
        'link',           '/foundation/agents'
      )
    ),

    -- ── Next-Best Actions (ModuleAction[]) ────────────────────────────
    'nbaActions', jsonb_build_array(
      jsonb_build_object(
        'label',       'Review at-risk obligation',
        'labelAr',     'مراجعة الالتزام المعرض للخطر',
        'description', 'SAMA cyber rule 4.2 deadline in 5 days',
        'aiScore',     94,
        'route',       '/compliance/obligation-workspace',
        'actionKey',   'compliance.obligation.review',
        'permission',  'compliance.obligation.read',
        'severity',    'critical'
      ),
      jsonb_build_object(
        'label',       'Attest 3 controls',
        'labelAr',     'الإقرار بـ 3 ضوابط',
        'description', 'Quarterly attestation cycle is open',
        'aiScore',     78,
        'route',       '/compliance/attestations',
        'actionKey',   'compliance.attestation.start',
        'permission',  'compliance.attestation.write',
        'severity',    'warning'
      ),
      jsonb_build_object(
        'label',       'Approve evidence batch',
        'labelAr',     'اعتماد دفعة الأدلة',
        'description', '7 evidence artifacts awaiting reviewer sign-off',
        'aiScore',     65,
        'route',       '/compliance/evidence-ops',
        'actionKey',   'compliance.evidence.approve',
        'permission',  'compliance.evidence.approve',
        'severity',    'info'
      )
    ),

    -- ── Tabs (ModuleTab[]) ────────────────────────────────────────────
    'tabs', jsonb_build_array(
      jsonb_build_object('id', 'overview', 'label', 'Overview',     'labelAr', 'نظرة عامة'),
      jsonb_build_object('id', 'queue',    'label', 'My queue',     'labelAr', 'قائمة مهامي', 'badge', 12),
      jsonb_build_object('id', 'agents',   'label', 'AI agents',    'labelAr', 'وكلاء الذكاء')
    ),

    -- ── Work-queue groups (downstream rails) ───────────────────────────
    'workqueueGroups', jsonb_build_array(
      jsonb_build_object(
        'group_id',   'my-inbox',
        'sort_order', 1,
        'label_en',   'My inbox',
        'label_ar',   'صندوق الوارد',
        'urgency',    'normal'
      ),
      jsonb_build_object(
        'group_id',   'awaiting-approval',
        'sort_order', 2,
        'label_en',   'Awaiting my approval',
        'label_ar',   'بانتظار موافقتي',
        'urgency',    'high'
      ),
      jsonb_build_object(
        'group_id',   'overdue',
        'sort_order', 3,
        'label_en',   'Overdue',
        'label_ar',   'متأخر',
        'urgency',    'critical'
      )
    )
  ),
  -- Masthead — bilingual.
  'Welcome back',                   'مرحبًا بعودتك',
  'Your workspace command center',  'مركز قيادة مساحة عملك',
  'Workspace',                      'مساحة العمل',
  'AI has prioritized 3 actions for you today',
  'رتّب الذكاء الاصطناعي 3 إجراءات لك اليوم',
  jsonb_build_array(
    jsonb_build_object('label', 'Live',           'severity', 'success'),
    jsonb_build_object('label', 'AI assisted',    'severity', 'info')
  ),
  jsonb_build_object(
    'label',      'Open AI assistant',
    'labelAr',    'افتح مساعد الذكاء الاصطناعي',
    'actionKey',  'ai.assistant.open',
    'severity',   'info'
  )
)
ON CONFLICT (route) DO UPDATE
  SET archetype       = EXCLUDED.archetype,
      template_export = EXCLUDED.template_export,
      props           = EXCLUDED.props,
      title_en        = EXCLUDED.title_en,
      title_ar        = EXCLUDED.title_ar,
      subtitle_en     = EXCLUDED.subtitle_en,
      subtitle_ar     = EXCLUDED.subtitle_ar,
      eyebrow_en      = EXCLUDED.eyebrow_en,
      eyebrow_ar      = EXCLUDED.eyebrow_ar,
      ai_headline_en  = EXCLUDED.ai_headline_en,
      ai_headline_ar  = EXCLUDED.ai_headline_ar,
      status_tags     = EXCLUDED.status_tags,
      primary_action  = EXCLUDED.primary_action,
      version         = dos.ui_route_template_binding.version + 1,
      updated_at      = now();

COMMIT;
