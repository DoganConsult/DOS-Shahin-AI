import type { Response } from 'express';
export declare function escapeCsv(v: unknown): string;
export declare function sendCsv(res: Response, filename: string, columns: string[], rows: any[]): void;
