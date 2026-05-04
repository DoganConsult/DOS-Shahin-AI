-- 20260505_0700_dos_master_platform_slo.sql
-- DOS Master L36 (Phase 4) — SLO + synthetic monitoring contract.
--
-- Owner: dos-master writer.
-- Doctrine binding: Article 11 (controlled tables — only dos-master may write),
--                   Article 3 (DB owns the runtime contract).
--
-- Two tables:
--   dos.platform_slo        — versioned per-service SLO declarations.
--   dos.platform_slo_event  — synthetic-prober ledger (append-only).
--
-- The slo-row-per-active-service CI guard fails if any row in
-- dos_master.service_registry status='active' lacks a matching SLO row.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.platform_slo (
  service_code            text PRIMARY KEY,
  availability_target     numeric(5,4) NOT NULL CHECK (availability_target > 0 AND availability_target <= 1),
  latency_p99_ms          integer      NOT NULL CHECK (latency_p99_ms > 0),
  error_budget_seconds_30d integer     NOT NULL CHECK (error_budget_seconds_30d >= 0),
  trust_zone              text         NOT NULL CHECK (trust_zone IN ('admin','tenant','customer')),
  created_at              timestamptz  NOT NULL DEFAULT now(),
  updated_at              timestamptz  NOT NULL DEFAULT now(),
  written_by              text         NOT NULL DEFAULT current_setting('dos.actor', true)
);

CREATE TABLE IF NOT EXISTS dos.platform_slo_event (
  id              bigserial PRIMARY KEY,
  service_code    text        NOT NULL REFERENCES dos.platform_slo(service_code),
  probed_at       timestamptz NOT NULL DEFAULT now(),
  ok              boolean     NOT NULL,
  http_status     integer,
  latency_ms      integer,
  error_message   text,
  emitted_by      text        NOT NULL DEFAULT current_setting('dos.actor', true)
);

CREATE INDEX IF NOT EXISTS ix_platform_slo_event_svc_time
  ON dos.platform_slo_event (service_code, probed_at DESC);

-- Article 11 master-only writer trigger.
CREATE OR REPLACE FUNCTION dos.trg_dos_master_only_platform_slo() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('dos.actor', true), '') <> 'dos-master' THEN
    RAISE EXCEPTION 'dos.platform_slo write rejected: actor=% (only dos-master may write)',
      coalesce(current_setting('dos.actor', true), '∅');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dos_master_only_platform_slo ON dos.platform_slo;
CREATE TRIGGER trg_dos_master_only_platform_slo
  BEFORE INSERT OR UPDATE OR DELETE ON dos.platform_slo
  FOR EACH ROW EXECUTE FUNCTION dos.trg_dos_master_only_platform_slo();

-- Event ledger writer (any writer with dos.actor set may emit).
CREATE OR REPLACE FUNCTION dos.trg_dos_master_only_platform_slo_event() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('dos.actor', true), '') = '' THEN
    RAISE EXCEPTION 'dos.platform_slo_event write rejected: dos.actor unset';
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'dos.platform_slo_event is append-only (TG_OP=%)', TG_OP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dos_master_only_platform_slo_event ON dos.platform_slo_event;
CREATE TRIGGER trg_dos_master_only_platform_slo_event
  BEFORE INSERT OR UPDATE OR DELETE ON dos.platform_slo_event
  FOR EACH ROW EXECUTE FUNCTION dos.trg_dos_master_only_platform_slo_event();

-- Seed SLO rows for every currently-active registered service so the
-- slo-row-per-active-service guard reports PASS on first migration run.
SET LOCAL dos.actor = 'dos-master';
INSERT INTO dos.platform_slo (service_code, availability_target, latency_p99_ms,
                              error_budget_seconds_30d, trust_zone)
SELECT sr.service_code,
       0.999    AS availability_target,
       500      AS latency_p99_ms,
       2592     AS error_budget_seconds_30d,    -- 0.1% of 30 days
       CASE
         WHEN sr.service_code IN ('admin-console-bff','publish-service','rollout-service','workflow-service')
              OR sr.service_code LIKE '%-os-service'
           THEN 'admin'
         WHEN sr.service_code IN ('gateway')
           THEN 'customer'
         ELSE 'tenant'
       END AS trust_zone
  FROM dos_master.service_registry sr
 WHERE sr.status = 'active'
ON CONFLICT (service_code) DO NOTHING;

COMMIT;
