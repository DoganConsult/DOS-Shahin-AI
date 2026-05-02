/**
 * Canonical identifier primitives shared by Keycloak, Postgres, OpenFGA, and
 * Cerbos. These branded types guarantee at the type level that an id originated
 * from its authoritative system and is safe to propagate across the three
 * stores without reshape.
 *
 * Sources of truth:
 *   UserId         ← Keycloak `sub` (UUIDv4). Mirrored to users.keycloak_sub.
 *   TenantId       ← Postgres platform_dos.tenants_registry.tenant_id (UUIDv7).
 *   ProductCode    ← Postgres platform_dos.products_registry.product_code.
 *   ModuleCode     ← Postgres platform_dos.modules_registry.module_code.
 *   WorkspaceId    ← Postgres workspaces table (UUIDv7).
 *   ResourceUrn    ← Derived: urn:dos:<module>:<tenant>:<id>
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type TenantId = Brand<string, 'TenantId'>;
export type ProductCode = Brand<string, 'ProductCode'>;
export type ModuleCode = Brand<string, 'ModuleCode'>;
export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export type RoleCode = Brand<string, 'RoleCode'>;
export type SessionId = Brand<string, 'SessionId'>;

export interface CanonicalIds {
  readonly userId: UserId;
  readonly tenantId: TenantId;
  readonly productCode: ProductCode;
  readonly workspaceId?: WorkspaceId;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_ANY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[a-z][a-z0-9_-]{1,63}$/;

export function asUserId(value: string): UserId {
  if (!UUID_ANY.test(value)) {
    throw new Error(`[authz-ids] invalid UserId (expected UUID): ${redact(value)}`);
  }
  return value as UserId;
}

export function asTenantId(value: string): TenantId {
  if (!UUID_ANY.test(value)) {
    throw new Error(`[authz-ids] invalid TenantId (expected UUID): ${redact(value)}`);
  }
  return value as TenantId;
}

export function asProductCode(value: string): ProductCode {
  if (!CODE.test(value)) {
    throw new Error(`[authz-ids] invalid ProductCode (expected lowercase kebab/snake): ${redact(value)}`);
  }
  return value as ProductCode;
}

export function asModuleCode(value: string): ModuleCode {
  if (!CODE.test(value)) {
    throw new Error(`[authz-ids] invalid ModuleCode (expected lowercase kebab/snake): ${redact(value)}`);
  }
  return value as ModuleCode;
}

export function asWorkspaceId(value: string): WorkspaceId {
  if (!UUID_ANY.test(value)) {
    throw new Error(`[authz-ids] invalid WorkspaceId (expected UUID): ${redact(value)}`);
  }
  return value as WorkspaceId;
}

export function asRoleCode(value: string): RoleCode {
  if (!CODE.test(value)) {
    throw new Error(`[authz-ids] invalid RoleCode: ${redact(value)}`);
  }
  return value as RoleCode;
}

export function asSessionId(value: string): SessionId {
  if (!value || value.length < 8 || value.length > 128) {
    throw new Error(`[authz-ids] invalid SessionId length`);
  }
  return value as SessionId;
}

export function isUuidV4(value: string): boolean {
  return UUID_V4.test(value);
}

export function isUuidV7(value: string): boolean {
  return UUID_V7.test(value);
}

function redact(value: string): string {
  if (value.length <= 8) {
    return '***';
  }
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
