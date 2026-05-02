"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = hasPermission;
exports.hasRole = hasRole;
exports.hasAuthority = hasAuthority;
exports.getAllowedModules = getAllowedModules;
exports.getLandingPage = getLandingPage;
exports.isModuleVisible = isModuleVisible;
exports.getScopeBindings = getScopeBindings;
function hasPermission(snapshot, permissionCode) {
    return snapshot.effectivePermissions.includes(permissionCode);
}
function hasRole(snapshot, roleCode) {
    return snapshot.functionalRoles.includes(roleCode);
}
function hasAuthority(snapshot, authorityCode) {
    return snapshot.decisionAuthorities.includes(authorityCode);
}
function getAllowedModules(snapshot) {
    return snapshot.allowedModules;
}
function getLandingPage(snapshot) {
    return snapshot.landingHint.landingPage;
}
function isModuleVisible(snapshot, moduleCode) {
    return snapshot.allowedModules.includes(moduleCode);
}
function getScopeBindings(snapshot, roleCode) {
    if (!roleCode)
        return snapshot.scopeBindings;
    return snapshot.scopeBindings.filter(b => b.roleCode === roleCode);
}
//# sourceMappingURL=access-snapshot.contract.js.map