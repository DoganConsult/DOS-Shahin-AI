import { safeQuery } from "@dos/db";

export interface RemediationWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export async function onWorkflowTriggered(ctx: RemediationWorkflowContext): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.remediation_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onTaskCreated(ctx: RemediationWorkflowContext, _taskId: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.remediation_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onApprovalRequired(ctx: RemediationWorkflowContext, _approverRole: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.remediation_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onEscalation(ctx: RemediationWorkflowContext, _reason: string, _escalateTo: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.remediation_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onClosure(ctx: RemediationWorkflowContext, _closureReason: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.remediation_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onFailure(ctx: RemediationWorkflowContext, _error: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.remediation_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
