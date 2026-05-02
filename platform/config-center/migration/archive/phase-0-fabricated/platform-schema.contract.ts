/**
 * Schema Contract -- Platform Service Database Structures
 * Per DOS-AIO-Specs: Schema Contract is one of 5 mandatory contract layers.
 * Defines table structures, constraints, indexes, and migration classification.
 *
 * This contract covers Milestone 1 platform service tables only.
 * Domain module tables (compliance, risk) are defined in their own schema contracts.
 */

// --- Schema Contract Type ---

export interface TableSchemaContract {
  tableName: string;
  ownerService: string;
  schema: 'public' | 'tenant';
  columns: ColumnDefinition[];
  primaryKey: string[];
  uniqueConstraints?: string[][];
  indexes?: IndexDefinition[];
  foreignKeys?: ForeignKeyDefinition[];
  migrationClassification: 'baseline' | 'additive' | 'corrective' | 'rename' | 'destructive' | 'backfill' | 'deprecation' | 'archival';
}

export interface ColumnDefinition {
  name: string;
  type: string;          // PostgreSQL type: uuid, text, timestamptz, integer, boolean, jsonb, etc.
  nullable: boolean;
  default?: string;
  description?: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface ForeignKeyDefinition {
  columns: string[];
  referencesTable: string;
  referencesColumns: string[];
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

// --- Auth Service Core Tables ---

export const AUTH_SCHEMA: TableSchemaContract[] = [
  {
    tableName: 'users',
    ownerService: 'auth-service',
    schema: 'public',
    migrationClassification: 'baseline',
    primaryKey: ['id'],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'email', type: 'text', nullable: false },
      { name: 'password_hash', type: 'text', nullable: true, description: 'null for SSO/SAML users' },
      { name: 'display_name', type: 'text', nullable: false },
      { name: 'status', type: 'text', nullable: false, default: "'active'" },
      { name: 'email_verified', type: 'boolean', nullable: false, default: 'false' },
      { name: 'mfa_enabled', type: 'boolean', nullable: false, default: 'false' },
      { name: 'last_login_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()' },
    ],
    uniqueConstraints: [['email']],
    indexes: [
      { name: 'idx_users_email', columns: ['email'], unique: true },
      { name: 'idx_users_status', columns: ['status'], unique: false },
    ],
  },
  {
    tableName: 'sessions',
    ownerService: 'auth-service',
    schema: 'public',
    migrationClassification: 'baseline',
    primaryKey: ['id'],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'tenant_id', type: 'uuid', nullable: true },
      { name: 'token_hash', type: 'text', nullable: false },
      { name: 'ip_address', type: 'text', nullable: true },
      { name: 'user_agent', type: 'text', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
    ],
    foreignKeys: [
      { columns: ['user_id'], referencesTable: 'users', referencesColumns: ['id'], onDelete: 'CASCADE' },
    ],
    indexes: [
      { name: 'idx_sessions_user_id', columns: ['user_id'], unique: false },
      { name: 'idx_sessions_expires', columns: ['expires_at'], unique: false },
    ],
  },
  {
    tableName: 'permissions',
    ownerService: 'auth-service',
    schema: 'public',
    migrationClassification: 'baseline',
    primaryKey: ['id'],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'code', type: 'text', nullable: false, description: 'Format: <scope>:<resource>:<action>' },
      { name: 'display_name', type: 'text', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'owner_scope', type: 'text', nullable: false, description: 'platform | product' },
      { name: 'module_code', type: 'text', nullable: true },
      { name: 'resource', type: 'text', nullable: false },
      { name: 'action', type: 'text', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
    ],
    uniqueConstraints: [['code']],
    indexes: [
      { name: 'idx_permissions_code', columns: ['code'], unique: true },
      { name: 'idx_permissions_module', columns: ['module_code'], unique: false },
    ],
  },
];

// --- Tenant Service Core Tables ---

export const TENANT_SCHEMA: TableSchemaContract[] = [
  {
    tableName: 'tenants',
    ownerService: 'tenant-service',
    schema: 'public',
    migrationClassification: 'baseline',
    primaryKey: ['id'],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'name', type: 'text', nullable: false },
      { name: 'slug', type: 'text', nullable: false },
      { name: 'status', type: 'text', nullable: false, default: "'active'" },
      { name: 'schema_name', type: 'text', nullable: false, description: 'tenant_<uuid_underscored>' },
      { name: 'owner_user_id', type: 'uuid', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()' },
    ],
    uniqueConstraints: [['slug'], ['schema_name']],
    indexes: [
      { name: 'idx_tenants_slug', columns: ['slug'], unique: true },
      { name: 'idx_tenants_status', columns: ['status'], unique: false },
    ],
    foreignKeys: [
      { columns: ['owner_user_id'], referencesTable: 'users', referencesColumns: ['id'], onDelete: 'RESTRICT' },
    ],
  },
];

// --- Workflow Service Core Tables ---

export const WORKFLOW_SCHEMA: TableSchemaContract[] = [
  {
    tableName: 'workflow_instances',
    ownerService: 'workflow-service',
    schema: 'tenant',
    migrationClassification: 'baseline',
    primaryKey: ['id'],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'workflow_type', type: 'text', nullable: false },
      { name: 'entity_type', type: 'text', nullable: false },
      { name: 'entity_id', type: 'uuid', nullable: false },
      { name: 'status', type: 'text', nullable: false, default: "'pending'" },
      { name: 'current_step', type: 'text', nullable: true },
      { name: 'initiated_by', type: 'uuid', nullable: false },
      { name: 'metadata', type: 'jsonb', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()' },
      { name: 'completed_at', type: 'timestamptz', nullable: true },
    ],
    indexes: [
      { name: 'idx_wf_instances_entity', columns: ['entity_type', 'entity_id'], unique: false },
      { name: 'idx_wf_instances_status', columns: ['status'], unique: false },
      { name: 'idx_wf_instances_type', columns: ['workflow_type'], unique: false },
    ],
  },
];

// --- Audit Service Core Tables ---

export const AUDIT_SCHEMA: TableSchemaContract[] = [
  {
    tableName: 'audit_trail',
    ownerService: 'audit-service',
    schema: 'tenant',
    migrationClassification: 'baseline',
    primaryKey: ['id'],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      { name: 'actor_id', type: 'uuid', nullable: false },
      { name: 'actor_type', type: 'text', nullable: false },
      { name: 'module_code', type: 'text', nullable: false },
      { name: 'entity_type', type: 'text', nullable: false },
      { name: 'entity_id', type: 'uuid', nullable: false },
      { name: 'action', type: 'text', nullable: false },
      { name: 'before_summary', type: 'jsonb', nullable: true },
      { name: 'after_summary', type: 'jsonb', nullable: true },
      { name: 'correlation_id', type: 'text', nullable: true },
      { name: 'source', type: 'text', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
    ],
    indexes: [
      { name: 'idx_audit_trail_entity', columns: ['entity_type', 'entity_id'], unique: false },
      { name: 'idx_audit_trail_actor', columns: ['actor_id'], unique: false },
      { name: 'idx_audit_trail_module', columns: ['module_code'], unique: false },
      { name: 'idx_audit_trail_created', columns: ['created_at'], unique: false },
    ],
  },
];
