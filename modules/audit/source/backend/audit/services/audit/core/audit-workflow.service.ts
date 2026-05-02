import { safeQuery } from "@dos/db";

export interface AuditWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export async function onWorkflowTriggered(ctx: AuditWorkflowContext): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.audit_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onTaskCreated(ctx: AuditWorkflowContext, _taskId: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.audit_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onApprovalRequired(ctx: AuditWorkflowContext, _approverRole: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.audit_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onEscalation(ctx: AuditWorkflowContext, _reason: string, _escalateTo: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.audit_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onClosure(ctx: AuditWorkflowContext, _closureReason: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.audit_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onFailure(ctx: AuditWorkflowContext, _error: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.audit_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
