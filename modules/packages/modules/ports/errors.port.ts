export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(400, message);
    this.name = 'ValidationError';
  }
}

export function sendError(res: any, ...args: any[]): void {
  const statusCode = typeof args[0] === 'number' ? args[0] : 500;
  const message = typeof args[0] === 'string' ? args[0] : (args[1] || 'Error');
  res.status(statusCode).json({ success: false, error: message, statusCode });
}

export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
