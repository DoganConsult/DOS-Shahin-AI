-- ============================================================================
-- 111_ai_model_risk_management_enhancement.sql
-- Ported from monolith: backend/src/migrations/tenant/360_ai_model_risk_management_enhancement.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- ============================================================
-- Migration 360: AI Model Risk Management Enhancement
-- Enhances AI System Registry with model versioning, risk scoring,
-- lifecycle management, and automated risk calculation
-- ============================================================

-- ── Enhanced AI System Registry (if not exists, create basic structure) ──
CREATE TABLE IF NOT EXISTS ai_system_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name VARCHAR(255) NOT NULL,
  description TEXT,
  risk_level VARCHAR(50) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated', 'archived')),
  purpose TEXT,
  sector VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure expected columns for 360 logic exist (for drifts from other migrations)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema AND table_name = 'ai_system_registry' AND column_name = 'status') THEN
    ALTER TABLE ai_system_registry ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema AND table_name = 'ai_system_registry' AND column_name = 'risk_level') THEN
    ALTER TABLE ai_system_registry ADD COLUMN risk_level VARCHAR(50) DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema AND table_name = 'ai_system_registry' AND column_name = 'system_name') THEN
    ALTER TABLE ai_system_registry ADD COLUMN system_name VARCHAR(255) DEFAULT 'Unnamed AI System';
  END IF;

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ai_system_registry_status ON ai_system_registry(status)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ai_system_registry_risk ON ai_system_registry(risk_level)';
END $$;

