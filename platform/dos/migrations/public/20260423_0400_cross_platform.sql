-- 20260423_0400_cross_platform.sql
-- Cross-platform concerns: outbox pattern for guaranteed event delivery,
-- idempotency keys for safe retries. Live in platform_dos as host schema.

CREATE TABLE IF NOT EXISTS platform_dos.outbox (
  id              BIGSERIAL PRIMARY KEY,
  aggregate_type  TEXT NOT NULL,
  aggregate_id    TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  tenant_id       TEXT NOT NULL,
  payload         JSONB NOT NULL,
  correlation_id  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','published','failed','skipped')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  available_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending
  ON platform_dos.outbox (status, available_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate
  ON platform_dos.outbox (aggregate_type, aggregate_id, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_dos.idempotency_keys (
  key             TEXT NOT NULL,
  tenant_id       TEXT NOT NULL,
  request_hash    TEXT NOT NULL,
  response_status INTEGER,
  response_body   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  PRIMARY KEY (tenant_id, key)
);
CREATE INDEX IF NOT EXISTS idx_idem_expires
  ON platform_dos.idempotency_keys (expires_at);
