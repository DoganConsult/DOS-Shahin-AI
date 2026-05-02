import type { GenericRow } from '@dos/types/db';
export declare function getActorRoles(tenantId: string, actorId: string): Promise<GenericRow[]>;
export declare function assignRoleToActor(tenantId: string, actorId: string, roleId: string, assignedBy: string): Promise<GenericRow | null>;
export declare function revokeRoleFromActor(tenantId: string, actorId: string, roleId: string): Promise<boolean>;
export declare function getActorAccessAssignments(tenantId: string, actorId: string): Promise<GenericRow[]>;
export declare function assignAccessToActor(tenantId: string, actorId: string, profileId: string, assignedBy: string): Promise<GenericRow | null>;
export declare function logActorAudit(tenantId: string, actorId: string, action: string, details?: Record<string, unknown>): Promise<void>;
export declare function getActorAuditLog(tenantId: string, actorId: string, limit?: number): Promise<GenericRow[]>;
