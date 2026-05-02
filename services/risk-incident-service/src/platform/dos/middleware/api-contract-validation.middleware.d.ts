import type { RequestHandler } from 'express';
export interface ContractValidationOptions {
    strict?: boolean;
    allowUnknownQueryParams?: boolean;
    requiredHeaders?: string[];
    maxBodySizeBytes?: number;
    logViolations?: boolean;
}
export declare function createApiContractValidation(options?: ContractValidationOptions): RequestHandler;
