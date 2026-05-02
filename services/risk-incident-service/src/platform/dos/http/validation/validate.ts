/**
 * Zod-based request validation middleware.
 *
 * Validates `req.body` against the provided Zod schema. On failure it returns
 * HTTP 422 with a structured errors array so the client knows exactly which
 * fields were invalid. On success it attaches the parsed (coerced) body back
 * to `req.body` and calls `next()`.
 *
 * Usage:
 *   router.post('/risks', validate(createRiskSchema), handler);
 */
import { type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { type ZodTypeAny, ZodError } from 'zod';

export function validate(schema: ZodTypeAny): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      res.status(422).json({ error: 'Validation failed', errors });
      return;
    }
    req.body = result.data;
    next();
  };
}
