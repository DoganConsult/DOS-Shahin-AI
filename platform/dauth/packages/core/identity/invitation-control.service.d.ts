import type { InvitationStatus } from '../types/dauth.types';
export interface Invitation {
    invitationId: string;
    tenantId: string;
    email: string;
    roleCode: string;
    invitedBy: string;
    status: InvitationStatus;
    token: string;
    expiresAt: string;
    createdAt: string;
    acceptedAt: string | null;
}
export declare function createInvitation(tenantId: string, email: string, roleCode: string, invitedBy: string): Promise<Invitation>;
export declare function validateInvitation(token: string): Promise<Invitation | null>;
export declare function acceptInvitation(token: string): Promise<boolean>;
export declare function revokeInvitation(invitationId: string, _revokedBy: string): Promise<boolean>;
export declare function getPendingInvitations(tenantId: string): Promise<Invitation[]>;
export declare function expireStaleInvitations(): Promise<number>;
