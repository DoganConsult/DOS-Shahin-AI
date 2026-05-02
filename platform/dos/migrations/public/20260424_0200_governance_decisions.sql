-- F1.19 — dos.governance_decisions for the /api/governance/decisions surface.
-- Tenant-scoped board/committee decision register. No placeholder.
BEGIN;
SET search_path = public;

CREATE TABLE IF NOT EXISTS dos.governance_decisions (
  decision_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  title         TEXT NOT NULL,
  summary       TEXT,
  decision_type TEXT NOT NULL DEFAULT 'board',
  status        TEXT NOT NULL DEFAULT 'recorded',
  committee_id  UUID REFERENCES dos.committees(committee_id) ON DELETE SET NULL,
  decided_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by    VARCHAR(64),
  rationale     TEXT,
  linked_entity_type TEXT,
  linked_entity_id   VARCHAR(64),
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dos_decisions_tenant ON dos.governance_decisions(tenant_id, decided_at DESC) WHERE deleted_at IS NULL;

COMMIT;
