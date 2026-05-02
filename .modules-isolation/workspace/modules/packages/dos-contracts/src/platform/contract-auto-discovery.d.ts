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
export interface ContractDiscoveryResult {
    contractsUpdated: number;
    consumersRegistered: number;
    unknownContracts: string[];
    details: Record<string, string[]>;
}
/**
 * Run contract auto-discovery at startup.
 * Reads all module manifests' `usedContracts` fields and registers them
 * with the contract registry — no hardcoded consumer lists needed.
 */
export declare function runContractAutoDiscovery(): ContractDiscoveryResult;
