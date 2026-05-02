"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_DEPRECATION_POLICY = void 0;
exports.negotiateVersion = negotiateVersion;
exports.validateDeprecation = validateDeprecation;
exports.DEFAULT_DEPRECATION_POLICY = {
    minDeprecationNoticeMs: 90 * 24 * 60 * 60 * 1000,
    sunsetGracePeriodMs: 180 * 24 * 60 * 60 * 1000,
    requireMigrationGuide: true,
    notifyOnDeprecatedUsage: true,
};
function negotiateVersion(contract, requestedVersion) {
    const warnings = [];
    if (requestedVersion) {
        const entry = contract.versions.find(v => v.version === requestedVersion);
        if (entry) {
            if (entry.status === 'sunset') {
                const current = contract.versions.find(v => v.status === 'current');
                return {
                    resolvedVersion: current?.version || entry.version,
                    requestedVersion,
                    isDeprecated: false,
                    warnings: [`Version ${requestedVersion} has been sunset. Upgraded to ${current?.version || 'latest'}.`],
                };
            }
            if (entry.status === 'deprecated') {
                warnings.push(`Version ${requestedVersion} is deprecated. Please migrate to a current version.`);
            }
            return {
                resolvedVersion: entry.version,
                requestedVersion,
                isDeprecated: entry.status === 'deprecated',
                warnings,
            };
        }
        warnings.push(`Requested version ${requestedVersion} not found. Falling back to current.`);
    }
    const current = contract.versions.find(v => v.status === 'current');
    if (!current) {
        const latest = contract.versions[contract.versions.length - 1];
        return {
            resolvedVersion: latest?.version || '1',
            requestedVersion,
            isDeprecated: latest?.status === 'deprecated',
            warnings: [...warnings, 'No current version found.'],
        };
    }
    return {
        resolvedVersion: current.version,
        requestedVersion,
        isDeprecated: false,
        warnings,
    };
}
function validateDeprecation(entry, deprecationDate, policy = exports.DEFAULT_DEPRECATION_POLICY) {
    const errors = [];
    if (entry.status === 'deprecated') {
        if (policy.requireMigrationGuide && !entry.migrationGuide) {
            errors.push(`Version ${entry.version}: deprecation requires a migration guide.`);
        }
    }
    return errors;
}
//# sourceMappingURL=versioning.js.map