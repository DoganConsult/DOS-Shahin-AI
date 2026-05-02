-- ============================================================================
-- 122_risk_review_approval_tables.sql
-- Ported from monolith: backend/src/migrations/tenant/900_risk_review_approval_tables.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- ============================================
-- AGRC-OS Tenant Migration 900
-- Risk Review & Approval Tables
-- - risk_reviews table for review workflows
-- - risk_approval_requests table for approval workflows
-- ============================================

-- ── 1. Risk Reviews Table ──────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_reviews (
    review_id VARCHAR(32) PRIMARY KEY,
    tenant_id UUID,
    risk_id VARCHAR(32) NOT NULL,
    review_type VARCHAR(50) NOT NULL CHECK (review_type IN ('periodic', 'escalation', 'appetite_breach', 'treatment_completion', 'closure')),
    requested_by VARCHAR(64) NOT NULL,
    assigned_to VARCHAR(64),
    assigned_at TIMESTAMPTZ,
    assignment_type VARCHAR(50) DEFAULT 'manual',
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    due_date TIMESTAMPTZ,
    review_notes TEXT,
    auto_escalation_days INTEGER DEFAULT 7,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'escalated', 'completed')),
    reviewed_by VARCHAR(64),
    reviewed_at TIMESTAMPTZ,
    next_review_date TIMESTAMPTZ,
    conditions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_risk_reviews_risk FOREIGN KEY (risk_id) REFERENCES __TENANT_SCHEMA__.risks(risk_id) ON DELETE CASCADE
);

-- ── 2. Risk Approval Requests Table ───────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_approval_requests (
    approval_id VARCHAR(32) PRIMARY KEY,
    tenant_id UUID,
    risk_id VARCHAR(32) NOT NULL,
    approval_type VARCHAR(50) NOT NULL CHECK (approval_type IN ('risk_acceptance', 'treatment_plan', 'risk_closure', 'appetite_breach', 'escalation')),
    requested_by VARCHAR(64) NOT NULL,
    requested_role VARCHAR(100) NOT NULL,
    urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('normal', 'urgent', 'critical')),
    business_justification TEXT NOT NULL,
    risk_level VARCHAR(50),
    control_effectiveness TEXT,
    mitigation_plan TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated', 'delegated')),
    approved_by VARCHAR(64),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    conditions JSONB,
    delegated_to VARCHAR(64),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_risk_approval_requests_risk FOREIGN KEY (risk_id) REFERENCES __TENANT_SCHEMA__.risks(risk_id) ON DELETE CASCADE
);

-- ── 3. Indexes for Performance ─────────────────────────────

-- Risk reviews indexes
CREATE INDEX IF NOT EXISTS idx_risk_reviews_risk_id ON __TENANT_SCHEMA__.risk_reviews(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_reviews_status ON __TENANT_SCHEMA__.risk_reviews(status);
CREATE INDEX IF NOT EXISTS idx_risk_reviews_assigned_to ON __TENANT_SCHEMA__.risk_reviews(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risk_reviews_priority ON __TENANT_SCHEMA__.risk_reviews(priority DESC);
CREATE INDEX IF NOT EXISTS idx_risk_reviews_due_date ON __TENANT_SCHEMA__.risk_reviews(due_date) WHERE due_date IS NOT NULL;

-- Risk approval requests indexes
CREATE INDEX IF NOT EXISTS idx_risk_approval_requests_risk_id ON __TENANT_SCHEMA__.risk_approval_requests(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_approval_requests_status ON __TENANT_SCHEMA__.risk_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_risk_approval_requests_urgency ON __TENANT_SCHEMA__.risk_approval_requests(urgency DESC);
CREATE INDEX IF NOT EXISTS idx_risk_approval_requests_requested_role ON __TENANT_SCHEMA__.risk_approval_requests(requested_role);

-- ── 4. Update Risk Table with Conditions Column ───────

ALTER TABLE __TENANT_SCHEMA__.risks 
ADD COLUMN IF NOT EXISTS conditions JSONB;

-- ── 5. Audit Trail Integration ─────────────────────────────

-- Ensure audit trail can handle review and approval events
COMMENT ON TABLE __TENANT_SCHEMA__.risk_reviews IS 'Risk review workflow tracking with assignment and escalation support';
COMMENT ON TABLE __TENANT_SCHEMA__.risk_approval_requests IS 'Risk approval workflow tracking with DAuth integration and SoD enforcement';

-- ── 6. Row Level Security (RLS) Policies ─────────────

-- Enable RLS on review tables
ALTER TABLE __TENANT_SCHEMA__.risk_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE __TENANT_SCHEMA__.risk_approval_requests ENABLE ROW LEVEL SECURITY;

-- Phase 3A: the `authenticated_role` database role is not created by any
-- migration in this chain; it's a deployment-time role (RLS-enabled DB
-- engines like PostgREST / Supabase). Drop the TO clause so the policy
-- applies to PUBLIC (consistent with the other tenant_isolation policies
-- in 020_row_level_security.sql, which use no TO clause).
-- Phase 10J: drop-then-create keeps CREATE POLICY idempotent across
-- upgrade-DB replays (PostgreSQL has no CREATE POLICY IF NOT EXISTS).
DROP POLICY IF EXISTS risk_reviews_tenant_isolation ON __TENANT_SCHEMA__.risk_reviews;
CREATE POLICY risk_reviews_tenant_isolation ON __TENANT_SCHEMA__.risk_reviews
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS risk_approval_requests_tenant_isolation ON __TENANT_SCHEMA__.risk_approval_requests;
CREATE POLICY risk_approval_requests_tenant_isolation ON __TENANT_SCHEMA__.risk_approval_requests
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ── 7. Triggers for Updated Timestamps ─────────────────

CREATE OR REPLACE FUNCTION __TENANT_SCHEMA__.update_risk_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Phase 10J: drop-then-create keeps CREATE TRIGGER idempotent across
-- upgrade-DB replays (PostgreSQL has no CREATE TRIGGER IF NOT EXISTS
-- in versions before 14; drop-if-exists is portable).
DROP TRIGGER IF EXISTS trigger_update_risk_reviews_updated_at ON __TENANT_SCHEMA__.risk_reviews;
CREATE TRIGGER trigger_update_risk_reviews_updated_at
    BEFORE UPDATE ON __TENANT_SCHEMA__.risk_reviews
    FOR EACH ROW
    EXECUTE FUNCTION __TENANT_SCHEMA__.update_risk_reviews_updated_at();

CREATE OR REPLACE FUNCTION __TENANT_SCHEMA__.update_risk_approval_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_risk_approval_requests_updated_at ON __TENANT_SCHEMA__.risk_approval_requests;
CREATE TRIGGER trigger_update_risk_approval_requests_updated_at
    BEFORE UPDATE ON __TENANT_SCHEMA__.risk_approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION __TENANT_SCHEMA__.update_risk_approval_requests_updated_at();
