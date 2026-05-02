import { Request, Response, NextFunction } from 'express';
type DbPort = {
    safeQuery: (sql: string, params?: unknown[]) => Promise<any>;
    tenantSchema: (tenantId: string) => string;
};
export declare function setAuditDbPort(port: DbPort): void;
export declare function auditMiddleware(actionCode?: string): (req: Request, res: Response, next: NextFunction) => void;
export declare function setAuditData(res: Response, data: {
    action: string;
    entityType: string;
    entityId?: string;
    beforeState?: unknown;
    afterState?: unknown;
}): void;
export declare function requestLogger(..._args: unknown[]): (req: Request, res: Response, next: NextFunction) => void;
export declare function localKnowledgeAccessLogMiddleware(_req: Request, _res: Response, next: NextFunction): void;
export {};
