-- =============================================================================
-- Migration: 20260505_2700_cleanup_orphan_tenant_schemas
-- Purpose:   Clean up orphan tenant schemas for inactive tenants.
--
-- Issue:     4 inactive tenant schemas exist with full schemas but no dos.tenants.status='active':
--            - tenant_a765b0362188
--            - tenant_a7f7b3f6f0df
--            - tenant_f2a45bc25f31
--            - tenant_douhan_consult
--
-- Fix:       DROP SCHEMA CASCADE for each orphan tenant schema.
--
-- Idempotent: YES — IF EXISTS pattern for DROP SCHEMA.
--
-- NOTE: Requires elevated DBA privileges (DROP SCHEMA CASCADE).
-- =============================================================================

-- This migration requires DBA privileges to execute.
-- Run as superuser (postgres, shahin, barman, or powa_user):
-- psql -h localhost -U postgres -d shahin_grc -f /root/DOS-Platform/platform/dos/migrations/public/20260505_2700_cleanup_orphan_tenant_schemas.sql

DROP SCHEMA IF EXISTS tenant_a765b0362188 CASCADE;
DROP SCHEMA IF EXISTS tenant_a7f7b3f6f0df CASCADE;
DROP SCHEMA IF EXISTS tenant_f2a45bc25f31 CASCADE;
DROP SCHEMA IF EXISTS tenant_douhan_consult CASCADE;
