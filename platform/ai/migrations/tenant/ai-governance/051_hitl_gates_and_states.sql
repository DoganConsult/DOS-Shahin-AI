-- AI-OS Wave 2 — HITL gate + state tables (per-tenant).
--
-- The agent-governance.service createHITLGate / resolveHITLGate /
-- expireOverdueGates path INSERTs/UPDATEs into <tenant>.hitl_gates,
-- and the hitl.routes.ts queue/dashboard/review endpoints query
-- <tenant>.hitl_states. Neither table shipped with a CREATE migration,
-- so write-gated tool calls (organization.write, policy.publish, etc.)
-- failed silently or auto-approved. This migration adds the canonical
-- shape used by both code paths.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
-- Runs against the active tenant schema (search_path is set by the
-- tenant migration runner before execution).

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- hitl_gates — one row per HITL approval request raised by an agent when
-- it tries to invoke a tool whose agent_tool_permissions row is at level
-- 'approval_required'. The gate carries the proposed action context, an
-- expiry deadline, and the human reviewer's decision once resolved.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hitl_gates (
  gate_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     text NOT NULL,
  tool_name    text NOT NULL,
  action       text NOT NULL,
  context      jsonb NOT NULL DEFAULT '{}'::jsonb,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','expired','escalated')),
  decision     text,
  decided_by   text,
  decided_at   timestamptz,
  reason       text,
  requested_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hitl_gates_status
  ON hitl_gates (status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_hitl_gates_agent
  ON hitl_gates (agent_id, status);
CREATE INDEX IF NOT EXISTS idx_hitl_gates_expires
  ON hitl_gates (expires_at) WHERE status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────
-- hitl_states — review state for any AI-produced entity. Tracks per-entity
-- workflow status (ai_draft → pending_review → approved/rejected/escalated)
-- so reviewers can queue, batch-approve, and SLA-gate them. Indexed for the
-- /hitl/queue and /hitl/dashboard endpoints.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hitl_states (
  state_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      text NOT NULL,
  entity_id        text NOT NULL,
  hitl_state       text NOT NULL DEFAULT 'ai_draft'
                     CHECK (hitl_state IN ('ai_draft','pending_review','approved','rejected','escalated')),
  ai_agent_id      text,
  confidence       numeric(5,4),
  last_actor_type  text CHECK (last_actor_type IN ('human','system','agent')),
  review_required  boolean NOT NULL DEFAULT TRUE,
  review_decision  text,
  reviewer_id      text,
  reviewer_notes   text,
  created_at       timestamptz NOT NULL DEFAULT NOW(),
  updated_at       timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_hitl_states_state
  ON hitl_states (hitl_state, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_hitl_states_entity
  ON hitl_states (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_hitl_states_agent
  ON hitl_states (ai_agent_id, hitl_state);

-- ─────────────────────────────────────────────────────────────────────────
-- agent_governance_audit — companion table referenced by logAuditEntry()
-- in agent-governance.service.ts. Created here so the same migration unblocks
-- the full HITL audit trail (gate creation, gate resolution, expiry events).
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_governance_audit (
  entry_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    text NOT NULL,
  entry_type  text NOT NULL,
  action      text NOT NULL,
  result      text NOT NULL,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_governance_audit_agent
  ON agent_governance_audit (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_governance_audit_type
  ON agent_governance_audit (entry_type, created_at DESC);

COMMIT;
