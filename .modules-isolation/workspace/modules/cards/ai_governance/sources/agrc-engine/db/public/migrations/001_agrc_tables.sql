-- agrc-os-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.agrc_tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  assigned_to VARCHAR(64),
  due_date DATE,
  source_module VARCHAR(100),
  source_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_agrc_tasks_tenant ON dos.agrc_tasks (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agrc_tasks_status ON dos.agrc_tasks (tenant_id, status);

COMMIT;
