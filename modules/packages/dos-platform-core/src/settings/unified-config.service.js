"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedConfigService = void 0;
const settings_resolver_service_1 = require("./settings-resolver.service");
const platform_identity_1 = require("../config/platform-identity");
class UnifiedConfigService {
    static resolveRegisteredProductKey() {
        const defaultKey = (0, platform_identity_1.getDefaultProductKey)();
        if (defaultKey) {
            return defaultKey;
        }
        return undefined;
    }
    static async resolve(key, options) {
        return (await this.resolveWithMetadata(key, options)).value;
    }
    static async resolveWithMetadata(key, options) {
        const envKey = key.replace(/\./g, '_').toUpperCase();
        const overridenLayers = [];
        if (process.env[envKey] !== undefined) {
            return {
                value: this.parseEnvValue(process.env[envKey]),
                source: 'environment',
                overridenLayers,
            };
        }
        overridenLayers.push('environment');
        const deploymentOverride = this.getDeploymentOverride(key);
        if (deploymentOverride !== undefined) {
            return { value: deploymentOverride, source: 'deployment', overridenLayers };
        }
        overridenLayers.push('deployment');
        if (options?.tenantId) {
            const schema = `tenant_${options.tenantId.replace(/-/g, '_')}`;
            try {
                const resolved = await (0, settings_resolver_service_1.resolveSettingWithInheritance)(schema, key, {
                    productKey: (0, platform_identity_1.getDefaultProductKey)() || undefined,
                    moduleCode: options.moduleCode,
                    workspaceId: options.workspaceId,
                    ownerUserId: options.userId,
                });
                if (resolved?.value !== undefined) {
                    return {
                        value: resolved.value,
                        source: `tenant:${resolved.resolvedScope}`,
                        overridenLayers,
                    };
                }
            }
            catch { }
        }
        overridenLayers.push('tenant');
        const productKey = this.resolveRegisteredProductKey();
        if (productKey) {
            const product = (0, platform_identity_1.getRegisteredProduct)(productKey);
            if (product) {
                if (key === 'bootstrap.landing_page' && options?.roleCode) {
                    const roleSpecific = product.rbac?.roleLandings?.landingMap?.[options.roleCode];
                    if (roleSpecific) {
                        return { value: roleSpecific, source: 'product:rbac', overridenLayers };
                    }
                    const homeByRole = product.role_pack?.home_by_role?.[options.roleCode];
                    if (homeByRole) {
                        return { value: homeByRole, source: 'product:role_pack', overridenLayers };
                    }
                }
                if (key === 'bootstrap.dashboard_route' && options?.dashboardCode) {
                    const dashboardDefinitions = product.dashboard_definitions || [];
                    const dashboardDefinition = dashboardDefinitions.find((definition) => definition.dashboard_code === options.dashboardCode);
                    if (dashboardDefinition?.route) {
                        return {
                            value: dashboardDefinition.route,
                            source: 'product:dashboard_definitions',
                            overridenLayers,
                        };
                    }
                }
                if (key === 'registration.defaults' && product.registrationDefaults) {
                    return {
                        value: product.registrationDefaults,
                        source: 'product:registrationDefaults',
                        overridenLayers,
                    };
                }
                if (product.settings && product.settings[key] !== undefined) {
                    return {
                        value: product.settings[key],
                        source: 'product:settings',
                        overridenLayers,
                    };
                }
            }
        }
        overridenLayers.push('product');
        return {
            value: this.getPlatformDefault(key, options?.roleCode),
            source: 'platform',
            overridenLayers,
        };
    }
    static resolveSync(key, options) {
        return this.resolveSyncWithMetadata(key, options).value;
    }
    static resolveSyncWithMetadata(key, options) {
        const envKey = key.replace(/\./g, '_').toUpperCase();
        const overridenLayers = [];
        if (process.env[envKey] !== undefined) {
            return {
                value: this.parseEnvValue(process.env[envKey]),
                source: 'environment',
                overridenLayers,
            };
        }
        overridenLayers.push('environment');
        const deploymentOverride = this.getDeploymentOverride(key);
        if (deploymentOverride !== undefined) {
            return { value: deploymentOverride, source: 'deployment', overridenLayers };
        }
        overridenLayers.push('deployment');
        overridenLayers.push('tenant');
        const productKey = this.resolveRegisteredProductKey();
        if (productKey) {
            const product = (0, platform_identity_1.getRegisteredProduct)(productKey);
            if (product) {
                if (key === 'bootstrap.landing_page' && options?.roleCode) {
                    const landing = product.rbac?.roleLandings?.landingMap?.[options.roleCode];
                    if (landing) {
                        return { value: landing, source: 'product:rbac', overridenLayers };
                    }
                    const homeByRole = product.role_pack?.home_by_role?.[options.roleCode];
                    if (homeByRole) {
                        return { value: homeByRole, source: 'product:role_pack', overridenLayers };
                    }
                }
                if (key === 'bootstrap.dashboard_route' && options?.dashboardCode) {
                    const dashboardDefinitions = product.dashboard_definitions || [];
                    const dashboardDefinition = dashboardDefinitions.find((definition) => definition.dashboard_code === options.dashboardCode);
                    if (dashboardDefinition?.route) {
                        return {
                            value: dashboardDefinition.route,
                            source: 'product:dashboard_definitions',
                            overridenLayers,
                        };
                    }
                }
                if (key === 'registration.defaults' && product.registrationDefaults) {
                    return {
                        value: product.registrationDefaults,
                        source: 'product:registrationDefaults',
                        overridenLayers,
                    };
                }
                if (product.settings && product.settings[key] !== undefined) {
                    return {
                        value: product.settings[key],
                        source: 'product:settings',
                        overridenLayers,
                    };
                }
            }
        }
        overridenLayers.push('product');
        return {
            value: this.getPlatformDefault(key, options?.roleCode),
            source: 'platform',
            overridenLayers,
        };
    }
    static parseEnvValue(value) {
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
    static getDeploymentOverride(_key) {
        return undefined;
    }
    static getPlatformDefault(key, roleCode) {
        if (key === 'bootstrap.landing_page') {
            if (roleCode && ['tenant_admin', 'admin', 'platform_admin'].includes(roleCode)) {
                return '/app/admin';
            }
            return '/workspace-home';
        }
        const defaults = {
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
exports.UnifiedConfigService = UnifiedConfigService;
//# sourceMappingURL=unified-config.service.js.map