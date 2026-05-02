import { z } from 'zod';
export interface ContractVersion {
    version: string;
    deprecated: boolean;
    removedAt?: string;
}
export interface ContractEntry {
    contractId: string;
    ownerModule: string;
    description: string;
    currentVersion: string;
    versions: ContractVersion[];
    /** Optional Zod schema for runtime payload validation */
    zodSchema?: z.ZodTypeAny;
    /** Legacy JSON Schema (kept for backward compatibility) */
    schema?: Record<string, unknown>;
    consumers: string[];
}
export declare function registerContract(entry: ContractEntry): void;
export declare function getContract(contractId: string): ContractEntry | undefined;
export declare function listContracts(): ContractEntry[];
export declare function addContractConsumer(contractId: string, consumer: string): void;
/**
 * Validate a payload against the Zod schema registered for a contract.
 * Returns validation result. Falls back to success if no Zod schema registered.
 */
export declare function validateContractPayload(contractId: string, payload: unknown): {
    success: boolean;
    errors?: string[];
};
export declare function validateContractRegistry(): string[];
