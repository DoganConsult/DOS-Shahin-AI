# Config Registry Implementation Pack

## Purpose
This is a single handoff file for implementing the hierarchical configuration registry in the backend for all deployment cases:
- Enterprise SaaS
- On-Premise
- Government / Sovereign
- Open SDK / Headless

It is written as one all-in-one execution pack so engineering can scaffold, implement, review, and hand over without needing separate notes.

---

## Primary decision
Start with the **config registry first**, then connect access control to it in the same pass.

Reason:
- access profiles and permissions need a stable config surface to protect
- deployment mode, product mode, and tenant mode should not be encoded inside ad hoc admin logic
- the config registry becomes the canonical source for what can be set, where it can be set, and who can override it

So the build order is:
1. database schema
2. TypeScript domain types
3. Zod request/response contracts
4. service layer
5. REST endpoints
6. permission checks and access-profile wiring
7. effective config resolution
8. audit trail
9. deployment-profile bootstrap seeds
10. SDK/headless adapter

---

# 1. Core model

## Canonical tables
Use these tables as the base model:
- `config_definitions`
- `config_values`
- `config_locks`
- `config_audit_logs`
- `effective_config_cache` (optional, later)

## Separation rule
Every config key must declare:
- owner domain
- value type
- allowed scopes
- default behavior
- whether it is secret
- whether it is overridable
- whether it is lockable
- whether restart is required
- whether it is deployment-only

## Supported scopes
Use this scope order only:
- `environment`
- `deployment`
- `platform`
- `product`
- `module`
- `tenant`
- `organization`
- `user`

### Effective precedence
Higher specificity wins:
`user > organization > tenant > module > product > platform > deployment > environment > default`

### Guardrail
Not every key can be set at every scope.
That is enforced by `allowed_scopes` in `config_definitions`.

---

# 2. PostgreSQL schema

```sql
create extension if not exists "pgcrypto";

create table if not exists config_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  owner_domain text not null,
  category text not null,
  value_type text not null,
  allowed_scopes text[] not null,
  default_value jsonb,
  validation_schema jsonb,
  enum_values text[] default '{}',
  is_secret boolean not null default false,
  is_required boolean not null default false,
  is_overridable boolean not null default true,
  is_lockable boolean not null default true,
  requires_restart boolean not null default false,
  deployment_only boolean not null default false,
  sdk_exposable boolean not null default false,
  ui_exposable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create index if not exists idx_config_definitions_owner_domain on config_definitions(owner_domain);
create index if not exists idx_config_definitions_category on config_definitions(category);

create table if not exists config_values (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references config_definitions(id) on delete cascade,
  scope_type text not null,
  scope_id text not null,
  value jsonb not null,
  value_hash text,
  is_encrypted boolean not null default false,
  source text not null default 'manual',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (definition_id, scope_type, scope_id)
);

create index if not exists idx_config_values_scope on config_values(scope_type, scope_id);
create index if not exists idx_config_values_definition on config_values(definition_id);

create table if not exists config_locks (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references config_definitions(id) on delete cascade,
  locked_at_scope_type text not null,
  locked_at_scope_id text not null,
  lock_behavior text not null default 'no_override_below',
  reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  unique (definition_id, locked_at_scope_type, locked_at_scope_id)
);

create index if not exists idx_config_locks_scope on config_locks(locked_at_scope_type, locked_at_scope_id);

create table if not exists config_audit_logs (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid references config_definitions(id) on delete set null,
  config_key text not null,
  action text not null,
  scope_type text not null,
  scope_id text not null,
  actor_user_id uuid,
  actor_role_code text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_config_audit_logs_key on config_audit_logs(config_key);
create index if not exists idx_config_audit_logs_scope on config_audit_logs(scope_type, scope_id);
create index if not exists idx_config_audit_logs_created_at on config_audit_logs(created_at desc);

create table if not exists effective_config_cache (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references config_definitions(id) on delete cascade,
  scope_type text not null,
  scope_id text not null,
  effective_value jsonb not null,
  resolved_from_scope_type text not null,
  resolved_from_scope_id text not null,
  resolution_path jsonb not null default '[]'::jsonb,
  resolved_at timestamptz not null default now(),
  unique (definition_id, scope_type, scope_id)
);
```

---

# 3. Suggested key taxonomy

Use fully qualified config keys:

```text
platform.branding.primaryColor
platform.observability.telemetryEnabled
platform.security.passwordPolicy
platform.licensing.mode

deployment.mode
deployment.airgapped.enabled
deployment.secrets.provider
deployment.storage.objectStore

auth.session.maxAgeMinutes
auth.mfa.required

ai.providers.default
ai.providers.allowed
ai.llm.localOnly
ai.llm.modelPack

product.shahin.enabled
product.shahin.onboardingPreset

module.audit.enabled
module.evidence.retentionDays
module.governance.boardPackTemplate

tenant.notifications.emailEnabled
organization.dashboard.defaultLayout
user.preferences.language
user.preferences.timezone
```

Rule:
- `platform.*` = reusable neutral platform keys
- `product.*` = product-owned defaults
- `module.*` = module-owned defaults
- `tenant.*`, `organization.*`, `user.*` = scoped override families

---

# 4. TypeScript domain model

```ts
export const CONFIG_SCOPE_ORDER = [
  'environment',
  'deployment',
  'platform',
  'product',
  'module',
  'tenant',
  'organization',
  'user',
] as const;

export type ConfigScopeType = typeof CONFIG_SCOPE_ORDER[number];

export const CONFIG_VALUE_TYPES = [
  'string',
  'number',
  'boolean',
  'json',
  'string_array',
  'number_array',
  'enum',
  'secret',
] as const;

export type ConfigValueType = typeof CONFIG_VALUE_TYPES[number];

export interface ConfigDefinition {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  ownerDomain: string;
  category: string;
  valueType: ConfigValueType;
  allowedScopes: ConfigScopeType[];
  defaultValue?: unknown;
  validationSchema?: Record<string, unknown> | null;
  enumValues?: string[];
  isSecret: boolean;
  isRequired: boolean;
  isOverridable: boolean;
  isLockable: boolean;
  requiresRestart: boolean;
  deploymentOnly: boolean;
  sdkExposable: boolean;
  uiExposable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigValueRecord {
  id: string;
  definitionId: string;
  scopeType: ConfigScopeType;
  scopeId: string;
  value: unknown;
  valueHash?: string | null;
  isEncrypted: boolean;
  source: 'manual' | 'bootstrap' | 'seed' | 'system' | 'sdk';
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveConfigResult {
  key: string;
  effectiveValue: unknown;
  resolvedFromScopeType: ConfigScopeType | 'default';
  resolvedFromScopeId: string | 'definition';
  resolutionPath: Array<{
    scopeType: ConfigScopeType | 'default';
    scopeId: string;
    hit: boolean;
  }>;
  lockedBy?: {
    scopeType: ConfigScopeType;
    scopeId: string;
  } | null;
}
```

---

# 5. Zod schemas

