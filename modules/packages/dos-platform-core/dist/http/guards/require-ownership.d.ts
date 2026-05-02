import { Request, Response, NextFunction } from 'express';
export declare function requireOwnership(ownerField?: string): (req: Request, res: Response, next: NextFunction) => void;
