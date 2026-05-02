/**
 * Tenant Data Export Tool (GDPR Article 20)
 * Aggregates all specific module records tied directly to a provided UUID.
 */

import { Pool } from 'pg';
import * as fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://shahin:shahin_grc_2024@localhost:5432/shahin_grc',
});

const tenantId = process.argv[2];

if (!tenantId) {
  console.error("Usage: ts-node tenant-data-export.ts <tenant-id>");
  process.exit(1);
}

async function exportTenantData() {
  const exportDoc: any = {
    metadata: {
      generatedAt: new Date().toISOString(),
      tenantId: tenantId,
      governingAuthority: 'Article 20 Output',
    },
    data: {}
  };

  try {
    const modulesToScan = [
      'users',
      'risk_register',
      'compliance_frameworks',
      'compliance_controls',
      'audit_plans',
      'incident_reports'
    ];

    const client = await pool.connect();
    
    // Explicit safety isolation scope — parameterized per Phase 2 convention
    await client.query("SELECT set_config('rls.tenant_id', $1, true)", [tenantId]).catch(() => null);

    for (const mod of modulesToScan) {
      try {
        const records = await client.query(`SELECT * FROM dos.${mod} WHERE tenant_id = $1`, [tenantId]);
        exportDoc.data[mod] = records.rows;
      } catch (e: any) {
        if (!e.message.includes('does not exist')) {
            console.error(`Warning: Failed fetching schema layer ${mod}:`, e.message);
        }
      }
    }

    client.release();

    const outputName = `GDPR_EXPORT_${tenantId}_${Date.now()}.json`;
    fs.writeFileSync(outputName, JSON.stringify(exportDoc, null, 2));

    console.log(`✅ Extracted structured compliance export successfully: ${outputName}`);

  } catch(e) {
    console.error("Export failure: ", e);
  } finally {
    pool.end();
  }
}

exportTenantData();
