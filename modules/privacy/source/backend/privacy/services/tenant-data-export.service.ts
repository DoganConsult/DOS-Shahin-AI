// ============================================
// Shahin-Ai — Tenant Data Export Service
// GDPR Article 20: Right to data portability
// Aggregates all tenant-scoped data across
// dos schema tables and tenant-specific schemas.
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';

// === Types ===

export interface ExportTableDef {
  schema: 'dos' | 'public';
  table: string;
  tenantIdColumn: string;
  excludeColumns?: string[];
  label: string;
}

export interface TenantExportResult {
  metadata: {
    tenantId: string;
    exportedAt: string;
    formatVersion: string;
    gdprArticle: string;
    recordCounts: Record<string, number>;
    totalRecords: number;
  };
  categories: Record<string, Record<string, unknown>[]>;
}

// === Export Table Catalog ===
// All tenant-scoped tables from migration 009_service_domain_tables.sql
// plus platform tables with tenant_id filtering.

const EXPORT_CATALOG: ExportTableDef[] = [
  // Platform identity
  { schema: 'public', table: 'users', tenantIdColumn: 'tenant_id', excludeColumns: ['password_hash'], label: 'Users' },
  { schema: 'public', table: 'tenant_user_memberships', tenantIdColumn: 'tenant_id', label: 'Memberships' },

  // Workflow
  { schema: 'dos', table: 'workflow_instances', tenantIdColumn: 'tenant_id', label: 'Workflow Instances' },
  { schema: 'dos', table: 'workflow_tasks', tenantIdColumn: 'tenant_id', label: 'Workflow Tasks' },
  { schema: 'dos', table: 'workflow_approvals', tenantIdColumn: 'tenant_id', label: 'Workflow Approvals' },
  { schema: 'dos', table: 'workflow_schedules', tenantIdColumn: 'tenant_id', label: 'Workflow Schedules' },

  // Notifications
  { schema: 'dos', table: 'notifications', tenantIdColumn: 'tenant_id', label: 'Notifications' },
  { schema: 'dos', table: 'inbox_items', tenantIdColumn: 'tenant_id', label: 'Inbox Items' },

  // Risk & Incident
  { schema: 'dos', table: 'risks', tenantIdColumn: 'tenant_id', label: 'Risks' },
  { schema: 'dos', table: 'incidents', tenantIdColumn: 'tenant_id', label: 'Incidents' },

  // Compliance & Controls
  { schema: 'dos', table: 'compliance_frameworks', tenantIdColumn: 'tenant_id', label: 'Compliance Frameworks' },
  { schema: 'dos', table: 'controls', tenantIdColumn: 'tenant_id', label: 'Controls' },

  // Governance
  { schema: 'dos', table: 'policies', tenantIdColumn: 'tenant_id', label: 'Policies' },

  // Vendor
  { schema: 'dos', table: 'vendors', tenantIdColumn: 'tenant_id', label: 'Vendors' },

  // Asset
  { schema: 'dos', table: 'assets', tenantIdColumn: 'tenant_id', label: 'Assets' },

  // BCP
  { schema: 'dos', table: 'bcp_plans', tenantIdColumn: 'tenant_id', label: 'BCP Plans' },

  // Training
  { schema: 'dos', table: 'training_courses', tenantIdColumn: 'tenant_id', label: 'Training Courses' },
  { schema: 'dos', table: 'training_enrollments', tenantIdColumn: 'tenant_id', label: 'Training Enrollments' },

  // Privacy
  { schema: 'dos', table: 'privacy_assessments', tenantIdColumn: 'tenant_id', label: 'Privacy Assessments' },

  // DORA
  { schema: 'dos', table: 'dora_assessments', tenantIdColumn: 'tenant_id', label: 'DORA Assessments' },

  // Remediation
  { schema: 'dos', table: 'remediation_actions', tenantIdColumn: 'tenant_id', label: 'Remediation Actions' },

  // Evidence & Audit
  { schema: 'dos', table: 'evidence', tenantIdColumn: 'tenant_id', label: 'Evidence' },
  { schema: 'dos', table: 'audit_findings', tenantIdColumn: 'tenant_id', label: 'Audit Findings' },

  // Analytics
  { schema: 'dos', table: 'dashboards', tenantIdColumn: 'tenant_id', label: 'Dashboards' },
  { schema: 'dos', table: 'widgets', tenantIdColumn: 'tenant_id', label: 'Widgets' },
  { schema: 'dos', table: 'report_schedules', tenantIdColumn: 'tenant_id', label: 'Report Schedules' },

  // Executive
  { schema: 'dos', table: 'briefings', tenantIdColumn: 'tenant_id', label: 'Briefings' },

  // Integrations (exclude credentials column — contains encrypted secrets)
  { schema: 'dos', table: 'integrations', tenantIdColumn: 'tenant_id', excludeColumns: ['credentials'], label: 'Integrations' },

  // Portals
  { schema: 'dos', table: 'portals', tenantIdColumn: 'tenant_id', label: 'Portals' },

  // Records
  { schema: 'dos', table: 'records', tenantIdColumn: 'tenant_id', label: 'Records' },

  // Qiyas
  { schema: 'dos', table: 'qiyas_journeys', tenantIdColumn: 'tenant_id', label: 'Qiyas Journeys' },

  // AGRC
  { schema: 'dos', table: 'agrc_tasks', tenantIdColumn: 'tenant_id', label: 'AGRC Tasks' },

  // Product licenses
  { schema: 'dos', table: 'product_licenses', tenantIdColumn: 'tenant_id', label: 'Product Licenses' },

  // Audit logs
  { schema: 'dos', table: 'audit_logs', tenantIdColumn: 'tenant_id', label: 'Audit Logs' },

  // Onboarding
  { schema: 'dos', table: 'onboarding_journeys', tenantIdColumn: 'tenant_id', label: 'Onboarding Journeys' },
];

