/**
 * Wave 11a-§5 Widgets — extended manager smoke tests.
 *
 * Mocks the DbPool and asserts each manager method issues the expected
 * SQL fragment with tenant scoping. No live DB; just contract-shape
 * verification for the 9 §5 tables (instances, permissions, role grants,
 * data bindings, refresh policies, error states, visibility rules,
 * personalization, catalog categories).
 */
import { describe, it, expect, vi } from 'vitest';
import { UiOsWidgetExtManager } from '../managers/ui-os-widget-ext.manager.js';
import type { DbPool } from '../db.js';

function mockPool(rows: unknown[] = [], rowCount = rows.length): { pool: DbPool; calls: { sql: string; params: unknown[] }[] } {
  const calls: { sql: string; params: unknown[] }[] = [];
  const pool = {
    query: vi.fn(async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows, rowCount };
    }),
  } as unknown as DbPool;
  return { pool, calls };
}

const TENANT = 't-acme';
const USER = 'u-1';
const INST_UUID = '11111111-1111-1111-1111-111111111111';

describe('UiOsWidgetExtManager — instances', () => {
  it('listInstances scopes by tenant_id', async () => {
    const { pool, calls } = mockPool([{ id: 'a', tenant_id: TENANT, instance_key: 'k' }]);
    const m = new UiOsWidgetExtManager(pool);
    await m.listInstances(TENANT);
    expect(calls[0].sql).toMatch(/FROM dos\.ui_widget_instances/);
    expect(calls[0].sql).toMatch(/WHERE tenant_id = \$1/);
    expect(calls[0].params[0]).toBe(TENANT);
  });

  it('createInstance inserts with tenant + user attribution', async () => {
    const { pool, calls } = mockPool([{ id: 'a', tenant_id: TENANT, instance_key: 'k' }]);
    const m = new UiOsWidgetExtManager(pool);
    await m.createInstance(TENANT, USER, {
      instance_key: 'k', widget_catalog_id: INST_UUID, dashboard_id: INST_UUID,
    });
    expect(calls[0].sql).toMatch(/INSERT INTO dos\.ui_widget_instances/);
    expect(calls[0].params[0]).toBe(TENANT);
  });

  it('deleteInstance returns false when no row removed', async () => {
    const { pool } = mockPool([], 0);
    const m = new UiOsWidgetExtManager(pool);
    expect(await m.deleteInstance(TENANT, 'missing')).toBe(false);
  });
});

describe('UiOsWidgetExtManager — permissions / roles', () => {
  it('upsertPermission casts effect to ENUM type', async () => {
    const { pool, calls } = mockPool([{ id: 'p', permission_code: 'view', effect: 'allow' }]);
    const m = new UiOsWidgetExtManager(pool);
    await m.upsertPermission(TENANT, USER, INST_UUID, { permission_code: 'view', effect: 'allow' });
    expect(calls[0].sql).toMatch(/dos\.ui_perm_effect_t/);
  });

  it('grantRole upserts on (instance, role)', async () => {
    const { pool, calls } = mockPool([{ id: 'r', role_code: 'editor', granted_at: 'now' }]);
    const m = new UiOsWidgetExtManager(pool);
    await m.grantRole(TENANT, USER, INST_UUID, 'editor');
    expect(calls[0].sql).toMatch(/ui_widget_instance_role_grants/);
    expect(calls[0].sql).toMatch(/ON CONFLICT \(widget_instance_id, role_code\)/);
  });
});

describe('UiOsWidgetExtManager — binding / refresh / errors', () => {
  it('upsertBinding casts binding_kind + http_method to ENUMs', async () => {
    const { pool, calls } = mockPool([{ id: 'b', binding_kind: 'rest', http_method: 'GET' }]);
    const m = new UiOsWidgetExtManager(pool);
    await m.upsertBinding(TENANT, USER, INST_UUID, { binding_kind: 'rest' });
    expect(calls[0].sql).toMatch(/dos\.ui_widget_binding_kind_t/);
    expect(calls[0].sql).toMatch(/dos\.ui_http_method_t/);
  });

  it('upsertRefreshPolicy upserts by widget_instance_id', async () => {
    const { pool, calls } = mockPool([{ id: 'r' }]);
    const m = new UiOsWidgetExtManager(pool);
    await m.upsertRefreshPolicy(TENANT, USER, INST_UUID, { interval_seconds: 60 });
    expect(calls[0].sql).toMatch(/ON CONFLICT \(widget_instance_id\)/);
  });

  it('upsertErrorState casts retry_strategy ENUM', async () => {
    const { pool, calls } = mockPool([{ id: 'e' }]);
    const m = new UiOsWidgetExtManager(pool);
    await m.upsertErrorState(TENANT, USER, INST_UUID, { error_code: 'X' });
    expect(calls[0].sql).toMatch(/dos\.ui_retry_strategy_t/);
  });
});

describe('UiOsWidgetExtManager — visibility / personalization / categories', () => {
  it('createVisibilityRule casts rule_kind + effect ENUMs', async () => {
    const { pool, calls } = mockPool([{ id: 'v' }]);
    const m = new UiOsWidgetExtManager(pool);
    await m.createVisibilityRule(TENANT, USER, INST_UUID, { rule_kind: 'role' });
    expect(calls[0].sql).toMatch(/dos\.ui_visibility_rule_kind_t/);
    expect(calls[0].sql).toMatch(/dos\.ui_visibility_effect_t/);
  });

  it('upsertPersonalization scopes by (instance, user)', async () => {
    const { pool, calls } = mockPool([{ id: 'p' }]);
    const m = new UiOsWidgetExtManager(pool);
    await m.upsertPersonalization(TENANT, USER, INST_UUID, { is_pinned: true });
    expect(calls[0].sql).toMatch(/ON CONFLICT \(widget_instance_id, user_id\)/);
  });

  it('listCategories filters by tenant_id', async () => {
    const { pool, calls } = mockPool([]);
    const m = new UiOsWidgetExtManager(pool);
    await m.listCategories(TENANT);
    expect(calls[0].sql).toMatch(/FROM dos\.ui_widget_catalog_categories/);
    expect(calls[0].params[0]).toBe(TENANT);
  });
});
