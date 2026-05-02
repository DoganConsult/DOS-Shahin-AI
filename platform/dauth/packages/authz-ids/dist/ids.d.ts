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
type Brand<T, B extends string> = T & {
    readonly [brand]: B;
};
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
export declare function asUserId(value: string): UserId;
export declare function asTenantId(value: string): TenantId;
export declare function asProductCode(value: string): ProductCode;
export declare function asModuleCode(value: string): ModuleCode;
export declare function asWorkspaceId(value: string): WorkspaceId;
export declare function asRoleCode(value: string): RoleCode;
export declare function asSessionId(value: string): SessionId;
export declare function isUuidV4(value: string): boolean;
export declare function isUuidV7(value: string): boolean;
export {};
