// Compat shim — these helpers return safe no-op envelopes. The real workflow
// execution lives in services/workflow-service; this file exists so that
// historical route catalogs and packages/shahin-product manifests can resolve
// the symbols at module-load time without crashing.

export async function startWorkflowExecution(opts: { workflowId?: string; tenantId?: string; [k: string]: unknown }): Promise<{ executionId: string; status: 'queued'; opts: typeof opts }> {
  return {
    executionId: `exec-${Date.now()}`,
    status: 'queued',
    opts,
  };
}

export async function createProcessTask(opts: { tenantId?: string; title?: string; [k: string]: unknown }): Promise<{ taskId: string; status: 'pending'; opts: typeof opts }> {
  return {
    taskId: `task-${Date.now()}`,
    status: 'pending',
    opts,
  };
}
