"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerContract = registerContract;
exports.getContract = getContract;
exports.listContracts = listContracts;
exports.addContractConsumer = addContractConsumer;
exports.validateContractPayload = validateContractPayload;
exports.validateContractRegistry = validateContractRegistry;
const observability_1 = require("@dos/platform-core/observability");
const _registry = new Map();
function registerContract(entry) {
    if (_registry.has(entry.contractId)) {
        observability_1.logger.warn(`[ContractRegistry] Overwriting contract: ${entry.contractId}`);
    }
    _registry.set(entry.contractId, entry);
}
function getContract(contractId) {
    return _registry.get(contractId);
}
function listContracts() {
    return Array.from(_registry.values());
}
function addContractConsumer(contractId, consumer) {
    const entry = _registry.get(contractId);
    if (entry && !entry.consumers.includes(consumer)) {
        entry.consumers.push(consumer);
    }
}
/**
 * Validate a payload against the Zod schema registered for a contract.
 * Returns validation result. Falls back to success if no Zod schema registered.
 */
function validateContractPayload(contractId, payload) {
    const entry = _registry.get(contractId);
    if (!entry) {
        return { success: false, errors: [`Unknown contract: '${contractId}'`] };
    }
    if (!entry.zodSchema) {
        // No schema registered — allow-all (schema-optional approach)
        return { success: true };
    }
    const result = entry.zodSchema.safeParse(payload);
    if (result.success)
        return { success: true };
    return {
        success: false,
        errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    };
}
function validateContractRegistry() {
    const errors = [];
    for (const [id, entry] of _registry) {
        if (!entry.versions.find(v => v.version === entry.currentVersion)) {
            errors.push(`Contract '${id}' currentVersion '${entry.currentVersion}' not found in versions array`);
        }
        const deprecated = entry.versions.filter(v => v.deprecated);
        for (const d of deprecated) {
            if (entry.consumers.length > 0 && d.version === entry.currentVersion) {
                errors.push(`Contract '${id}' current version is deprecated but has ${entry.consumers.length} consumer(s)`);
            }
        }
    }
    return errors;
}
registerContract({
    contractId: 'platform.event-bus',
    ownerModule: 'platform',
    description: 'Platform event bus publish/subscribe contract',
    currentVersion: '1.0.0',
    versions: [{ version: '1.0.0', deprecated: false }],
    consumers: ['workflow', 'notification', 'inbox', 'analytics'],
});
registerContract({
    contractId: 'platform.workflow-engine',
    ownerModule: 'workflow',
    description: 'Workflow state machine contract for step-based processes',
    currentVersion: '1.0.0',
    versions: [{ version: '1.0.0', deprecated: false }],
    consumers: ['governance', 'risk', 'compliance', 'evidence', 'audit', 'remediation'],
});
registerContract({
    contractId: 'platform.rule-engine',
    ownerModule: 'platform',
    description: 'Generic rule evaluation engine',
    currentVersion: '1.0.0',
    versions: [{ version: '1.0.0', deprecated: false }],
    consumers: ['risk', 'compliance', 'evidence', 'vendor'],
});
registerContract({
    contractId: 'platform.graph-backend',
    ownerModule: 'platform',
    description: 'Apache AGE graph relationship layer',
    currentVersion: '1.0.0',
    versions: [{ version: '1.0.0', deprecated: false }],
    consumers: ['foundation', 'governance', 'risk', 'compliance'],
});
registerContract({
    contractId: 'platform.auth',
    ownerModule: 'foundation',
    description: 'JWT authentication and identity resolution',
    currentVersion: '1.0.0',
    versions: [{ version: '1.0.0', deprecated: false }],
    consumers: ['*'],
});
registerContract({
    contractId: 'platform.rbac',
    ownerModule: 'foundation',
    description: 'Role-based access control with permission families',
    currentVersion: '2.0.0',
    versions: [
        { version: '1.0.0', deprecated: true, removedAt: '2.0.0' },
        { version: '2.0.0', deprecated: false },
    ],
    consumers: ['*'],
});
registerContract({
    contractId: 'platform.openfga',
    ownerModule: 'platform',
    description: 'Fine-grained authorization via OpenFGA',
    currentVersion: '1.0.0',
    versions: [{ version: '1.0.0', deprecated: false }],
    consumers: ['governance', 'risk', 'audit', 'vendor'],
});
registerContract({
    contractId: 'platform.audit-trail',
    ownerModule: 'platform',
    description: 'Immutable audit trail for all module actions',
    currentVersion: '1.0.0',
    versions: [{ version: '1.0.0', deprecated: false }],
    consumers: ['*'],
});
registerContract({
    contractId: 'platform.notification',
    ownerModule: 'notification',
    description: 'Multi-channel notification delivery',
    currentVersion: '1.0.0',
    versions: [{ version: '1.0.0', deprecated: false }],
    consumers: ['workflow', 'governance', 'risk', 'compliance', 'evidence', 'audit'],
});
registerContract({
    contractId: 'platform.task-engine',
    ownerModule: 'platform',
    description: 'Human-in-the-loop task submission and handler registration',
    currentVersion: '1.0.0',
    versions: [{ version: '1.0.0', deprecated: false }],
    consumers: ['governance', 'risk', 'compliance', 'evidence', 'audit', 'vendor', 'incident', 'training'],
});
registerContract({
    contractId: 'platform.form-engine',
    ownerModule: 'platform',
    description: 'Schema-driven dynamic form registry and renderer API',
    currentVersion: '1.0.0',
    versions: [{ version: '1.0.0', deprecated: false }],
    consumers: ['governance', 'risk', 'compliance', 'controls', 'evidence', 'audit', 'vendor'],
});
registerContract({
    contractId: 'platform.state-machine',
    ownerModule: 'platform',
    description: 'Generic entity state transition dispatcher with event emission',
    currentVersion: '1.0.0',
    versions: [{ version: '1.0.0', deprecated: false }],
    consumers: ['risk', 'controls', 'governance', 'workflow', 'evidence'],
});
//# sourceMappingURL=contract-registry.js.map