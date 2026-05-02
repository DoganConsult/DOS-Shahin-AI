import type { ModuleEventPayload } from '@dos/types';
export type EventPublisher = (payload: ModuleEventPayload) => Promise<void>;
export declare function setPublisher(fn: EventPublisher): void;
export declare function publish(eventName: string, payload: Omit<ModuleEventPayload, 'moduleCode'>): Promise<void>;
export declare function getPublishedEventNames(): string[];
