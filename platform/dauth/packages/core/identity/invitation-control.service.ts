import * as crypto from 'crypto';
import {  safeQuery } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';
import { getTenantSecurityPolicy } from '../policies/tenant-security-policy.service';
import type { InvitationStatus } from '../types/dauth.types';
import { catchHandler, EC } from '@dos/platform-core/resilience';

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

export async function createInvitation(
  tenantId: string,
  email: string,
  roleCode: string,
  invitedBy: string,
): Promise<Invitation> {
  const policy = await getTenantSecurityPolicy(tenantId);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + policy.invitationExpiryHours * 60 * 60_000);

  const { rows } = await safeQuery(
    `INSERT INTO invitations (tenant_id, email, role_code, invited_by, status, token, expires_at)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6)
     RETURNING invitation_id, created_at`,
    [tenantId, email, roleCode, invitedBy, token, expiresAt],
  );

  await publish('dauth.invitation.created', tenantId, { email, roleCode, invitedBy }).catch(catchHandler(EC.EVENT_BUS));

  const row: any = rows[0];
  return {
    invitationId: row.invitation_id,
    tenantId,
    email,
    roleCode,
    invitedBy,
    status: 'pending',
    token,
    expiresAt: expiresAt.toISOString(),
    createdAt: row.created_at?.toISOString?.() ?? new Date().toISOString(),
    acceptedAt: null,
  };
}

export async function validateInvitation(token: string): Promise<Invitation | null> {
  const { rows } = await safeQuery(
    `SELECT invitation_id, tenant_id, email, role_code, invited_by, status,
            token, expires_at, created_at, accepted_at
     FROM invitations
     WHERE token = $1 AND status = 'pending' AND expires_at > NOW() LIMIT 1`,
    [token],
  );
  if (!rows[0]) return null;
  const r: any = rows[0];
  return {
    invitationId: r.invitation_id,
    tenantId: r.tenant_id,
    email: r.email,
    roleCode: r.role_code,
    invitedBy: r.invited_by,
    status: r.status,
    token: r.token,
    expiresAt: r.expires_at?.toISOString?.() ?? '',
    createdAt: r.created_at?.toISOString?.() ?? '',
    acceptedAt: null,
  };
}

export async function acceptInvitation(token: string): Promise<boolean> {
  const result = await safeQuery(
    `UPDATE invitations SET status = 'accepted', accepted_at = NOW()
     WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
    [token],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function revokeInvitation(invitationId: string, _revokedBy: string): Promise<boolean> {
  const result = await safeQuery(
    `UPDATE invitations SET status = 'revoked'
     WHERE invitation_id = $1 AND status = 'pending'`,
    [invitationId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getPendingInvitations(tenantId: string): Promise<Invitation[]> {
  const { rows } = await safeQuery(
    `SELECT invitation_id, tenant_id, email, role_code, invited_by, status,
            token, expires_at, created_at, accepted_at
     FROM invitations
     WHERE tenant_id = $1 AND status = 'pending' AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [tenantId],
  );
  return rows.map(( r: any) => ({
    invitationId: r.invitation_id,
    tenantId: r.tenant_id,
    email: r.email,
    roleCode: r.role_code,
    invitedBy: r.invited_by,
    status: r.status,
    token: r.token,
    expiresAt: r.expires_at?.toISOString?.() ?? '',
    createdAt: r.created_at?.toISOString?.() ?? '',
    acceptedAt: null,
  }));
}

export async function expireStaleInvitations(): Promise<number> {
  const result = await safeQuery(
    `UPDATE invitations SET status = 'expired'
     WHERE status = 'pending' AND expires_at < NOW()`,
  );
  return result.rowCount ?? 0;
}
