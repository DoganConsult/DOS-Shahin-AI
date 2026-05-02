/**
 * Knowledge module lifecycle port — wraps platform-core process-task creation.
 * Kept tiny so subscribers can `vi.mock` it cleanly in unit tests.
 */
export interface ProcessTaskInput {
  title: string;
  description: string;
  taskType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  entityType: string;
  entityId: string;
  triggerSource: string;
}

export async function createProcessTask(
  tenantId: string,
  input: ProcessTaskInput,
): Promise<void> {
  try {
    // Defer to platform-core when available; otherwise no-op.
    const mod: any = await import('@dos/platform-core/lifecycle/process-task.adapter').catch(
      () => null,
    );
    if (mod?.createProcessTask) {
      await mod.createProcessTask(tenantId, input);
    }
  } catch {
    // swallow — knowledge handlers must not crash on lifecycle issues.
  }
}
