// @ts-nocheck
import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

import {
  getProcessTable, getKernelStatus, getSchedulerTable, getIpcMessages,
  getMemoryPartitions, getKernelLog, killProcess, rebootAgent,
  adjustAutonomyLevel, getTokenUsage, setGlobalAutonomyLevel,
  getProcessDetail, getAgentDetail, pauseAgent, resumeAgent,
  getKernelHealth, saveKernelSnapshot, listKernelSnapshots,
} from '../services/orchestration/ai-os-kernel.service';
import {
  getAgentHealthStatus, getAgentHealthDashboard,
} from '../services/agents/lifecycle/agent-health-visualization.service';
import {
  getActiveAlerts, evaluateAlertRules, acknowledgeAlert,
} from '../services/activity/activity-alerts.service';
import {
  getUnifiedActivityFeed,
} from '../services/activity/unified-activity-feed.service';
import {
  checkToolPermission, getAgentPermissions, updateToolPermission,
} from '../services/governance/agent-governance.service';
import {
  analyzeRbacUsage,
} from '../services/core/ai-rbac-optimizer.service.js';
import {
  autoAssignAgentsForTenantMode,
} from '../services/personal/personal-agent-auto-assign.service';

export async function processTable(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getProcessTable(req.tenantId);
  res.json(ok(result, req));
}

export async function kernelStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getKernelStatus(req.tenantId);
  res.json(ok(result, req));
}

export async function schedulerTable(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSchedulerTable(req.tenantId);
  res.json(ok(result, req));
}

export async function ipcMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const result = await getIpcMessages(req.tenantId, limit);
  res.json(ok(result, req));
}

export async function memoryPartitions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getMemoryPartitions(req.tenantId);
  res.json(ok(result, req));
}

export async function kernelLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const result = await getKernelLog(req.tenantId, limit);
  res.json(ok(result, req));
}

export async function killProcessHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await killProcess(req.tenantId, req.params.runId);
  setAuditData(res as any, { action: 'delete', entityType: 'ai_process', entityId: req.params.runId });
  res.json(ok({ killed: result }, req));
}

export async function rebootAgentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId;
  const result = await rebootAgent(req.tenantId, req.params.agentId);
  setAuditData(res as any, { action: 'update', entityType: 'ai_agent', entityId: req.params.agentId });
  res.json(ok(result, req));
}

export async function adjustAutonomy(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await adjustAutonomyLevel(req.tenantId, req.params.agentId, req.body.level);
  setAuditData(res as any, { action: 'update', entityType: 'ai_autonomy', entityId: req.params.agentId });
  res.json(ok(result, req));
}

export async function tokenUsage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTokenUsage(req.tenantId);
  res.json(ok(result, req));
}

export async function setGlobalAutonomy(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await setGlobalAutonomyLevel(req.tenantId, req.body.level);
  setAuditData(res as any, { action: 'update', entityType: 'global_autonomy' });
  res.json(ok(result, req));
}

export async function processDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getProcessDetail(req.tenantId, req.params.pid);
  if (!result) throw new NotFoundError('ai_process', req.params.pid);
  res.json(ok(result, req));
}

export async function agentDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAgentDetail(req.tenantId, req.params.agentId);
  if (!result) throw new NotFoundError('ai_agent', req.params.agentId);
  res.json(ok(result, req));
}

export async function pauseAgentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await pauseAgent(req.tenantId, req.params.agentId);
  setAuditData(res as any, { action: 'update', entityType: 'ai_agent_pause', entityId: req.params.agentId });
  res.json(ok({ paused: result }, req));
}

export async function resumeAgentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await resumeAgent(req.tenantId, req.params.agentId);
  setAuditData(res as any, { action: 'update', entityType: 'ai_agent_resume', entityId: req.params.agentId });
  res.json(ok({ resumed: result }, req));
}

export async function kernelHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getKernelHealth(req.tenantId);
  res.json(ok(result, req));
}

export async function saveSnapshot(req: AuthenticatedRequest, res: Response): Promise<void> {
  const snapshotId = await saveKernelSnapshot(req.tenantId);
  setAuditData(res as any, { action: 'create', entityType: 'kernel_snapshot', entityId: snapshotId });
  res.status(201).json(ok({ snapshotId }, req));
}

export async function listSnapshots(req: AuthenticatedRequest, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const result = await listKernelSnapshots(req.tenantId, limit);
  res.json(ok(result, req));
}

export async function healthStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAgentHealthStatus(req.tenantId, req.params.agentId);
  res.json(ok(result, req));
}

export async function healthDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAgentHealthDashboard(req.tenantId);
  res.json(ok(result, req));
}

export async function activeAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const severity = req.query.severity as string | undefined;
  const result = await getActiveAlerts(req.tenantId, severity);
  res.json(ok(result, req));
}

export async function evaluateAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await evaluateAlertRules(req.tenantId);
  res.json(ok(result, req));
}

export async function acknowledgeAlertHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  await acknowledgeAlert(req.tenantId, req.params.alertId, userId);
  setAuditData(res as any, { action: 'update', entityType: 'ai_alert', entityId: req.params.alertId });
  res.json(action('Alert acknowledged', req));
}

export async function activityFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId ?? null;
  const result = await getUnifiedActivityFeed(req.tenantId, userId, {});
  res.json(ok(result, req));
}

export async function toolPermissionCheck(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { agentId, toolName, action: permAction } = req.body;
  const result = await checkToolPermission(req.tenantId, agentId, toolName, permAction);
  res.json(ok(result, req));
}

export async function agentPermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAgentPermissions(req.tenantId, req.params.agentId);
  res.json(ok(result, req));
}

export async function updatePermission(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateToolPermission(req.tenantId, req.params.agentId, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'ai_tool_permission', entityId: req.params.agentId });
  res.json(ok(result, req));
}

export async function rbacAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await analyzeRbacUsage(req.tenantId);
  res.json(ok(result, req));
}

export async function assignments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const result = await autoAssignAgentsForTenantMode(req.tenantId, req.body.targetMode || 'copilot', userId);
  res.json(ok(result, req));
}
