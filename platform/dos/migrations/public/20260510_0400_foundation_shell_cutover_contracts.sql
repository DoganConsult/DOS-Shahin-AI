-- 20260510_0400_foundation_shell_cutover_contracts.sql
--
-- Foundation hard-cutover contract patch:
--   1) Canonical Foundation nav ordering for ui-os shell runtime.
--   2) Route-scoped page experience contracts for access-review/delegations/users.
--   3) Pillar labels moved to DB props (no frontend static labels).
--
-- Idempotent, additive, no table drops.

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Canonical group/item ordering (DB-authoritative)
-- ---------------------------------------------------------------------
UPDATE dos.ui_module_nav_group
   SET sort_order = CASE group_id
     WHEN 'foundation.group.organization' THEN 10
     WHEN 'foundation.group.identity' THEN 20
     WHEN 'foundation.group.governance' THEN 30
     WHEN 'foundation.group.main' THEN 40
     ELSE sort_order
   END,
       updated_at = now()
 WHERE module_code = 'foundation'
   AND group_id IN (
     'foundation.group.organization',
     'foundation.group.identity',
     'foundation.group.governance',
     'foundation.group.main'
   );

UPDATE dos.ui_module_nav_item
   SET sort_order = CASE item_id
     WHEN 'foundation.overview' THEN 10
     WHEN 'foundation.organization' THEN 20
     WHEN 'foundation.business-units' THEN 30
     WHEN 'foundation.departments' THEN 40
     WHEN 'foundation.positions' THEN 50
     WHEN 'foundation.locations' THEN 60
     WHEN 'foundation.users' THEN 10
     WHEN 'foundation.teams' THEN 20
     WHEN 'foundation.roles' THEN 30
     WHEN 'foundation.committees' THEN 10
     WHEN 'foundation.delegations' THEN 20
     WHEN 'foundation.ownership-mapping' THEN 30
     WHEN 'foundation.access-review' THEN 40
     WHEN 'foundation.policies' THEN 50
     WHEN 'foundation.data-processing' THEN 60
     WHEN 'foundation.reference-data' THEN 70
     WHEN 'foundation.audit' THEN 80
     WHEN 'foundation.settings' THEN 90
     WHEN 'foundation.user-lifecycle' THEN 190
     ELSE sort_order
   END,
       updated_at = now()
 WHERE module_code = 'foundation'
   AND item_id IN (
     'foundation.overview',
     'foundation.organization',
     'foundation.business-units',
     'foundation.departments',
     'foundation.positions',
     'foundation.locations',
     'foundation.users',
     'foundation.teams',
     'foundation.roles',
     'foundation.committees',
     'foundation.delegations',
     'foundation.ownership-mapping',
     'foundation.access-review',
     'foundation.policies',
     'foundation.data-processing',
     'foundation.reference-data',
     'foundation.audit',
     'foundation.settings',
     'foundation.user-lifecycle'
   );

-- ---------------------------------------------------------------------
-- 2) Route-scoped page experience + masthead/action contracts
-- ---------------------------------------------------------------------
UPDATE dos.ui_route_template_binding
   SET title_en = 'Access review',
       title_ar = 'مراجعة الصلاحيات',
       subtitle_en = 'Campaign progress for periodic access attestations',
       subtitle_ar = 'تقدم حملات المراجعة الدورية للصلاحيات',
       eyebrow_en = 'Foundation',
       eyebrow_ar = 'Foundation',
       ai_headline_en = 'Route contract: access-review.workflow',
       ai_headline_ar = 'عقد المسار: access-review.workflow',
       status_tags = '[]'::jsonb,
       primary_action = jsonb_build_object(
         'id', 'access-review.start',
         'label', 'Start review',
         'route', '/foundation/access-review/new',
         'action', jsonb_build_object('kind', 'navigate', 'path', '/foundation/access-review/new')
       ),
       props = jsonb_set(
         COALESCE(props, '{}'::jsonb),
         '{pillars}',
         jsonb_build_object(
           'labels', jsonb_build_object(
             'whatChanged', 'Campaign progress',
             'whyItMatters', 'Why it matters',
             'riskOrOpportunity', 'Risk exposure',
             'nextAction', 'What should I do?',
             'evidence', 'Evidence basis'
           ),
           'whatChanged', 'Coverage and queue status across active campaigns.',
           'whyItMatters', 'Periodic attestations reduce toxic access risk.',
           'riskOrOpportunity', 'Unreviewed privileged access remains high-risk.',
           'nextAction', jsonb_build_object('label', 'Start review'),
           'evidence', 'Derived from access-review campaign and delegation data.'
         ),
         true
       ),
       updated_at = now()
 WHERE route = '/foundation/access-review';

