-- =============================================================================
-- Migration: 20260505_1600_foundation_route_props_seed
-- Purpose:   Seed `props` for the two DB-driven foundation routes that the
--            template-binding registry resolves through ui-os-service:
--              /foundation/delegations    → DelegationCenterTemplateComponent
--              /foundation/reference-data → ModuleRecordsTemplateComponent
--
--            Both rows shipped with `props='{}'::jsonb`, so the template
--            components mounted with empty `@Input()` arrays — the visible
--            symptom on /foundation/reference-data was an empty body under a
--            tab strip; on /foundation/delegations the legacy renderer's
--            5 visible rows came from a route-resolver bypass and not from
--            the canonical archetype.
--
--            This migration writes a baseline `props` payload that exercises
--            the contract for each archetype without assuming live data.
--            The payload uses the contract field names of each template
--            (rules / rows / columns / emptyState / ...). Real per-tenant
--            content streams from the dedicated row-tables
--            (`dos.ui_route_record_row`, etc.) once the foundation feed is
--            connected; until then the fallback strings keep the page chrome
--            populated and prevent "empty mystery body" UX.
--
-- Idempotent: YES — uses `UPDATE ... WHERE props = '{}'::jsonb OR ...` so
--             re-running is a no-op once the props are non-empty (re-applies
--             only when the row is still in its empty default).
--
-- PnP discipline (Doctrine Article 11): additive — no schema change, no
--             constraint mutation, no DELETE. `dos.ui_route_template_binding`
--             is not a controlled-DDL table, so no `dos.actor='dos-master'`
--             requirement.
-- =============================================================================

BEGIN;

-- /foundation/delegations — DelegationCenterTemplateComponent (@Input rules)
UPDATE dos.ui_route_template_binding
   SET props = jsonb_build_object(
         'title',    'Delegations',
         'subtitle', 'Active delegation rules and expiry.',
         'emptyState', jsonb_build_object(
           'titleEn', 'No delegations yet',
           'titleAr', 'لا توجد تفويضات بعد',
           'bodyEn',  'When you delegate authority, active rules will appear here.',
           'bodyAr',  'عند تفويض الصلاحيات ستظهر القواعد النشطة هنا.'
         ),
         'rules',   '[]'::jsonb,
         'columns', jsonb_build_array(
           jsonb_build_object('key','delegator', 'labelEn','Delegator', 'labelAr','المفوِّض'),
           jsonb_build_object('key','delegate',  'labelEn','Delegate',  'labelAr','المفوَّض إليه'),
           jsonb_build_object('key','scope',     'labelEn','Scope',     'labelAr','النطاق'),
           jsonb_build_object('key','startsAt',  'labelEn','From',      'labelAr','من'),
           jsonb_build_object('key','expiresAt', 'labelEn','Until',     'labelAr','حتى'),
           jsonb_build_object('key','status',    'labelEn','Status',    'labelAr','الحالة')
         )
       )
 WHERE route = '/foundation/delegations'
   AND (props = '{}'::jsonb OR props IS NULL);

-- /foundation/reference-data — ModuleRecordsTemplateComponent (intelligent-register)
UPDATE dos.ui_route_template_binding
   SET props = jsonb_build_object(
         'title',    'Reference Data',
         'subtitle', 'Lookup lists and code tables.',
         'dataSource', 'foundation.reference-data',
         'emptyState', jsonb_build_object(
           'titleEn', 'No reference data sets yet',
           'titleAr', 'لا توجد بيانات مرجعية بعد',
           'bodyEn',  'Import or define a code table to start managing controlled vocabulary.',
           'bodyAr',  'استورد جدول رموز أو عرّف قائمة لبدء إدارة المصطلحات المعتمدة.'
         ),
         'rows',    '[]'::jsonb,
         'columns', jsonb_build_array(
           jsonb_build_object('key','code',        'labelEn','Code',        'labelAr','الرمز'),
           jsonb_build_object('key','name',        'labelEn','Name',        'labelAr','الاسم'),
           jsonb_build_object('key','category',    'labelEn','Category',    'labelAr','الفئة'),
           jsonb_build_object('key','status',      'labelEn','Status',      'labelAr','الحالة'),
           jsonb_build_object('key','lastUpdated', 'labelEn','Last update', 'labelAr','آخر تحديث')
         ),
         'actions', jsonb_build_array(
           jsonb_build_object('id','import', 'labelEn','Import',     'labelAr','استيراد', 'permission','foundation.read'),
           jsonb_build_object('id','export', 'labelEn','Export',     'labelAr','تصدير',   'permission','foundation.read')
         )
       )
 WHERE route = '/foundation/reference-data'
   AND (props = '{}'::jsonb OR props IS NULL);

-- Self-assertion: both rows now carry non-empty props.
DO $$
DECLARE
  empty_count integer;
BEGIN
  SELECT count(*)
    INTO empty_count
    FROM dos.ui_route_template_binding
   WHERE route IN ('/foundation/delegations','/foundation/reference-data')
     AND (props = '{}'::jsonb OR props IS NULL);
  IF empty_count <> 0 THEN
    RAISE EXCEPTION 'foundation route props seed left % empty rows', empty_count;
  END IF;
END $$;

COMMIT;
