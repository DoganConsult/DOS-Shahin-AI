// Workflow-local audit-tree events port — mirrors the minimal `eventBus`
// surface consumed by audit-prep.service.ts (publish only). Real bus wiring
// is provided at service-boot time via setEventBus from @dos/module-sdk.
import { publishEvent } from '@dos/module-sdk';
export const eventBus = {
  publish: async (event: Record<string, unknown>): Promise<void> => {
    await publishEvent(event as Parameters<typeof publishEvent>[0]);
  },
};
