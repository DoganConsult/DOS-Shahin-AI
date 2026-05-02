import type { Request, Response, NextFunction, RequestHandler } from 'express';
import * as crypto from 'crypto';

const SERVICE_SECRET = process.env.INTER_SERVICE_SECRET || process.env.JWT_SECRET || '';
const ALLOWED_SERVICES = new Set((process.env.ALLOWED_SERVICE_CALLERS || '').split(',').filter(Boolean));

export interface InterServiceToken {
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

export function generateServiceToken(sourceService: string, targetService: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: InterServiceToken = {
    iss: sourceService,
    aud: targetService,
    iat: now,
    exp: now + 300,
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SERVICE_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyServiceToken(token: string): InterServiceToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expected = crypto
      .createHmac('sha256', SERVICE_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (signature !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as InterServiceToken;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function interServiceGuard(thisService: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!SERVICE_SECRET) { next(); return; }

    const svcToken = req.headers['x-service-token'] as string | undefined;
    if (!svcToken) { next(); return; }

    const payload = verifyServiceToken(svcToken);
    if (!payload) {
      res.status(403).json({ error: 'Invalid service token', code: 'INVALID_SERVICE_TOKEN' });
      return;
    }

    if (payload.aud !== thisService && payload.aud !== '*') {
      res.status(403).json({ error: 'Service token audience mismatch', code: 'SERVICE_TOKEN_AUDIENCE_MISMATCH' });
      return;
    }

    if (ALLOWED_SERVICES.size > 0 && !ALLOWED_SERVICES.has(payload.iss)) {
      res.status(403).json({ error: 'Service not in allowed callers list', code: 'SERVICE_NOT_ALLOWED' });
      return;
    }

    if (SERVICE_SECRET && req.headers['x-body-signature'] && req.body) {
      const expectedSig = crypto
        .createHmac('sha256', SERVICE_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex')
        .slice(0, 32);
      if (req.headers['x-body-signature'] !== expectedSig) {
        res.status(403).json({ error: 'Body signature mismatch', code: 'BODY_SIGNATURE_MISMATCH' });
        return;
      }
    }

    (req as any).callingService = payload.iss;
    next();
  };
}

export function requireServiceToken(thisService: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!SERVICE_SECRET) { next(); return; }

    const svcToken = req.headers['x-service-token'] as string | undefined;
    if (!svcToken) {
      res.status(401).json({ error: 'Service token required', code: 'SERVICE_TOKEN_REQUIRED' });
      return;
    }

    const payload = verifyServiceToken(svcToken);
    if (!payload) {
      res.status(403).json({ error: 'Invalid service token', code: 'INVALID_SERVICE_TOKEN' });
      return;
    }

    if (payload.aud !== thisService && payload.aud !== '*') {
      res.status(403).json({ error: 'Service token audience mismatch', code: 'SERVICE_TOKEN_AUDIENCE_MISMATCH' });
      return;
    }

    (req as any).callingService = payload.iss;
    next();
  };
}
