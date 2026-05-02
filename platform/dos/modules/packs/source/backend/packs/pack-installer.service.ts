import { readFile } from 'fs/promises';
import path from 'path';
import { query, safeQuery, withClient } from './ports/database.port';
import { InstallPackDto, PackInstallResultDto } from './pack-installer.types';
import type { PoolClient } from 'pg';

export class PackInstallerService {
  async installPack(
    tenantId: string,
    dto: InstallPackDto
  ): Promise<PackInstallResultDto> {
    const schema = await this.resolveTenantSchema(tenantId);
    const manifest = await this.loadManifest(dto.packCode);

    const steps: PackInstallResultDto['steps'] = [];

    await withClient(async (client) => {
      await client.query('BEGIN');
      try {
        await this.installNavigation(schema, manifest, steps, client);
        await this.installNavigationOverrides(schema, manifest, steps, client);
        await this.installWidgets(schema, manifest, steps, client);
        await this.installDashboards(schema, manifest, steps, client);
        await this.installDashboardRoleBindings(schema, manifest, steps, client);
        await this.installDashboardOverrides(schema, manifest, steps, client);
        await this.installRoleProfiles(schema, manifest, steps, client);
        await this.installWorkspaceProfile(schema, tenantId, manifest, steps, client);
        await this.installFeatureFlags(schema, manifest, steps, client);
        await this.recordInstallation(schema, manifest, dto, steps, client);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    });

    return {

      packCode: manifest.packCode,

      version: manifest.version,
      installed: true,
      steps,
    };
  }

  private async resolveTenantSchema(tenantId: string): Promise<string> {
    const result = await safeQuery(
      `SELECT schema_name
       FROM public.tenants
       WHERE tenant_id = $1::text
       LIMIT 1`,
      [tenantId]
    );
    const schema = result.rows[0]?.schema_name;
    if (!schema) throw new Error('Tenant schema not found');
    return schema;
  }

  private async loadManifest(packCode: string): Promise<Record<string, unknown>> {
    const candidates = [
      path.join(process.cwd(), 'src', 'packs', `${packCode}.pack.json`),
      path.join(__dirname, '..', '..', 'packs', `${packCode}.pack.json`),
    ];

    for (const filePath of candidates) {
      try {
        const raw = await readFile(filePath, 'utf-8');
        return JSON.parse(raw);
      } catch {
        continue;
      }
    }

    throw new Error(`Pack manifest not found: ${packCode}`);
  }

  private async installNavigation(schema: string, manifest: Record<string, unknown>, steps: Record<string, unknown>[], client?: PoolClient) {

    const items = manifest.installs?.navigation || [];
    if (!items.length) {
      steps.push({ step: 'navigation', status: 'skipped' });
      return;
    }
    const q = client ? client.query.bind(client) : query;

    for (const item of items) {
      try {
        await q(
          `
          INSERT INTO "${schema}".navigation_registry
          (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active, created_at, updated_at)
          VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,true,now(),now())
          ON CONFLICT (nav_key) DO UPDATE SET
            parent_nav_key = EXCLUDED.parent_nav_key,
            label_en = EXCLUDED.label_en,
            label_ar = EXCLUDED.label_ar,
            route = EXCLUDED.route,
            icon = EXCLUDED.icon,
            module_code = EXCLUDED.module_code,
            item_type = EXCLUDED.item_type,
            sort_order = EXCLUDED.sort_order,
            updated_at = now()
          `,
          [
            item.nav_key,
            item.parent_nav_key ?? null,
            item.label_en,
            item.label_ar,
            item.route ?? null,
            item.icon ?? null,
            item.module_code ?? null,
            item.item_type ?? 'link',
            item.sort_order ?? 100,
          ]
        );
      } catch (err: unknown) {
        steps.push({ step: 'navigation', status: 'failed', details: (err as Error)?.message });
        return;
      }
    }
    steps.push({ step: 'navigation', status: 'ok', details: `${items.length} items` });
  }

  private async installNavigationOverrides(schema: string, manifest: Record<string, unknown>, steps: Record<string, unknown>[], client?: PoolClient) {

    const items = manifest.installs?.navigationOverrides || [];
    if (!items.length) {
      steps.push({ step: 'navigationOverrides', status: 'skipped' });
      return;
    }
    const q = client ? client.query.bind(client) : query;

    for (const item of items) {
      try {
        await q(
          `
          INSERT INTO "${schema}".navigation_overrides
          (nav_key, enabled, label_en, label_ar, route, icon, module_code, sort_order, applies_to_role, is_active, created_at, updated_at)
          VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,now(),now())
          `,
          [
            item.nav_key,
            item.enabled ?? true,
            item.label_en ?? null,
            item.label_ar ?? null,
            item.route ?? null,
            item.icon ?? null,
            item.module_code ?? null,
            item.sort_order ?? null,
            item.applies_to_role ?? null,
          ]
        );
      } catch (err: unknown) {
        steps.push({ step: 'navigationOverrides', status: 'failed', details: (err as Error)?.message });
        return;
      }
    }
    steps.push({ step: 'navigationOverrides', status: 'ok', details: `${items.length} items` });
  }

  private async installWidgets(schema: string, manifest: Record<string, unknown>, steps: Record<string, unknown>[], client?: PoolClient) {
    const q = client ? client.query.bind(client) : query;

    const items = manifest.installs?.widgetRegistry || [];
    if (!items.length) {
      steps.push({ step: 'widgetRegistry', status: 'skipped' });
      return;
    }

    for (const item of items) {
      try {
        await q(
          `
          INSERT INTO "${schema}".dashboard_widget_registry
          (widget_key, label_en, label_ar, module_code, component_key, default_width, default_height, default_config, is_system, is_active, sort_order, created_at, updated_at)
          VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,true,true,$9,now(),now())
          ON CONFLICT (widget_key) DO UPDATE SET
            label_en = EXCLUDED.label_en,
            label_ar = EXCLUDED.label_ar,
            module_code = EXCLUDED.module_code,
            component_key = EXCLUDED.component_key,
            default_width = EXCLUDED.default_width,
            default_height = EXCLUDED.default_height,
            default_config = EXCLUDED.default_config,
            sort_order = EXCLUDED.sort_order,
            updated_at = now()
          `,
          [
            item.widget_key,
            item.label_en,
            item.label_ar,
            item.module_code ?? null,
            item.component_key,
            item.default_width ?? 6,
            item.default_height ?? 3,
            JSON.stringify(item.default_config ?? {}),
            item.sort_order ?? 100,
          ]
        );
      } catch (err: unknown) {
        steps.push({ step: 'widgetRegistry', status: 'failed', details: (err as Error)?.message });
        return;
      }
    }
    steps.push({ step: 'widgetRegistry', status: 'ok', details: `${items.length} items` });
  }

  private async installDashboards(schema: string, manifest: Record<string, unknown>, steps: Record<string, unknown>[], client?: PoolClient) {
    const q = client ? client.query.bind(client) : query;

    const items = manifest.installs?.dashboards || [];
    if (!items.length) {
      steps.push({ step: 'dashboards', status: 'skipped' });
      return;
    }

    for (const item of items) {
      try {
        await q(
          `
          INSERT INTO "${schema}".dashboard_registry
          (dashboard_code, name_en, name_ar, audience, module_code, route, layout, default_filters, is_system, is_active, sort_order, created_at, updated_at)
          VALUES
          ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,true,true,$9,now(),now())
          ON CONFLICT (dashboard_code) DO UPDATE SET
            name_en = EXCLUDED.name_en,
            name_ar = EXCLUDED.name_ar,
            audience = EXCLUDED.audience,
            module_code = EXCLUDED.module_code,
            route = EXCLUDED.route,
            layout = EXCLUDED.layout,
            default_filters = EXCLUDED.default_filters,
            sort_order = EXCLUDED.sort_order,
            updated_at = now()
          `,
          [
            item.dashboard_code,
            item.name_en,
            item.name_ar,
            item.audience ?? null,
            item.module_code ?? null,
            item.route ?? null,
            JSON.stringify(item.layout ?? { version: 1, widgets: [] }),
            JSON.stringify(item.default_filters ?? {}),
            item.sort_order ?? 100,
          ]
        );
      } catch (err: unknown) {
        steps.push({ step: 'dashboards', status: 'failed', details: (err as Error)?.message });
        return;
      }
    }
    steps.push({ step: 'dashboards', status: 'ok', details: `${items.length} items` });
  }

  private async installDashboardRoleBindings(schema: string, manifest: Record<string, unknown>, steps: Record<string, unknown>[], client?: PoolClient) {
    const q = client ? client.query.bind(client) : query;

    const items = manifest.installs?.dashboardRoleBindings || [];
    if (!items.length) {
      steps.push({ step: 'dashboardRoleBindings', status: 'skipped' });
      return;
    }

    for (const item of items) {
      try {
        await q(
          `
          INSERT INTO "${schema}".dashboard_role_bindings
          (dashboard_code, role_code, is_default, is_allowed, created_at)
          VALUES
          ($1,$2,$3,$4,now())
          ON CONFLICT (dashboard_code, role_code) DO UPDATE SET
            is_default = EXCLUDED.is_default,
            is_allowed = EXCLUDED.is_allowed
          `,
          [
            item.dashboard_code,
            item.role_code,
            item.is_default ?? false,
            item.is_allowed ?? true,
          ]
        );
      } catch (err: unknown) {
        steps.push({ step: 'dashboardRoleBindings', status: 'failed', details: (err as Error)?.message });
        return;
      }
    }
    steps.push({ step: 'dashboardRoleBindings', status: 'ok', details: `${items.length} items` });
  }

  private async installDashboardOverrides(schema: string, manifest: Record<string, unknown>, steps: Record<string, unknown>[], client?: PoolClient) {
    const q = client ? client.query.bind(client) : query;

    const items = manifest.installs?.dashboardOverrides || [];
    if (!items.length) {
      steps.push({ step: 'dashboardOverrides', status: 'skipped' });
      return;
    }

    for (const item of items) {
      try {
        await q(
          `
          INSERT INTO "${schema}".dashboard_overrides
          (dashboard_code, applies_to_role, enabled, name_en, name_ar, route, layout_patch, default_filters_patch, metadata_patch, is_active, created_at, updated_at)
          VALUES
          ($1,$2,true,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,true,now(),now())
          `,
          [
            item.dashboard_code,
            item.applies_to_role ?? null,
            item.name_en ?? null,
            item.name_ar ?? null,
            item.route ?? null,
            JSON.stringify(item.layout_patch ?? {}),
            JSON.stringify(item.default_filters_patch ?? {}),
            JSON.stringify(item.metadata_patch ?? {}),
          ]
        );
      } catch (err: unknown) {
        steps.push({ step: 'dashboardOverrides', status: 'failed', details: (err as Error)?.message });
        return;
      }
    }
    steps.push({ step: 'dashboardOverrides', status: 'ok', details: `${items.length} items` });
  }

  private async installRoleProfiles(schema: string, manifest: Record<string, unknown>, steps: Record<string, unknown>[], client?: PoolClient) {
    const q = client ? client.query.bind(client) : query;

    const items = manifest.installs?.roleProfiles || [];
    if (!items.length) {
      steps.push({ step: 'roleProfiles', status: 'skipped' });
      return;
    }

    for (const item of items) {
      try {
        await q(
          `
          INSERT INTO "${schema}".role_profiles
          (role, modules, dashboard_widgets, default_landing_page, custom)
          VALUES
          ($1,$2::jsonb,$3::jsonb,$4,$5::jsonb)
          ON CONFLICT (role) DO UPDATE SET
            modules = EXCLUDED.modules,
            dashboard_widgets = EXCLUDED.dashboard_widgets,
            default_landing_page = EXCLUDED.default_landing_page,
            custom = EXCLUDED.custom
          `,
          [
            item.role,
            JSON.stringify(item.modules ?? []),
            JSON.stringify(item.dashboard_widgets ?? []),
            item.default_landing_page ?? '/',
            JSON.stringify(item.custom ?? {}),
          ]
        );
      } catch (err: unknown) {
        steps.push({ step: 'roleProfiles', status: 'failed', details: (err as Error)?.message });
        return;
      }
    }
    steps.push({ step: 'roleProfiles', status: 'ok', details: `${items.length} items` });
  }

  private async installWorkspaceProfile(
    schema: string,
    tenantId: string,
    manifest: Record<string, unknown>,
    steps: Record<string, unknown>[],
    client?: PoolClient,
  ) {
    const q = client ? client.query.bind(client) : query;
    const installs = (manifest.installs ?? {}) as Record<string, unknown>;
    const item = installs.workspaceProfile;
    if (!item || Object.keys(item).length === 0) {
      steps.push({ step: 'workspaceProfile', status: 'skipped' });
      return;
    }

    try {
      await q(
        `
        INSERT INTO "${schema}".workspace_profile
        (tenant_id, industry, org_size, sectors, default_dashboard, risk_appetite, enforcement_mode, evidence_freshness_days)
        VALUES
        ($1,$2,$3,$4::jsonb,$5,$6,$7,$8)
        ON CONFLICT (tenant_id) DO UPDATE SET
          industry = EXCLUDED.industry,
          org_size = EXCLUDED.org_size,
          sectors = EXCLUDED.sectors,
          default_dashboard = EXCLUDED.default_dashboard,
          risk_appetite = EXCLUDED.risk_appetite,
          enforcement_mode = EXCLUDED.enforcement_mode,
          evidence_freshness_days = EXCLUDED.evidence_freshness_days
        `,
        [
          tenantId,

          item.industry ?? null,

          item.org_size ?? null,

          JSON.stringify(item.sectors ?? []),

          item.default_dashboard ?? null,

          item.risk_appetite ?? null,

          item.enforcement_mode ?? null,

          item.evidence_freshness_days ?? 90,
        ]
      );
      steps.push({ step: 'workspaceProfile', status: 'ok' });
    } catch (err: unknown) {
      steps.push({ step: 'workspaceProfile', status: 'failed', details: (err as Error)?.message });
    }
  }

  private async installFeatureFlags(schema: string, manifest: Record<string, unknown>, steps: Record<string, unknown>[], client?: PoolClient) {
    const q = client ? client.query.bind(client) : query;

    const items = manifest.installs?.featureFlags || [];
    if (!items.length) {
      steps.push({ step: 'featureFlags', status: 'skipped' });
      return;
    }

    let installed = 0;
    for (const item of items) {
      try {
        await q(
          `
          INSERT INTO "${schema}".feature_flags
          (feature_key, enabled, created_at, updated_at)
          VALUES
          ($1,$2,now(),now())
          ON CONFLICT (feature_key) DO UPDATE SET
            enabled = EXCLUDED.enabled,
            updated_at = now()
          `,
          [item.feature_key, item.enabled ?? true]
        );
        installed++;
      } catch {
        try {
          await q(
            `
            INSERT INTO "${schema}".feature_flags
            (feature_name, is_enabled, created_at, updated_at)
            VALUES
            ($1,$2,now(),now())
            `,
            [item.feature_key, item.enabled ?? true]
          );
          installed++;
        } catch {
          // feature_flags table may not exist in this schema — skip silently
        }
      }
    }

    steps.push({ step: 'featureFlags', status: installed > 0 ? 'ok' : 'skipped', details: `${installed}/${items.length} items` });
  }

  private async recordInstallation(schema: string, manifest: Record<string, unknown>, dto: InstallPackDto, steps: Record<string, unknown>[], client?: PoolClient) {
    const q = client ? client.query.bind(client) : query;
    try {
      await q(
        `
        INSERT INTO "${schema}".pack_installations
        (pack_code, pack_version, installation_scope, workspace_id, applies_to_role, installed_by, install_status, install_log, created_at, updated_at)
        VALUES
        ($1,$2,'tenant',$3,$4,$5,'installed',$6::jsonb,now(),now())
        `,
        [
          manifest.packCode,
          manifest.version,
          dto.workspaceId ?? null,
          dto.appliesToRole ?? null,
          dto.installedBy ?? null,
          JSON.stringify(steps),
        ]
      );
      steps.push({ step: 'recordInstallation', status: 'ok' });
    } catch (err: unknown) {
      steps.push({ step: 'recordInstallation', status: 'failed', details: (err as Error)?.message });
    }
  }
}
