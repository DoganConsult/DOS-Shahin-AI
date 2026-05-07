-- 20260507_2600_foundation_overview_command_home_props.sql
-- Owner: ui-os-service.
--
-- Purpose:
--   Make /foundation/overview exercise the approved command-home archetype
--   using the props shape consumed by ModuleOverviewTemplateComponent.
--
-- Scope:
--   One route only: /foundation/overview.
--
-- The prior binding had zone/surface shaped props. This route is rendered by
-- DynamicTemplatePageComponent, which passes props directly to the approved
-- command-home template inputs. This migration stores renderable kpis[],
-- nbaActions[], tabs[], and full pillars data in the binding row.

BEGIN;

WITH foundation_counts AS (
  SELECT
    (SELECT COUNT(*)::int FROM dos.users) AS users,
    (SELECT COUNT(*)::int FROM dos.departments) AS departments,
    (SELECT COUNT(*)::int FROM dos.access_reviews) AS access_reviews,
    (SELECT COUNT(*)::int FROM platform_dauth.delegations) AS delegations,
    (SELECT COUNT(*)::int FROM dos.foundation_sod_violations) AS sod_violations,
    (SELECT COUNT(*)::int FROM dos.foundation_cat_reference) AS reference_rows
),
overview_props AS (
  SELECT jsonb_build_object(
    'kpis', jsonb_build_array(
      jsonb_build_object(
        'label', 'Active users',
        'labelAr', 'المستخدمون النشطون',
        'value', users,
        'deltaDirection', 'neutral',
        'aiInsight', 'From the Foundation user directory',
        'status', 'info',
        'link', '/foundation/users'
      ),
      jsonb_build_object(
        'label', 'Departments',
        'labelAr', 'الإدارات',
        'value', departments,
        'deltaDirection', 'neutral',
        'aiInsight', 'Organizational units available for governance',
        'status', 'success',
        'link', '/foundation/departments'
      ),
      jsonb_build_object(
        'label', 'Open access reviews',
        'labelAr', 'مراجعات الوصول المفتوحة',
        'value', access_reviews,
        'deltaDirection', 'neutral',
        'aiInsight', 'Campaigns and review items requiring governance attention',
        'status', CASE WHEN access_reviews > 0 THEN 'warning' ELSE 'success' END,
        'link', '/foundation/access-review'
      ),
      jsonb_build_object(
        'label', 'Active delegations',
        'labelAr', 'التفويضات النشطة',
        'value', delegations,
        'deltaDirection', 'neutral',
        'aiInsight', 'Delegated authority records visible to the tenant',
        'status', CASE WHEN delegations > 0 THEN 'info' ELSE 'success' END,
        'link', '/foundation/delegations'
      ),
      jsonb_build_object(
        'label', 'SoD conflicts',
        'labelAr', 'تعارضات فصل الواجبات',
        'value', sod_violations,
        'deltaDirection', 'neutral',
        'aiInsight', 'Segregation-of-duties violations from Foundation controls',
        'status', CASE WHEN sod_violations > 0 THEN 'critical' ELSE 'success' END,
        'link', '/foundation/sod'
      ),
      jsonb_build_object(
        'label', 'Reference records',
        'labelAr', 'السجلات المرجعية',
        'value', reference_rows,
        'deltaDirection', 'neutral',
        'aiInsight', 'Catalog rows available for module setup and normalization',
        'status', 'info',
        'link', '/foundation/reference-data'
      )
    ),
    'nbaActions', jsonb_build_array(
      jsonb_build_object(
        'label', 'Review organization hierarchy',
        'labelAr', 'مراجعة الهيكل التنظيمي',
        'description', 'Confirm departments, teams, and reporting lines before downstream module activation.',
        'aiScore', 92,
        'route', '/foundation/organization',
        'actionKey', 'foundation.organization.review',
        'permission', 'foundation.data.read',
        'severity', 'info'
      ),
      jsonb_build_object(
        'label', 'Open access review queue',
        'labelAr', 'فتح قائمة مراجعات الوصول',
        'description', 'Work through access review campaigns and evidence before roles are promoted.',
        'aiScore', 88,
        'route', '/foundation/access-review',
        'actionKey', 'foundation.access_review.open',
        'permission', 'foundation.review.read',
        'severity', CASE WHEN access_reviews > 0 THEN 'warning' ELSE 'info' END
      ),
      jsonb_build_object(
        'label', 'Check permission ownership',
        'labelAr', 'فحص ملكية الصلاحيات',
        'description', 'Validate role and permission ownership before publishing additional modules.',
        'aiScore', 81,
        'route', '/foundation/permissions',
        'actionKey', 'foundation.permissions.review',
        'permission', 'foundation.rbac.read',
        'severity', 'info'
      )
    ),
    'tabs', jsonb_build_array(
      jsonb_build_object('id', 'overview', 'label', 'Overview', 'labelAr', 'نظرة عامة'),
      jsonb_build_object('id', 'structure', 'label', 'Structure', 'labelAr', 'الهيكل', 'badge', departments),
      jsonb_build_object('id', 'access', 'label', 'Access governance', 'labelAr', 'حوكمة الوصول', 'badge', access_reviews),
      jsonb_build_object('id', 'readiness', 'label', 'Readiness', 'labelAr', 'الجاهزية')
    ),
    'tabPanels', jsonb_build_array(
      jsonb_build_object(
        'id', 'overview',
        'rows', jsonb_build_array(
          jsonb_build_object('label', 'Foundation status', 'value', 'Published and active through UI-OS runtime'),
          jsonb_build_object('label', 'What changed', 'value', 'Organization, identity, access review, delegation, and audit context are published'),
          jsonb_build_object('label', 'Evidence', 'value', format('%s users, %s departments, %s access reviews', users, departments, access_reviews))
        )
      ),
      jsonb_build_object(
        'id', 'structure',
        'rows', jsonb_build_array(
          jsonb_build_object('label', 'Active users', 'value', users),
          jsonb_build_object('label', 'Departments', 'value', departments),
          jsonb_build_object('label', 'Reference records', 'value', reference_rows)
        )
      ),
      jsonb_build_object(
        'id', 'access',
        'rows', jsonb_build_array(
          jsonb_build_object('label', 'Open access reviews', 'value', access_reviews),
          jsonb_build_object('label', 'Active delegations', 'value', delegations),
          jsonb_build_object('label', 'SoD conflicts', 'value', sod_violations)
        )
      ),
      jsonb_build_object(
        'id', 'readiness',
        'rows', jsonb_build_array(
          jsonb_build_object('label', 'Primary action', 'value', 'Open access reviews'),
          jsonb_build_object('label', 'Risk or opportunity', 'value', CASE
            WHEN access_reviews > 0 THEN 'Open access review work remains before governance-ready state'
            ELSE 'Access review backlog is clear; next step is ownership enrichment'
          END),
          jsonb_build_object('label', 'Recommendation count', 'value', 3)
        )
      )
    ),
    'pillars', jsonb_build_object(
      'labels', jsonb_build_object(
        'whatChanged', 'What changed',
        'whyItMatters', 'Why it matters',
        'riskOrOpportunity', 'Risk or opportunity',
        'nextAction', 'Next action',
        'evidence', 'Evidence'
      ),
      'whatChanged', 'Foundation is now published as the platform base for organization, identity, access review, delegation, and audit context.',
      'whyItMatters', 'Risk, compliance, audit, evidence, and workflow modules need trusted users, roles, owners, and org structure before their pages can be activated safely.',
      'riskOrOpportunity', CASE
        WHEN access_reviews > 0 THEN 'Open access review work remains before the tenant can be considered governance-ready.'
        ELSE 'Access review backlog is clear; the next opportunity is enriching org and ownership data.'
      END,
      'nextAction', jsonb_build_object(
        'label', 'Open access reviews',
        'labelAr', 'افتح مراجعات الوصول',
        'route', '/foundation/access-review',
        'actionKey', 'foundation.access_review.open',
        'permission', 'foundation.review.read',
        'severity', CASE WHEN access_reviews > 0 THEN 'warning' ELSE 'info' END
      ),
      'evidence', format(
        'DB counts at seed time: %s users, %s departments, %s access reviews, %s delegations, %s SoD conflicts, %s reference rows.',
        users,
        departments,
        access_reviews,
        delegations,
        sod_violations,
        reference_rows
      )
    )
  ) AS props
  FROM foundation_counts
)
INSERT INTO dos.ui_route_template_binding (
  route,
  archetype,
  template_export,
  props,
  title_en,
  title_ar,
  subtitle_en,
  subtitle_ar,
  eyebrow_en,
  eyebrow_ar,
  ai_headline_en,
  ai_headline_ar,
  status_tags,
  primary_action
)
SELECT
  '/foundation/overview',
  'command-home',
  'ModuleOverviewTemplateComponent',
  overview_props.props,
  'Foundation command home',
  'الصفحة الرئيسية للأساس',
  'Organization, identity, access governance, delegation, and audit readiness from DB-published Foundation data.',
  'المنظمة والهوية وحوكمة الوصول والتفويض وجاهزية التدقيق من بيانات الأساس المنشورة في قاعدة البيانات.',
  'Foundation',
  'الأساس',
  'Foundation runtime is resolved from DB through UI-OS',
  'يتم حل تشغيل الأساس من قاعدة البيانات عبر UI-OS',
  jsonb_build_array(
    jsonb_build_object('label', 'DB published', 'severity', 'success'),
    jsonb_build_object('label', 'UI-OS runtime', 'severity', 'info')
  ),
  jsonb_build_object(
    'label', 'Open access reviews',
    'labelAr', 'افتح مراجعات الوصول',
    'route', '/foundation/access-review',
    'actionKey', 'foundation.access_review.open',
    'permission', 'foundation.review.read',
    'severity', 'warning'
  )
