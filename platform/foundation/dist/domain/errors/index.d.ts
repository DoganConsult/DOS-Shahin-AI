export declare class DomainError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status?: number);
}
export declare const ValidationError: typeof DomainError;
export declare class NotFoundError extends DomainError {
    constructor(entityType: string, idOrMsg?: string);
}
export default DomainError;