```ts
import { z } from 'zod';

export const ConfigScopeTypeSchema = z.enum([
  'environment',
  'deployment',
  'platform',
  'product',
  'module',
  'tenant',
  'organization',
  'user',
]);

export const ConfigValueTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'json',
  'string_array',
  'number_array',
  'enum',
  'secret',
]);

export const JsonValueSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ])
);

export const ConfigDefinitionCreateSchema = z.object({
  key: z.string().min(3).max(255).regex(/^[a-z0-9_.-]+$/),
  label: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  ownerDomain: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  valueType: ConfigValueTypeSchema,
  allowedScopes: z.array(ConfigScopeTypeSchema).min(1),
  defaultValue: JsonValueSchema.optional(),
  validationSchema: z.record(JsonValueSchema).optional(),
  enumValues: z.array(z.string()).optional(),
  isSecret: z.boolean().default(false),
  isRequired: z.boolean().default(false),
  isOverridable: z.boolean().default(true),
  isLockable: z.boolean().default(true),
  requiresRestart: z.boolean().default(false),
  deploymentOnly: z.boolean().default(false),
  sdkExposable: z.boolean().default(false),
  uiExposable: z.boolean().default(true),
});

export const ConfigDefinitionUpdateSchema = ConfigDefinitionCreateSchema.partial();

export const ConfigValueUpsertSchema = z.object({
  key: z.string().min(3).max(255),
  scopeType: ConfigScopeTypeSchema,
  scopeId: z.string().min(1).max(255),
  value: JsonValueSchema,
  source: z.enum(['manual', 'bootstrap', 'seed', 'system', 'sdk']).default('manual'),
  notes: z.string().max(2000).optional(),
});

export const ConfigResolveQuerySchema = z.object({
  key: z.string().min(3).max(255),
  scopeType: ConfigScopeTypeSchema,
  scopeId: z.string().min(1).max(255),
  includePath: z.coerce.boolean().optional().default(true),
});

export const ConfigLockSchema = z.object({
  key: z.string().min(3).max(255),
  lockedAtScopeType: ConfigScopeTypeSchema,
  lockedAtScopeId: z.string().min(1).max(255),
  lockBehavior: z.enum(['no_override_below']).default('no_override_below'),
  reason: z.string().max(2000).optional(),
});
```

---

# 6. Validation rules in service layer

Do not trust only Zod. Add service-level validation:

- key must exist in `config_definitions`
- requested scope must be in `allowed_scopes`
- if `deployment_only = true`, block writes outside deployment/environment/platform
- if `is_secret = true`, write through secret provider or encrypt before persistence
- if `enum_values` exists, value must be one of them
- if locked by a parent scope, reject lower-scope override
- if `is_overridable = false`, only definition default or owning scope may set it
- if `value_type = boolean`, reject non-boolean JSON
- if `value_type = number`, reject stringified numbers

---

# 7. Effective resolution algorithm

```ts
const PRECEDENCE: ConfigScopeType[] = [
  'user',
  'organization',
  'tenant',
  'module',
  'product',
  'platform',
  'deployment',
  'environment',
];

export async function resolveEffectiveConfig(
  db: DbClient,
  key: string,
  target: { scopeType: ConfigScopeType; scopeId: string },
): Promise<EffectiveConfigResult> {
  const definition = await getDefinitionByKey(db, key);
  if (!definition) throw new Error(`Unknown config key: ${key}`);

  const applicablePath = buildResolutionPath(target, PRECEDENCE);
  const values = await getConfigValuesForKey(db, definition.id, applicablePath);
  const locks = await getActiveLocksForKey(db, definition.id);

  for (const node of applicablePath) {
    const hit = values.find(v => v.scopeType === node.scopeType && v.scopeId === node.scopeId);
    if (hit) {
      return {
        key,
        effectiveValue: hit.value,
        resolvedFromScopeType: hit.scopeType,
        resolvedFromScopeId: hit.scopeId,
        resolutionPath: applicablePath.map(p => ({
          scopeType: p.scopeType,
          scopeId: p.scopeId,
          hit: !!values.find(v => v.scopeType === p.scopeType && v.scopeId === p.scopeId),
        })),
        lockedBy: findBlockingLock(locks, target) ?? null,
      };
    }
  }

  return {
    key,
    effectiveValue: definition.defaultValue,
    resolvedFromScopeType: 'default',
    resolvedFromScopeId: 'definition',
    resolutionPath: applicablePath.map(p => ({
      scopeType: p.scopeType,
      scopeId: p.scopeId,
      hit: false,
    })),
    lockedBy: findBlockingLock(locks, target) ?? null,
  };
}
```

### Important note
`buildResolutionPath()` must be aware of ancestry.
Example:
- user belongs to organization
- organization belongs to tenant
- module belongs to product
- deployment belongs to environment

This ancestry can come from a lookup service, not from hardcoded strings.

---

# 8. API endpoints

Use neutral platform routes.

## Definitions
- `GET /api/platform/config/definitions`
- `POST /api/platform/config/definitions`
- `PATCH /api/platform/config/definitions/:id`
- `GET /api/platform/config/definitions/:key`

## Values
- `PUT /api/platform/config/values`
- `DELETE /api/platform/config/values/:key/:scopeType/:scopeId`
- `GET /api/platform/config/values/:key/:scopeType/:scopeId`

## Resolution
- `GET /api/platform/config/resolve?key=...&scopeType=tenant&scopeId=...`
- `POST /api/platform/config/resolve/bulk`

## Locks
- `POST /api/platform/config/locks`
- `DELETE /api/platform/config/locks/:key/:scopeType/:scopeId`

## Audit
- `GET /api/platform/config/audit/:key`

## Seed/bootstrap
- `POST /api/platform/config/bootstrap/profile/:profileCode`

---

# 9. Endpoint scaffolding example

```ts
import type { Request, Response } from 'express';
import { z } from 'zod';

export async function upsertConfigValueHandler(req: Request, res: Response) {
  const parsed = ConfigValueUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload', details: parsed.error.flatten() });
  }

  const actor = req.user;
  const payload = parsed.data;

  await requirePermission(actor, 'platform.config.value.write', {
    scopeType: payload.scopeType,
    scopeId: payload.scopeId,
  });

  const result = await configService.upsertValue({
    actor,
    payload,
  });

  return res.status(200).json({ ok: true, data: result });
}

export async function resolveConfigHandler(req: Request, res: Response) {
  const parsed = ConfigResolveQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_query', details: parsed.error.flatten() });
  }

  const result = await configService.resolve(parsed.data.key, {
    scopeType: parsed.data.scopeType,
    scopeId: parsed.data.scopeId,
  });

  return res.status(200).json({ ok: true, data: result });
}
```

---

# 10. Permissions and access-profile wiring

Do not start with role-name shortcuts. Use permissions and scope.

## Suggested permission family
```text
platform.config.definition.read
platform.config.definition.create
platform.config.definition.update
platform.config.definition.delete

platform.config.value.read
platform.config.value.write
platform.config.value.delete

platform.config.lock.read
platform.config.lock.write

platform.config.audit.read
platform.config.bootstrap.execute
platform.config.resolve.read
```

## Suggested access profile intent
- `platform_super_admin`
  - all config permissions at all scopes
- `tenant_admin`
  - value read/write for tenant, organization, user scopes within assigned tenant
  - resolve read within tenant
  - no definition create/update
- `module_admin`
  - module-scope values for assigned module and allowed tenant scopes
- `security_admin`
  - secret-config read metadata, lock write, audit read
- `viewer`
  - resolve read only where explicitly granted
- `external_auditor`
  - audit read only, no secret value exposure

## Important rule
`config_definitions` are platform-owned.
Most non-platform actors should not create definition keys.
They may only set permitted scoped values.

---

# 11. Example RBAC guard

```ts
export async function requirePermission(
  actor: AuthActor,
  permissionCode: string,
  target?: { scopeType: string; scopeId: string }
) {
  const hasPerm = await authzService.hasPermission(actor, permissionCode, target);
  if (!hasPerm) {
    throw new ForbiddenError(`Missing permission: ${permissionCode}`);
  }
}
```

### Scope rule
A tenant admin may write tenant, organization, and user config only within their assigned tenant boundary.
A platform super admin may write any scope.
A module admin may only write module-owned keys or explicitly whitelisted keys.

---

# 12. Bootstrap seeds for all deployment cases

## Profile codes
- `saas-enterprise`
- `onprem-singletenant`
- `sovereign-airgapped`
- `sdk-headless`

