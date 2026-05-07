-- 20260512_0930_foundation_sod_role_and_action_layers.sql
--
-- SOD follow-up hardening:
-- - locale-complete pillars (pillarsEn/pillarsAr)
-- - active read/write role model defaults for module-settings
-- - DB-driven save/discard event handlers
-- - explicit empty-state contract copy
--
-- Idempotent and additive.

BEGIN;

UPDATE dos.ui_route_template_binding
   SET props = COALESCE(props, '{}'::jsonb)
       || jsonb_build_object(
         'writeRoles', to_jsonb(ARRAY[
           'platform_super_admin',
           'tenant_admin',
           'foundation_admin',
           'foundation_operator'
         ]),
         'eventHandlers', jsonb_build_object(
           'settings.save', jsonb_build_object(
             'method', 'redirect',
             'url', '/foundation/sod?saved=1'
           ),
           'settings.discard', jsonb_build_object(
             'method', 'redirect',
             'url', '/foundation/sod?discarded=1'
           )
         ),
         'emptyStateTitle', 'No settings available',
         'emptyStateTitleAr', 'لا توجد إعدادات متاحة',
         'emptyStateDescription', 'No settings contract has been published for this route.',
         'emptyStateDescriptionAr', 'لم يتم نشر عقد إعدادات لهذه الصفحة.',
         'pillarsEn', jsonb_build_object(
           'whyItMatters', 'SoD policy drift expands fraud and approval-risk exposure.',
           'evidence', 'Ruleset, exception queue, review cadence, and owner accountability.',
           'whatChanged', 'Conflict-rule baseline refreshed with owner and SLA controls.',
           'riskOrOpportunity', 'Reduce unauthorized combinations and overdue exceptions.'
         ),
         'pillarsAr', jsonb_build_object(
           'whyItMatters', 'انحراف سياسة فصل الواجبات يوسع مخاطر الاحتيال والاعتماد غير المنضبط.',
           'evidence', 'مجموعة القواعد، وطابور الاستثناءات، ودورية المراجعة، ومساءلة المالك.',
           'whatChanged', 'تم تحديث خط الأساس لقواعد التعارض مع ضوابط المالك واتفاقيات الخدمة.',
           'riskOrOpportunity', 'خفض التوليفات غير المصرح بها والاستثناءات المتأخرة.'
         ),
         'pillars', jsonb_build_object(
           'whyItMatters', 'SoD policy drift expands fraud and approval-risk exposure.',
           'evidence', 'Ruleset, exception queue, review cadence, and owner accountability.',
           'whatChanged', 'Conflict-rule baseline refreshed with owner and SLA controls.',
           'riskOrOpportunity', 'Reduce unauthorized combinations and overdue exceptions.'
         )
       ),
       version = GREATEST(version, 0) + 1
 WHERE route = '/foundation/sod';

DO $$
DECLARE
  ok_count INT;
BEGIN
  SELECT COUNT(*) INTO ok_count
    FROM dos.ui_route_template_binding
   WHERE route = '/foundation/sod'
     AND jsonb_typeof(props->'pillarsAr') = 'object'
     AND jsonb_typeof(props->'pillarsEn') = 'object'
     AND jsonb_typeof(props->'eventHandlers') = 'object'
     AND jsonb_typeof(props->'writeRoles') = 'array';
  IF ok_count <> 1 THEN
    RAISE EXCEPTION 'foundation/sod role/action hardening assertion failed';
  END IF;
END $$;

COMMIT;
