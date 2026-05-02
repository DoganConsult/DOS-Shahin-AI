/**
 * DOS persistence ports.
 * Five repos (tenants, modules, products, events, jobs) × (InMemory + Pg).
 */

import type {
  TenantRef,
  ModuleDescriptor,
  ProductDescriptor,
  PlatformEventEnvelope,
} from '@dos/ports/dos';

// ───────── Tenants ─────────

export interface TenantsRepository {
  get(tenantId: string): Promise<TenantRef | null>;
  list(): Promise<readonly TenantRef[]>;
  upsert(tenant: TenantRef): Promise<void>;
  setStatus(tenantId: string, status: TenantRef['status']): Promise<boolean>;
}

export class InMemoryTenantsRepository implements TenantsRepository {
  private rows = new Map<string, TenantRef>();
  async get(tenantId: string): Promise<TenantRef | null> {
    return this.rows.get(tenantId) ?? null;
  }
  async list(): Promise<readonly TenantRef[]> {
    return Array.from(this.rows.values());
  }
  async upsert(tenant: TenantRef): Promise<void> {
    this.rows.set(tenant.tenantId, tenant);
  }
  async setStatus(tenantId: string, status: TenantRef['status']): Promise<boolean> {
    const existing = this.rows.get(tenantId);
    if (!existing) return false;
    this.rows.set(tenantId, { ...existing, status });
    return true;
  }
}

export class PgTenantsRepository implements TenantsRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}

  async get(tenantId: string): Promise<TenantRef | null> {
    const { rows } = await this.query(
      `SELECT tenant_id, product_code, status FROM platform_dos.tenants_registry WHERE tenant_id = $1`,
      [tenantId],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return { tenantId: r.tenant_id, productCode: r.product_code ?? undefined, status: r.status };
  }

  async list(): Promise<readonly TenantRef[]> {
    const { rows } = await this.query(
      `SELECT tenant_id, product_code, status FROM platform_dos.tenants_registry ORDER BY registered_at DESC`,
      [],
    );
    return rows.map((r) => ({
      tenantId: r.tenant_id,
      productCode: r.product_code ?? undefined,
      status: r.status,
    }));
  }

  async upsert(t: TenantRef): Promise<void> {
    await this.query(
      `INSERT INTO platform_dos.tenants_registry (tenant_id, product_code, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id) DO UPDATE
           SET product_code = EXCLUDED.product_code,
               status = EXCLUDED.status,
               status_changed_at = NOW()`,
      [t.tenantId, t.productCode ?? null, t.status],
    );
  }

  async setStatus(tenantId: string, status: TenantRef['status']): Promise<boolean> {
    const { rows } = await this.query(
      `UPDATE platform_dos.tenants_registry
         SET status = $2, status_changed_at = NOW()
         WHERE tenant_id = $1
         RETURNING tenant_id`,
      [tenantId, status],
    );
    return rows.length > 0;
  }
}

// ───────── Modules ─────────

export interface ModulesRepository {
  register(mod: ModuleDescriptor): Promise<void>;
  isRegistered(moduleCode: string): Promise<boolean>;
  get(moduleCode: string): Promise<ModuleDescriptor | null>;
  list(): Promise<readonly ModuleDescriptor[]>;
}

export class InMemoryModulesRepository implements ModulesRepository {
  private rows = new Map<string, ModuleDescriptor>();
  async register(mod: ModuleDescriptor): Promise<void> {
    this.rows.set(mod.moduleCode, mod);
  }
  async isRegistered(moduleCode: string): Promise<boolean> {
    return this.rows.has(moduleCode);
  }
  async get(moduleCode: string): Promise<ModuleDescriptor | null> {
    return this.rows.get(moduleCode) ?? null;
  }
  async list(): Promise<readonly ModuleDescriptor[]> {
    return Array.from(this.rows.values());
  }
}

export class PgModulesRepository implements ModulesRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}

  async register(mod: ModuleDescriptor): Promise<void> {
    await this.query(
      `INSERT INTO platform_dos.modules_registry (module_code, version, layer, owner_team, status)
         VALUES ($1,$2,$3,$4,'registered')
         ON CONFLICT (module_code) DO UPDATE
           SET version = EXCLUDED.version,
               layer = EXCLUDED.layer,
               owner_team = EXCLUDED.owner_team,
               status = 'registered',
               deregistered_at = NULL`,
      [mod.moduleCode, mod.version, mod.layer, mod.ownerTeam],
    );
  }

  async isRegistered(moduleCode: string): Promise<boolean> {
    const { rows } = await this.query(
      `SELECT 1 FROM platform_dos.modules_registry WHERE module_code = $1 AND status = 'registered'`,
      [moduleCode],
    );
    return rows.length > 0;
  }

  async get(moduleCode: string): Promise<ModuleDescriptor | null> {
    const { rows } = await this.query(
      `SELECT module_code, version, layer, owner_team FROM platform_dos.modules_registry WHERE module_code = $1`,
      [moduleCode],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return { moduleCode: r.module_code, version: r.version, layer: r.layer, ownerTeam: r.owner_team };
  }

  async list(): Promise<readonly ModuleDescriptor[]> {
    const { rows } = await this.query(
      `SELECT module_code, version, layer, owner_team
         FROM platform_dos.modules_registry
         WHERE status = 'registered'
         ORDER BY layer, module_code`,
      [],
    );
    return rows.map((r) => ({
      moduleCode: r.module_code,
      version: r.version,
      layer: r.layer,
      ownerTeam: r.owner_team,
    }));
  }
}

