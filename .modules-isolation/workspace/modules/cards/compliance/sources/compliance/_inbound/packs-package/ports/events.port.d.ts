export type { PlatformEvent, EventBus } from '@dos/module-sdk';
export { emitEvent } from '@dos/platform-core/events';
export { eventBus as _platformEventBus } from '@dos/platform-core/events';
export { eventBus as getEventBus } from '@dos/platform-core/events';
export declare function publishEvent(...args: any[]): Promise<void>;
export declare function pushToTenant(tenantId: string, event: any): void;
export declare function buildWSEvent(type: string, payload: any): any;
export declare const eventBus: {
    publish: (...args: any[]) => Promise<string>;
    subscribe: (...args: any[]) => any;
};
