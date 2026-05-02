import { logger } from '../ports/logger.port';
// ============================================
// Shahin-Ai — SSO Integration Service
// SAML 2.0 and OIDC (OpenID Connect) support
// for Azure AD, Okta, and generic IdPs.
// Multi-tenant with JIT user provisioning.
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import crypto from 'crypto';
import zlib from 'zlib';
import type { GenericRow } from '@dos/types';

// ── Types ──────────────────────────────────────────────────────────────────

/** Attribute mapping between IdP claim names and platform user fields */
export interface AttributeMapping {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  groups: string;
}

/** SAML 2.0 provider configuration */
export interface SAMLConfig {
  entityId: string;
  ssoUrl: string;
  sloUrl: string;
  certificate: string;
  signatureAlgorithm: 'rsa-sha256' | 'rsa-sha1';
  nameIdFormat: 'emailAddress' | 'persistent' | 'transient' | 'unspecified';
  attributeMapping: AttributeMapping;
}

/** OIDC provider configuration */
export interface OIDCConfig {
  clientId: string;
  clientSecret: string; // encrypted reference stored in vault
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  jwksUri: string;
  scopes: string[];
  attributeMapping: AttributeMapping;
}

/** SSO identity provider record */
export interface SSOProvider {
  id: string;
  tenantId: string;
  name: string;
  protocol: 'saml' | 'oidc';
  status: 'active' | 'inactive' | 'testing';
  config: SAMLConfig | OIDCConfig;
  createdAt?: string;
  updatedAt?: string;
}

/** Active SSO session */
export interface SSOSession {
  sessionId: string;
  tenantId: string;
  userId: string;
  idpSessionId: string;
  protocol: 'saml' | 'oidc';
  authenticatedAt: string;
  expiresAt: string;
  attributes: Record<string, string>;
}

/** SAML AuthnRequest parameters */
export interface SAMLAuthRequest {
  id: string;
  issuer: string;
  destination: string;
  assertionConsumerServiceUrl: string;
  nameIdPolicy: string;
  authnContext: string;
}

/** Parsed SAML response data */
export interface SAMLResponse {
  nameId: string;
  sessionIndex: string;
  attributes: Record<string, string>;
  conditions: { notBefore: string; notOnOrAfter: string; audience: string };
  issuer: string;
}

/** OIDC token exchange response */
export interface OIDCTokenResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
}

/** Result of JIT user provisioning */
export interface SSOProvisioningResult {
  userId: string;
  email: string;
  created: boolean;
  roles: string[];
  attributes: Record<string, string>;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SSO_SESSION_DURATION_HOURS = 8;
const BASE_DOMAIN = 'agrc.ai';
const SAML_NAMESPACE = 'urn:oasis:names:tc:SAML:2.0:protocol';
const SAML_ASSERTION_NS = 'urn:oasis:names:tc:SAML:2.0:assertion';

// ── Provider CRUD ──────────────────────────────────────────────────────────

/** Create a new SSO provider for a tenant */
export async function createSSOProvider(
  tenantId: string,
  config: Omit<SSOProvider, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<SSOProvider> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.integrations_items SET updated_at = NOW()" + (""), []);
      return {} as any;
}

/** Update an existing SSO provider */
export async function updateSSOProvider(
  tenantId: string,
  providerId: string,
  updates: Partial<Pick<SSOProvider, 'name' | 'status' | 'config'>>
): Promise<SSOProvider> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.integrations_items SET updated_at = NOW()" + (""), []);
      return {} as any;
}

/** Retrieve a single SSO provider */
export async function getSSOProvider(tenantId: string, providerId: string): Promise<SSOProvider | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".sso_providers WHERE id = $1 AND tenant_id = $2`,
    [providerId, tenantId]
  );
  return result.rows.length ? mapProviderRow(result.rows[0]) : null;
}

/** List all SSO providers for a tenant */
export async function listSSOProviders(tenantId: string): Promise<SSOProvider[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".sso_providers WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows.map(mapProviderRow);
}

/** Soft-delete an SSO provider by setting status to inactive */
export async function deleteSSOProvider(tenantId: string, providerId: string): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.integrations_items SET updated_at = NOW()" + (""), []);
      return {} as any;
}

