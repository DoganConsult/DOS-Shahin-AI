-- 520_phase1_cutoff_seeds.sql
-- Phase-1 production cutoff seeds (2026-04-28).
--
-- 1. Shifts-stalled alert rule (SB-5) — fires critical if no
--    ai_employee_reports landed in the last 90 minutes (the shift runner
--    is silent when it's working, so absence is the only signal).
-- 2. Disable A02 mfa_morning_sweep across tenants until the Keycloak-
--    backed MFA adapter ships (HB-5 chose the "honest skip" path; the
--    A02 tool now reports mfaSource='keycloak_not_yet_wired' but we
--    still skip the daily run to avoid noisy "no MFA data" reports).

INSERT INTO public.ai_alert_rules
  (id, tenant_id, rule_name, condition_type, condition_config, severity, message_template, is_active)
VALUES (
  gen_random_uuid(),
  NULL,
  'ai-hr-shifts-stalled-90m',
  'shifts_stalled',
  '{"windowMinutes": 90, "minExpected": 1, "throttleMinutes": 30}'::jsonb,
  'critical',
  'AI-HR shift runner appears stalled — no shifts have landed in 90 minutes. Investigate the engine cron-runner before customer-facing impact.',
  TRUE
)
ON CONFLICT DO NOTHING;

-- A02 sweep disabled for now. The shift row stays so that the moment we
-- wire a Keycloak MFA adapter, ops can `UPDATE ... SET enabled=TRUE` and
-- shifts resume without re-seeding. Per the cutoff plan, "0/0 users
-- without MFA" daily would be worse than no report.
UPDATE public.ai_employee_shifts
   SET enabled = FALSE,
       updated_at = NOW()
 WHERE agent_id = 'A02'
   AND shift_code = 'mfa_morning_sweep';
