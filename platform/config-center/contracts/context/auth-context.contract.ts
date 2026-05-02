/**
 * Auth Context Contract
 * Defines how auth context is propagated between services.
 * Source: DOS-AIO-Specs -- auth context is propagated via HTTP headers.
 */

/**
 * Headers that MUST be forwarded by the gateway to all backend services.
 */
export const AUTH_HEADERS = {
  /** JWT Bearer token */
  authorization: 'authorization',

  /** Tenant ID (resolved from JWT or explicitly set) */
  tenantId: 'x-tenant-id',

  /** User ID (resolved from JWT) */
  userId: 'x-user-id',

  /** Distributed trace / correlation ID */
  correlationId: 'x-correlation-id',

  /** Request ID (unique per request) */
  requestId: 'x-request-id',

  /** Source service code (set by service-client) */
  sourceService: 'x-source-service',
} as const;

/**
 * JWT payload shape (RS256 signed by auth-service only).
 * Other services verify with public key or call auth-service /validate.
 */
export interface JwtPayload {
  sub: string;          // userId
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;          // 'dos-auth-service'
  aud: string;          // 'dos-platform'
}
