CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmarks_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    owner_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmarks_items
ALTER TABLE __TENANT_SCHEMA__.benchmarks_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_items ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE __TENANT_SCHEMA__.benchmarks_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_items ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE __TENANT_SCHEMA__.benchmarks_items ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_items ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmarks_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(255) NOT NULL,
    actor_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmarks_logs
ALTER TABLE __TENANT_SCHEMA__.benchmarks_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_logs ADD COLUMN IF NOT EXISTS action VARCHAR(255);
ALTER TABLE __TENANT_SCHEMA__.benchmarks_logs ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_benchmarks_items_tenant ON __TENANT_SCHEMA__.benchmarks_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_logs_entity ON __TENANT_SCHEMA__.benchmarks_logs(tenant_id, entity_id);