-- Phase 8 / M2 drift-repair — align dos.teams with the user-service
-- column list so /api/teams stops returning 500 for every caller.
--
-- The extracted user-service owns `services/user-service/src/domain/
-- team.service.ts`, which reads/writes:
--   team_id, tenant_id, name, code, description, status, department_id,
--   created_by, created_at, updated_at, deleted_at
-- The live schema (migrated by 009b + team modules) has only:
--   id, tenant_id, name, description, lead_user_id, is_active,
--   created_at, updated_at
-- This migration adds the missing columns and exposes `team_id` as a
-- stored generated copy of `id` so the foreign key from
-- dos.team_members(team_id) → dos.teams(id) keeps working while the
-- service can query by `team_id` directly.
--
-- Idempotent via IF NOT EXISTS guards + DO-block column checks.

-- ── dos.teams ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'teams' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE dos.teams ADD COLUMN team_id uuid
      GENERATED ALWAYS AS (id) STORED;
  END IF;
END
$$;

ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS code          TEXT;
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS status        TEXT DEFAULT 'active';
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS department_id uuid;
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS created_by    uuid;
ALTER TABLE dos.teams ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_team_id ON dos.teams(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_deleted_at    ON dos.teams(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teams_tenant_status ON dos.teams(tenant_id, status) WHERE deleted_at IS NULL;