## Seed strategy
Each profile seeds:
- base definitions
- base default values
- lock behavior
- disabled/hidden features by profile
- secret provider mode
- telemetry policy
- AI provider mode

## Example bootstrap seed
```ts
export const deploymentProfileSeeds = {
  'saas-enterprise': {
    values: [
      { key: 'deployment.mode', scopeType: 'deployment', scopeId: 'default', value: 'saas' },
      { key: 'platform.observability.telemetryEnabled', scopeType: 'platform', scopeId: 'global', value: true },
      { key: 'deployment.secrets.provider', scopeType: 'deployment', scopeId: 'default', value: 'cloud_kms' },
    ],
  },
  'onprem-singletenant': {
    values: [
      { key: 'deployment.mode', scopeType: 'deployment', scopeId: 'default', value: 'onprem' },
      { key: 'platform.observability.telemetryEnabled', scopeType: 'platform', scopeId: 'global', value: false },
      { key: 'deployment.secrets.provider', scopeType: 'deployment', scopeId: 'default', value: 'local_vault' },
    ],
  },
  'sovereign-airgapped': {
    values: [
      { key: 'deployment.mode', scopeType: 'deployment', scopeId: 'default', value: 'sovereign' },
      { key: 'deployment.airgapped.enabled', scopeType: 'deployment', scopeId: 'default', value: true },
      { key: 'ai.llm.localOnly', scopeType: 'platform', scopeId: 'global', value: true },
      { key: 'deployment.secrets.provider', scopeType: 'deployment', scopeId: 'default', value: 'hsm' },
    ],
  },
  'sdk-headless': {
    values: [
      { key: 'deployment.mode', scopeType: 'deployment', scopeId: 'default', value: 'sdk' },
      { key: 'platform.ui.enabled', scopeType: 'platform', scopeId: 'global', value: false },
      { key: 'platform.api.publicMode', scopeType: 'platform', scopeId: 'global', value: true },
    ],
  },
} as const;
```

---

# 13. Secret handling

Do not store raw secrets in plain JSON unless explicitly unavoidable.

## Pattern
- for `is_secret = true`, write through secret provider abstraction
- DB can store ciphertext or reference token
- audit log must never store raw secret values
- API responses must redact secrets unless explicitly privileged

## Secret provider interface
```ts
export interface SecretProvider {
  putSecret(input: { key: string; scopeType: string; scopeId: string; value: string }): Promise<{ ref: string; hash: string }>;
  getSecret(ref: string): Promise<string>;
  deleteSecret(ref: string): Promise<void>;
}
```

## Provider modes
- SaaS: cloud KMS / HSM-backed provider
- On-Prem: Vault / TPM-backed local provider
- Sovereign: HSM-backed unwrap flow
- SDK: caller-provided provider

---

# 14. SDK adapter

The SDK should not require DB lookup for every call.
Support config injection and optional registry sync.

```ts
export interface AgrcEngineOptions {
  configProvider: {
    get: (key: string) => unknown;
    resolve?: (key: string, ctx?: Record<string, string>) => unknown;
  };
  dbClient?: unknown;
  secretProvider?: SecretProvider;
}

export class AgrcEngine {
  constructor(private readonly options: AgrcEngineOptions) {}

  getConfig<T = unknown>(key: string): T {
    return this.options.configProvider.get(key) as T;
  }
}
```

Rule:
The SDK uses the same config keys and same Zod contracts, but may use an in-memory or user-supplied config provider.

---

# 15. File layout suggestion

```text
backend/src/modules/platform/config/
  config.types.ts
  config.schemas.ts
  config.repository.ts
  config.service.ts
  config.resolver.ts
  config.permissions.ts
  config.routes.ts
  config.bootstrap.ts
  config.secret-provider.ts
  config.audit.ts
  __tests__/
    config.schemas.test.ts
    config.resolver.test.ts
    config.permissions.test.ts
    config.bootstrap-profiles.test.ts
```

---

# 16. Minimal repository contract

```ts
export interface ConfigRepository {
  findDefinitionByKey(key: string): Promise<ConfigDefinition | null>;
  listDefinitions(filters?: Record<string, unknown>): Promise<ConfigDefinition[]>;
  createDefinition(input: unknown): Promise<ConfigDefinition>;
  updateDefinition(id: string, input: unknown): Promise<ConfigDefinition>;

  upsertValue(input: {
    definitionId: string;
    scopeType: ConfigScopeType;
    scopeId: string;
    value: unknown;
    isEncrypted?: boolean;
    source: string;
    notes?: string;
    actorUserId?: string;
  }): Promise<ConfigValueRecord>;

  getValue(definitionId: string, scopeType: ConfigScopeType, scopeId: string): Promise<ConfigValueRecord | null>;
  getValuesForDefinition(definitionId: string, scopes: Array<{ scopeType: ConfigScopeType; scopeId: string }>): Promise<ConfigValueRecord[]>;
  createLock(input: unknown): Promise<void>;
  getActiveLocks(definitionId: string): Promise<Array<Record<string, unknown>>>;
  writeAudit(input: unknown): Promise<void>;
}
```

---

# 17. Tests required

## Unit
- Zod schema accepts valid payloads
- Zod schema rejects invalid key format
- value type validation matches definition
- enum validation works

## Service
- tenant scope override beats platform scope
- lower scope blocked by lock
- non-overridable key rejects lower-scope write
- secret values are redacted in read response
- deployment-only key rejects user-scope write

## Integration
- bootstrap profile seeds correct defaults
- resolve endpoint returns correct origin scope
- audit log written on create, update, delete, and lock
- SDK config provider behaves without DB
- sovereign profile does not require cloud provider

## Offline mode
- on-prem profile resolves config with no external secret fetches
- sovereign profile resolves local-only AI/provider settings

---

# 18. Example response shapes

## Resolve response
```json
{
  "ok": true,
  "data": {
    "key": "deployment.secrets.provider",
    "effectiveValue": "hsm",
    "resolvedFromScopeType": "deployment",
    "resolvedFromScopeId": "default",
    "resolutionPath": [
      { "scopeType": "user", "scopeId": "u_1", "hit": false },
      { "scopeType": "organization", "scopeId": "org_1", "hit": false },
      { "scopeType": "tenant", "scopeId": "tenant_1", "hit": false },
      { "scopeType": "deployment", "scopeId": "default", "hit": true }
    ],
    "lockedBy": null
  }
}
```

## Secret read response
```json
{
  "ok": true,
  "data": {
    "key": "deployment.masterKeyRef",
    "scopeType": "deployment",
    "scopeId": "default",
    "value": "***REDACTED***",
    "isSecret": true
  }
}
```

---

# 19. Implementation notes for handoff

## Phase 1: schema and contracts
- add SQL migration
- add TS types
- add Zod schemas
- add repository methods

## Phase 2: core resolver
- implement ancestry-aware scope path
- implement lock checks
- implement secret redaction

## Phase 3: endpoint layer
- add route file
- wire authz middleware
- return consistent response envelopes

## Phase 4: profile bootstrap
- seed definitions and profile defaults
- add bootstrap execution endpoint or migration hook

## Phase 5: access profile mapping
- connect new permission family to existing authorization matrix
- restrict definition writes to platform scope actors
- allow scoped value writes by scope ownership

## Phase 6: SDK/headless mode
- expose config provider contract
- allow in-memory provider for tests and embedded usage

---

# 20. Handover checklist

Before handoff is marked complete, verify:
- [ ] migration applies cleanly
- [ ] definitions can be created and read
- [ ] values can be set at valid scopes only
- [ ] invalid scopes are rejected
- [ ] effective resolution works across all scope levels
- [ ] locks prevent lower overrides
- [ ] audit events are persisted
- [ ] secrets are redacted from normal responses
- [ ] bootstrap profiles seed correctly
- [ ] SDK can run with injected config provider
- [ ] no deployment profile requires separate core code

