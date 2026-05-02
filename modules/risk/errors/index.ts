export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  readonly resource?: string;
  readonly resourceId?: string;
  constructor(resourceOrMessage: string, id?: string) {
    super(id !== undefined ? `${resourceOrMessage} not found: ${id}` : resourceOrMessage);
    this.name = 'NotFoundError';
    if (id !== undefined) {
      this.resource = resourceOrMessage;
      this.resourceId = id;
    }
  }
}

