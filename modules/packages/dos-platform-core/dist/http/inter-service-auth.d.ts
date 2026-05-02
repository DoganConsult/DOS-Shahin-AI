import type { RequestHandler } from 'express';
export interface InterServiceToken {
    iss: string;
    aud: string;
    iat: number;
    exp: number;
}
export declare function generateServiceToken(sourceService: string, targetService: string): string;
export declare function interServiceGuard(thisService: string): RequestHandler;
export declare function requireServiceToken(thisService: string): RequestHandler;
