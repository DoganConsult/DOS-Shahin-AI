import { resolveSettingWithInheritance } from './settings-resolver.service';
import {
  getDefaultProductKey,
  getRegisteredProduct,
} from '../config/platform-identity';

export class UnifiedConfigService {
  private static resolveRegisteredProductKey(): string | undefined {
    const defaultKey = getDefaultProductKey();
    if (defaultKey) {
      return defaultKey;
    }
    return undefined;
  }

  static async resolve<T>(
    key: string,
    options?: {
      tenantId?: string;
      workspaceId?: string;
      userId?: string;
      moduleCode?: string;
      roleCode?: string;
      dashboardCode?: string;
    },
  ): Promise<T | undefined> {
    return (await this.resolveWithMetadata<T>(key, options)).value;
  }

  static async resolveWithMetadata<T>(
    key: string,
    options?: {
      tenantId?: string;
      workspaceId?: string;
      userId?: string;
      moduleCode?: string;
      roleCode?: string;
      dashboardCode?: string;
    },
  ): Promise<{ value: T | undefined; source: string; overridenLayers: string[] }> {
    const envKey = key.replace(/\./g, '_').toUpperCase();
    const overridenLayers: string[] = [];

    if (process.env[envKey] !== undefined) {
      return {
        value: this.parseEnvValue(process.env[envKey]) as T,
        source: 'environment',
        overridenLayers,
      };
    }
    overridenLayers.push('environment');

    const deploymentOverride = this.getDeploymentOverride(key);
    if (deploymentOverride !== undefined) {
      return { value: deploymentOverride as T, source: 'deployment', overridenLayers };
    }
    overridenLayers.push('deployment');

    if (options?.tenantId) {
      const schema = `tenant_${options.tenantId.replace(/-/g, '_')}`;
      try {
        const resolved = await resolveSettingWithInheritance(schema, key, {
          productKey: getDefaultProductKey() || undefined,
          moduleCode: options.moduleCode,
          workspaceId: options.workspaceId,
          ownerUserId: options.userId,
        });
        if (resolved?.value !== undefined) {
          return {
            value: resolved.value as T,
            source: `tenant:${resolved.resolvedScope}`,
            overridenLayers,
          };
        }
      } catch {}
    }
    overridenLayers.push('tenant');

    const productKey = this.resolveRegisteredProductKey();
    if (productKey) {
      const product = getRegisteredProduct(productKey);
      if (product) {
        if (key === 'bootstrap.landing_page' && options?.roleCode) {
          const roleSpecific = (product as any).rbac?.roleLandings?.landingMap?.[options.roleCode];
          if (roleSpecific) {
            return { value: roleSpecific as T, source: 'product:rbac', overridenLayers };
          }

          const homeByRole = (product as any).role_pack?.home_by_role?.[options.roleCode];
          if (homeByRole) {
            return { value: homeByRole as T, source: 'product:role_pack', overridenLayers };
          }
        }

        if (key === 'bootstrap.dashboard_route' && options?.dashboardCode) {
          const dashboardDefinitions = (product as any).dashboard_definitions || [];
          const dashboardDefinition = dashboardDefinitions.find(
            (definition: any) => definition.dashboard_code === options.dashboardCode,
          );
          if (dashboardDefinition?.route) {
            return {
              value: dashboardDefinition.route as T,
              source: 'product:dashboard_definitions',
              overridenLayers,
            };
          }
        }

        if (key === 'registration.defaults' && (product as any).registrationDefaults) {
          return {
            value: (product as any).registrationDefaults as T,
            source: 'product:registrationDefaults',
            overridenLayers,
          };
        }

        if ((product as any).settings && (product as any).settings[key] !== undefined) {
          return {
            value: (product as any).settings[key] as T,
            source: 'product:settings',
            overridenLayers,
          };
        }
      }
    }
    overridenLayers.push('product');

    return {
      value: this.getPlatformDefault(key, options?.roleCode) as T,
      source: 'platform',
      overridenLayers,
    };
  }