---

# 21. Audio handover script

Use this as the spoken project handoff summary.

## Short version
"This pass introduces the canonical hierarchical config registry for the platform. The implementation creates platform-owned config definitions, scoped config values, lock controls, and audit logs. Effective resolution is ancestry-aware and follows a fixed precedence from user back to environment. The same model supports SaaS, on-prem, sovereign, and SDK profiles without forking the runtime. Definition ownership stays platform-level. Scoped writes are controlled by permission and scope assignment. Secret values use a secret-provider abstraction and are redacted from standard responses. Next after this pass is permission mapping completion, profile seeding, and full integration into deployment bootstrap."

## Long version
"The platform now has a formal configuration registry built around config definitions and scoped values. A definition declares what a key is, what type it stores, which scopes may set it, whether it is secret, whether it is overridable, and whether it may be locked. Config values then store overrides at environment, deployment, platform, product, module, tenant, organization, or user scope. Effective config resolution always follows the same precedence, with more specific scope values winning unless blocked by a parent lock. This structure allows us to support Enterprise SaaS, On-Premise, Government, and SDK deployment profiles using one runtime. Deployment behavior is expressed as configuration and bootstrap seeds, not as separate code branches. Permission enforcement is scope-aware. Definitions are platform-owned, while tenant and lower actors primarily set values rather than inventing keys. Secret values are handled through a secret provider abstraction rather than direct raw persistence. The remaining work after this handoff is full RBAC mapping, bootstrap seed completion for each deployment profile, and end-to-end test coverage across online and offline profiles."

---

# 22. Final recommendation

Do this pass as one bounded implementation:
- config registry schema
- contracts
- resolver
- endpoints
- audit
- profile seeds
- permission family wiring

Do not delay the access-profile mapping too long, but do not block the registry on a full role redesign first.

The registry is the base. Access control attaches to it immediately after the core scaffold is in place.


---

# 23. Copy-paste-ready file set layout

Use this exact backend layout:

```text
backend/src/modules/platform/config/
  config.types.ts
  config.schemas.ts
  config.permissions.ts
  config.secret-provider.ts
  config.resolver.ts
  config.repository.ts
  config.service.ts
  config.bootstrap.ts
  config.routes.ts
  __tests__/
    config.schemas.test.ts
    config.resolver.test.ts
```

---

## File: `backend/src/modules/platform/config/config.types.ts`

```ts
export const CONFIG_SCOPE_ORDER = [
  'environment',
  'deployment',
  'platform',
  'product',
  'module',
  'tenant',
  'organization',
  'user',
] as const;

export type ConfigScopeType = typeof CONFIG_SCOPE_ORDER[number];

export const CONFIG_VALUE_TYPES = [
  'string',
  'number',
  'boolean',
  'json',
  'string_array',
  'number_array',
  'enum',
  'secret',
] as const;

export type ConfigValueType = typeof CONFIG_VALUE_TYPES[number];

export type ConfigValueSource = 'manual' | 'bootstrap' | 'seed' | 'system' | 'sdk';

export interface AuthActor {
  userId?: string;
  roleCodes?: string[];
  permissions?: string[];
  tenantId?: string;
  organizationId?: string;
}

export interface ConfigDefinition {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  ownerDomain: string;
  category: string;
  valueType: ConfigValueType;
  allowedScopes: ConfigScopeType[];
  defaultValue?: unknown;
  validationSchema?: Record<string, unknown> | null;
  enumValues?: string[];
  isSecret: boolean;
  isRequired: boolean;
  isOverridable: boolean;
  isLockable: boolean;
  requiresRestart: boolean;
  deploymentOnly: boolean;
  sdkExposable: boolean;
  uiExposable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigValueRecord {
  id: string;
  definitionId: string;
  scopeType: ConfigScopeType;
  scopeId: string;
  value: unknown;
  valueHash?: string | null;
  isEncrypted: boolean;
  source: ConfigValueSource;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigLock {
  id: string;
  definitionId: string;
  lockedAtScopeType: ConfigScopeType;
  lockedAtScopeId: string;
  lockBehavior: 'no_override_below';
  reason?: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy?: string | null;
}

export interface EffectiveConfigResult {
  key: string;
  effectiveValue: unknown;
  resolvedFromScopeType: ConfigScopeType | 'default';
  resolvedFromScopeId: string | 'definition';
  resolutionPath: Array<{
    scopeType: ConfigScopeType | 'default';
    scopeId: string;
    hit: boolean;
  }>;
  lockedBy?: {
    scopeType: ConfigScopeType;
    scopeId: string;
  } | null;
}

export interface ScopeNode {
  scopeType: ConfigScopeType;
  scopeId: string;
}
```

---

## File: `backend/src/modules/platform/config/config.schemas.ts`

```ts
import { z } from 'zod';

export const ConfigScopeTypeSchema = z.enum([
  'environment',
  'deployment',
  'platform',
  'product',
  'module',
  'tenant',
  'organization',
  'user',
]);

export const ConfigValueTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'json',
  'string_array',
  'number_array',
  'enum',
  'secret',
]);

export const JsonValueSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ])
);

export const ConfigDefinitionCreateSchema = z.object({
  key: z.string().min(3).max(255).regex(/^[a-z0-9_.-]+$/),
  label: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  ownerDomain: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  valueType: ConfigValueTypeSchema,
  allowedScopes: z.array(ConfigScopeTypeSchema).min(1),
  defaultValue: JsonValueSchema.optional(),
  validationSchema: z.record(JsonValueSchema).optional(),
  enumValues: z.array(z.string()).optional(),
  isSecret: z.boolean().default(false),
  isRequired: z.boolean().default(false),
  isOverridable: z.boolean().default(true),
  isLockable: z.boolean().default(true),
  requiresRestart: z.boolean().default(false),
  deploymentOnly: z.boolean().default(false),
  sdkExposable: z.boolean().default(false),
  uiExposable: z.boolean().default(true),
});

export const ConfigDefinitionUpdateSchema = ConfigDefinitionCreateSchema.partial();

export const ConfigValueUpsertSchema = z.object({
  key: z.string().min(3).max(255),
  scopeType: ConfigScopeTypeSchema,
  scopeId: z.string().min(1).max(255),
  value: JsonValueSchema,
  source: z.enum(['manual', 'bootstrap', 'seed', 'system', 'sdk']).default('manual'),
  notes: z.string().max(2000).optional(),
});

export const ConfigResolveQuerySchema = z.object({
  key: z.string().min(3).max(255),
  scopeType: ConfigScopeTypeSchema,
  scopeId: z.string().min(1).max(255),
  includePath: z.coerce.boolean().optional().default(true),
});

export const ConfigLockSchema = z.object({
  key: z.string().min(3).max(255),
  lockedAtScopeType: ConfigScopeTypeSchema,
  lockedAtScopeId: z.string().min(1).max(255),
  lockBehavior: z.enum(['no_override_below']).default('no_override_below'),
  reason: z.string().max(2000).optional(),
});

export type ConfigDefinitionCreateInput = z.infer<typeof ConfigDefinitionCreateSchema>;
export type ConfigDefinitionUpdateInput = z.infer<typeof ConfigDefinitionUpdateSchema>;
export type ConfigValueUpsertInput = z.infer<typeof ConfigValueUpsertSchema>;
export type ConfigResolveQueryInput = z.infer<typeof ConfigResolveQuerySchema>;
export type ConfigLockInput = z.infer<typeof ConfigLockSchema>;
```

---

## File: `backend/src/modules/platform/config/config.permissions.ts`

