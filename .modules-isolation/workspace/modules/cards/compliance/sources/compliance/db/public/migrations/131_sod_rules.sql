-- ============================================================================
-- 131_sod_rules.sql
-- Enterprise SoD (role-pair conflicts) tenant-scoped table.
--
-- Consumed by:
--   - services/auth-service/src/domain/sod/sod-engine.ts#evaluateSod
--   - services/auth-service/src/domain/sod/sod-policy.service.ts (full CRUD)
--   - services/auth-service/src/domain/access/decision-engine.ts (sod guard)
--   - services/auth-service/src/domain/delegation/delegation.service.ts
--   - services/auth-service/src/domain/delegation/delegation-automation.service.ts
--
-- Complements (do not confuse with):
--   - dos.sod_rules            (platform template, different shape)
--   - "<tenant>".module_sod_rules  (action-pair conflicts; 023_fix_template_tables.sql + seeder)
--   - "<tenant>".agent_sod_policies (human/non-human pairs; 130_agent_sod_policies.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sod_rules (
  policy_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code                 VARCHAR(100) NOT NULL,
  role_code_a               VARCHAR(100) NOT NULL,
  role_code_b               VARCHAR(100) NOT NULL,
  conflict_level            VARCHAR(20)  NOT NULL DEFAULT 'warn'
                              CHECK (conflict_level IN ('block','escalate','warn','allow')),
  enforcement               VARCHAR(20)  NOT NULL DEFAULT 'block'
                              CHECK (enforcement IN ('block','warn','log')),
  module_code               VARCHAR(100),
  description               TEXT,
  is_active                 BOOLEAN      NOT NULL DEFAULT TRUE,
  temporary_waiver_allowed  BOOLEAN      NOT NULL DEFAULT FALSE,
  waiver_max_days           INTEGER,
  created_by                VARCHAR(128),
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (rule_code)
);

CREATE INDEX IF NOT EXISTS idx_sod_rules_active_roles
  ON sod_rules (is_active, role_code_a, role_code_b);
CREATE INDEX IF NOT EXISTS idx_sod_rules_module
  ON sod_rules (module_code) WHERE module_code IS NOT NULL;

-- Tenant isolation is implicit (table lives inside the tenant schema),
-- but if a tenant_id column is ever added, mirror the RLS pattern from
-- 130_agent_sod_policies.sql.