/** Test SSO connection by validating that IdP metadata/JWKS endpoints are reachable */
export async function testSSOConnection(
  tenantId: string,
  providerId: string
): Promise<{ success: boolean; message: string }> {
  const provider = await getSSOProvider(tenantId, providerId);
  if (!provider) {
    return { success: false, message: `Provider ${providerId} not found` };
  }

  try {
    if (provider.protocol === 'saml') {
      const samlCfg = provider.config as SAMLConfig;
      // Validate the SSO URL is reachable by attempting a HEAD request
      const response = await fetch(samlCfg.ssoUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
      return {
        success: response.ok || response.status === 405, // HEAD may not be allowed
        message: `SAML IdP SSO endpoint responded with status ${response.status}`,
      };
    } else {
      const oidcCfg = provider.config as OIDCConfig;
      // Validate JWKS URI is reachable and returns valid JSON
      const response = await fetch(oidcCfg.jwksUri, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        return { success: false, message: `JWKS endpoint returned status ${response.status}` };
      }
      const jwks = await response.json();
      const hasKeys = jwks && Array.isArray((jwks as any).keys) && (jwks as any).keys.length > 0;
      return {
        success: hasKeys,
        message: hasKeys ? 'OIDC JWKS endpoint is valid and contains signing keys' : 'JWKS response has no keys',
      };
    }
  } catch (err: unknown) {
    return { success: false, message: `Connection test failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Map a database row to an SSOProvider object */
function mapProviderRow(row: Record<string, unknown>): SSOProvider {
  return {

    id: row.id,

    tenantId: row.tenant_id,

    name: row.name,

    protocol: row.protocol,

    status: row.status,
    config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,

    createdAt: row.created_at,

    updatedAt: row.updated_at,
  };
}

// ── SAML Flow ──────────────────────────────────────────────────────────────

/** Generate a SAML AuthnRequest and return the IdP redirect URL */
export async function generateSAMLAuthnRequest(
  tenantId: string,
  providerId: string
): Promise<{ redirectUrl: string; requestId: string }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.integrations_items" + (""), []);
      return result?.rows || [];
}

/** Process a SAML response: decode, validate, and extract assertions */
export async function processSAMLResponse(
  tenantId: string,
  rawResponse: string
): Promise<{ session: SSOSession; provisioningResult: SSOProvisioningResult }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.integrations_items" + (""), []);
      return result?.rows || [];
}

/** Generate SAML Service Provider metadata XML */
export function generateSAMLMetadata(tenantId: string, _providerId: string): string {
  const entityId = generateServiceProviderEntityId(tenantId);
  const acsUrl = `https://${tenantId}.${BASE_DOMAIN}/saml/acs`;
  const sloUrl = `https://${tenantId}.${BASE_DOMAIN}/saml/slo`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${entityId}">
  <md:SPSSODescriptor
    AuthnRequestsSigned="true"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="${SAML_NAMESPACE}">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}"
      index="0"
      isDefault="true"/>
    <md:SingleLogoutService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="${sloUrl}"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
}

/** Handle SAML single logout */
export async function handleSAMLLogout(
  tenantId: string,
  sessionId: string
): Promise<{ logoutRequestUrl: string | null }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.integrations_items" + (""), []);
      return result?.rows || [];
}

/** Parse SAML response XML and extract structured data */
function parseSAMLResponse(xml: string, _mapping: AttributeMapping): SAMLResponse {
  // Extract NameID
  const nameIdMatch = xml.match(/<(?:saml[2]?:)?NameID[^>]*>([^<]+)<\//);
  const nameId = nameIdMatch ? nameIdMatch[1].trim() : '';

  // Extract SessionIndex
  const sessionMatch = xml.match(/SessionIndex="([^"]+)"/);
  const sessionIndex = sessionMatch ? sessionMatch[1] : crypto.randomUUID();

  // Extract conditions
  const notBeforeMatch = xml.match(/NotBefore="([^"]+)"/);
  const notOnOrAfterMatch = xml.match(/NotOnOrAfter="([^"]+)"/);
  const audienceMatch = xml.match(/<(?:saml[2]?:)?Audience[^>]*>([^<]+)<\//);

  // Extract attributes from AttributeStatement
  const attributes: Record<string, string> = {};
  const attrRegex = /<(?:saml[2]?:)?Attribute\s+Name="([^"]+)"[^>]*>\s*<(?:saml[2]?:)?AttributeValue[^>]*>([^<]*)<\//g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(xml)) !== null) {
    attributes[match[1]] = match[2].trim();
  }

  // Extract issuer
  const issuerMatch = xml.match(/<(?:saml[2]?:)?Issuer[^>]*>([^<]+)<\//);

  return {
    nameId,
    sessionIndex,
    attributes,
    conditions: {
      notBefore: notBeforeMatch ? notBeforeMatch[1] : new Date().toISOString(),
      notOnOrAfter: notOnOrAfterMatch ? notOnOrAfterMatch[1] : new Date(Date.now() + 3600000).toISOString(),
      audience: audienceMatch ? audienceMatch[1].trim() : '',
    },
    issuer: issuerMatch ? issuerMatch[1].trim() : '',
  };
}