FROM overview_props
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

UPDATE dos.dynamic_ui_routes
   SET component_key = 'module.entry.page',
       permission_key = 'foundation.module.read'
 WHERE path_pattern = '/foundation/overview'
   AND module_code = 'foundation';

-- The approved command-home binding above now owns the page payload. Older
-- shaped extension rows for this same route emit source descriptors
-- (label_en/source_path) instead of renderable ModuleOverview inputs and would
-- override props.kpis/tabs/nbaActions in UI-OS. Remove only this route's stale
-- extension rows so the DB binding is the single source for the trial page.
DELETE FROM dos.ui_route_kpi WHERE route = '/foundation/overview';
DELETE FROM dos.ui_route_tab WHERE route = '/foundation/overview';
DELETE FROM dos.ui_route_nba WHERE route = '/foundation/overview';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM dos.ui_route_template_binding b
      JOIN dos.dynamic_ui_routes r
        ON r.module_code = 'foundation'
       AND r.path_pattern = b.route
     WHERE b.route = '/foundation/overview'
       AND b.archetype = 'command-home'
       AND b.template_export = 'ModuleOverviewTemplateComponent'
       AND r.component_key = 'module.entry.page'
       AND r.permission_key = 'foundation.module.read'
       AND b.props ? 'kpis'
       AND b.props ? 'nbaActions'
       AND b.props ? 'tabs'
       AND b.props ? 'tabPanels'
       AND b.props ? 'pillars'
       AND b.props->'pillars' ? 'labels'
       AND jsonb_array_length(b.props->'kpis') >= 4
       AND jsonb_array_length(b.props->'nbaActions') >= 3
       AND jsonb_array_length(b.props->'tabPanels') >= 4
       AND NOT EXISTS (SELECT 1 FROM dos.ui_route_kpi WHERE route = b.route)
       AND NOT EXISTS (SELECT 1 FROM dos.ui_route_tab WHERE route = b.route)
       AND NOT EXISTS (SELECT 1 FROM dos.ui_route_nba WHERE route = b.route)
  ) THEN
    RAISE EXCEPTION 'foundation overview command-home seed assertion failed';
  END IF;
END $$; COMMIT;
