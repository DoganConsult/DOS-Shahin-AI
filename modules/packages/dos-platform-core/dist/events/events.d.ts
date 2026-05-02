import type { PlatformEvent as CanonicalPlatformEvent, EventSubscription } from '@dos/types';
export interface EventRegistration {
    eventType: string;
    category: string;
    ownerModule: string;
    description?: string;
    payloadSchema?: Record<string, unknown>;
    severity?: string;
    version?: number;
}
export type EventTypeString = string;
export type DOSEventHandler = (event: CanonicalPlatformEvent) => Promise<void> | void;
export type BeforePublishHook = (event: CanonicalPlatformEvent) => Promise<CanonicalPlatformEvent | null> | CanonicalPlatformEvent | null;
export type AfterPublishHook = (event: CanonicalPlatformEvent) => Promise<void> | void;
export interface EmitEventParams {
    event: string;
    module: string;
    tenantId: string;
    data?: Record<string, unknown>;
    userId?: string;
    entityType?: string;
    entityId?: string;
}
export interface PlatformEvents {
    subscribe(sub: EventSubscription): () => void;
    getSubscriberCount(eventType?: string): number;
    getSubscribers?(): Record<string, string[]>;
    publish<T = Record<string, unknown>>(eventType: string, tenantId: string, payload: T, opts?: {
        userId?: string;
        actorId?: string;
        moduleCode?: string;
        entityType?: string;
        entityId?: string;
        severity?: 'info' | 'warn' | 'error' | 'critical';
        category?: 'security' | 'audit' | 'system' | 'domain';
        correlationId?: string;
        causationId?: string;
    }): Promise<string>;
    getDeadLetterQueue(): Array<{
        event: CanonicalPlatformEvent;
        error: string;
        failedAt: Date;
    }>;
    drainDeadLetterQueue(): Array<{
        event: CanonicalPlatformEvent;
        error: string;
        failedAt: Date;
    }>;
    emitEvent(params: EmitEventParams): Promise<string>;
    eventBus?: any;
}
export interface PlatformEventExtensions {
    getAutomationRules(tenantId: string, moduleCode?: string): Promise<Record<string, unknown>[]>;
    getAutomationRule(tenantId: string, ruleId: string): Promise<unknown>;
    createAutomationRule(tenantId: string, data: Record<string, unknown>): Promise<unknown>;
    updateAutomationRule(tenantId: string, ruleId: string, data: Record<string, unknown>): Promise<unknown>;
    deleteAutomationRule(tenantId: string, ruleId: string): Promise<void>;
    getAutomationLog(tenantId: string, limit?: number): Promise<Record<string, unknown>[]>;
    seedDefaultAutomationRules(tenantId: string): Promise<number>;
    registerEventType(reg: EventRegistration): void;
    getRegisteredEventTypes(moduleCode?: string): EventRegistration[];
    registerModuleEventTypes(moduleCode: string, eventTypes: string[]): void;
    registerEventTypes(productCode: string, types: readonly string[]): void;
    getRegisteredTypes(productCode?: string): string[];
    verifyEventLogChain(tenantId: string, since?: string): Promise<{
        valid: boolean;
        brokenAt?: string;
        totalChecked: number;
    }>;
}
export declare function setPlatformEvents(impl: PlatformEvents): void;
export declare function setPlatformEventExtensions(impl: PlatformEventExtensions): void;
export declare function subscribe(sub: EventSubscription): () => void;
export declare function getSubscriberCount(eventType?: string): number;
export declare function publish<T = Record<string, unknown>>(eventType: string, tenantId: string, payload: T, opts?: Parameters<PlatformEvents['publish']>[3]): Promise<string>;
export declare function getDeadLetterQueue(): Array<{
    event: CanonicalPlatformEvent;
    error: string;
    failedAt: Date;
}>;
export declare function drainDeadLetterQueue(): Array<{
    event: CanonicalPlatformEvent;
    error: string;
    failedAt: Date;
}>;
export declare function emitEvent(params: EmitEventParams): Promise<string>;
export declare const eventBus: {
    publish: <T>(eventType: string, tenantId: string, payload: unknown, opts?: {
        userId?: string;
        actorId?: string;
        moduleCode?: string;
        entityType?: string;
        entityId?: string;
        severity?: "info" | "warn" | "error" | "critical";
        category?: "security" | "audit" | "system" | "domain";
        correlationId?: string;
        causationId?: string;
    }) => Promise<string>;
    subscribe: (sub: EventSubscription) => () => void;
    getSubscribers: () => Record<string, string[]>;
};
export declare function getEventBus(): typeof eventBus;
export declare function onEvent(eventType: string, handler: (payload: Record<string, unknown>) => Promise<void> | void): () => void;
export declare function publishEvent(event: CanonicalPlatformEvent): Promise<string>;
export declare function getAutomationRules(tenantId: string, moduleCode?: string): Promise<Record<string, unknown>[]>;
export declare function getAutomationRule(tenantId: string, ruleId: string): Promise<unknown>;
export declare function createAutomationRule(tenantId: string, data: Record<string, unknown>): Promise<unknown>;
export declare function updateAutomationRule(tenantId: string, ruleId: string, data: Record<string, unknown>): Promise<unknown>;
export declare function deleteAutomationRule(tenantId: string, ruleId: string): Promise<void>;
export declare function getAutomationLog(tenantId: string, limit?: number): Promise<Record<string, unknown>[]>;
export declare function seedDefaultAutomationRules(tenantId: string): Promise<number>;
export declare function registerEventType(reg: EventRegistration): void;
export declare function getRegisteredEventTypes(moduleCode?: string): EventRegistration[];
export declare function registerModuleEventTypes(moduleCode: string, eventTypes: string[]): void;
export declare function registerEventTypes(productCode: string, types: readonly string[]): void;
export declare function getRegisteredTypes(productCode?: string): string[];
export declare function verifyEventLogChain(tenantId: string, since?: string): Promise<{
    valid: boolean;
    brokenAt?: string;
    totalChecked: number;
}>;
