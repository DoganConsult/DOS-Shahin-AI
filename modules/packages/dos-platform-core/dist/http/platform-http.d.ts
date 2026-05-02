import { Request, Response, NextFunction } from 'express';
type Middleware = (req: Request, res: Response, next: NextFunction) => void;
export interface PlatformHttp {
    notifyDomainChange(tenantId: string, module: string, action: 'create' | 'update' | 'delete', entityId: string): void;
    scopeContext?: Middleware;
    lifecycleGate?: (configOrModule?: string | {
        blockedStates?: string[];
        entityParam?: string;
        statusColumn?: string;
    }) => Middleware;
    moduleStack?: (moduleCode: string) => Middleware;
    auditMiddleware?: (actionCode?: string) => Middleware;
    setAuditData?: (req: Request, data: Record<string, unknown>) => void;
    automationMiddleware?: (triggerCode?: string) => Middleware;
    requireOwnership?: (ownerField?: string) => Middleware;
    fieldRbac?: (config?: {
        module?: string;
        sensitiveFields?: string[];
    }) => Middleware;
    mandatoryFields?: (...fields: string[]) => Middleware;
    rateLimiter?: (options?: {
        limit?: number;
        window?: number;
    }) => Middleware;
    enforceMandatoryFields?: (...fields: string[]) => Middleware;
    enforceStageGates?: (...stages: string[]) => Middleware;
}
export declare function setPlatformHttp(impl: PlatformHttp): void;
export declare function notifyD(tenantId: string, module: string, action: 'create' | 'update' | 'delete', entityId: string): void;
export declare function scopeContext(req: Request, res: Response, next: NextFunction): void;
export declare function lifecycleGate(configOrModule?: string | {
    blockedStates?: string[];
    entityParam?: string;
    statusColumn?: string;
}): Middleware;
export declare function moduleStack(moduleCode: string): Middleware;
export declare function auditMiddleware(actionCode?: string): Middleware;
export declare function setAuditData(req: Request, data: Record<string, unknown>): void;
export declare function automationMiddleware(triggerCode?: string): Middleware;
export declare function requireOwnership(ownerField?: string): Middleware;
export declare function fieldRbac(config?: {
    module?: string;
    sensitiveFields?: string[];
}): Middleware;
export declare function mandatoryFields(...fields: string[]): Middleware;
export declare function rateLimiter(options?: {
    limit?: number;
    window?: number;
}): Middleware;
export declare function enforceMandatoryFields(...fields: string[]): Middleware;
export declare function enforceStageGates(...stages: string[]): Middleware;
export {};
