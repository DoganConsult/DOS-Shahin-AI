export { eventBus } from '@dos/platform-core/events';
export type { PlatformEvent, DOSEventHandler } from '@dos/platform-core/events';
export { emitEvent } from '@dos/platform-core/events';
export function notifyDomainChange(_tenantId: string, _module: string, _action: 'create' | 'update' | 'delete', _entityId: string): void {}
export function buildWSEvent(type: string, payload: any): any { return { type, payload, timestamp: new Date().toISOString() }; }
export function pushToTenant(_tenantId: string, _event: any): void {}
