import { safeQuery } from "@dos/db";

export interface BcpWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export async function onWorkflowTriggered(ctx: BcpWorkflowContext): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.bcp_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onTaskCreated(ctx: BcpWorkflowContext, _taskId: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.bcp_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onApprovalRequired(ctx: BcpWorkflowContext, _approverRole: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.bcp_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onEscalation(ctx: BcpWorkflowContext, _reason: string, _escalateTo: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.bcp_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onClosure(ctx: BcpWorkflowContext, _closureReason: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.bcp_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onFailure(ctx: BcpWorkflowContext, _error: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.bcp_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
