"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTenancyHandler = setTenancyHandler;
exports.getProvisionedTenants = getProvisionedTenants;
let _tenancy = null;
function setTenancyHandler(impl) {
    _tenancy = impl;
}
async function getProvisionedTenants() {
    if (!_tenancy) {
        throw new Error('PlatformTenancy not initialized. Call setTenancyHandler() first.');
    }
    return _tenancy.getProvisionedTenants();
}
//# sourceMappingURL=tenancy.js.map