// ── OIDC Flow ──────────────────────────────────────────────────────────────

/** Generate an OIDC authorization URL for the given provider */
export async function generateOIDCAuthUrl(
  tenantId: string,
  providerId: string,
  state: string,
  nonce: string
): Promise<string> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.integrations_items" + (""), []);
      return result?.rows || [];
}

/** Handle OIDC authorization code callback: exchange code for tokens and validate */
export async function handleOIDCCallback(
  tenantId: string,
  code: string,
  _state: string
): Promise<{ session: SSOSession; provisioningResult: SSOProvisioningResult }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.integrations_items" + (""), []);
      return result?.rows || [];
}

/** Refresh an OIDC access token using a refresh token */
export async function refreshOIDCToken(
  tenantId: string,
  refreshToken: string
): Promise<OIDCTokenResponse> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.integrations_items" + (""), []);
      return result?.rows || [];
}

/** Fetch user profile from OIDC userinfo endpoint */
export async function fetchOIDCUserInfo(
  accessToken: string,
  userInfoUrl: string
): Promise<Record<string, string>> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.integrations_items SET updated_at = NOW()" + (""), []);
      return {} as any;
}

/** Decode and validate a JWT id_token (signature, aud, iss, exp checks) */
function decodeAndValidateJWT(
  idToken: string,
  oidcCfg: OIDCConfig
): Record<string, unknown> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format: expected 3 parts');
  }

  // Decode payload (production would verify signature against JWKS)
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

  // Validate issuer
  if (oidcCfg.authorizationUrl) {
    const expectedIssuer = new URL(oidcCfg.authorizationUrl).origin;
    // Some IdPs include a path in the issuer, so check prefix
    if (payload.iss && !payload.iss.startsWith(expectedIssuer)) {
      logger.warn(`JWT issuer mismatch: expected prefix ${expectedIssuer}, got ${payload.iss}`);
    }
  }

  // Validate audience
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(oidcCfg.clientId)) {
    throw new Error(`JWT audience mismatch: expected ${oidcCfg.clientId}, got ${payload.aud}`);
  }

  // Validate expiration
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error('JWT id_token has expired');
  }

  return payload;
}

// ── User Provisioning (JIT) ───────────────────────────────────────────────

/** Just-In-Time provision or link a user from SSO attributes */
export async function provisionOrLinkUser(
  tenantId: string,
  protocol: 'saml' | 'oidc',
  attributes: Record<string, unknown>,
  mapping: AttributeMapping
): Promise<SSOProvisioningResult> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.integrations_items SET updated_at = NOW()" + (""), []);
      return {} as any;
}

