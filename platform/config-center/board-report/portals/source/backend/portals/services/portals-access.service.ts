// ============================================
// Shahin-Ai — Portals Access Service
// External user token management, session mgmt,
// access logging, IP allowlisting, rate limiting
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";
import * as crypto from "crypto";

// === Types ===

export interface PortalToken {
  tokenId: string;
  portalId: string;
  externalUserId: string;
  externalOrg: string;
  tokenHash: string;
  expiresAt: string;
  lastUsedAt: string | null;
  isRevoked: boolean;
  createdAt: string;
}

export interface PortalSession {
  sessionId: string;
  tokenId: string;
  portalId: string;
  externalUserId: string;
  ipAddress: string;
  userAgent: string;
  startedAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface AccessLogEntry {
  logId: string;
  portalId: string;
  externalUserId: string | null;
  ipAddress: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  statusCode: number;
  createdAt: string;
}

// === Pure Functions ===

export function generateToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function isIpAllowed(ipAddress: string, allowedRanges: string[]): boolean {
  if (allowedRanges.length === 0) return true;
  return allowedRanges.some(range => {
    if (range.includes("/")) {
      const [network, prefix] = range.split("/");
      const maskBits = parseInt(prefix, 10);
      const ipInt = ipToInt(ipAddress);
      const netInt = ipToInt(network);
      const mask = (-1 << (32 - maskBits)) >>> 0;
      return (ipInt & mask) === (netInt & mask);
    }
    return range === ipAddress;
  });
}

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// === DB-backed Functions ===

function mapToken( r: Record<string, unknown>): PortalToken {
  return {

    tokenId: r.token_id,

    portalId: r.portal_id,

    externalUserId: r.external_user_id,

    externalOrg: r.external_org || "",

    tokenHash: r.token_hash,

    expiresAt: r.expires_at?.toISOString?.() || r.expires_at,

    lastUsedAt: r.last_used_at ? (r.last_used_at?.toISOString?.() || r.last_used_at) : null,

    isRevoked: r.is_revoked || false,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function issuePortalToken(
  tenantId: string,
  data: {
    portalId: string;
    externalUserId: string;
    externalOrg: string;
    ttlDays?: number;
  }
): Promise<{ token: PortalToken; rawToken: string }> {
  const schema = tenantSchema(tenantId);
  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + (data.ttlDays ?? 30) * 24 * 60 * 60 * 1000).toISOString();

  const result = await safeQuery(
    `INSERT INTO "${schema}".portal_tokens
      (portal_id, external_user_id, external_org, token_hash, expires_at, is_revoked)
     VALUES ($1, $2, $3, $4, $5, false)
     RETURNING *`,
    [data.portalId, data.externalUserId, data.externalOrg, hash, expiresAt]
  );

  return { token: mapToken(getFirstRow(result)!), rawToken: raw };
}

export async function validateToken(
  tenantId: string,
  rawToken: string
): Promise<PortalToken | null> {
  const schema = tenantSchema(tenantId);
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const result = await safeQuery(
    `SELECT * FROM "${schema}".portal_tokens
     WHERE token_hash = $1 AND is_revoked = false AND expires_at > NOW() LIMIT 1`,
    [hash]
  );

  if (result.rows.length === 0) return null;

  await safeQuery(
    `UPDATE "${schema}".portal_tokens SET last_used_at = NOW() WHERE token_id = $1`,
    [result.rows[0].token_id]
  );

  return mapToken(result.rows[0]);
}

export async function revokeToken(tenantId: string, tokenId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".portal_tokens SET is_revoked = true, updated_at = NOW() WHERE token_id = $1`,
    [tokenId]
  );
}

export async function createSession(
  tenantId: string,
  data: {
    tokenId: string;
    portalId: string;
    externalUserId: string;
    ipAddress: string;
    userAgent: string;
    sessionTimeoutMinutes?: number;
  }
): Promise<PortalSession> {
  const schema = tenantSchema(tenantId);
  const timeoutMs = (data.sessionTimeoutMinutes ?? 60) * 60 * 1000;
  const expiresAt = new Date(Date.now() + timeoutMs).toISOString();

  const result = await safeQuery(
    `INSERT INTO "${schema}".portal_sessions
      (token_id, portal_id, external_user_id, ip_address, user_agent, expires_at, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING *`,
    [data.tokenId, data.portalId, data.externalUserId, data.ipAddress, data.userAgent, expiresAt]
  );

  const r = result.rows[0];
  return {
    sessionId: r.session_id,
    tokenId: r.token_id,
    portalId: r.portal_id,
    externalUserId: r.external_user_id,
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
    startedAt: r.started_at?.toISOString?.() || r.started_at,
    lastActivityAt: r.last_activity_at?.toISOString?.() || r.last_activity_at,
    expiresAt: r.expires_at?.toISOString?.() || r.expires_at,
    isActive: r.is_active,
  };
}

export async function logAccess(
  tenantId: string,
  data: {
    portalId: string;
    externalUserId?: string;
    ipAddress: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    statusCode: number;
  }
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".portal_access_logs
      (portal_id, external_user_id, ip_address, action, resource_type, resource_id, status_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      data.portalId,
      data.externalUserId || null,
      data.ipAddress,
      data.action,
      data.resourceType || null,
      data.resourceId || null,
      data.statusCode,
    ]
  );
}

export async function getAccessLogs(
  tenantId: string,
  portalId: string,
  limit = 100
): Promise<AccessLogEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".portal_access_logs
     WHERE portal_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [portalId, limit]
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    logId: r.log_id,
    portalId: r.portal_id,
    externalUserId: r.external_user_id,
    ipAddress: r.ip_address,
    action: r.action,
    resourceType: r.resource_type,
    resourceId: r.resource_id,
    statusCode: r.status_code,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  }));
}
