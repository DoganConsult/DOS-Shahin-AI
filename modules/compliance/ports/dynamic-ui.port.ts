/**
 * Dynamic UI port — outbound interface to the Dynamic UI platform service.
 *
 * Dynamic UI owns: navigation resolution, route catalog, module enrollment
 * status, shell composition, route-permission gates, component registry.
 * Compliance does NOT write to dos.dynamic_ui_* directly at runtime — it
 * publishes its enrollment intent through this port (W1.5 seeds are the
 * static template; tenant enrollment goes through this port).
 *
 * The port stays narrow: read enrollment, refresh route catalog after
 * Compliance config changes, register the module's component catalog at boot.
 */

export type EnrollmentStatus = 'not_enrolled' | 'active' | 'unavailable' | 'blocked';

export interface ModuleEnrollment {
  tenantId: string;
  moduleCode: 'compliance';
  status: EnrollmentStatus;
  updatedAt?: Date;
}

export interface ComponentRegistration {
  componentKey: string;
  moduleCode: 'compliance';
  source: 'compliance-ui-library';
}

export interface RouteCatalogRefreshInput {
  tenantId?: string | null;
  moduleCode: 'compliance';
  reason: string;
}

export interface DynamicUiPort {
  /** Read this tenant's Compliance module enrollment status. */
  getEnrollment(tenantId: string): Promise<ModuleEnrollment>;
  /** Register the Compliance UI library's component allowlist at module boot. */
  registerComponents(components: ComponentRegistration[]): Promise<void>;
  /** Notify Dynamic UI that route catalog rows for Compliance changed. */
  invalidateRouteCatalog(input: RouteCatalogRefreshInput): Promise<void>;
}

const unbound = (name: string) => async () => {
  throw new Error(`[compliance] dynamic-ui port not bound: bindDynamicUiPort() before using ${name}`);
};

let _impl: DynamicUiPort = {
  getEnrollment: unbound('getEnrollment') as DynamicUiPort['getEnrollment'],
  registerComponents: unbound('registerComponents') as DynamicUiPort['registerComponents'],
  invalidateRouteCatalog: unbound('invalidateRouteCatalog') as DynamicUiPort['invalidateRouteCatalog'],
};

export function bindDynamicUiPort(impl: Partial<DynamicUiPort>): void {
  _impl = { ..._impl, ...impl };
}

export function getDynamicUiPort(): DynamicUiPort {
  return _impl;
}

export const getEnrollment: DynamicUiPort['getEnrollment'] = (tenantId) => _impl.getEnrollment(tenantId);
export const registerComponents: DynamicUiPort['registerComponents'] = (c) => _impl.registerComponents(c);
export const invalidateRouteCatalog: DynamicUiPort['invalidateRouteCatalog'] = (i) =>
  _impl.invalidateRouteCatalog(i);
