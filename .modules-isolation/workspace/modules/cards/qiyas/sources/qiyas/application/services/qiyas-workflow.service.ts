import { safeQuery } from "@dos/db";

export interface QiyasWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export async function onWorkflowTriggered(ctx: QiyasWorkflowContext): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.qiyas_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onTaskCreated(ctx: QiyasWorkflowContext, _taskId: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.qiyas_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onApprovalRequired(ctx: QiyasWorkflowContext, _approverRole: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.qiyas_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onEscalation(ctx: QiyasWorkflowContext, _reason: string, _escalateTo: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.qiyas_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onClosure(ctx: QiyasWorkflowContext, _closureReason: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.qiyas_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onFailure(ctx: QiyasWorkflowContext, _error: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.qiyas_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