```ts
import type { AuthActor, ConfigScopeType } from './config.types';

export const CONFIG_PERMISSIONS = {
  definitionRead: 'platform.config.definition.read',
  definitionCreate: 'platform.config.definition.create',
  definitionUpdate: 'platform.config.definition.update',
  definitionDelete: 'platform.config.definition.delete',
  valueRead: 'platform.config.value.read',
  valueWrite: 'platform.config.value.write',
  valueDelete: 'platform.config.value.delete',
  lockRead: 'platform.config.lock.read',
  lockWrite: 'platform.config.lock.write',
  auditRead: 'platform.config.audit.read',
  bootstrapExecute: 'platform.config.bootstrap.execute',
  resolveRead: 'platform.config.resolve.read',
} as const;

export function hasPermission(actor: AuthActor | undefined, permission: string): boolean {
  return !!actor?.permissions?.includes(permission);
}

export function assertPermission(actor: AuthActor | undefined, permission: string): void {
  if (!hasPermission(actor, permission)) {
    const err = new Error(`Missing permission: ${permission}`);
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
}

export function assertScopeAccess(
  actor: AuthActor | undefined,
  target: { scopeType: ConfigScopeType; scopeId: string },
): void {
  if (!actor) {
    const err = new Error('Unauthenticated');
    (err as Error & { status?: number }).status = 401;
    throw err;
  }

  if (actor.permissions?.includes('*')) return;

  if (target.scopeType === 'tenant' && actor.tenantId && actor.tenantId !== target.scopeId) {
    const err = new Error('Cross-tenant config access denied');
    (err as Error & { status?: number }).status = 403;
    throw err;
  }

  if (
    target.scopeType === 'organization' &&
    actor.organizationId &&
    actor.organizationId !== target.scopeId &&
    !actor.permissions?.includes(CONFIG_PERMISSIONS.definitionUpdate)
  ) {
    const err = new Error('Cross-organization config access denied');
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
}
```

---

## File: `backend/src/modules/platform/config/config.secret-provider.ts`

```ts
export interface SecretProvider {
  putSecret(input: { key: string; scopeType: string; scopeId: string; value: string }): Promise<{ ref: string; hash: string }>;
  getSecret(ref: string): Promise<string>;
  deleteSecret(ref: string): Promise<void>;
}

export class InMemorySecretProvider implements SecretProvider {
  private readonly store = new Map<string, string>();

  async putSecret(input: { key: string; scopeType: string; scopeId: string; value: string }): Promise<{ ref: string; hash: string }> {
    const ref = `${input.key}:${input.scopeType}:${input.scopeId}`;
    this.store.set(ref, input.value);
    return { ref, hash: `hash:${Buffer.from(input.value).toString('base64')}` };
  }

  async getSecret(ref: string): Promise<string> {
    const value = this.store.get(ref);
    if (!value) throw new Error(`Secret not found for ref: ${ref}`);
    return value;
  }

  async deleteSecret(ref: string): Promise<void> {
    this.store.delete(ref);
  }
}
```

---

## File: `backend/src/modules/platform/config/config.resolver.ts`

```ts
import type {
  ConfigDefinition,
  ConfigLock,
  ConfigScopeType,
  ConfigValueRecord,
  EffectiveConfigResult,
  ScopeNode,
} from './config.types';

const PRECEDENCE: ConfigScopeType[] = [
  'user',
  'organization',
  'tenant',
  'module',
  'product',
  'platform',
  'deployment',
  'environment',
];

export interface ScopeAncestryProvider {
  buildPath(target: ScopeNode): Promise<ScopeNode[]>;
}

export class StaticScopeAncestryProvider implements ScopeAncestryProvider {
  async buildPath(target: ScopeNode): Promise<ScopeNode[]> {
    return [{ scopeType: target.scopeType, scopeId: target.scopeId }];
  }
}

export function findBlockingLock(
  locks: ConfigLock[],
  target: ScopeNode,
): { scopeType: ConfigScopeType; scopeId: string } | null {
  const precedenceIndex = PRECEDENCE.indexOf(target.scopeType);
  for (const lock of locks) {
    const lockIndex = PRECEDENCE.indexOf(lock.lockedAtScopeType);
    if (lockIndex > precedenceIndex) continue;
    if (lock.lockedAtScopeType === target.scopeType && lock.lockedAtScopeId === target.scopeId) {
      return { scopeType: lock.lockedAtScopeType, scopeId: lock.lockedAtScopeId };
    }
  }
  return null;
}

export function buildResolutionPathFromAncestry(target: ScopeNode, ancestry: ScopeNode[]): ScopeNode[] {
  const byType = new Map<ConfigScopeType, ScopeNode>();
  for (const node of ancestry) byType.set(node.scopeType, node);
  if (!byType.has(target.scopeType)) byType.set(target.scopeType, target);
  return PRECEDENCE.filter(scope => byType.has(scope)).map(scope => byType.get(scope) as ScopeNode);
}

export function resolveFromRecords(input: {
  definition: ConfigDefinition;
  target: ScopeNode;
  resolutionPath: ScopeNode[];
  values: ConfigValueRecord[];
  locks: ConfigLock[];
}): EffectiveConfigResult {
  const { definition, target, resolutionPath, values, locks } = input;
  const hit = resolutionPath.find(pathNode =>
    values.some(v => v.scopeType === pathNode.scopeType && v.scopeId === pathNode.scopeId),
  );

  if (hit) {
    const record = values.find(v => v.scopeType === hit.scopeType && v.scopeId === hit.scopeId)!;
    return {
      key: definition.key,
      effectiveValue: record.value,
      resolvedFromScopeType: record.scopeType,
      resolvedFromScopeId: record.scopeId,
      resolutionPath: resolutionPath.map(p => ({
        scopeType: p.scopeType,
        scopeId: p.scopeId,
        hit: !!values.find(v => v.scopeType === p.scopeType && v.scopeId === p.scopeId),
      })),
      lockedBy: findBlockingLock(locks, target),
    };
  }

  return {
    key: definition.key,
    effectiveValue: definition.defaultValue,
    resolvedFromScopeType: 'default',
    resolvedFromScopeId: 'definition',
    resolutionPath: resolutionPath.map(p => ({
      scopeType: p.scopeType,
      scopeId: p.scopeId,
      hit: false,
    })),
    lockedBy: findBlockingLock(locks, target),
  };
}
```

---

## File: `backend/src/modules/platform/config/config.repository.ts`

