import type { ModuleEventPayload } from '@dos/types';
export type EventPublisher = (payload: ModuleEventPayload) => Promise<void>;
export declare function setPublisher(fn: EventPublisher): void;
type SseSubscriber = (eventName: string, payload: ModuleEventPayload) => void;
export declare function subscribeForTenant(tenantId: string, fn: SseSubscriber): () => void;
export declare function publish(eventName: string, payload: Omit<ModuleEventPayload, 'moduleCode'>): Promise<void>;
export declare function getPublishedEventNames(): string[];
export {};