-- ── AI Model Registry Enhancement (extends existing ai_model_registry) ──
-- Add columns to existing ai_model_registry if they don't exist
DO $$
BEGIN
  -- Model type (LLM, classifier, regressor, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = current_schema AND table_name = 'ai_model_registry' AND column_name = 'model_type') THEN
    ALTER TABLE ai_model_registry ADD COLUMN model_type VARCHAR(50);
  END IF;

  -- Model family (GPT-4, Claude, Llama, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = current_schema AND table_name = 'ai_model_registry' AND column_name = 'model_family') THEN
    ALTER TABLE ai_model_registry ADD COLUMN model_family VARCHAR(100);
  END IF;

  -- Deployment environment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = current_schema AND table_name = 'ai_model_registry' AND column_name = 'deployment_environment') THEN
    ALTER TABLE ai_model_registry ADD COLUMN deployment_environment VARCHAR(50) 
      DEFAULT 'production' CHECK (deployment_environment IN ('development', 'staging', 'production'));
  END IF;

  -- Training data summary
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = current_schema AND table_name = 'ai_model_registry' AND column_name = 'training_data_summary') THEN
    ALTER TABLE ai_model_registry ADD COLUMN training_data_summary JSONB DEFAULT '{}';
  END IF;

  -- Performance metrics
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = current_schema AND table_name = 'ai_model_registry' AND column_name = 'performance_metrics') THEN
    ALTER TABLE ai_model_registry ADD COLUMN performance_metrics JSONB DEFAULT '{}';
  END IF;

  -- Risk classification (EU AI Act)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = current_schema AND table_name = 'ai_model_registry' AND column_name = 'risk_classification') THEN
    ALTER TABLE ai_model_registry ADD COLUMN risk_classification VARCHAR(50) 
      CHECK (risk_classification IN ('minimal', 'limited', 'high', 'unacceptable'));
  END IF;

  -- Deployed at timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = current_schema AND table_name = 'ai_model_registry' AND column_name = 'deployed_at') THEN
    ALTER TABLE ai_model_registry ADD COLUMN deployed_at TIMESTAMPTZ;
  END IF;

  -- Retired at timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = current_schema AND table_name = 'ai_model_registry' AND column_name = 'retired_at') THEN
    ALTER TABLE ai_model_registry ADD COLUMN retired_at TIMESTAMPTZ;
  END IF;

  -- System ID reference (link to ai_system_registry)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = current_schema AND table_name = 'ai_model_registry' AND column_name = 'system_id') THEN
    ALTER TABLE ai_model_registry ADD COLUMN system_id UUID REFERENCES ai_system_registry(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Model Risk Scoring Table ──
CREATE TABLE IF NOT EXISTS ai_model_risk_scores (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id UUID REFERENCES ai_model_registry(model_version_id) ON DELETE CASCADE,
  system_id UUID REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  
  -- Risk dimensions (0.0 to 1.0)
  data_risk_score DECIMAL(3,2) DEFAULT 0.0 CHECK (data_risk_score >= 0 AND data_risk_score <= 1),
  model_risk_score DECIMAL(3,2) DEFAULT 0.0 CHECK (model_risk_score >= 0 AND model_risk_score <= 1),
  operational_risk_score DECIMAL(3,2) DEFAULT 0.0 CHECK (operational_risk_score >= 0 AND operational_risk_score <= 1),
  compliance_risk_score DECIMAL(3,2) DEFAULT 0.0 CHECK (compliance_risk_score >= 0 AND compliance_risk_score <= 1),
  
  -- Composite risk score (weighted average)
  composite_risk_score DECIMAL(3,2) DEFAULT 0.0 CHECK (composite_risk_score >= 0 AND composite_risk_score <= 1),
  
  -- Risk factors (structured breakdown)
  risk_factors JSONB DEFAULT '{}',
  
  -- Scoring metadata
  scoring_method VARCHAR(50) DEFAULT 'automated',
  scored_by VARCHAR(64),
  scored_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Version tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_model_risk_scores_model ON ai_model_risk_scores(model_version_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_risk_scores_system ON ai_model_risk_scores(system_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_risk_scores_composite ON ai_model_risk_scores(composite_risk_score DESC);

-- ── Model Lifecycle States ──
CREATE TABLE IF NOT EXISTS ai_model_lifecycle (
  lifecycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id UUID NOT NULL REFERENCES ai_model_registry(model_version_id) ON DELETE CASCADE,
  system_id UUID REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  
  -- Current state
  current_state VARCHAR(50) NOT NULL DEFAULT 'development' 
    CHECK (current_state IN ('development', 'validation', 'staging', 'production', 'deprecated', 'archived')),
  
  -- State transitions
  previous_state VARCHAR(50),
  transition_reason TEXT,
  transitioned_by VARCHAR(64),
  transitioned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Approval gates
  requires_approval BOOLEAN DEFAULT TRUE,
  approval_status VARCHAR(50) DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'not_required')),
  approved_by VARCHAR(64),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  -- Retirement criteria
  retirement_reason TEXT,
  retirement_criteria_met JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_model_lifecycle_model ON ai_model_lifecycle(model_version_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_lifecycle_state ON ai_model_lifecycle(current_state);
CREATE INDEX IF NOT EXISTS idx_ai_model_lifecycle_approval ON ai_model_lifecycle(approval_status) WHERE approval_status = 'pending';

-- ── Model Risk Assessment History ──
CREATE TABLE IF NOT EXISTS ai_model_risk_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id UUID REFERENCES ai_model_registry(model_version_id) ON DELETE CASCADE,
  system_id UUID REFERENCES ai_system_registry(id) ON DELETE CASCADE,
  
  -- Assessment details
  assessment_type VARCHAR(50) NOT NULL DEFAULT 'automated' 
    CHECK (assessment_type IN ('automated', 'manual', 'hybrid', 'external_audit')),
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Risk findings
  risk_findings JSONB DEFAULT '[]',
  risk_level VARCHAR(50) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Recommendations
  recommendations JSONB DEFAULT '[]',
  remediation_required BOOLEAN DEFAULT FALSE,
  
  -- Assessor info
  assessed_by VARCHAR(64),
  assessment_notes TEXT,
  
  -- Next assessment
  next_assessment_due DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_model_risk_assessments_model ON ai_model_risk_assessments(model_version_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_risk_assessments_system ON ai_model_risk_assessments(system_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_risk_assessments_due ON ai_model_risk_assessments(next_assessment_due) WHERE next_assessment_due IS NOT NULL;

-- ── Comments for documentation ──
COMMENT ON TABLE ai_model_risk_scores IS 'Automated and manual risk scoring for AI models across data, model, operational, and compliance dimensions';
COMMENT ON TABLE ai_model_lifecycle IS 'Tracks model lifecycle state transitions with approval gates and retirement criteria';
COMMENT ON TABLE ai_model_risk_assessments IS 'Historical record of risk assessments for AI models with remediation tracking';
