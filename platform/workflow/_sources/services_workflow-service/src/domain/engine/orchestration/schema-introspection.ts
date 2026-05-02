// ============================================
// Process Orchestration — Schema Introspection
// Cached table/column existence checks to avoid
// repeated introspection queries on fresh tenants.
// ============================================

import { safeQuery } from '@dos/db';
import type { GenericRow } from '@dos/types/db';

const TABLE_CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Table existence cache ───────────────────────────────────────────────────

const _tableExistsCache = new Map<string, Set<string>>();
let _tableCacheTime = 0;

export async function tableExists(schema: string, tableName: string): Promise<boolean> {
  if (Date.now() - _tableCacheTime > TABLE_CACHE_TTL) {
    _tableExistsCache.clear();
    _tableCacheTime = Date.now();
  }
  if (!_tableExistsCache.has(schema)) {
    try {
      const res = await safeQuery(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
        [schema],
      );
      _tableExistsCache.set(schema, new Set(res.rows.map((r: GenericRow) => r.table_name)));
    } catch {
      return false;
    }
  }
  return _tableExistsCache.get(schema)?.has(tableName) ?? false;
}

// ── Column existence cache ──────────────────────────────────────────────────

const _colExistsCache = new Map<string, boolean>();
let _colCacheTime = 0;

export async function columnExists(schema: string, table: string, column: string): Promise<boolean> {
  if (Date.now() - _colCacheTime > TABLE_CACHE_TTL) {
    _colExistsCache.clear();
    _colCacheTime = Date.now();
  }
  const key = `${schema}.${table}.${column}`;
  if (_colExistsCache.has(key)) return _colExistsCache.get(key)!;
  try {
    const res = await safeQuery(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3 LIMIT 1`,
      [schema, table, column],
    );
    const exists = res.rows.length > 0;
    _colExistsCache.set(key, exists);
    return exists;
  } catch {
    return false;
  }
}

// ── Task Type Permission Action (DB-cached) ─────────────────────────────────

import { withTenantClient } from '@dos/db';
import { TASK_TYPE_TO_PERMISSION_ACTION } from './types';

let _taskTypeCache: { map: Map<string, string>; expiresAt: number } | null = null;

export async function getTaskTypePermissionAction(tenantId: string, taskType: string): Promise<string> {
  if (!_taskTypeCache || _taskTypeCache.expiresAt <= Date.now()) {
    try {
      const rows = await withTenantClient(tenantId, async (c) => {
        const r = await c.query(`SELECT task_type, permission_action FROM task_type_config`);
        return r.rows;
      });
      const map = new Map<string, string>();
      for (const r of rows) map.set(r.task_type, r.permission_action);
      _taskTypeCache = { map, expiresAt: Date.now() + 5 * 60_000 };
    } catch {
      // table may not exist
    }
  }
  return _taskTypeCache?.map.get(taskType) || TASK_TYPE_TO_PERMISSION_ACTION[taskType] || 'record.read';
}
