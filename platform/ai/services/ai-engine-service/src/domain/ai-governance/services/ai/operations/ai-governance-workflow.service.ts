import { safeQuery } from "@dos/db";

export interface AiGovernanceWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export async function onWorkflowTriggered(_ctx: AiGovernanceWorkflowContext): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (_ctx.tenantId ? " WHERE tenant_id = $1" : ""), _ctx.tenantId ? [_ctx.tenantId] : []);
      return {} as any;
}

export async function onTaskCreated(_ctx: AiGovernanceWorkflowContext, _taskId: string): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (_ctx.tenantId ? " WHERE tenant_id = $1" : ""), _ctx.tenantId ? [_ctx.tenantId] : []);
      return {} as any;
}

export async function onApprovalRequired(_ctx: AiGovernanceWorkflowContext, _approverRole: string): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (_ctx.tenantId ? " WHERE tenant_id = $1" : ""), _ctx.tenantId ? [_ctx.tenantId] : []);
      return {} as any;
}

export async function onEscalation(_ctx: AiGovernanceWorkflowContext, _reason: string, _escalateTo: string): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (_ctx.tenantId ? " WHERE tenant_id = $1" : ""), _ctx.tenantId ? [_ctx.tenantId] : []);
      return {} as any;
}

export async function onClosure(_ctx: AiGovernanceWorkflowContext, _closureReason: string): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (_ctx.tenantId ? " WHERE tenant_id = $1" : ""), _ctx.tenantId ? [_ctx.tenantId] : []);
      return {} as any;
}

export async function onFailure(_ctx: AiGovernanceWorkflowContext, _error: string): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (_ctx.tenantId ? " WHERE tenant_id = $1" : ""), _ctx.tenantId ? [_ctx.tenantId] : []);
      return {} as any;
}