```ts
import type { Pool } from 'pg';
import type {
  ConfigDefinition,
  ConfigLock,
  ConfigScopeType,
  ConfigValueRecord,
  ConfigValueSource,
} from './config.types';
import type { ConfigDefinitionCreateInput, ConfigDefinitionUpdateInput } from './config.schemas';

export class ConfigRepository {
  constructor(private readonly db: Pool) {}

  async findDefinitionByKey(key: string): Promise<ConfigDefinition | null> {
    const result = await this.db.query(`select * from config_definitions where key = $1 limit 1`, [key]);
    return result.rows[0] ? mapDefinition(result.rows[0]) : null;
  }

  async listDefinitions(): Promise<ConfigDefinition[]> {
    const result = await this.db.query(`select * from config_definitions order by key asc`);
    return result.rows.map(mapDefinition);
  }

  async createDefinition(input: ConfigDefinitionCreateInput, actorUserId?: string): Promise<ConfigDefinition> {
    const result = await this.db.query(
      `insert into config_definitions
       (key, label, description, owner_domain, category, value_type, allowed_scopes, default_value, validation_schema, enum_values,
        is_secret, is_required, is_overridable, is_lockable, requires_restart, deployment_only, sdk_exposable, ui_exposable,
        created_by, updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19)
       returning *`,
      [
        input.key,
        input.label,
        input.description ?? null,
        input.ownerDomain,
        input.category,
        input.valueType,
        input.allowedScopes,
        input.defaultValue ?? null,
        input.validationSchema ?? null,
        input.enumValues ?? [],
        input.isSecret,
        input.isRequired,
        input.isOverridable,
        input.isLockable,
        input.requiresRestart,
        input.deploymentOnly,
        input.sdkExposable,
        input.uiExposable,
        actorUserId ?? null,
      ],
    );
    return mapDefinition(result.rows[0]);
  }

  async updateDefinition(id: string, input: ConfigDefinitionUpdateInput, actorUserId?: string): Promise<ConfigDefinition> {
    const current = await this.db.query(`select * from config_definitions where id = $1 limit 1`, [id]);
    if (!current.rows[0]) throw new Error(`Definition not found: ${id}`);
    const row = current.rows[0];
    const result = await this.db.query(
      `update config_definitions set
        label = $2,
        description = $3,
        owner_domain = $4,
        category = $5,
        value_type = $6,
        allowed_scopes = $7,
        default_value = $8,
        validation_schema = $9,
        enum_values = $10,
        is_secret = $11,
        is_required = $12,
        is_overridable = $13,
        is_lockable = $14,
        requires_restart = $15,
        deployment_only = $16,
        sdk_exposable = $17,
        ui_exposable = $18,
        updated_by = $19,
        updated_at = now()
       where id = $1
       returning *`,
      [
        id,
        input.label ?? row.label,
        input.description ?? row.description,
        input.ownerDomain ?? row.owner_domain,
        input.category ?? row.category,
        input.valueType ?? row.value_type,
        input.allowedScopes ?? row.allowed_scopes,
        input.defaultValue ?? row.default_value,
        input.validationSchema ?? row.validation_schema,
        input.enumValues ?? row.enum_values,
        input.isSecret ?? row.is_secret,
        input.isRequired ?? row.is_required,
        input.isOverridable ?? row.is_overridable,
        input.isLockable ?? row.is_lockable,
        input.requiresRestart ?? row.requires_restart,
        input.deploymentOnly ?? row.deployment_only,
        input.sdkExposable ?? row.sdk_exposable,
        input.uiExposable ?? row.ui_exposable,
        actorUserId ?? null,
      ],
    );
    return mapDefinition(result.rows[0]);
  }

  async upsertValue(input: {
    definitionId: string;
    scopeType: ConfigScopeType;
    scopeId: string;
    value: unknown;
    source: ConfigValueSource;
    notes?: string;
    isEncrypted?: boolean;
    valueHash?: string | null;
    actorUserId?: string;
  }): Promise<ConfigValueRecord> {
    const result = await this.db.query(
      `insert into config_values
       (definition_id, scope_type, scope_id, value, source, notes, is_encrypted, value_hash, created_by, updated_by)
       values ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$9)
       on conflict (definition_id, scope_type, scope_id)
       do update set
         value = excluded.value,
         source = excluded.source,
         notes = excluded.notes,
         is_encrypted = excluded.is_encrypted,
         value_hash = excluded.value_hash,
         updated_by = excluded.updated_by,
         updated_at = now()
       returning *`,
      [
        input.definitionId,
        input.scopeType,
        input.scopeId,
        JSON.stringify(input.value),
        input.source,
        input.notes ?? null,
        input.isEncrypted ?? false,
        input.valueHash ?? null,
        input.actorUserId ?? null,
      ],
    );
    return mapValue(result.rows[0]);
  }

  async getValue(definitionId: string, scopeType: ConfigScopeType, scopeId: string): Promise<ConfigValueRecord | null> {
    const result = await this.db.query(
      `select * from config_values where definition_id = $1 and scope_type = $2 and scope_id = $3 and is_active = true limit 1`,
      [definitionId, scopeType, scopeId],
    );
    return result.rows[0] ? mapValue(result.rows[0]) : null;
  }

  async getValuesForDefinition(
    definitionId: string,
    scopes: Array<{ scopeType: ConfigScopeType; scopeId: string }>,
  ): Promise<ConfigValueRecord[]> {
    if (scopes.length === 0) return [];
    const params: unknown[] = [definitionId];
    const tuples = scopes.map((scope, idx) => {
      params.push(scope.scopeType, scope.scopeId);
      const base = 2 + idx * 2;
      return `($${base}, $${base + 1})`;
    });
    const result = await this.db.query(
      `select * from config_values
       where definition_id = $1
         and is_active = true
         and (scope_type, scope_id) in (${tuples.join(', ')})`,
      params,
    );
    return result.rows.map(mapValue);
  }

  async createLock(input: {
    definitionId: string;
    lockedAtScopeType: ConfigScopeType;
    lockedAtScopeId: string;
    lockBehavior: 'no_override_below';
    reason?: string;
    actorUserId?: string;
  }): Promise<void> {
    await this.db.query(
      `insert into config_locks
       (definition_id, locked_at_scope_type, locked_at_scope_id, lock_behavior, reason, created_by)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (definition_id, locked_at_scope_type, locked_at_scope_id)
       do update set
         lock_behavior = excluded.lock_behavior,
         reason = excluded.reason,
         is_active = true`,
      [
        input.definitionId,
        input.lockedAtScopeType,
        input.lockedAtScopeId,
        input.lockBehavior,
        input.reason ?? null,
        input.actorUserId ?? null,
      ],
    );
  }

  async getActiveLocks(definitionId: string): Promise<ConfigLock[]> {
    const result = await this.db.query(
      `select * from config_locks where definition_id = $1 and is_active = true`,
      [definitionId],
    );
    return result.rows.map(mapLock);
  }

  async writeAudit(input: {
    definitionId?: string | null;
    configKey: string;
    action: string;
    scopeType: string;
    scopeId: string;
    actorUserId?: string | null;
    actorRoleCode?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.query(
      `insert into config_audit_logs
       (definition_id, config_key, action, scope_type, scope_id, actor_user_id, actor_role_code, old_value, new_value, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb)`,
      [
        input.definitionId ?? null,
        input.configKey,
        input.action,
        input.scopeType,
        input.scopeId,
        input.actorUserId ?? null,
        input.actorRoleCode ?? null,
        input.oldValue === undefined ? null : JSON.stringify(input.oldValue),
        input.newValue === undefined ? null : JSON.stringify(input.newValue),
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}

function mapDefinition(row: any): ConfigDefinition {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    description: row.description,
    ownerDomain: row.owner_domain,
    category: row.category,
    valueType: row.value_type,
    allowedScopes: row.allowed_scopes,
    defaultValue: row.default_value,
    validationSchema: row.validation_schema,
    enumValues: row.enum_values,
    isSecret: row.is_secret,
    isRequired: row.is_required,
    isOverridable: row.is_overridable,
    isLockable: row.is_lockable,
    requiresRestart: row.requires_restart,
    deploymentOnly: row.deployment_only,
    sdkExposable: row.sdk_exposable,
    uiExposable: row.ui_exposable,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapValue(row: any): ConfigValueRecord {
  return {
    id: row.id,
    definitionId: row.definition_id,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    value: row.value,
    valueHash: row.value_hash,
    isEncrypted: row.is_encrypted,
    source: row.source,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLock(row: any): ConfigLock {
  return {
    id: row.id,
    definitionId: row.definition_id,
    lockedAtScopeType: row.locked_at_scope_type,
    lockedAtScopeId: row.locked_at_scope_id,
    lockBehavior: row.lock_behavior,
    reason: row.reason,
    isActive: row.is_active,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}
```

---

## File: `backend/src/modules/platform/config/config.service.ts`

