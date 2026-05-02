import type { SessionSecurityEventType, SessionRiskLevel } from './csrf-policy.contracts';
export interface RecordSessionEventOpts {
    sessionId: string;
    tenantId: string;
    userId: string;
    eventType: SessionSecurityEventType;
    riskLevel: SessionRiskLevel;
    metadata?: Record<string, unknown>;
}
/** Persist a session security event to DB + publish to event bus. */
export declare function recordSessionSecurityEvent(opts: RecordSessionEventOpts): Promise<void>;
/** Compute server-side session health score from recent events. */
export declare function getSessionHealthScore(sessionId: string): Promise<{
    score: number;
    state: 'healthy' | 'unstable' | 'degraded' | 'expired';
    recentEvents: number;
}>;
/** Detect anomalies by comparing current request against session history. */
export declare function detectSessionAnomalies(sessionId: string, tenantId: string, userId: string, currentIp: string, currentUa: string): Promise<SessionSecurityEventType[]>;
/** Get recent session security events for diagnostics. */
export declare function getSessionSecurityEvents(tenantId: string, limit?: number): Promise<Array<{
    eventId: string;
    sessionId: string;
    userId: string;
    eventType: string;
    riskLevel: string;
    occurredAt: string;
}>>;
