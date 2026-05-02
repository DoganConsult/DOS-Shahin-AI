export interface ProductProvisioningContext {
  tenantId: string;
  tenantCode?: string;
  productKey: string;
  productCode?: string;
  requestedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface ProductBootstrapHook {
  productKey: string;
  productName: string;
  onProvision: (context: ProductProvisioningContext) => Promise<void>;
}

const _hooks = new Map<string, ProductBootstrapHook>();

export function registerProductBootstrapHook(hook: ProductBootstrapHook): void {
  _hooks.set(hook.productKey, hook);
}

export function getProductBootstrapHook(productKey: string): ProductBootstrapHook | undefined {
  return _hooks.get(productKey);
}

export function listProductBootstrapHooks(): ProductBootstrapHook[] {
  return [..._hooks.values()];
}

