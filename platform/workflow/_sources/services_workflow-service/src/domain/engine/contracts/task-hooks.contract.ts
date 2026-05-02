/**
 * DOS Workflow Task Hooks Contract — Patch 7 §2.3, Law 15
 *
 * Provides injectable hooks for product/module-specific behavior
 * that DOS workflow orchestration needs but must not import directly.
 * Products and modules register their hooks at startup.
 *
 * @owner DOS
 * @since 2026-03-30
 */

export interface ActionSLAInput {
  actionId: string;
  tenantId: string;
  actionType: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueInHours: number;
}

export interface SquadAssignResult {
  assigned: boolean;
  agentCode?: string;
}

export type ActionSLAHook = (input: ActionSLAInput) => Promise<void>;
export type SquadAssignHook = (tenantId: string, taskId: string, agentId: string) => Promise<SquadAssignResult>;
export type NotificationHook = (tenantId: string, opts: { userId: string; type: string; title: string; body: string; link: string }) => Promise<void>;
export type AuditHook = (tenantId: string, opts: Record<string, unknown>) => Promise<void>;
export type AuthzCheckHook = (tenantId: string, userId: string, permissionCode: string) => Promise<boolean>;
export type AuthzLogHook = (tenantId: string, opts: Record<string, unknown>) => Promise<void>;

const hooks = {
  actionSLA: null as ActionSLAHook | null,
  squadAssign: null as SquadAssignHook | null,
  notify: null as NotificationHook | null,
  audit: null as AuditHook | null,
  authzCheck: null as AuthzCheckHook | null,
  authzLog: null as AuthzLogHook | null,
};

export function registerTaskHook<K extends keyof typeof hooks>(name: K, fn: NonNullable<(typeof hooks)[K]>): void {
  (hooks as Record<string, unknown>)[name] = fn;
}

export async function runActionSLA(input: ActionSLAInput): Promise<void> {
  if (hooks.actionSLA) await hooks.actionSLA(input);
}

export async function runSquadAssign(tenantId: string, taskId: string, agentId: string): Promise<SquadAssignResult> {
  if (hooks.squadAssign) return hooks.squadAssign(tenantId, taskId, agentId);
  return { assigned: false };
}

export async function runNotify(tenantId: string, opts: { userId: string; type: string; title: string; body: string; link: string }): Promise<void> {
  if (hooks.notify) await hooks.notify(tenantId, opts);
}

export async function runAudit(tenantId: string, opts: Record<string, unknown>): Promise<void> {
  if (hooks.audit) await hooks.audit(tenantId, opts);
}

export async function runAuthzCheck(tenantId: string, userId: string, permissionCode: string): Promise<boolean> {
  if (hooks.authzCheck) return hooks.authzCheck(tenantId, userId, permissionCode);
  return true;
}

export async function runAuthzLog(tenantId: string, opts: Record<string, unknown>): Promise<void> {
  if (hooks.authzLog) await hooks.authzLog(tenantId, opts);
}

export interface EligibleAssignee {
  userId: string;
  teamId?: string | null;
  scopeType?: string | null;
  scopeId?: number | null;
  functionalRoleCode?: string;
  authorityLevel?: string;
  isDelegated?: boolean;
  openTasks?: number;
}

export interface FindEligibleOpts {
  scopeType?: string;
  scopeId?: number;
  minAuthorityLevel?: string;
  includeDelegations?: boolean;
  limit?: number;
}

export type FindEligibleAssigneesHook = (tenantId: string, moduleCode: string, permissionCode: string, opts: FindEligibleOpts) => Promise<EligibleAssignee[]>;

const eligibleHook: { fn: FindEligibleAssigneesHook | null } = { fn: null };

export function registerFindEligibleHook(fn: FindEligibleAssigneesHook): void {
  eligibleHook.fn = fn;
}

export async function runFindEligibleAssignees(tenantId: string, moduleCode: string, permissionCode: string, opts: FindEligibleOpts): Promise<EligibleAssignee[]> {
  if (eligibleHook.fn) return eligibleHook.fn(tenantId, moduleCode, permissionCode, opts);
  return [];
}
