let _tenancy = null;
export function setTenancyHandler(impl) {
    _tenancy = impl;
}
export async function getProvisionedTenants() {
    if (!_tenancy) {
        throw new Error('PlatformTenancy not initialized. Call setTenancyHandler() first.');
    }
    return _tenancy.getProvisionedTenants();
}
//# sourceMappingURL=tenancy.js.map