UPDATE dos.ui_route_template_binding
   SET title_en = 'Delegations',
       title_ar = 'التفويضات',
       subtitle_en = 'Authority assignments across delegator and delegate roles',
       subtitle_ar = 'إسنادات الصلاحيات بين المفوض والمفوّض إليه',
       eyebrow_en = 'Foundation',
       eyebrow_ar = 'Foundation',
       ai_headline_en = 'Route contract: delegations.center',
       ai_headline_ar = 'عقد المسار: delegations.center',
       status_tags = '[]'::jsonb,
       primary_action = jsonb_build_object(
         'id', 'delegations.create',
         'label', 'Create delegation',
         'route', '/foundation/delegations/new',
         'action', jsonb_build_object('kind', 'navigate', 'path', '/foundation/delegations/new')
       ),
       props = jsonb_set(
         COALESCE(props, '{}'::jsonb),
         '{pillars}',
         jsonb_build_object(
           'labels', jsonb_build_object(
             'whatChanged', 'Delegation posture',
             'whyItMatters', 'Why it matters',
             'riskOrOpportunity', 'Risk exposure',
             'nextAction', 'What should I do?',
             'evidence', 'Evidence basis'
           ),
           'whatChanged', 'Active and expiring delegations by scope.',
           'whyItMatters', 'Delegated authority impacts approval accountability.',
           'riskOrOpportunity', 'Stale delegations increase control drift.',
           'nextAction', jsonb_build_object('label', 'Create delegation'),
           'evidence', 'Derived from delegation contracts and authority mappings.'
         ),
         true
       ),
       updated_at = now()
 WHERE route = '/foundation/delegations';

UPDATE dos.ui_route_template_binding
   SET title_en = 'Users',
       title_ar = 'المستخدمون',
       subtitle_en = 'Identity register for platform users and assignments',
       subtitle_ar = 'سجل الهوية لمستخدمي المنصة وتعييناتهم',
       eyebrow_en = 'Foundation',
       eyebrow_ar = 'Foundation',
       ai_headline_en = 'Route contract: users.register',
       ai_headline_ar = 'عقد المسار: users.register',
       status_tags = '[]'::jsonb,
       primary_action = jsonb_build_object(
         'id', 'users.create',
         'label', 'Create user',
         'route', '/foundation/users/new',
         'action', jsonb_build_object('kind', 'navigate', 'path', '/foundation/users/new')
       ),
       props = jsonb_set(
         COALESCE(props, '{}'::jsonb),
         '{pillars}',
         jsonb_build_object(
           'labels', jsonb_build_object(
             'whatChanged', 'Identity posture',
             'whyItMatters', 'Why it matters',
             'riskOrOpportunity', 'Risk exposure',
             'nextAction', 'What should I do?',
             'evidence', 'Evidence basis'
           ),
           'whatChanged', 'User lifecycle and assignment coverage snapshots.',
           'whyItMatters', 'Identity completeness drives access governance quality.',
           'riskOrOpportunity', 'Orphaned users can bypass ownership controls.',
           'nextAction', jsonb_build_object('label', 'Create user'),
           'evidence', 'Derived from users, roles, and team membership data.'
         ),
         true
       ),
       updated_at = now()
 WHERE route = '/foundation/users';

-- ---------------------------------------------------------------------
-- 3) Assertions (fail migration if missing)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  missing_routes integer;
BEGIN
  SELECT COUNT(*) INTO missing_routes
    FROM (
      SELECT '/foundation/access-review' AS route
      UNION ALL SELECT '/foundation/delegations'
      UNION ALL SELECT '/foundation/users'
    ) x
   WHERE NOT EXISTS (
     SELECT 1
       FROM dos.ui_route_template_binding b
      WHERE b.route = x.route
   );

  IF missing_routes <> 0 THEN
    RAISE EXCEPTION 'foundation cutover assertion failed: % target route bindings missing', missing_routes;
  END IF;
END $$;

COMMIT;
