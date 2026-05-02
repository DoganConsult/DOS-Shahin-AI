export type { PlatformEvent, EventBus } from '@dos/module-sdk';
export { emitEvent } from '@dos/platform-core/events';
export { eventBus as _platformEventBus } from '@dos/platform-core/events';
export { eventBus as getEventBus } from '@dos/platform-core/events';
export async function publishEvent(...args: any[]): Promise<void> {}
export function pushToTenant(tenantId: string, event: any): void {}
export function buildWSEvent(type: string, payload: any): any { return { type, payload, timestamp: new Date().toISOString() }; }

import { eventBus as _eb } from '@dos/platform-core/events';
export const eventBus = {
  publish: (...args: any[]): Promise<string> => {
    if (args.length === 1 && typeof args[0] === 'object') {
      const { eventType, tenantId, ...rest } = args[0];
      return _eb.publish(eventType, tenantId, rest);
    }
    return (_eb.publish as any)(...args);
  },
  subscribe: (...args: any[]) => (_eb.subscribe as any)(...args),
};

