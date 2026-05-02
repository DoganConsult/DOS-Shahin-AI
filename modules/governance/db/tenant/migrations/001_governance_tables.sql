-- Module: governance | Migration: 001
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_boards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  board_type      TEXT NOT NULL DEFAULT 'risk_committee',
  status          TEXT NOT NULL DEFAULT 'active',
  chairperson_id  UUID,
  members         JSONB NOT NULL DEFAULT '[]',
  meeting_frequency TEXT,
  quorum_threshold INTEGER NOT NULL DEFAULT 50,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_boards
ALTER TABLE __TENANT_SCHEMA__.governance_boards ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_boards ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_boards ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_boards ADD COLUMN IF NOT EXISTS board_type TEXT NOT NULL DEFAULT 'risk_committee';
ALTER TABLE __TENANT_SCHEMA__.governance_boards ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.governance_boards ADD COLUMN IF NOT EXISTS chairperson_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_boards ADD COLUMN IF NOT EXISTS members JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.governance_boards ADD COLUMN IF NOT EXISTS meeting_frequency TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_boards ADD COLUMN IF NOT EXISTS quorum_threshold INTEGER NOT NULL DEFAULT 50;
ALTER TABLE __TENANT_SCHEMA__.governance_boards ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_boards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_boards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.board_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  board_id        UUID NOT NULL REFERENCES __TENANT_SCHEMA__.governance_boards(id) ON DELETE CASCADE,
  decision_ref    TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  decision_type   TEXT NOT NULL DEFAULT 'resolution',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','under_review','approved','rejected','deferred')),
  decided_by      UUID,
  decided_at      TIMESTAMPTZ,
  rationale       TEXT,
  minutes_ref     TEXT,
  entity_type     TEXT,
  entity_id       UUID,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.board_decisions
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES __TENANT_SCHEMA__.governance_boards(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS decision_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS decision_type TEXT NOT NULL DEFAULT 'resolution';
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','under_review','approved','rejected','deferred'));
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS decided_by UUID;
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS rationale TEXT;
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS minutes_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.board_decisions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  board_id        UUID NOT NULL REFERENCES __TENANT_SCHEMA__.governance_boards(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  held_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','held','cancelled','postponed')),
  agenda          JSONB NOT NULL DEFAULT '[]',
  attendees       JSONB NOT NULL DEFAULT '[]',
  minutes         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_meetings
ALTER TABLE __TENANT_SCHEMA__.governance_meetings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_meetings ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES __TENANT_SCHEMA__.governance_boards(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.governance_meetings ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_meetings ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.governance_meetings ADD COLUMN IF NOT EXISTS held_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.governance_meetings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','held','cancelled','postponed'));
ALTER TABLE __TENANT_SCHEMA__.governance_meetings ADD COLUMN IF NOT EXISTS agenda JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.governance_meetings ADD COLUMN IF NOT EXISTS attendees JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.governance_meetings ADD COLUMN IF NOT EXISTS minutes TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_meetings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_health_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  score_type      TEXT NOT NULL,
  score           NUMERIC(5,2) NOT NULL,
  components      JSONB NOT NULL DEFAULT '{}',
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start    DATE,
  period_end      DATE
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_health_scores
ALTER TABLE __TENANT_SCHEMA__.governance_health_scores ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_health_scores ADD COLUMN IF NOT EXISTS score_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_health_scores ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.governance_health_scores ADD COLUMN IF NOT EXISTS components JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.governance_health_scores ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_health_scores ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_health_scores ADD COLUMN IF NOT EXISTS period_end DATE;
CREATE INDEX IF NOT EXISTS idx_board_decisions_tenant ON __TENANT_SCHEMA__.board_decisions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_governance_health_tenant ON __TENANT_SCHEMA__.governance_health_scores(tenant_id, score_type);
