export { createProcessTask } from '@dos/platform-core/workflows';
export type { ProcessTaskInput } from '@dos/platform-core/workflows';
export { registerLifecycleDefinition } from '@dos/platform-core/lifecycle';

// Stub for completeProcessTask — host wires a real implementation when the
// workflow runtime is available; otherwise this is a no-op marker.
export async function completeProcessTask(
  _tenantId: string,
  _taskId: string,
  _outcome?: Record<string, unknown>,
): Promise<{ completed: boolean }> {
  return { completed: false };
}