// ───────── Products ─────────

export interface ProductsRepository {
  register(p: ProductDescriptor): Promise<void>;
  list(): Promise<readonly ProductDescriptor[]>;
  setEnabled(productCode: string, enabled: boolean): Promise<boolean>;
}

export class InMemoryProductsRepository implements ProductsRepository {
  private rows = new Map<string, ProductDescriptor>();
  async register(p: ProductDescriptor): Promise<void> {
    this.rows.set(p.productCode, p);
  }
  async list(): Promise<readonly ProductDescriptor[]> {
    return Array.from(this.rows.values());
  }
  async setEnabled(productCode: string, enabled: boolean): Promise<boolean> {
    const existing = this.rows.get(productCode);
    if (!existing) return false;
    this.rows.set(productCode, { ...existing, enabled });
    return true;
  }
}

export class PgProductsRepository implements ProductsRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}

  async register(p: ProductDescriptor): Promise<void> {
    await this.query(
      `INSERT INTO platform_dos.products_registry (product_code, version, enabled)
         VALUES ($1,$2,$3)
         ON CONFLICT (product_code) DO UPDATE
           SET version = EXCLUDED.version,
               enabled = EXCLUDED.enabled,
               status_changed_at = NOW()`,
      [p.productCode, p.version, p.enabled],
    );
  }

  async list(): Promise<readonly ProductDescriptor[]> {
    const { rows } = await this.query(
      `SELECT product_code, version, enabled FROM platform_dos.products_registry ORDER BY registered_at DESC`,
      [],
    );
    return rows.map((r) => ({ productCode: r.product_code, version: r.version, enabled: r.enabled }));
  }

  async setEnabled(productCode: string, enabled: boolean): Promise<boolean> {
    const { rows } = await this.query(
      `UPDATE platform_dos.products_registry
         SET enabled = $2, status_changed_at = NOW()
         WHERE product_code = $1
         RETURNING product_code`,
      [productCode, enabled],
    );
    return rows.length > 0;
  }
}

// ───────── Events log ─────────

export interface EventsLogRepository {
  record(event: PlatformEventEnvelope): Promise<void>;
  recent(tenantId: string, limit: number): Promise<readonly PlatformEventEnvelope[]>;
  byType(eventType: string, limit: number): Promise<readonly PlatformEventEnvelope[]>;
}

export class InMemoryEventsLogRepository implements EventsLogRepository {
  private rows: PlatformEventEnvelope[] = [];
  async record(event: PlatformEventEnvelope): Promise<void> {
    this.rows.push(event);
  }
  async recent(tenantId: string, limit: number): Promise<readonly PlatformEventEnvelope[]> {
    return this.rows
      .filter((r) => r.tenantId === tenantId)
      .slice(-limit)
      .reverse();
  }
  async byType(eventType: string, limit: number): Promise<readonly PlatformEventEnvelope[]> {
    return this.rows
      .filter((r) => r.eventType === eventType)
      .slice(-limit)
      .reverse();
  }
}

export class PgEventsLogRepository implements EventsLogRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}

  async record(event: PlatformEventEnvelope): Promise<void> {
    await this.query(
      `INSERT INTO platform_dos.platform_events_log
         (event_id, event_type, tenant_id, payload, correlation_id, occurred_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        event.eventId ?? null,
        event.eventType,
        event.tenantId,
        JSON.stringify(event.payload ?? {}),
        event.correlationId ?? null,
        event.occurredAt,
      ],
    );
  }

  async recent(tenantId: string, limit: number): Promise<readonly PlatformEventEnvelope[]> {
    const { rows } = await this.query(
      `SELECT event_id, event_type, tenant_id, payload, correlation_id, occurred_at
         FROM platform_dos.platform_events_log
         WHERE tenant_id = $1
         ORDER BY occurred_at DESC LIMIT $2`,
      [tenantId, limit],
    );
    return rows.map(mapEventRow);
  }

  async byType(eventType: string, limit: number): Promise<readonly PlatformEventEnvelope[]> {
    const { rows } = await this.query(
      `SELECT event_id, event_type, tenant_id, payload, correlation_id, occurred_at
         FROM platform_dos.platform_events_log
         WHERE event_type = $1
         ORDER BY occurred_at DESC LIMIT $2`,
      [eventType, limit],
    );
    return rows.map(mapEventRow);
  }
}

function mapEventRow(r: any): PlatformEventEnvelope {
  return {
    eventId: r.event_id ?? undefined,
    eventType: r.event_type,
    tenantId: r.tenant_id,
    payload: r.payload ?? {},
    correlationId: r.correlation_id ?? undefined,
    occurredAt: r.occurred_at instanceof Date ? r.occurred_at.toISOString() : String(r.occurred_at),
  };
}
