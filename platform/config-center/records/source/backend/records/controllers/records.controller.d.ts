import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
export declare function listRecords(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function getRecordById(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function createRecord(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function updateRecord(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function deleteRecord(req: AuthenticatedRequest, res: Response): Promise<void>;
