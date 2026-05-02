export class DomainError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export const ValidationError = DomainError;
export class NotFoundError extends DomainError {
  constructor(entityType: string, idOrMsg?: string) {
    super('NOT_FOUND', idOrMsg ? `${entityType} ${idOrMsg} not found` : entityType, 404);
  }
}
export default DomainError;
