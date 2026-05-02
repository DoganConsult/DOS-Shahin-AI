import { Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
export declare function initializeHealthContext(pool: Pool, redis: Redis): void;
export declare function healthCheck(req: Request, res: Response): Promise<void>;
