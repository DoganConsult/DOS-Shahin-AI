"use strict";
/**
 * Contract Auto-Discovery Service — A3
 *
 * Replaces the hardcoded `consumers` arrays in contract-registry.ts `registerContract()` calls.
 *
 * At platform startup, this service:
 * 1. Reads all registered module manifests (via module-registry)
 * 2. For each module that declares `usedContracts`, calls `addContractConsumer()`
 *    on the contract registry for each contract ID
 * 3. Logs a summary of consumers registered per contract
 *
 * This eliminates drift: the manifest is the single source of truth for
 * which module depends on which contract. No manual list to maintain in
 * the registry itself.
 *
 * @owner DOS Platform
 * @since 2026-04-07
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runContractAutoDiscovery = runContractAutoDiscovery;
const observability_1 = require("@dos/platform-core/observability");
const contract_registry_1 = require("./contract-registry");
const module_sdk_1 = require("@dos/module-sdk");
/**
 * Run contract auto-discovery at startup.
 * Reads all module manifests' `usedContracts` fields and registers them
 * with the contract registry — no hardcoded consumer lists needed.
 */
function runContractAutoDiscovery() {
    const modules = [...(0, module_sdk_1.getAllManifests)().values()];
    const knownContractIds = new Set((0, contract_registry_1.listContracts)().map((c) => c.contractId));
    const unknownContracts = [];
    const details = {};
    let consumersRegistered = 0;
    const contractsUpdated = new Set();
    for (const manifest of modules) {
        if (!manifest.usedContracts || manifest.usedContracts.length === 0)
            continue;
        for (const contractId of manifest.usedContracts) {
            if (!knownContractIds.has(contractId)) {
                if (!unknownContracts.includes(contractId)) {
                    unknownContracts.push(contractId);
                    observability_1.logger.warn(`[ContractAutoDiscovery] Module '${manifest.code}' references unknown contract '${contractId}' — ` +
                        `register it in contract-registry.ts or update the manifest`);
                }
                continue;
            }
            (0, contract_registry_1.addContractConsumer)(contractId, String(manifest.code));
            consumersRegistered++;
            contractsUpdated.add(contractId);
            if (!details[contractId])
                details[contractId] = [];
            details[contractId].push(String(manifest.code));
        }
    }
    const result = {
        contractsUpdated: contractsUpdated.size,
        consumersRegistered,
        unknownContracts,
        details,
    };
    if (consumersRegistered > 0) {
        observability_1.logger.info(`[ContractAutoDiscovery] Registered ${consumersRegistered} consumer(s) across ${contractsUpdated.size} contract(s) from ${modules.length} module manifest(s)`, { contractsUpdated: [...contractsUpdated] });
    }
    if (unknownContracts.length > 0) {
        observability_1.logger.warn(`[ContractAutoDiscovery] ${unknownContracts.length} unknown contract reference(s) found — update manifests or register contracts`, { unknownContracts });
    }
    return result;
}
//# sourceMappingURL=contract-auto-discovery.js.map