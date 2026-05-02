export declare class AppError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ValidationError extends AppError {
    constructor(message?: string);
}
export declare function sendError(res: any, ...args: any[]): void;
export declare function toErrorMessage(err: unknown): string;