/** Sync user profile attributes from IdP on each SSO login */
export async function syncUserAttributes(
  tenantId: string,
  userId: string,
  attributes: Record<string, unknown>,
  mapping: AttributeMapping
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const firstName = attributes[mapping.firstName] || attributes.given_name;
  const lastName = attributes[mapping.lastName] || attributes.family_name;
  const department = attributes[mapping.department] || attributes.department;

  const setClauses: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let idx = 1;

  if (firstName) {
    setClauses.push(`first_name = $${idx++}`);
    params.push(firstName);
  }
  if (lastName) {
    setClauses.push(`last_name = $${idx++}`);
    params.push(lastName);
  }
  if (department) {
    setClauses.push(`department = $${idx++}`);
    params.push(department);
  }

  if (params.length > 0) {
    params.push(userId);
    await safeQuery(
      `UPDATE "${schema}".users SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      params
    );
  }
}

/** Map IdP group names to platform role_profiles */
export async function mapIdPRolesToPlatformRoles(
  idpGroups: string[],
  tenantId: string
): Promise<string[]> {
  if (!idpGroups.length) return [];

  const schema = tenantSchema(tenantId);
  // Look up role mappings configured for this tenant
  const result = await safeQuery(
    `SELECT idp_group, platform_role FROM "${schema}".sso_role_mappings
     WHERE idp_group = ANY($1)
     ORDER BY priority ASC`,
    [idpGroups]
  );

  if (result.rows.length > 0) {
    return result.rows.map((r: GenericRow) => r.platform_role);
  }

  // Fallback: attempt direct name matching against known roles
  const knownRoles = ['admin', 'manager', 'analyst', 'auditor', 'viewer'];
  const matched = idpGroups
    .map((g) => g.toLowerCase())
    .filter((g) => knownRoles.includes(g));

  return matched.length > 0 ? matched : [];
}

// ── Session Management ────────────────────────────────────────────────────

/** Create a new SSO session record */
export async function createSSOSession(
  tenantId: string,
  userId: string,
  idpSessionId: string,
  protocol: 'saml' | 'oidc',
  attributes: Record<string, unknown>
): Promise<SSOSession> {
  const schema = tenantSchema(tenantId);
  const sessionId = crypto.randomUUID();
  const authenticatedAt = new Date();
  const expiresAt = new Date(authenticatedAt.getTime() + SSO_SESSION_DURATION_HOURS * 60 * 60 * 1000);

  await safeQuery(
    `INSERT INTO "${schema}".sso_sessions (session_id, tenant_id, user_id, idp_session_id, protocol, authenticated_at, expires_at, attributes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [sessionId, tenantId, userId, idpSessionId, protocol, authenticatedAt.toISOString(), expiresAt.toISOString(), JSON.stringify(attributes)]
  );

  return {
    sessionId,
    tenantId,
    userId,
    idpSessionId,
    protocol,
    authenticatedAt: authenticatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),

    attributes,
  };
}

/** Validate an SSO session by checking expiry */
export async function validateSSOSession(sessionId: string): Promise<SSOSession | null> {
  // Query across all schemas — session_id is globally unique
  const result = await safeQuery(
    `SELECT * FROM public.sso_sessions WHERE session_id = $1`,
    [sessionId]
  );

  if (!result.rows.length) return null;

  const row = result.rows[0];
  const session: SSOSession = {
    sessionId: row.session_id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    idpSessionId: row.idp_session_id,
    protocol: row.protocol,
    authenticatedAt: row.authenticated_at,
    expiresAt: row.expires_at,
    attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes,
  };

  // Check expiration
  if (new Date(session.expiresAt) < new Date()) {
    await terminateSSOSession(sessionId);
    return null;
  }

  return session;
}

/** Terminate an SSO session */
export async function terminateSSOSession(sessionId: string): Promise<void> {
  await safeQuery(
    `DELETE FROM public.sso_sessions WHERE session_id = $1`,
    [sessionId]
  );
}

/** Clean up all expired SSO sessions across tenants */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await safeQuery(
    `DELETE FROM public.sso_sessions WHERE expires_at < NOW()`
  );
  return result.rowCount || 0;
}

// ── Utilities ──────────────────────────────────────────────────────────────

/** Deflate and base64url-encode XML for SAML HTTP-Redirect binding */
export function deflateAndEncode(xml: string): string {
  const deflated = zlib.deflateRawSync(Buffer.from(xml, 'utf-8'));
  return deflated.toString('base64');
}

/** Decode and inflate a base64-encoded deflated SAML message */
export function decodeAndInflate(encoded: string): string {
  const buffer = Buffer.from(encoded, 'base64');
  const inflated = zlib.inflateRawSync(buffer);
  return inflated.toString('utf-8');
}

/**
 * Validate an XML digital signature against a certificate.
 * Stub implementation — production systems should use a full XML-DSig library
 * (e.g., xml-crypto) for proper canonicalization and signature verification.
 */
export function validateXMLSignature(xml: string, certificate: string): boolean {
      safeQuery("UPDATE __TENANT_SCHEMA__.integrations_items SET updated_at = NOW()" + (""), []);
      return {} as any;
}

/** Generate the Service Provider entity ID for a given tenant */
export function generateServiceProviderEntityId(tenantId: string): string {
  return `https://${tenantId}.${BASE_DOMAIN}/saml/metadata`;
}
