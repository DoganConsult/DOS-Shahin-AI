import { Request, Response, Router } from 'express';
import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';

import { asyncHandler } from '../../ports/middleware.port';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

router.get('/role-experience/profile', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const schema = tenantSchema(req.tenantId);
  const roles = await safeQuery(
    `SELECT fr.code, fr.name, fr.description FROM "${schema}".functional_roles fr
     JOIN "${schema}".user_role_assignments ura ON ura.functional_role_id = fr.id
     WHERE ura.user_id = $1 AND ura.is_active = TRUE AND fr.is_active = TRUE`,
    [user.userId || user.id],
  );
  const modules = await safeQuery(
    `SELECT DISTINCT tme.module_code FROM public.tenant_module_entitlements tme
     WHERE tme.tenant_id = $1 AND tme.is_active = TRUE ORDER BY tme.module_code`,
    [req.tenantId],
  );
  const recentActivity = await safeQuery(
    `SELECT permission_code, module_code, decision, created_at
     FROM "${schema}".authz_decision_log
     WHERE user_id = $1 AND decision = 'allow'
     ORDER BY created_at DESC LIMIT 20`,
    [user.userId || user.id],
  ).catch(() => ({ rows: [] }));
  const frequentModules = new Map<string, number>();
  for (const row of recentActivity.rows) {
    const m = row.module_code || 'unknown';
    frequentModules.set(m, (frequentModules.get(m) || 0) + 1);
  }
  res.json({
    success: true,
    data: {
      userId: user.userId || user.id,
      roles: roles.rows,
      entitledModules: modules.rows.map(( r: Record<string, unknown>) => r.module_code),
      frequentModules: [...frequentModules.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => ({ moduleCode: code, accessCount: count })),
      personalizedDashboard: roles.rows.length > 0 ? `${roles.rows[0].code}-dashboard` : 'default-dashboard',
    },
  });
}));

router.get('/role-experience/recommendations', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const schema = tenantSchema(req.tenantId);
  const roles = await safeQuery(
    `SELECT fr.code FROM "${schema}".functional_roles fr
     JOIN "${schema}".user_role_assignments ura ON ura.functional_role_id = fr.id
     WHERE ura.user_id = $1 AND ura.is_active = TRUE`,
    [user.userId || user.id],
  );
  const roleCodes = roles.rows.map(( r: Record<string, unknown>) => r.code);
  const pending = await safeQuery(
    `SELECT entity_type, COUNT(*) AS cnt FROM "${schema}".workflow_steps
     WHERE assignee_id = $1 AND status IN ('pending', 'in_progress')
     GROUP BY entity_type ORDER BY cnt DESC`,
    [user.userId || user.id],
  ).catch(() => ({ rows: [] }));
  const recommendations: Array<{ type: string; title: string; priority: string; context: string }> = [];
  for (const p of pending.rows) {
    recommendations.push({
      type: 'action_required',
      title: `${p.cnt} pending ${p.entity_type} items`,
      priority: parseInt(p.cnt, 10) > 5 ? 'high' : 'medium',
      context: p.entity_type,
    });
  }
  if (roleCodes.includes('risk_manager') || roleCodes.includes('risk_lead')) {
    recommendations.push({ type: 'insight', title: 'Review risk heat map for updated scores', priority: 'medium', context: 'risk' });
  }
  if (roleCodes.includes('compliance_officer') || roleCodes.includes('compliance_lead')) {
    recommendations.push({ type: 'insight', title: 'Check overdue compliance assessments', priority: 'high', context: 'compliance' });
  }
  res.json({ success: true, data: { roles: roleCodes, recommendations } });
}));

router.get('/role-experience/shortcuts', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const schema = tenantSchema(req.tenantId);
  const roles = await safeQuery(
    `SELECT fr.code FROM "${schema}".functional_roles fr
     JOIN "${schema}".user_role_assignments ura ON ura.functional_role_id = fr.id
     WHERE ura.user_id = $1 AND ura.is_active = TRUE`,
    [user.userId || user.id],
  );
  const roleCodes = new Set(roles.rows.map(( r: Record<string, unknown>) => r.code));
  const shortcuts: Array<{ label: string; route: string; icon: string }> = [
    { label: 'My Tasks', route: '/inbox', icon: 'inbox' },
  ];
  if (roleCodes.has('risk_manager') || roleCodes.has('risk_lead')) {
    shortcuts.push({ label: 'Risk Register', route: '/risk', icon: 'shield' });
    shortcuts.push({ label: 'Risk Heat Map', route: '/risk/heatmap', icon: 'grid' });
  }
  if (roleCodes.has('compliance_officer') || roleCodes.has('compliance_lead')) {
    shortcuts.push({ label: 'Compliance Dashboard', route: '/compliance', icon: 'check-circle' });
  }
  if (roleCodes.has('auditor') || roleCodes.has('audit_lead')) {
    shortcuts.push({ label: 'Audit Plans', route: '/audit', icon: 'clipboard' });
  }
  if (roleCodes.has('policy_owner') || roleCodes.has('policy_manager')) {
    shortcuts.push({ label: 'Policy Library', route: '/policy', icon: 'book' });
  }
  if (roleCodes.has('vendor_manager')) {
    shortcuts.push({ label: 'Vendor Hub', route: '/vendor', icon: 'users' });
  }
  if (roleCodes.has('executive') || roleCodes.has('board_member')) {
    shortcuts.push({ label: 'Executive Dashboard', route: '/governance/executive', icon: 'bar-chart' });
  }
  res.json({ success: true, data: shortcuts });
}));

export default router;
