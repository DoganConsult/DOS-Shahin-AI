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

import { logger } from '@dos/platform-core/observability';
import { addContractConsumer, listContracts } from './contract-registry';
import { getAllManifests } from '@dos/module-sdk';

export interface ContractDiscoveryResult {
  contractsUpdated: number;
  consumersRegistered: number;
  unknownContracts: string[];
  details: Record<string, string[]>; // contractId → [modules that consume it]
}

/**
 * Run contract auto-discovery at startup.
 * Reads all module manifests' `usedContracts` fields and registers them
 * with the contract registry — no hardcoded consumer lists needed.
 */
export function runContractAutoDiscovery(): ContractDiscoveryResult {
  const modules = [...getAllManifests().values()];
  const knownContractIds = new Set(listContracts().map((c) => c.contractId));
  const unknownContracts: string[] = [];
  const details: Record<string, string[]> = {};
  let consumersRegistered = 0;
  const contractsUpdated = new Set<string>();

  for (const manifest of modules) {
    if (!manifest.usedContracts || manifest.usedContracts.length === 0) continue;

    for (const contractId of manifest.usedContracts) {
      if (!knownContractIds.has(contractId)) {
        if (!unknownContracts.includes(contractId)) {
          unknownContracts.push(contractId);
          logger.warn(
            `[ContractAutoDiscovery] Module '${manifest.code}' references unknown contract '${contractId}' — ` +
              `register it in contract-registry.ts or update the manifest`,
          );
        }
        continue;
      }

      addContractConsumer(contractId, String(manifest.code));
      consumersRegistered++;
      contractsUpdated.add(contractId);

      if (!details[contractId]) details[contractId] = [];
      details[contractId].push(String(manifest.code));
    }
  }

  const result: ContractDiscoveryResult = {
    contractsUpdated: contractsUpdated.size,
    consumersRegistered,
    unknownContracts,
    details,
  };

  if (consumersRegistered > 0) {
    logger.info(
      `[ContractAutoDiscovery] Registered ${consumersRegistered} consumer(s) across ${contractsUpdated.size} contract(s) from ${modules.length} module manifest(s)`,
      { contractsUpdated: [...contractsUpdated] },
    );
  }

  if (unknownContracts.length > 0) {
    logger.warn(
      `[ContractAutoDiscovery] ${unknownContracts.length} unknown contract reference(s) found — update manifests or register contracts`,
      { unknownContracts },
    );
  }

  return result;
}
