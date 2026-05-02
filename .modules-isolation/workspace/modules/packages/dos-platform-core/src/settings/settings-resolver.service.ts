import { safeQuery } from '@dos/db';
import { logger } from '../observability';

export type SettingsScope = 'platform' | 'product' | 'tenant' | 'workspace' | 'module' | 'user';

export interface SettingsContext {
  schema: string;
  scope: SettingsScope;
  productKey?: string;
  moduleCode?: string;
  workspaceId?: string;
  ownerUserId?: string;
}

export interface SettingRecord {
  key: string;
  value: unknown;
  scope: SettingsScope;
  productKey?: string;
  moduleCode?: string;
  workspaceId?: string;
  ownerUserId?: string;
}

const SCOPE_HIERARCHY: SettingsScope[] = ['platform', 'product', 'tenant', 'workspace', 'module', 'user'];

function scopeWeight(scope: SettingsScope): number {
  return SCOPE_HIERARCHY.indexOf(scope);
}

export async function getSetting(ctx: SettingsContext, key: string): Promise<unknown | undefined> {
  const row = await resolveSettingRow(ctx, key);
  return row?.value !== undefined ? tryParseJson(row.value) : undefined;
}

export async function getSettingsForScope(ctx: SettingsContext): Promise<SettingRecord[]> {
  const conditions = ['scope = $1'];
  const params: unknown[] = [ctx.scope];
  let idx = 2;

  if (ctx.productKey) {
    conditions.push(`product_key = $${idx++}`);
    params.push(ctx.productKey);
  }
  if (ctx.moduleCode) {
    conditions.push(`module_code = $${idx++}`);
    params.push(ctx.moduleCode);
  }
  if (ctx.workspaceId) {
    conditions.push(`workspace_id = $${idx++}`);
    params.push(ctx.workspaceId);
  }
  if (ctx.ownerUserId) {
    conditions.push(`owner_user_id = $${idx++}`);
    params.push(ctx.ownerUserId);
  }

  const result = await safeQuery(
    `SELECT key, value, scope, product_key, module_code, workspace_id, owner_user_id
     FROM "${ctx.schema}".tenant_settings
     WHERE ${conditions.join(' AND ')}
     ORDER BY key`,
    params,
  );

  return result.rows.map(mapRow);
}

export async function upsertSetting(ctx: SettingsContext, key: string, value: unknown): Promise<void> {
  validateScopeContext(ctx);
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  await safeQuery(
    `INSERT INTO "${ctx.schema}".tenant_settings
       (key, value, scope, product_key, module_code, workspace_id, owner_user_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (key) DO UPDATE SET
       value = $2, scope = $3, product_key = $4, module_code = $5, workspace_id = $6, owner_user_id = $7, updated_at = now()`,
    [
      key,
      serialized,
      ctx.scope,
      ctx.productKey ?? null,
      ctx.moduleCode ?? null,
      ctx.workspaceId ?? null,
      ctx.ownerUserId ?? null,
    ],
  );
}

export async function resolveSettingWithInheritance(
  schema: string,
  key: string,
  context: {
    productKey?: string;
    moduleCode?: string;
    workspaceId?: string;
    ownerUserId?: string;
  },
): Promise<{ value: unknown; resolvedScope: SettingsScope } | undefined> {
  const scopes: SettingsContext[] = [];

  if (context.ownerUserId) {
    scopes.push({
      schema,
      scope: 'user',
      ownerUserId: context.ownerUserId,
      workspaceId: context.workspaceId,
      moduleCode: context.moduleCode,
      productKey: context.productKey,
    });
  }
  if (context.moduleCode) {
    scopes.push({ schema, scope: 'module', moduleCode: context.moduleCode, productKey: context.productKey });
  }
  if (context.workspaceId) {
    scopes.push({ schema, scope: 'workspace', workspaceId: context.workspaceId });
  }

  scopes.push({ schema, scope: 'tenant' });

  if (context.productKey) {
    scopes.push({ schema, scope: 'product', productKey: context.productKey });
  }

  scopes.push({ schema, scope: 'platform' });
  scopes.sort((a, b) => scopeWeight(b.scope) - scopeWeight(a.scope));

  for (const ctx of scopes) {
    const row = await resolveSettingRow(ctx, key);
    if (row) {
      return { value: tryParseJson(row.value), resolvedScope: ctx.scope };
    }
  }

  return undefined;
}

