import { safeQuery, tenantSchema } from '../ports/database.port';

export async function getMcpDiagnosticsSnapshot(tenantId: string) {
  const schema = tenantSchema(tenantId);
  const checks: Array<{ check: string; status: 'pass' | 'warn' | 'fail'; detail: string }> = [];

  const schemaRes = await safeQuery(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
    [schema],
  ).catch(() => ({ rows: [] }));
  checks.push({
    check: 'schema_exists',
    status: schemaRes.rows.length > 0 ? 'pass' : 'fail',
    detail: schemaRes.rows.length > 0 ? 'Schema exists' : 'Schema missing',
  });

  const tableRes = await safeQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name LIKE 'mcp_%'`,
    [schema],
  ).catch(() => ({ rows: [] }));
  const expected = ['mcp_tool_registry', 'mcp_agent_registry', 'mcp_tool_execution_log', 'mcp_tool_approval_requests', 'mcp_tool_overrides'];
  const existing = tableRes.rows.map((r: any) => r.table_name);
  const missing = expected.filter(t => !existing.includes(t));
  checks.push({
    check: 'tables_exist',
    status: missing.length === 0 ? 'pass' : 'fail',
    detail: missing.length === 0 ? `${existing.length} tables found` : `Missing: ${missing.join(', ')}`,
  });

  const pendingRes = await safeQuery(
    `SELECT COUNT(*) as cnt FROM "${schema}".mcp_tool_approval_requests WHERE status = 'pending' AND created_at < NOW() - INTERVAL '48 hours'`,
    [],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const overduePending = Number(pendingRes.rows[0]?.cnt || 0);
  checks.push({
    check: 'overdue_approvals',
    status: overduePending === 0 ? 'pass' : 'warn',
    detail: `${overduePending} approvals pending > 48h`,
  });

  const failedRes = await safeQuery(
    `SELECT COUNT(*) as cnt FROM "${schema}".mcp_tool_execution_log WHERE status = 'error' AND executed_at > NOW() - INTERVAL '24 hours'`,
    [],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const recentFailed = Number(failedRes.rows[0]?.cnt || 0);
  checks.push({
    check: 'failed_executions_24h',
    status: recentFailed < 100 ? (recentFailed < 10 ? 'pass' : 'warn') : 'fail',
    detail: `${recentFailed} failed executions in 24h`,
  });

  const staleRes = await safeQuery(
    `SELECT COUNT(*) as cnt FROM "${schema}".mcp_tool_registry WHERE status = 'active' AND updated_at < NOW() - INTERVAL '90 days'`,
    [],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const staleTools = Number(staleRes.rows[0]?.cnt || 0);
  checks.push({
    check: 'stale_tools',
    status: staleTools < 5 ? 'pass' : 'warn',
    detail: `${staleTools} active tools not updated in 90 days`,
  });

  const suspendedRes = await safeQuery(
    `SELECT COUNT(*) as cnt FROM "${schema}".mcp_tool_registry WHERE status = 'suspended'`,
    [],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const suspendedCount = Number(suspendedRes.rows[0]?.cnt || 0);
  checks.push({
    check: 'suspended_tools',
    status: suspendedCount < 3 ? 'pass' : 'warn',
    detail: `${suspendedCount} tools currently suspended`,
  });

  const auditRes = await safeQuery(
    `SELECT COUNT(*) as cnt FROM "${schema}".audit_trail WHERE module_code = 'mcp' AND created_at > NOW() - INTERVAL '24 hours'`,
    [],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const recentAudit = Number(auditRes.rows[0]?.cnt || 0);
  checks.push({
    check: 'recent_audit_activity',
    status: recentAudit > 0 ? 'pass' : 'warn',
    detail: `${recentAudit} audit entries in 24h`,
  });

  const overall = checks.some(c => c.status === 'fail') ? 'critical' :
    checks.some(c => c.status === 'warn') ? 'degraded' : 'healthy';

  return {
    tenantId,
    moduleCode: 'mcp',
    generatedAt: new Date().toISOString(),
    overall,
    checks,
  };
}
