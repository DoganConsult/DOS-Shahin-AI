-- 20260425_0002_register_seed_question_bank_down.sql
-- Removes the 8 anchor-tier seed-question entries added by the forward.
-- Safe because nothing else in the schema FKs to question_bank.id for
-- these codes (answers reference question_code as text, and removing
-- the bank rows just makes the JOIN miss again — the same state as
-- before the forward).

DELETE FROM public.onboarding_question_bank
WHERE  question_code IN (
  'org.legal_name', 'org.company_name', 'org.arabic_name',
  'org.industry',   'org.country',      'org.org_type',
  'org.employee_band', 'org.owner_title'
)
  AND  question_tier = 'anchor'
  AND  stage_code    = 'organization_identity';
