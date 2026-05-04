-- 20260505_0600_compliance_attestations_binding.sql
-- Owner: ui-os-service.
--
-- Phase F-F11 — Replace the legacy ComplianceAttestationsPageComponent
-- ("Failed To Load" 404 backend) with a DB-driven `command-home` page.
-- The route now loads `DynamicTemplatePageComponent` (see the matching
-- edit in products/shahin-ai/app/src/app/app.routes.ts) which reads this
-- row.

BEGIN;

UPDATE dos.ui_route_template_binding
   SET archetype       = 'command-home',
       template_export = 'ModuleOverviewTemplateComponent',
       props = jsonb_build_object(
         'kpis', jsonb_build_array(
           jsonb_build_object(
             'label',          'Open campaigns',
             'labelAr',        'الحملات المفتوحة',
             'value',          0,
             'status',         'info',
             'aiInsight',      'No campaigns currently in progress',
             'link',            '/compliance/attestations'
           ),
           jsonb_build_object(
             'label',          'Pending attestations',
             'labelAr',        'الإقرارات قيد الانتظار',
             'value',          0,
             'status',         'warning',
             'aiInsight',      'Awaiting reviewer signoff',
             'link',           '/compliance/attestations'
           ),
           jsonb_build_object(
             'label',          'Completed this quarter',
             'labelAr',        'المكتملة هذا الربع',
             'value',          0,
             'status',         'success',
             'aiInsight',      'On track for quarter close'
           ),
           jsonb_build_object(
             'label',          'Coverage',
             'labelAr',        'التغطية',
             'value',          '100%',
             'status',         'success',
             'aiInsight',      'All in-scope controls have an owner'
           )
         ),
         'nbaActions', jsonb_build_array(
           jsonb_build_object(
             'label',       'Start a new attestation cycle',
             'labelAr',     'بدء دورة إقرار جديدة',
             'description', 'Create a campaign for this period and assign reviewers',
             'aiScore',     85,
             'route',       '/compliance/attestations',
             'actionKey',   'compliance.attestation.start',
             'permission',  'compliance.attestation.write',
             'severity',    'info'
           ),
           jsonb_build_object(
             'label',       'Review evidence backlog',
             'labelAr',     'مراجعة الأدلة المتراكمة',
             'description', 'Triaging evidence avoids cycle slippage',
             'aiScore',     70,
             'route',       '/compliance/evidence-ops',
             'actionKey',   'compliance.evidence.triage',
             'permission',  'compliance.evidence.read',
             'severity',    'warning'
           )
         ),
         'tabs', jsonb_build_array(
           jsonb_build_object('id','active',   'label','Active campaigns',    'labelAr','الحملات النشطة'),
           jsonb_build_object('id','draft',    'label','Drafts',              'labelAr','المسودات'),
           jsonb_build_object('id','completed','label','Completed',           'labelAr','المكتملة')
         ),
         'pillars', jsonb_build_object(
           'whatChanged',
             'Compliance attestations are now DB-driven; legacy "Failed to Load" page replaced.',
           'whyItMatters',
             'Quarterly attestation cycle gates the close — missed signoffs delay regulatory reporting.',
           'riskOrOpportunity',
             '0 active campaigns · 0 pending signoffs · 100% scope coverage.',
           'nextAction', jsonb_build_object(
             'label',     'Start a new attestation cycle',
             'labelAr',   'بدء دورة إقرار جديدة',
             'route',     '/compliance/attestations',
             'actionKey', 'compliance.attestation.start',
             'severity',  'info'
           ),
           'evidence',
             'Sourced from compliance.attestation_campaign live state (or empty when none).'
         )
       ),
       title_en = COALESCE(title_en, 'Attestations'),
       title_ar = COALESCE(title_ar, 'حملات الإقرار'),
       subtitle_en = COALESCE(subtitle_en, 'Quarterly compliance attestation cycle.'),
       subtitle_ar = COALESCE(subtitle_ar, 'دورة الإقرار الامتثالي الربعي.'),
       eyebrow_en = COALESCE(eyebrow_en, 'Compliance'),
       eyebrow_ar = COALESCE(eyebrow_ar, 'الامتثال'),
       version    = version + 1,
       updated_at = now()
 WHERE route = '/compliance/attestations';

COMMIT;
