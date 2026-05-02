import { Request, Response, NextFunction } from 'express';
export declare function fieldRbac(config?: {
    module?: string;
    sensitiveFields?: string[];
}): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function fieldRbacFilter(moduleCode?: string): (req: Request, res: Response, next: NextFunction) => void;