// === Core Export Function ===

export async function exportTenantData(
  tenantId: string,
  options?: { categories?: string[]; includeSoftDeleted?: boolean }
): Promise<TenantExportResult> {
  const categories: Record<string, Record<string, unknown>[]> = {};
  const recordCounts: Record<string, number> = {};
  let totalRecords = 0;

  // Filter catalog if specific categories requested
  const tablesToExport = options?.categories
    ? EXPORT_CATALOG.filter(t => options.categories!.includes(t.label.toLowerCase().replace(/\s+/g, '_')))
    : EXPORT_CATALOG;

  // Export from registered tables
  for (const tableDef of tablesToExport) {
    try {
      const rows = await exportTableData(tenantId, tableDef, options?.includeSoftDeleted ?? false);
      const key = tableDef.label.toLowerCase().replace(/\s+/g, '_');
      categories[key] = rows;
      recordCounts[key] = rows.length;
      totalRecords += rows.length;
    } catch {
      // Table may not exist yet — skip silently
      const key = tableDef.label.toLowerCase().replace(/\s+/g, '_');
      categories[key] = [];
      recordCounts[key] = 0;
    }
  }

  // Export from tenant-specific schema (dynamically discovered tables)
  const schema = tenantSchema(tenantId);
  try {
    const tenantTables = await discoverTenantSchemaTables(schema);
    for (const tableName of tenantTables) {
      try {
        const result = await safeQuery(
          `SELECT * FROM "${schema}"."${tableName}" WHERE deleted_at IS NULL OR $1`,
          [options?.includeSoftDeleted ?? false]
        );
        const key = `tenant_${tableName}`;
        categories[key] = result.rows;
        recordCounts[key] = result.rows.length;
        totalRecords += result.rows.length;
      } catch {
        // Skip tables that fail
      }
    }
  } catch {
    // Tenant schema may not exist
  }

  return {
    metadata: {
      tenantId,
      exportedAt: new Date().toISOString(),
      formatVersion: '1.0',
      gdprArticle: '20',
      recordCounts,
      totalRecords,
    },
    categories,
  };
}

// === Helper Functions ===

async function exportTableData(
  tenantId: string,
  tableDef: ExportTableDef,
  includeSoftDeleted: boolean
): Promise<Record<string, unknown>[]> {
  const qualifiedTable = `${tableDef.schema}.${tableDef.table}`;

  // Build column list (exclude sensitive columns)
  let columnSelector = '*';
  if (tableDef.excludeColumns && tableDef.excludeColumns.length > 0) {
    // Get all columns and filter out excluded ones
    const colResult = await safeQuery(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [tableDef.schema, tableDef.table]
    );
    const allColumns: string[] = colResult.rows.map((r: Record<string, unknown>) => r.column_name as string);
    const filtered = allColumns.filter(c => !tableDef.excludeColumns!.includes(c));
    columnSelector = filtered.map(c => `"${c}"`).join(', ');
  }

  // Build WHERE clause
  const conditions = [`"${tableDef.tenantIdColumn}" = $1`];
  if (!includeSoftDeleted) {
    conditions.push(`(deleted_at IS NULL OR deleted_at IS NOT NULL AND FALSE)`);
  }

  const result = await safeQuery(
    `SELECT ${columnSelector} FROM ${qualifiedTable}
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC NULLS LAST`,
    [tenantId]
  );

  return result.rows;
}

async function discoverTenantSchemaTables(schema: string): Promise<string[]> {
  const result = await safeQuery(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [schema]
  );
  return result.rows.map((r: Record<string, unknown>) => r.table_name as string);
}

// === Export Metadata (for admin/status endpoints) ===

export function getExportCatalog(): { label: string; table: string; schema: string }[] {
  return EXPORT_CATALOG.map(t => ({ label: t.label, table: t.table, schema: t.schema }));
}