  static resolveSync<T>(key: string, options?: { roleCode?: string; dashboardCode?: string }): T | undefined {
    return this.resolveSyncWithMetadata<T>(key, options).value;
  }

  static resolveSyncWithMetadata<T>(
    key: string,
    options?: { roleCode?: string; dashboardCode?: string },
  ): { value: T | undefined; source: string; overridenLayers: string[] } {
    const envKey = key.replace(/\./g, '_').toUpperCase();
    const overridenLayers: string[] = [];

    if (process.env[envKey] !== undefined) {
      return {
        value: this.parseEnvValue(process.env[envKey]) as T,
        source: 'environment',
        overridenLayers,
      };
    }
    overridenLayers.push('environment');

    const deploymentOverride = this.getDeploymentOverride(key);
    if (deploymentOverride !== undefined) {
      return { value: deploymentOverride as T, source: 'deployment', overridenLayers };
    }
    overridenLayers.push('deployment');

    overridenLayers.push('tenant');

    const productKey = this.resolveRegisteredProductKey();
    if (productKey) {
      const product = getRegisteredProduct(productKey);
      if (product) {
        if (key === 'bootstrap.landing_page' && options?.roleCode) {
          const landing = (product as any).rbac?.roleLandings?.landingMap?.[options.roleCode];
          if (landing) {
            return { value: landing as T, source: 'product:rbac', overridenLayers };
          }

          const homeByRole = (product as any).role_pack?.home_by_role?.[options.roleCode];
          if (homeByRole) {
            return { value: homeByRole as T, source: 'product:role_pack', overridenLayers };
          }
        }

        if (key === 'bootstrap.dashboard_route' && options?.dashboardCode) {
          const dashboardDefinitions = (product as any).dashboard_definitions || [];
          const dashboardDefinition = dashboardDefinitions.find(
            (definition: any) => definition.dashboard_code === options.dashboardCode,
          );
          if (dashboardDefinition?.route) {
            return {
              value: dashboardDefinition.route as T,
              source: 'product:dashboard_definitions',
              overridenLayers,
            };
          }
        }

        if (key === 'registration.defaults' && (product as any).registrationDefaults) {
          return {
            value: (product as any).registrationDefaults as T,
            source: 'product:registrationDefaults',
            overridenLayers,
          };
        }

        if ((product as any).settings && (product as any).settings[key] !== undefined) {
          return {
            value: (product as any).settings[key] as T,
            source: 'product:settings',
            overridenLayers,
          };
        }
      }
    }
    overridenLayers.push('product');

    return {
      value: this.getPlatformDefault(key, options?.roleCode) as T,
      source: 'platform',
      overridenLayers,
    };
  }

  private static parseEnvValue(value: string | undefined): unknown {
    if (value === undefined) {
      return undefined;
    }
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    if (!Number.isNaN(Number(value))) {
      return Number(value);
    }
    return value;
  }

  private static getDeploymentOverride(_key: string): unknown {
    return undefined;
  }

  private static getPlatformDefault(key: string, roleCode?: string): unknown {
    if (key === 'bootstrap.landing_page') {
      if (roleCode && ['tenant_admin', 'admin', 'platform_admin'].includes(roleCode)) {
        return '/app/admin';
      }
      return '/workspace-home';
    }

    const defaults: Record<string, unknown> = {
      'bootstrap.enforce_email_verification': true,
      'bootstrap.session_timeout_minutes': 60,
      'bootstrap.max_concurrent_sessions': 3,
      'bootstrap.first_run_mandatory': false,
      'bootstrap.stale_session_cleanup_days': 7,
      'provisioning.allow_mock_runner': false,
      'workspace.strict_mode': false,
      'registration.defaults': {
        ownerRole: 'tenant_admin',
        userType: 'internal',
        initialStatus: 'pending',
      },
    };

    return defaults[key];
  }
}
