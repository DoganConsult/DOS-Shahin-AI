export interface AppErrorShape {
    statusCode: number;
    message: string;
    code: string;
    messageAr?: string;
    details?: unknown[];
}
export interface ValidationDetail {
    path: string;
    message: string;
    expected?: string;
}
export type HttpStatusCode = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503;
export interface ErrorEnvelope {
    success: false;
    error: string;
    message: string;
    statusCode: HttpStatusCode;
    correlationId?: string;
    details?: unknown[];
}
export declare function toErrorMessage(err: unknown): string;
