import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack, validate } from '../ports/middleware.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as executionService from '../services/mcp-execution.service';
import * as serverService from '../services/mcp-server.service';
import { MCP_OWNED_TABLES } from '../data/mcp-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericRouteSchema = z.any();

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('mcp'));
router.use(auditMiddleware('mcp'));

router.get(
  '/settings',
  authenticate,
  requirePermission('mcp.admin.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`,
      ['mcp'],
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, data: rows });
  }),
);

router.get(
  '/health',
  authenticate,
  requirePermission('mcp.admin.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const schema = tenantSchema(tenantId);

    const { rows: tables } = await safeQuery(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema IN ($1, 'public')
         AND table_name LIKE 'mcp_%'`,
      [schema],
    ).catch(() => ({ rows: [] }));

    const serverInfo = serverService.getServerInfo();
    const health = await executionService.getHealthReport(tenantId).catch((error) => {
      catchHandler(EC.FALLBACK_QUERY, { tenantId, operation: 'mcp-admin:get-health-report' })(error);
      return null;
    });

    res.json({
      success: true,
      tableCount: tables.length,
      tables: tables.map(r => r.table_name),
      expectedTables: MCP_OWNED_TABLES,
      missingTables: MCP_OWNED_TABLES.filter(t => !tables.some(r => r.table_name === t)),
      serverInfo,
      healthReport: health,
    });
  }),
);

router.get(
  '/diagnostics',
  authenticate,
  requirePermission('mcp.admin.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const diagnostics = await executionService.getDiagnostics(tenantId);
    res.json({ success: true, data: diagnostics });
  }),
);

router.post(
  '/expire-approvals',
  authenticate,
  requirePermission('mcp.admin.manage'), validate({ body: genericRouteSchema }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const count = await executionService.expireOldApprovals(tenantId);
    res.json({ success: true, message: `Expired ${count} old approval requests`, expiredCount: count });
  }),
);

router.get(
  '/sla',
  authenticate,
  requirePermission('mcp.admin.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId);
    const { rows } = await safeQuery(
      `SELECT config_value FROM "${schema}".module_configs WHERE module_code = 'mcp' AND config_key = 'sla_policy' LIMIT 1`,
      [],
    ).catch(() => ({ rows: [] }));
    const tenantOverrides = rows[0]?.config_value ? JSON.parse(rows[0].config_value) : null;
    res.json({
      success: true, data: {
        moduleCode: 'mcp',
        sla: {
          defaults: { toolApprovalSlaHours: 24, executionTimeoutMs: 30000, logRetentionDays: 90, serverHealthCheckIntervalMs: 60000 },
          timeouts: { approvalTimeoutHours: 48, escalationAfterHours: 72, reminderBeforeHours: 12 },
          thresholds: { maxPendingApprovals: 50, maxFailedExecutions24h: 100, maxQueueDepth: 1000 },
          tenantOverrides,
        },
      },
    });
  }),
);

router.get(
  '/escalation-policy',
  authenticate,
  requirePermission('mcp.admin.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId);
    const { rows } = await safeQuery(
      `SELECT config_value FROM "${schema}".module_configs WHERE module_code = 'mcp' AND config_key = 'escalation_policy' LIMIT 1`,
      [],
    ).catch(() => ({ rows: [] }));
    const tenantPolicy = rows[0]?.config_value ? JSON.parse(rows[0].config_value) : null;
    res.json({
      success: true, data: {
        moduleCode: 'mcp',
        escalation: {
          defaultPath: ['mcp.operator', 'mcp.module_lead', 'mcp.executive_owner'],
          escalateAfterHours: 72,
          reminderBeforeHours: 12,
          autoEscalateOnSlaBreach: true,
          notifyOnEscalation: true,
          maxEscalationLevels: 3,
          tenantPolicy,
        },
      },
    });
  }),
);

router.get(
  '/runbooks',
  authenticate,
  requirePermission('mcp.tool.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true, data: {
        moduleCode: 'mcp',
        runbooks: [
          { code: 'mcp.tool_registration', titleEn: 'Tool Registration', titleAr: 'تسجيل الأداة', url: '/docs/runbooks/mcp/tool-registration.md' },
          { code: 'mcp.tool_approval', titleEn: 'Tool Approval Workflow', titleAr: 'سير عمل الموافقة على الأداة', url: '/docs/runbooks/mcp/tool-approval.md' },
          { code: 'mcp.execution_governance', titleEn: 'Execution Governance', titleAr: 'حوكمة التنفيذ', url: '/docs/runbooks/mcp/execution-governance.md' },
          { code: 'mcp.server_management', titleEn: 'Server Management', titleAr: 'إدارة الخادم', url: '/docs/runbooks/mcp/server-management.md' },
          { code: 'mcp.failed_execution_triage', titleEn: 'Failed Execution Triage', titleAr: 'فرز التنفيذ الفاشل', url: '/docs/runbooks/mcp/failed-execution-triage.md' },
          { code: 'mcp.diagnostics_triage', titleEn: 'Diagnostics Triage', titleAr: 'فرز التشخيصات', url: '/docs/runbooks/mcp/diagnostics-triage.md' },
        ],
      },
    });
  }),
);

export default router;

let genericPayloadSchema = z.record(z.unknown());
