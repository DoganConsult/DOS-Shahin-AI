-- AI-OS Wave 2 — Per-tenant event_outbox.
--
-- Required by modules/compliance/application/event-publisher and the
-- companion dispatcher/dlq/retry/archive sub-verticals. Without this
-- table the durable outbox pattern degrades to in-process pub/sub and
-- cross-service event delivery is best-effort only.
--
-- The catch-up producer in ai-engine-service uses the same shape so the
-- dispatcher running in modules/compliance can drain events that were
-- synthesized from changed domain rows.
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS.

BEGIN;

CREATE TABLE IF NOT EXISTS event_outbox (
  event_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL,
  aggregate_type  text NOT NULL,
  aggregate_id    text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','dispatched','failed')),
  attempts        integer NOT NULL DEFAULT 0,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  dispatched_at   timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_outbox_pending
  ON event_outbox (created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_event_outbox_type
  ON event_outbox (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_outbox_aggregate
  ON event_outbox (aggregate_type, aggregate_id);

-- Cursor table for the catch-up producer in ai-engine-service. One row
-- per (entity_type) per tenant; tracks the last created_at scanned so
-- the producer doesn't re-emit historical rows on every poll.
CREATE TABLE IF NOT EXISTS ai_event_producer_cursors (
  entity_type     text PRIMARY KEY,
  last_seen_at    timestamptz NOT NULL DEFAULT NOW() - INTERVAL '7 days',
  last_run_at     timestamptz,
  rows_emitted    bigint NOT NULL DEFAULT 0
);

COMMIT;
