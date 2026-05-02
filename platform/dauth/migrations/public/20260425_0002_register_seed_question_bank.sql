-- 20260425_0002_register_seed_question_bank.sql
-- Reconcile a real schema/seed drift discovered while validating R4:
-- services/onboarding-service/src/application/register-tenant-user.ts seeds
-- 8 anchor-tier answers under question codes (org.legal_name,
-- org.company_name, org.arabic_name, org.industry, org.country,
-- org.org_type, org.employee_band, org.owner_title) that *do not exist*
-- anywhere in onboarding_question_bank. The bank uses a more granular
-- taxonomy (org.legal_entity_name, org.country_code, org.legal_form_type,
-- org.employee_count_exact, …).
--
-- Effect of the drift, prior to this migration:
--   • Stage progress for organization_identity could never advance from 0%
--     because the JOIN onboarding_answers ↔ onboarding_question_bank found
--     zero matches.
--   • The R3 progress recalc (count answers / count active bank questions)
--     produced misleading numbers — non-zero, but the answers weren't
--     actually for any question the bank knows about.
--
-- This migration adds the 8 seed codes as anchor-tier questions in the
-- organization_identity stage. The bank now recognizes them, JOINs land,
-- stage progress advances, and the more detailed wizard questions
-- (legal_entity_name, isic_sector_code, …) remain untouched and active.
--
-- Forward-only, additive, idempotent (UNIQUE constraint on question_code +
-- ON CONFLICT DO NOTHING).

INSERT INTO public.onboarding_question_bank (
  question_code, stage_code, question_type, label_en, label_ar,
  question_tier, is_required, is_active, sort_order, version, effective_from
) VALUES
  ('org.legal_name',    'organization_identity', 'text',   'Organization legal name',           'الاسم القانوني للمنظمة',           'anchor', TRUE,  TRUE,   1, 1, NOW()),
  ('org.company_name',  'organization_identity', 'text',   'Organization display name',         'الاسم الظاهر للمنظمة',             'anchor', FALSE, TRUE,   2, 1, NOW()),
  ('org.arabic_name',   'organization_identity', 'text',   'Arabic organization name',          'الاسم العربي للمنظمة',             'anchor', FALSE, TRUE,   3, 1, NOW()),
  ('org.industry',      'organization_identity', 'text',   'Industry / primary sector',         'الصناعة / القطاع الأساسي',          'anchor', TRUE,  TRUE,   4, 1, NOW()),
  ('org.country',       'organization_identity', 'text',   'Primary country of operations',     'البلد الرئيسي للعمليات',            'anchor', TRUE,  TRUE,   5, 1, NOW()),
  ('org.org_type',      'organization_identity', 'text',   'Organization type',                 'نوع المنظمة',                       'anchor', FALSE, TRUE,   6, 1, NOW()),
  ('org.employee_band', 'organization_identity', 'text',   'Employee size band',                'فئة عدد الموظفين',                  'anchor', FALSE, TRUE,   7, 1, NOW()),
  ('org.owner_title',   'organization_identity', 'text',   'Account-owner role / title',        'منصب صاحب الحساب',                  'anchor', FALSE, TRUE,   8, 1, NOW())
ON CONFLICT (question_code) DO NOTHING;
