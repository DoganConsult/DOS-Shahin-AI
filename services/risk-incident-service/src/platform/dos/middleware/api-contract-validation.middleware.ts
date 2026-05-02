import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '@dos/module-sdk';

export interface ContractValidationOptions {
  strict?: boolean;
  allowUnknownQueryParams?: boolean;
  requiredHeaders?: string[];
  maxBodySizeBytes?: number;
  logViolations?: boolean;
  // Phase 0.5: legacy options accepted by per-module api-contract middleware.
  // They are currently unused by the validator itself; Wave 2 will wire them
  // back once the openapi/schema plumbing returns to the risk service.
  moduleCode?: string;
  apiVersion?: string;
  requireAuth?: boolean;
  validateRequest?: boolean;
  validateResponse?: boolean;
  openApiSpecPath?: string;
  requestSchemaPath?: string;
  responseSchemaPath?: string;
}

function sendValidationError(res: Response, message: string, details?: unknown): void {
  res.status(400).json({
    error: 'CONTRACT_VIOLATION',
    message,
    details,
  });
}

export function createApiContractValidation(options: ContractValidationOptions = {}): RequestHandler {
  const {
    strict = false,
    allowUnknownQueryParams = true,
    requiredHeaders = [],
    maxBodySizeBytes = 10 * 1024 * 1024,
    logViolations = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      for (const header of requiredHeaders) {
        if (!req.headers[header.toLowerCase()]) {
          if (logViolations) {
            logger.warn('[ContractValidation] missing required header', { path: req.path, header });
          }
          sendValidationError(res, `Required header '${header}' is missing`);
          return;
        }
      }

      const contentLength = parseInt(req.headers['content-length'] ?? '0', 10);
      if (!isNaN(contentLength) && contentLength > maxBodySizeBytes) {
        if (logViolations) {
          logger.warn('[ContractValidation] body too large', { path: req.path, contentLength, maxBodySizeBytes });
        }
        res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds maximum allowed size' });
        return;
      }

      if (strict && !allowUnknownQueryParams) {
        const knownParams = ['page', 'limit', 'offset', 'sort', 'order', 'search', 'filter', 'tenant_id'];
        const unknownParams = Object.keys(req.query).filter((k) => !knownParams.includes(k));
        if (unknownParams.length > 0) {
          if (logViolations) {
            logger.warn('[ContractValidation] unknown query params', { path: req.path, unknownParams });
          }
          sendValidationError(res, 'Unknown query parameters', { unknownParams });
          return;
        }
      }

      next();
    } catch (err) {
      logger.error('[ContractValidation] middleware error', { err, path: req.path });
      next(err);
    }
  };
}
