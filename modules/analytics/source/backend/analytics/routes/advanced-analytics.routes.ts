// ============================================
// Shahin-Ai — Advanced Analytics API Routes
// Real DB-driven analytics with drill-through
// ============================================

import { Router, Response, RequestHandler } from 'express';
import { z } from "zod";
import { authenticate, requirePermission } from '../ports/auth.port';
import { AuthenticatedRequest } from '@dos/types';
import { asyncHandler } from '../ports/middleware.port';
import {
  getAdvancedRiskAnalytics,
  getAdvancedComplianceAnalytics,
  getAdvancedEvidenceAnalytics,
  getAdvancedWorkflowAnalytics,
  type AnalyticsContext,
} from '../services/advanced/advanced-analytics.service';
import { buildContextualDashboard, type DashboardContext } from '../services/misc/context-aware-dashboard.service';
import { safeQuery } from '@dos/db';
import { validate } from "../ports/middleware.port";
const router = Router();

// GET /api/analytics/advanced/risk — Advanced risk analytics with drill-through
router.get(
  '/risk',
  authenticate as RequestHandler,
  requirePermission('analytics.report.read') as RequestHandler, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const roleCode = (req.user as Record<string, unknown>)?.role as string || 'viewer';
    const moduleCode = req.query.moduleCode as string | undefined;
    const scenario = req.query.scenario as string | undefined;
    const orgStatus = req.query.orgStatus as 'trial' | 'active' | 'suspended' | 'archived' | undefined;

    // Get org status from tenant if not provided
    let resolvedOrgStatus = orgStatus;
    if (!resolvedOrgStatus) {
      const { safeQuery } = await import('../../../config/database.js');
      const tenantResult = await safeQuery(
        `SELECT status FROM tenants WHERE tenant_id = $1`,
        [tenantId]
      );
      resolvedOrgStatus = tenantResult.rows[0]?.status || 'active';
    }

    const ctx: AnalyticsContext = {
      tenantId,
      roleCode,
      moduleCode,
      scenario,
      orgStatus: resolvedOrgStatus,
      filters: req.query as Record<string, unknown>,
    };

    const result = await getAdvancedRiskAnalytics(ctx);
    res.json(result);
  }) as RequestHandler
);

// GET /api/analytics/advanced/compliance — Advanced compliance analytics
router.get(
  '/compliance',
  authenticate as RequestHandler,
  requirePermission('analytics.report.read') as RequestHandler, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const roleCode = (req.user as Record<string, unknown>)?.role as string || 'viewer';
    const moduleCode = req.query.moduleCode as string | undefined;
    const scenario = req.query.scenario as string | undefined;
    const orgStatus = req.query.orgStatus as 'trial' | 'active' | 'suspended' | 'archived' | undefined;

    let resolvedOrgStatus = orgStatus;
    if (!resolvedOrgStatus) {
      const { safeQuery } = await import('../../../config/database.js');
      const tenantResult = await safeQuery(
        `SELECT status FROM tenants WHERE tenant_id = $1`,
        [tenantId]
      );
      resolvedOrgStatus = tenantResult.rows[0]?.status || 'active';
    }

    const ctx: AnalyticsContext = {
      tenantId,
      roleCode,
      moduleCode,
      scenario,
      orgStatus: resolvedOrgStatus,
      filters: req.query as Record<string, unknown>,
    };

    const result = await getAdvancedComplianceAnalytics(ctx);
    res.json(result);
  }) as RequestHandler
);

// GET /api/analytics/advanced/evidence — Advanced evidence analytics
router.get(
  '/evidence',
  authenticate as RequestHandler,
  requirePermission('analytics.report.read') as RequestHandler, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const roleCode = (req.user as Record<string, unknown>)?.role as string || 'viewer';
    const moduleCode = req.query.moduleCode as string | undefined;
    const scenario = req.query.scenario as string | undefined;
    const orgStatus = req.query.orgStatus as 'trial' | 'active' | 'suspended' | 'archived' | undefined;

    let resolvedOrgStatus = orgStatus;
    if (!resolvedOrgStatus) {
      const { safeQuery } = await import('../../../config/database.js');
      const tenantResult = await safeQuery(
        `SELECT status FROM tenants WHERE tenant_id = $1`,
        [tenantId]
      );
      resolvedOrgStatus = tenantResult.rows[0]?.status || 'active';
    }

    const ctx: AnalyticsContext = {
      tenantId,
      roleCode,
      moduleCode,
      scenario,
      orgStatus: resolvedOrgStatus,
      filters: req.query as Record<string, unknown>,
    };

    const result = await getAdvancedEvidenceAnalytics(ctx);
    res.json(result);
  }) as RequestHandler
);

// GET /api/analytics/advanced/workflow — Advanced workflow analytics
router.get(
  '/workflow',
  authenticate as RequestHandler,
  requirePermission('analytics.report.read') as RequestHandler, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const roleCode = (req.user as Record<string, unknown>)?.role as string || 'viewer';
    const moduleCode = req.query.moduleCode as string | undefined;
    const scenario = req.query.scenario as string | undefined;
    const orgStatus = req.query.orgStatus as 'trial' | 'active' | 'suspended' | 'archived' | undefined;

    let resolvedOrgStatus = orgStatus;
    if (!resolvedOrgStatus) {
      const { safeQuery } = await import('../../../config/database.js');
      const tenantResult = await safeQuery(
        `SELECT status FROM tenants WHERE tenant_id = $1`,
        [tenantId]
      );
      resolvedOrgStatus = tenantResult.rows[0]?.status || 'active';
    }

    const ctx: AnalyticsContext = {
      tenantId,
      roleCode,
      moduleCode,
      scenario,
      orgStatus: resolvedOrgStatus,
      filters: req.query as Record<string, unknown>,
    };

    const result = await getAdvancedWorkflowAnalytics(ctx);
    res.json(result);
  }) as RequestHandler
);

// GET /api/analytics/advanced/dashboard — Context-aware dashboard builder
router.get(
  '/dashboard',
  authenticate as RequestHandler,
  requirePermission('analytics.report.read') as RequestHandler, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const roleCode = (req.user as Record<string, unknown>)?.role as string || 'viewer';
    const moduleCode = req.query.moduleCode as string | undefined;
    const scenario = req.query.scenario as 'baseline' | 'assessment' | 'remediation' | 'audit' | 'executive' | 'operations' | undefined;
    const orgStatus = req.query.orgStatus as 'trial' | 'active' | 'suspended' | 'archived' | undefined;
    const orgMaturity = req.query.orgMaturity as 'initial' | 'managed' | 'defined' | 'measured' | 'optimized' | undefined;

    // Get org status from tenant if not provided
    let resolvedOrgStatus = orgStatus;
    if (!resolvedOrgStatus) {
      try {
        const { query: _query } = await import('../../../config/database.js');
        const schema = `tenant_${tenantId}`;
        const tenantResult = await safeQuery(
          `SELECT status FROM "${schema}".tenants WHERE tenant_id = $1`,
          [tenantId]
        );
        if (tenantResult.rows[0]) {
          resolvedOrgStatus = tenantResult.rows[0].status || 'active';
        }
      } catch (_err) {
        // Fallback to active if query fails
        resolvedOrgStatus = 'active';
      }
    }

    const ctx: DashboardContext = {
      tenantId,
      roleCode,
      moduleCode,
      scenario,
      orgStatus: resolvedOrgStatus || 'active',
      orgMaturity,
    };

    const dashboard = await buildContextualDashboard(ctx);
    res.json(dashboard);
  }) as RequestHandler
);

export default router;