```ts
import type {
  AuthActor,
  ConfigDefinition,
  ConfigScopeType,
  EffectiveConfigResult,
  ScopeNode,
} from './config.types';
import type {
  ConfigDefinitionCreateInput,
  ConfigDefinitionUpdateInput,
  ConfigLockInput,
  ConfigValueUpsertInput,
} from './config.schemas';
import { ConfigRepository } from './config.repository';
import type { SecretProvider } from './config.secret-provider';
import {
  buildResolutionPathFromAncestry,
  resolveFromRecords,
  type ScopeAncestryProvider,
} from './config.resolver';

const PLATFORM_ONLY_SCOPES: ConfigScopeType[] = ['environment', 'deployment', 'platform'];

export class ConfigService {
  constructor(
    private readonly repository: ConfigRepository,
    private readonly ancestryProvider: ScopeAncestryProvider,
    private readonly secretProvider: SecretProvider,
  ) {}

  async listDefinitions(): Promise<ConfigDefinition[]> {
    return this.repository.listDefinitions();
  }

  async createDefinition(actor: AuthActor | undefined, input: ConfigDefinitionCreateInput): Promise<ConfigDefinition> {
    return this.repository.createDefinition(input, actor?.userId);
  }

  async updateDefinition(actor: AuthActor | undefined, id: string, input: ConfigDefinitionUpdateInput): Promise<ConfigDefinition> {
    return this.repository.updateDefinition(id, input, actor?.userId);
  }

  async upsertValue(actor: AuthActor | undefined, input: ConfigValueUpsertInput) {
    const definition = await this.repository.findDefinitionByKey(input.key);
    if (!definition) throw new Error(`Unknown config key: ${input.key}`);

    this.assertScopeAllowed(definition, input.scopeType);
    this.assertDeploymentOnlyRule(definition, input.scopeType);
    this.assertValueType(definition, input.value);

    const locks = await this.repository.getActiveLocks(definition.id);
    const blocking = locks.find(lock => lock.lockedAtScopeType === input.scopeType && lock.lockedAtScopeId === input.scopeId);
    if (blocking) throw new Error(`Config key is locked at ${blocking.lockedAtScopeType}:${blocking.lockedAtScopeId}`);

    let persistValue = input.value;
    let isEncrypted = false;
    let valueHash: string | null = null;

    if (definition.isSecret) {
      const raw = typeof input.value === 'string' ? input.value : JSON.stringify(input.value);
      const secret = await this.secretProvider.putSecret({
        key: input.key,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        value: raw,
      });
      persistValue = { ref: secret.ref };
      isEncrypted = true;
      valueHash = secret.hash;
    }

    const previous = await this.repository.getValue(definition.id, input.scopeType, input.scopeId);

    const value = await this.repository.upsertValue({
      definitionId: definition.id,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      value: persistValue,
      source: input.source,
      notes: input.notes,
      isEncrypted,
      valueHash,
      actorUserId: actor?.userId,
    });

    await this.repository.writeAudit({
      definitionId: definition.id,
      configKey: definition.key,
      action: previous ? 'update' : 'create',
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      actorUserId: actor?.userId,
      actorRoleCode: actor?.roleCodes?.[0] ?? null,
      oldValue: previous?.value,
      newValue: value.value,
    });

    return this.redactIfNeeded(definition, value);
  }

  async resolve(key: string, target: ScopeNode): Promise<EffectiveConfigResult> {
    const definition = await this.repository.findDefinitionByKey(key);
    if (!definition) throw new Error(`Unknown config key: ${key}`);

    const ancestry = await this.ancestryProvider.buildPath(target);
    const resolutionPath = buildResolutionPathFromAncestry(target, ancestry);
    const values = await this.repository.getValuesForDefinition(definition.id, resolutionPath);
    const locks = await this.repository.getActiveLocks(definition.id);

    return resolveFromRecords({
      definition,
      target,
      resolutionPath,
      values,
      locks,
    });
  }

  async createLock(actor: AuthActor | undefined, input: ConfigLockInput): Promise<void> {
    const definition = await this.repository.findDefinitionByKey(input.key);
    if (!definition) throw new Error(`Unknown config key: ${input.key}`);
    if (!definition.isLockable) throw new Error(`Config key is not lockable: ${input.key}`);

    await this.repository.createLock({
      definitionId: definition.id,
      lockedAtScopeType: input.lockedAtScopeType,
      lockedAtScopeId: input.lockedAtScopeId,
      lockBehavior: input.lockBehavior,
      reason: input.reason,
      actorUserId: actor?.userId,
    });

    await this.repository.writeAudit({
      definitionId: definition.id,
      configKey: definition.key,
      action: 'lock',
      scopeType: input.lockedAtScopeType,
      scopeId: input.lockedAtScopeId,
      actorUserId: actor?.userId,
      actorRoleCode: actor?.roleCodes?.[0] ?? null,
      metadata: { reason: input.reason ?? null },
    });
  }

  private assertScopeAllowed(definition: ConfigDefinition, scopeType: ConfigScopeType): void {
    if (!definition.allowedScopes.includes(scopeType)) {
      throw new Error(`Scope ${scopeType} is not allowed for key ${definition.key}`);
    }
  }

  private assertDeploymentOnlyRule(definition: ConfigDefinition, scopeType: ConfigScopeType): void {
    if (definition.deploymentOnly && !PLATFORM_ONLY_SCOPES.includes(scopeType)) {
      throw new Error(`Key ${definition.key} is deployment-only and cannot be set at ${scopeType} scope`);
    }
  }

  private assertValueType(definition: ConfigDefinition, value: unknown): void {
    switch (definition.valueType) {
      case 'boolean':
        if (typeof value !== 'boolean') throw new Error(`Key ${definition.key} requires boolean value`);
        break;
      case 'number':
        if (typeof value !== 'number') throw new Error(`Key ${definition.key} requires number value`);
        break;
      case 'string':
      case 'secret':
      case 'enum':
        if (typeof value !== 'string') throw new Error(`Key ${definition.key} requires string value`);
        break;
      case 'string_array':
        if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) {
          throw new Error(`Key ${definition.key} requires string array value`);
        }
        break;
      case 'number_array':
        if (!Array.isArray(value) || value.some(v => typeof v !== 'number')) {
          throw new Error(`Key ${definition.key} requires number array value`);
        }
        break;
      case 'json':
        break;
      default:
        throw new Error(`Unhandled config value type: ${definition.valueType satisfies never}`);
    }

    if (definition.enumValues?.length && typeof value === 'string' && !definition.enumValues.includes(value)) {
      throw new Error(`Key ${definition.key} must be one of: ${definition.enumValues.join(', ')}`);
    }
  }

  private redactIfNeeded(definition: ConfigDefinition, record: { value: unknown; [k: string]: unknown }) {
    if (!definition.isSecret) return record;
    return {
      ...record,
      value: '***REDACTED***',
      isSecret: true,
    };
  }
}
```

---

## File: `backend/src/modules/platform/config/config.bootstrap.ts`

