export { registerLifecycleDefinition } from '@dos/platform-core/lifecycle';

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
    const mod: any = await import('@dos/platform-core/lifecycle/process-task.adapter').catch(
      () => null,
    );
    if (mod?.createProcessTask) {
      await mod.createProcessTask(tenantId, input);
    }
  } catch {
    // swallow
  }
}
