#!/usr/bin/env node
// ============================================================================
// validate-ai-rls.mjs
// PRR gate: asserts every AI-domain tenant table has RLS enabled + forced
// and owns a tenant_isolation policy.
//
// Scope (regex): ^(ai_|copilot_|agent_|mcp_|agrc_)
//
// Runs per-tenant: picks up every schema in dos.tenants where status <> 'deleted'
// and checks pg_class relrowsecurity / relforcerowsecurity plus a policy named
// tenant_isolation in pg_policies.
//
// Usage:
//   node ops/scripts/validate-ai-rls.mjs
//
// Exits 0 on clean, 1 on any violation. Prints a compact report.
// ============================================================================

import pg from 'pg';

const AI_TABLE_REGEX = '^(ai_|copilot_|agent_|mcp_|agrc_)';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL not set.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const { rows: tenants } = await client.query(
      "SELECT tenant_id, schema_name FROM dos.tenants WHERE status <> 'deleted' ORDER BY tenant_id",
    );
    if (tenants.length === 0) {
      console.error('No active tenants; skipping.');
      process.exit(0);
    }

    let violations = 0;

    for (const t of tenants) {
      const { rows } = await client.query(
        `SELECT c.relname,
                c.relrowsecurity,
                c.relforcerowsecurity,
                EXISTS (
                  SELECT 1 FROM pg_policies p
                  WHERE p.schemaname = n.nspname
                    AND p.tablename = c.relname
                    AND p.policyname = 'tenant_isolation'
                ) AS has_policy
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = $1
           AND c.relkind = 'r'
           AND c.relname ~* $2
         ORDER BY c.relname`,
        [t.schema_name, AI_TABLE_REGEX],
      );

      for (const r of rows) {
        const ok = r.relrowsecurity && r.relforcerowsecurity && r.has_policy;
        if (!ok) {
          violations++;
          console.error(
            `  FAIL ${t.schema_name}.${r.relname}  rls=${r.relrowsecurity} force=${r.relforcerowsecurity} policy=${r.has_policy}`,
          );
        }
      }
    }

    if (violations === 0) {
      console.error('validate-ai-rls: OK');
      process.exit(0);
    }
    console.error(`validate-ai-rls: FAIL — ${violations} violation(s)`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('validate-ai-rls crashed:', err);
  process.exit(1);
});
