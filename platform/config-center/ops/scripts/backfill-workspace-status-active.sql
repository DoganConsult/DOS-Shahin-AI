-- ops/scripts/backfill-workspace-status-active.sql
--
-- One-shot backfill: tenants whose master row reads `tenants.status='active'`
-- but whose latest workspace row in `tenant_<id>.workspaces` still reads
-- `status='provisioning'` (or NULL) end up routed to /provisioning-status by
-- the bootstrap FSM (platform/dauth/services/auth-service/src/domain/session-bootstrap.service.ts:147,152)
-- even though they're fully provisioned — they poll forever.
--
-- The drift comes from `activateWorkspace()` historically only flipping
-- `tenants.status='active'` and `users.onboarding_complete=TRUE` without
-- also updating `tenant_<id>.workspaces.status`. The runtime fix landed in
-- modules/onboarding/source/backend/onboarding/services/provisioning-steps/activation-steps.ts
-- but legacy tenants need a one-time correction.
--
-- Usage (always preview first, apply explicitly):
--   sudo -u postgres psql -d shahin_grc \
--     -f ops/scripts/backfill-workspace-status-active.sql
--
--   # to actually apply, set apply=true:
--   sudo -u postgres psql -d shahin_grc \
--     -v apply=true \
--     -f ops/scripts/backfill-workspace-status-active.sql
--
-- Scope: only tenants whose master row says `active`. We never advance a
-- tenant whose master row is still `provisioning`/`failed`/`deleted` —
-- those are genuinely mid-flight or terminated and must not be touched.

\set ON_ERROR_STOP on

\if :{?apply}
\else
  \set apply 'false'
\endif

SELECT set_config('backfill.apply', :'apply', false);

\echo
\echo '════════════════════════════════════════════════════════════════════'
\echo '  Workspace-status backfill — flip provisioning → active for'
\echo '  tenants whose master row already says active'
\echo '════════════════════════════════════════════════════════════════════'
\echo

DO $$
DECLARE
  v_apply        BOOLEAN := lower(coalesce(current_setting('backfill.apply', true), 'false')) IN ('1','true','yes','on');
  r              RECORD;
  v_schema       TEXT;
  v_workspace_id UUID;
  v_ws_status    TEXT;
  v_fixed        INTEGER := 0;
  v_skipped      INTEGER := 0;
  v_no_ws        INTEGER := 0;
  v_no_schema    INTEGER := 0;
BEGIN
  FOR r IN
    SELECT tenant_id, schema_name
      FROM public.tenants
     WHERE status = 'active'
       AND schema_name IS NOT NULL
     ORDER BY tenant_id
  LOOP
    v_schema := r.schema_name;

    -- Schema may legitimately have been dropped by a prior rollback.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = v_schema
    ) THEN
      v_no_schema := v_no_schema + 1;
      RAISE NOTICE 'NO-SCHEMA  % (tenants.status=active but %.schema not present)', r.tenant_id, v_schema;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = v_schema AND table_name = 'workspaces'
    ) THEN
      v_no_schema := v_no_schema + 1;
      RAISE NOTICE 'NO-TABLE   % (%.workspaces not present)', r.tenant_id, v_schema;
      CONTINUE;
    END IF;

    EXECUTE format(
      $sql$ SELECT workspace_id, status FROM %I.workspaces ORDER BY created_at DESC LIMIT 1 $sql$,
      v_schema
    ) INTO v_workspace_id, v_ws_status;

    IF v_workspace_id IS NULL THEN
      v_no_ws := v_no_ws + 1;
      RAISE NOTICE 'NO-WS      % (no workspace row in %.workspaces)', r.tenant_id, v_schema;
      CONTINUE;
    END IF;

    IF v_ws_status = 'active' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    IF v_ws_status NOT IN ('provisioning', 'failed') THEN
      v_skipped := v_skipped + 1;
      RAISE NOTICE 'UNEXPECTED % (workspace_status=%, refusing to flip)', r.tenant_id, COALESCE(v_ws_status, 'NULL');
      CONTINUE;
    END IF;

    IF v_apply THEN
      EXECUTE format(
        $sql$ UPDATE %I.workspaces
                 SET status='active', activated_at = COALESCE(activated_at, NOW()), updated_at = NOW()
               WHERE workspace_id = $1 $sql$,
        v_schema
      ) USING v_workspace_id;
      v_fixed := v_fixed + 1;
      RAISE NOTICE 'FIXED      % (% → active)', r.tenant_id, COALESCE(v_ws_status, 'NULL');
    ELSE
      v_fixed := v_fixed + 1;
      RAISE NOTICE 'WOULD-FIX  % (% → active, set apply=true to commit)', r.tenant_id, COALESCE(v_ws_status, 'NULL');
    END IF;
  END LOOP;

  RAISE NOTICE '──────────────────────────────────────────────────────';
  RAISE NOTICE 'fixed: %, skipped: %, no_workspace_row: %, no_schema_or_table: %, apply=%',
    v_fixed, v_skipped, v_no_ws, v_no_schema, v_apply;
END $$;
