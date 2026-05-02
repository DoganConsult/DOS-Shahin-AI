import { safeQuery } from "@dos/db";

export interface ReportingWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export async function onWorkflowTriggered(ctx: ReportingWorkflowContext): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.reporting_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onTaskCreated(ctx: ReportingWorkflowContext, _taskId: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.reporting_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onApprovalRequired(ctx: ReportingWorkflowContext, _approverRole: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.reporting_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onEscalation(ctx: ReportingWorkflowContext, _reason: string, _escalateTo: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.reporting_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onClosure(ctx: ReportingWorkflowContext, _closureReason: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.reporting_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function onFailure(ctx: ReportingWorkflowContext, _error: string): Promise<void> {
      const { tenantId } = ctx;
      await safeQuery("UPDATE __TENANT_SCHEMA__.reporting_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