export function validateScopeContext(ctx: SettingsContext): void {
  if (ctx.scope === 'module' && !ctx.moduleCode) {
    throw new Error('module-scoped setting requires moduleCode');
  }
  if (ctx.scope === 'product' && !ctx.productKey) {
    throw new Error('product-scoped setting requires productKey');
  }
  if (ctx.scope === 'workspace' && !ctx.workspaceId) {
    throw new Error('workspace-scoped setting requires workspaceId');
  }
  if (ctx.scope === 'user' && !ctx.ownerUserId) {
    throw new Error('user-scoped setting requires ownerUserId');
  }
}

export async function detectScopeAmbiguities(schema: string): Promise<string[]> {
  const errors: string[] = [];

  try {
    const result = await safeQuery(
      `SELECT key, scope, module_code, product_key, workspace_id, owner_user_id FROM "${schema}".tenant_settings`,
    );

    for (const row of result.rows) {
      if (row.scope === 'module' && !row.module_code) {
        errors.push(`Setting '${row.key}' has scope=module but no module_code`);
      }
      if (row.scope === 'product' && !row.product_key) {
        errors.push(`Setting '${row.key}' has scope=product but no product_key`);
      }
      if (row.scope === 'workspace' && !row.workspace_id) {
        errors.push(`Setting '${row.key}' has scope=workspace but no workspace_id`);
      }
      if (row.scope === 'user' && !row.owner_user_id) {
        errors.push(`Setting '${row.key}' has scope=user but no owner_user_id`);
      }
      if (row.module_code && row.scope !== 'module') {
        errors.push(`Setting '${row.key}' has module_code='${row.module_code}' but scope='${row.scope}'`);
      }
    }
  } catch (error: unknown) {
    logger.warn(`[SettingsResolver] Could not read tenant_settings from ${schema}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return errors;
}

async function resolveSettingRow(
  ctx: SettingsContext,
  key: string,
): Promise<{ key: string; value: string } | undefined> {
  const conditions = ['key = $1', 'scope = $2'];
  const params: unknown[] = [key, ctx.scope];
  let idx = 3;

  if (ctx.productKey) {
    conditions.push(`product_key = $${idx++}`);
    params.push(ctx.productKey);
  } else {
    conditions.push('product_key IS NULL');
  }

  if (ctx.moduleCode) {
    conditions.push(`module_code = $${idx++}`);
    params.push(ctx.moduleCode);
  } else {
    conditions.push('module_code IS NULL');
  }

  if (ctx.workspaceId) {
    conditions.push(`workspace_id = $${idx++}`);
    params.push(ctx.workspaceId);
  } else {
    conditions.push('workspace_id IS NULL');
  }

  if (ctx.ownerUserId) {
    conditions.push(`owner_user_id = $${idx++}`);
    params.push(ctx.ownerUserId);
  } else {
    conditions.push('owner_user_id IS NULL');
  }

  const result = await safeQuery(
    `SELECT key, value FROM "${ctx.schema}".tenant_settings WHERE ${conditions.join(' AND ')} LIMIT 1`,
    params,
  );

  return result.rows[0] ?? undefined;
}

function mapRow(row: Record<string, any>): SettingRecord {
  return {
    key: row.key,
    value: tryParseJson(row.value),
    scope: row.scope,
    productKey: row.product_key ?? undefined,
    moduleCode: row.module_code ?? undefined,
    workspaceId: row.workspace_id ?? undefined,
    ownerUserId: row.owner_user_id ?? undefined,
  };
}

function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
