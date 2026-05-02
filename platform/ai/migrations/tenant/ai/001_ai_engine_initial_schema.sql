-- Service: ai-engine-service
-- Migration: 001_ai_engine_initial_schema.sql
-- Description: Central AI schema for providers, memory, and invocation execution state.

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(50) NOT NULL UNIQUE,
    api_key_encrypted TEXT NOT NULL,
    -- Phase 3A: 'URL' is not a Postgres built-in type. Use TEXT; application
    -- layer validates the URL shape.
    base_endpoint TEXT,
    is_active BOOLEAN DEFAULT true,
    routing_priority INT DEFAULT 1,
    configuration_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".ai_agent_executions (
    execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_code VARCHAR(100) NOT NULL,
    user_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    input_payload JSONB,
    output_result JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".ai_memory_store (
    memory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL,
    agent_code VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    token_count INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_exec_status ON "__TENANT_SCHEMA__".ai_agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_ai_memory_thread ON "__TENANT_SCHEMA__".ai_memory_store(thread_id);
