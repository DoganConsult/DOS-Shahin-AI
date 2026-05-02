import type { SessionContext } from '../types/dauth.types';
export declare function getSessionContext(sessionId: string): Promise<SessionContext | null>;
export declare function recordSessionActivity(sessionId: string): Promise<void>;
export declare function createSessionRecord(sessionId: string, userId: string, tenantId: string, ip: string, userAgent: string): Promise<void>;
export declare function getActiveSessionsForUser(userId: string): Promise<SessionContext[]>;
export declare function terminateExpiredSessions(timeoutMinutes: number): Promise<number>;
