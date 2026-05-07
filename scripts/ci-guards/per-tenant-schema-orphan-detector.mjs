#!/usr/bin/env node
/**
 * Per-Tenant Schema Orphan Detector
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/per-tenant-schema-orphan-detector.mjs [OPTIONS]

Fails if any tenant_<id> schema exists for a tenant whose dos.tenants.status != 'active'.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Exit codes:
  0 — No orphan schemas detected
  1 — Orphan schemas detected
  2 — Database connection error

Examples:
  # Run per-tenant schema orphan detector
  node scripts/ci-guards/per-tenant-schema-orphan-detector.mjs
`);
  process.exit(0);
}

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

async function checkPerTenantSchemaOrphans() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Load explicit allow-list (legitimate schemas without registry rows).
    let allowSet = new Set();
    try {
      const allow = await pool.query(`SELECT schema_name FROM dos.tenant_schema_allowlist`);
      allowSet = new Set(allow.rows.map(r => r.schema_name));
    } catch {
      // Table may not exist on older DBs — fall through with empty set.
    }
    
    // Get all tenant schemas
    const schemasResult = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
      ORDER BY schema_name
    `);
    
    const orphanSchemas = [];
    
    for (const row of schemasResult.rows) {
      const schemaName = row.schema_name;
      if (allowSet.has(schemaName)) continue; // explicit triage row
      const tenantId = schemaName.replace('tenant_', '');
      
      // Resolve via schema_name first (canonical link); fall back to tenant_id for legacy rows.
      const tenantCheck = await pool.query(
        `SELECT status FROM dos.tenants WHERE schema_name = $1 OR tenant_id = $2`,
        [schemaName, tenantId]
      );
      
      if (tenantCheck.rows.length === 0) {
        orphanSchemas.push({ schema: schemaName, reason: 'tenant does not exist' });
      } else if (tenantCheck.rows[0].status !== 'active') {
        orphanSchemas.push({ 
          schema: schemaName, 
          tenant_id: tenantId,
          status: tenantCheck.rows[0].status,
          reason: 'tenant is not active'
        });
      }
    }
    
    if (orphanSchemas.length > 0) {
      console.error('❌ Orphan tenant schemas detected:');
      orphanSchemas.forEach(s => {
        console.error(`  - ${s.schema}: ${s.reason}${s.tenant_id ? ` (tenant: ${s.tenant_id}, status: ${s.status})` : ''}`);
      });
      console.error(`\nTotal orphan schemas: ${orphanSchemas.length}`);
      console.error('\nTo fix: Run migration to DROP orphan schemas (requires DBA privileges)');
      process.exit(1);
    }
    
    console.log('✅ Per-tenant schema orphan check passed');
    console.log(`   Checked ${schemasResult.rows.length} tenant schemas`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

checkPerTenantSchemaOrphans();