```ts
import type { ConfigScopeType } from './config.types';
import { ConfigService } from './config.service';

export const deploymentProfileSeeds = {
  'saas-enterprise': {
    values: [
      { key: 'deployment.mode', scopeType: 'deployment', scopeId: 'default', value: 'saas' },
      { key: 'platform.observability.telemetryEnabled', scopeType: 'platform', scopeId: 'global', value: true },
      { key: 'deployment.secrets.provider', scopeType: 'deployment', scopeId: 'default', value: 'cloud_kms' },
    ],
  },
  'onprem-singletenant': {
    values: [
      { key: 'deployment.mode', scopeType: 'deployment', scopeId: 'default', value: 'onprem' },
      { key: 'platform.observability.telemetryEnabled', scopeType: 'platform', scopeId: 'global', value: false },
      { key: 'deployment.secrets.provider', scopeType: 'deployment', scopeId: 'default', value: 'local_vault' },
    ],
  },
  'sovereign-airgapped': {
    values: [
      { key: 'deployment.mode', scopeType: 'deployment', scopeId: 'default', value: 'sovereign' },
      { key: 'deployment.airgapped.enabled', scopeType: 'deployment', scopeId: 'default', value: true },
      { key: 'ai.llm.localOnly', scopeType: 'platform', scopeId: 'global', value: true },
      { key: 'deployment.secrets.provider', scopeType: 'deployment', scopeId: 'default', value: 'hsm' },
    ],
  },
  'sdk-headless': {
    values: [
      { key: 'deployment.mode', scopeType: 'deployment', scopeId: 'default', value: 'sdk' },
      { key: 'platform.ui.enabled', scopeType: 'platform', scopeId: 'global', value: false },
      { key: 'platform.api.publicMode', scopeType: 'platform', scopeId: 'global', value: true },
    ],
  },
} as const;

export type DeploymentProfileCode = keyof typeof deploymentProfileSeeds;

export async function bootstrapDeploymentProfile(
  service: ConfigService,
  actor: { userId?: string; roleCodes?: string[]; permissions?: string[] },
  profileCode: DeploymentProfileCode,
): Promise<void> {
  const profile = deploymentProfileSeeds[profileCode];
  for (const entry of profile.values) {
    await service.upsertValue(actor, {
      key: entry.key,
      scopeType: entry.scopeType as ConfigScopeType,
      scopeId: entry.scopeId,
      value: entry.value,
      source: 'bootstrap',
    });
  }
}
```

---

## File: `backend/src/modules/platform/config/config.routes.ts`

```ts
import { Router, type Request, type Response } from 'express';
import {
  ConfigDefinitionCreateSchema,
  ConfigDefinitionUpdateSchema,
  ConfigLockSchema,
  ConfigResolveQuerySchema,
  ConfigValueUpsertSchema,
} from './config.schemas';
import { CONFIG_PERMISSIONS, assertPermission, assertScopeAccess } from './config.permissions';
import type { ConfigService } from './config.service';
import { bootstrapDeploymentProfile } from './config.bootstrap';

export function createConfigRouter(configService: ConfigService): Router {
  const router = Router();

  router.get('/definitions', async (_req: Request, res: Response) => {
    const definitions = await configService.listDefinitions();
    res.json({ ok: true, data: definitions });
  });

  router.post('/definitions', async (req: Request, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.definitionCreate);
    const parsed = ConfigDefinitionCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_payload', details: parsed.error.flatten() });
    const created = await configService.createDefinition(req.user, parsed.data);
    return res.status(201).json({ ok: true, data: created });
  });

  router.patch('/definitions/:id', async (req: Request, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.definitionUpdate);
    const parsed = ConfigDefinitionUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_payload', details: parsed.error.flatten() });
    const updated = await configService.updateDefinition(req.user, req.params.id, parsed.data);
    return res.status(200).json({ ok: true, data: updated });
  });

  router.put('/values', async (req: Request, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.valueWrite);
    const parsed = ConfigValueUpsertSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_payload', details: parsed.error.flatten() });
    assertScopeAccess(req.user, { scopeType: parsed.data.scopeType, scopeId: parsed.data.scopeId });
    const result = await configService.upsertValue(req.user, parsed.data);
    return res.status(200).json({ ok: true, data: result });
  });

  router.get('/resolve', async (req: Request, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.resolveRead);
    const parsed = ConfigResolveQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_query', details: parsed.error.flatten() });
    assertScopeAccess(req.user, { scopeType: parsed.data.scopeType, scopeId: parsed.data.scopeId });
    const result = await configService.resolve(parsed.data.key, {
      scopeType: parsed.data.scopeType,
      scopeId: parsed.data.scopeId,
    });
    return res.status(200).json({ ok: true, data: result });
  });

  router.post('/locks', async (req: Request, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.lockWrite);
    const parsed = ConfigLockSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_payload', details: parsed.error.flatten() });
    assertScopeAccess(req.user, { scopeType: parsed.data.lockedAtScopeType, scopeId: parsed.data.lockedAtScopeId });
    await configService.createLock(req.user, parsed.data);
    return res.status(201).json({ ok: true });
  });

  router.post('/bootstrap/profile/:profileCode', async (req: Request, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.bootstrapExecute);
    await bootstrapDeploymentProfile(configService, req.user ?? {}, req.params.profileCode as any);
    return res.status(200).json({ ok: true, profileCode: req.params.profileCode });
  });

  return router;
}
```

---

## File: `backend/src/modules/platform/config/__tests__/config.schemas.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { ConfigDefinitionCreateSchema, ConfigValueUpsertSchema } from '../config.schemas';

describe('config schemas', () => {
  it('accepts valid definition payload', () => {
    const result = ConfigDefinitionCreateSchema.safeParse({
      key: 'deployment.mode',
      label: 'Deployment Mode',
      ownerDomain: 'platform',
      category: 'deployment',
      valueType: 'enum',
      allowedScopes: ['deployment', 'platform'],
      enumValues: ['saas', 'onprem', 'sovereign', 'sdk'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid key format', () => {
    const result = ConfigDefinitionCreateSchema.safeParse({
      key: 'Deployment Mode',
      label: 'Deployment Mode',
      ownerDomain: 'platform',
      category: 'deployment',
      valueType: 'enum',
      allowedScopes: ['deployment'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid config value payload', () => {
    const result = ConfigValueUpsertSchema.safeParse({
      key: 'platform.observability.telemetryEnabled',
      scopeType: 'platform',
      scopeId: 'global',
      value: true,
    });
    expect(result.success).toBe(true);
  });
});
```

---

## File: `backend/src/modules/platform/config/__tests__/config.resolver.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { resolveFromRecords } from '../config.resolver';

describe('config resolver', () => {
  it('prefers more specific scope value', () => {
    const result = resolveFromRecords({
      definition: {
        id: 'd1',
        key: 'platform.observability.telemetryEnabled',
        label: 'Telemetry Enabled',
        ownerDomain: 'platform',
        category: 'observability',
        valueType: 'boolean',
        allowedScopes: ['platform', 'tenant', 'organization', 'user'],
        defaultValue: false,
        isSecret: false,
        isRequired: false,
        isOverridable: true,
        isLockable: true,
        requiresRestart: false,
        deploymentOnly: false,
        sdkExposable: false,
        uiExposable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      target: { scopeType: 'user', scopeId: 'u_1' },
      resolutionPath: [
        { scopeType: 'user', scopeId: 'u_1' },
        { scopeType: 'tenant', scopeId: 't_1' },
        { scopeType: 'platform', scopeId: 'global' },
      ],
      values: [
        {
          id: 'v1',
          definitionId: 'd1',
          scopeType: 'platform',
          scopeId: 'global',
          value: false,
          isEncrypted: false,
          source: 'seed',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'v2',
          definitionId: 'd1',
          scopeType: 'tenant',
          scopeId: 't_1',
          value: true,
          isEncrypted: false,
          source: 'manual',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      locks: [],
    });

    expect(result.effectiveValue).toBe(true);
    expect(result.resolvedFromScopeType).toBe('tenant');
    expect(result.resolvedFromScopeId).toBe('t_1');
  });
});
```

---

# 24. Wiring note

Register the router under a neutral platform path:

```ts
app.use('/api/platform/config', createConfigRouter(configService));
```

Construct the service with:
- `ConfigRepository`
- `ScopeAncestryProvider`
- `SecretProvider`

---

# 25. Immediate next step after scaffold

After these files are in place, do this next:
1. add the SQL migration
2. register the permission family in RBAC
3. seed 10 to 20 initial config definitions
4. wire one real ancestry provider using tenant and organization lookup
5. run the profile bootstrap seeds
6. add integration tests for SaaS, on-prem, sovereign, and SDK bootstrap modes

