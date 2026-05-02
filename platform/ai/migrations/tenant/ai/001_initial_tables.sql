CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.ai_items (
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

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(255) NOT NULL,
    actor_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_items_tenant ON __TENANT_SCHEMA__.ai_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_entity ON __TENANT_SCHEMA__.ai_logs(tenant_id, entity_id);