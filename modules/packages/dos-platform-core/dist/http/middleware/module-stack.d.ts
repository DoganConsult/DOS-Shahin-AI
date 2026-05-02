import { Request, Response, NextFunction } from 'express';
export type SupportedLang = 'en' | 'ar';
export declare function moduleStack(moduleCode: string): (req: Request, _res: Response, next: NextFunction) => void;
type DbPort = {
    safeQuery: (sql: string, params?: unknown[]) => Promise<any>;
};
export declare function setModuleStackDbPort(port: DbPort): void;
export declare function blockInHumanOnlyMode(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function requireHybridOrHigher(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function i18nMiddleware(): (req: Request, _res: Response, next: NextFunction) => void;
export declare function apiVersionMiddleware(req: Request, res: Response, next: NextFunction): void;
export {};
