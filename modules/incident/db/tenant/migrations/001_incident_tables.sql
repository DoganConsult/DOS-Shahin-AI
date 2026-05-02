-- Module: incident | Migration: 001
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  incident_ref    TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  incident_type   TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','triaged','investigating','contained','remediated','closed','post_incident')),
  impact          TEXT,
  affected_systems JSONB NOT NULL DEFAULT '[]',
  reported_by     UUID NOT NULL,
  assigned_to     UUID,
  detected_at     TIMESTAMPTZ,
  reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contained_at    TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  root_cause      TEXT,
  lessons_learned TEXT,
  is_breach       BOOLEAN NOT NULL DEFAULT FALSE,
  breach_notified BOOLEAN,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incidents
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS incident_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS incident_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('low','medium','high','critical'));
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','triaged','investigating','contained','remediated','closed','post_incident'));
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS impact TEXT;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS affected_systems JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS reported_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS detected_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS contained_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS lessons_learned TEXT;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS is_breach BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS breach_notified BOOLEAN;
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID NOT NULL REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,
  event_type      TEXT NOT NULL,
  description     TEXT NOT NULL,
  actor_id        UUID,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_timeline
ALTER TABLE __TENANT_SCHEMA__.incident_timeline ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.incident_timeline ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_timeline ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_timeline ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_timeline ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_timeline ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_capas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID NOT NULL REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,
  action_type     TEXT NOT NULL CHECK (action_type IN ('corrective','preventive')),
  title           TEXT NOT NULL,
  description     TEXT,
  assigned_to     UUID,
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','verified')),
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_capas
ALTER TABLE __TENANT_SCHEMA__.incident_capas ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.incident_capas ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_capas ADD COLUMN IF NOT EXISTS action_type TEXT CHECK (action_type IN ('corrective','preventive'));
ALTER TABLE __TENANT_SCHEMA__.incident_capas ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_capas ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_capas ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_capas ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE __TENANT_SCHEMA__.incident_capas ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','verified'));
ALTER TABLE __TENANT_SCHEMA__.incident_capas ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_capas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON __TENANT_SCHEMA__.incidents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON __TENANT_SCHEMA__.incidents(severity, status);
