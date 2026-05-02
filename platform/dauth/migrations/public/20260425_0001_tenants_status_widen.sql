-- 20260425_0001_tenants_status_widen.sql
-- Align public.tenants.status CHECK with the documented registration FSM
-- (modules/onboarding/.../constants/registration-lifecycle.constants.ts) plus
-- the admin/terminal states the codebase writes.
--
-- FSM transitions (getNextLifecycleState):
--   registered -> email_pending -> verified -> provisioning
--               -> onboarding_ready -> active
-- Plus admin/terminal states actually written by other code paths:
--   onboarding (legacy alias kept from prior CHECK), suspended, archived,
--   pending (admin-imposed hold), deleted (soft-delete on rollback).
--
-- Prior constraint (from 20260422_0002_keycloak_bootstrap_align.sql) only
-- permitted: registered, onboarding, active, suspended, archived, pending.
-- That made every legitimate write of provisioning / onboarding_ready /
-- email_pending / verified / deleted throw a CHECK violation at runtime,
-- which broke onboarding completion (completion.service.ts:122),
-- the workflow step runner (advanceRegistrationLifecycle), and the
-- rollback path (provisioning-rollback.service.ts:120).
--
-- Forward-only, additive, idempotent.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tenants'::regclass
      AND conname  = 'tenants_status_check'
  ) THEN
    ALTER TABLE public.tenants DROP CONSTRAINT tenants_status_check;
  END IF;
END $$;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_status_check
  CHECK (status IN (
    'registered',
    'email_pending',
    'verified',
    'onboarding',
    'provisioning',
    'onboarding_ready',
    'active',
    'suspended',
    'archived',
    'pending',
    'deleted'
  ));

COMMENT ON CONSTRAINT tenants_status_check ON public.tenants IS
  'Tenant lifecycle FSM (registered -> email_pending -> verified -> provisioning -> onboarding_ready -> active) plus admin states (onboarding, suspended, archived, pending) and soft-delete terminal (deleted). Source of truth: registration-lifecycle.constants.ts.';
