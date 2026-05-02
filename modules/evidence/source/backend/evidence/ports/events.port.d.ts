export { eventBus } from '@dos/platform-core/events';
export type { PlatformEvent, DOSEventHandler } from '@dos/platform-core/events';
export { emitEvent } from '@dos/platform-core/events';
export declare function notifyDomainChange(_tenantId: string, _module: string, _action: 'create' | 'update' | 'delete', _entityId: string): void;
export declare function buildWSEvent(type: string, payload: any): any;
export declare function pushToTenant(_tenantId: string, _event: any): void;
