import type { SecurityEventType } from '../types/dauth.types';
export interface SecurityEvent {
    eventId: string;
    tenantId: string;
    userId: string;
    eventType: SecurityEventType;
    ip: string;
    userAgent: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}
export declare function logSecurityEvent(tenantId: string, userId: string, eventType: SecurityEventType, opts?: {
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
}): Promise<void>;
export declare function getSecurityEvents(tenantId: string, userId?: string, opts?: {
    eventType?: SecurityEventType;
    limit?: number;
    since?: string;
}): Promise<SecurityEvent[]>;
export declare function getRecentFailedLogins(tenantId: string, since: string): Promise<SecurityEvent[]>;
export declare function getSecurityEventSummary(tenantId: string, since: string): Promise<Record<SecurityEventType, number>>;
