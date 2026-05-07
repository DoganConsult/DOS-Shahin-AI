-- =====================================================================
-- 20260512_1020_foundation_nav_subroutes.sql
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / Dynamic UI-OS only.
--
-- 20 Foundation routes already exist in dos.dynamic_ui_route_metadata
-- (and template-binding), but are absent from dos.ui_module_nav_item.
-- The frontend must never invent nav structure — these rows materialize
-- the missing nav contracts so navigate-eligible routes are reachable
-- from the side-nav.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

WITH new_items(item_id, group_id, sort_order, route, icon, label_en, label_ar, permission) AS (
  VALUES
    -- Governance group (30)
    ('foundation.delegations.new',            'foundation.group.governance',  21,
       '/foundation/delegations/new',            'add',          'New delegation',           'تفويض جديد',           'foundation.delegations.write'),
    ('foundation.access-review.escalations',  'foundation.group.governance',  41,
       '/foundation/access-review/escalations',  'warning',      'Review escalations',       'تصعيدات المراجعة',     'foundation.access-review.read'),
    ('foundation.access-review.new',          'foundation.group.governance',  42,
       '/foundation/access-review/new',          'add',          'New access review',        'مراجعة وصول جديدة',     'foundation.access-review.write'),
    ('foundation.governance.authority-matrix','foundation.group.governance',  100,
       '/foundation/governance/authority-matrix','grid',         'Authority matrix',         'مصفوفة الصلاحيات',     'foundation.governance.read'),
    ('foundation.governance.coi',             'foundation.group.governance',  110,
       '/foundation/governance/coi',             'shield',       'Conflicts of interest',    'تضارب المصالح',         'foundation.governance.read'),
    ('foundation.governance.policy-acks',     'foundation.group.governance',  120,
       '/foundation/governance/policy-acks',     'document',     'Policy acknowledgements',  'إقرارات السياسات',     'foundation.governance.read'),
    ('foundation.governance.sod-rules',       'foundation.group.governance',  130,
       '/foundation/governance/sod-rules',       'rule',         'SoD rules',                'قواعد فصل المهام',     'foundation.governance.read'),
    ('foundation.governance.sod-violations',  'foundation.group.governance',  140,
       '/foundation/governance/sod-violations',  'alert',        'SoD violations',           'مخالفات فصل المهام',   'foundation.governance.read'),
    ('foundation.governance.training',        'foundation.group.governance',  150,
       '/foundation/governance/training',        'education',    'Compliance training',      'التدريب على الامتثال', 'foundation.governance.read'),
    -- Identity group (20)
    ('foundation.users.new',                  'foundation.group.identity',    11,
       '/foundation/users/new',                  'add',          'New user',                 'مستخدم جديد',          'foundation.users.write'),
    ('foundation.teams.new',                  'foundation.group.identity',    21,
       '/foundation/teams/new',                  'add',          'New team',                 'فريق جديد',            'foundation.teams.write'),
    ('foundation.roles.new',                  'foundation.group.identity',    31,
       '/foundation/roles/new',                  'add',          'New role',                 'دور جديد',             'foundation.roles.write'),
    ('foundation.people.lifecycle',           'foundation.group.identity',    100,
       '/foundation/people/lifecycle',           'user-profile', 'People lifecycle',         'دورة حياة الموظفين',   'foundation.people.read'),
    ('foundation.people.onboarding',          'foundation.group.identity',    110,
       '/foundation/people/onboarding',          'user-follow',  'Onboarding',               'الإلحاق الوظيفي',      'foundation.people.read'),
    ('foundation.people.probation-due',       'foundation.group.identity',    120,
       '/foundation/people/probation-due',       'time',         'Probation due',            'انتهاء فترة التجربة',  'foundation.people.read'),
    -- Foundation main group (40)
    ('foundation.workflows',                  'foundation.group.main',        200,
       '/foundation/workflows',                  'flow',         'Workflows',                'سير العمل',            'foundation.workflows.read'),
    ('foundation.workflows.new',              'foundation.group.main',        201,
       '/foundation/workflows/new',              'add',          'New workflow',             'سير عمل جديد',         'foundation.workflows.write'),
    ('foundation.operations-readiness',       'foundation.group.main',        220,
       '/foundation/operations-readiness',       'analytics',    'Operations readiness',     'الجاهزية التشغيلية',   'foundation.diagnostics.read'),
    ('foundation.records',                    'foundation.group.main',        230,
       '/foundation/records',                    'list',         'Records',                  'السجلات',              'foundation.records.read'),
    ('foundation.reports',                    'foundation.group.main',        240,
       '/foundation/reports',                    'report',       'Reports',                  'التقارير',             'foundation.reports.read')
)
INSERT INTO dos.ui_module_nav_item
  (module_code, item_id, group_id, sort_order, route, icon,
   permission, label_key, label_en, label_ar, enabled, version)
SELECT 'foundation', ni.item_id, ni.group_id, ni.sort_order, ni.route, ni.icon,
       NULLIF(ni.permission,''), 'foundation.nav.'||ni.item_id||'.label',
       ni.label_en, ni.label_ar, true, 1
  FROM new_items ni
ON CONFLICT (module_code, item_id) DO UPDATE
  SET group_id   = EXCLUDED.group_id,
      sort_order = EXCLUDED.sort_order,
      route      = EXCLUDED.route,
      icon       = EXCLUDED.icon,
      permission = EXCLUDED.permission,
      label_key  = EXCLUDED.label_key,
      label_en   = EXCLUDED.label_en,
      label_ar   = EXCLUDED.label_ar,
      enabled    = true,
      updated_at = now();

-- Self-test
DO $$
DECLARE n_items int;
BEGIN
  SELECT count(*) INTO n_items
    FROM dos.ui_module_nav_item
   WHERE module_code='foundation'
     AND item_id IN (
       'foundation.delegations.new','foundation.access-review.escalations',
       'foundation.access-review.new','foundation.governance.authority-matrix',
       'foundation.governance.coi','foundation.governance.policy-acks',
       'foundation.governance.sod-rules','foundation.governance.sod-violations',
       'foundation.governance.training','foundation.users.new',
       'foundation.teams.new','foundation.roles.new',
       'foundation.people.lifecycle','foundation.people.onboarding',
       'foundation.people.probation-due','foundation.workflows',
       'foundation.workflows.new','foundation.operations-readiness',
       'foundation.records','foundation.reports'
     );
  IF n_items < 20 THEN
    RAISE EXCEPTION 'foundation-nav-subroutes: only % of 20 inserted', n_items;
  END IF;
  RAISE NOTICE 'foundation-nav-subroutes: 20 nav items present';
END$$;

COMMIT;
