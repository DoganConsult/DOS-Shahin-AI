import { Request, Response, NextFunction } from 'express';

const IDEMPOTENCY_HEADER = 'idempotency-key';

export interface IdempotencyOptions {
  ttlMs?: number;
  headerName?: string;
  requiredForMethods?: string[];
  keyPrefix?: string;
}

interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  completedAt: string;
}

type IdempotencyState = 'processing' | 'completed';

interface IdempotencyEntry {
  state: IdempotencyState;
  response?: CachedResponse;
  createdAt: number;
}

const memoryStore = new Map<string, IdempotencyEntry>();

let _redis: any = null;
let _redisAvailable = false;

function getRedisClient(): any {
  if (_redis !== null) return _redisAvailable ? _redis : null;
  try {
    const { getRedis, redisConnected } = require('@dos/db');
    _redis = getRedis();
    _redisAvailable = redisConnected();
    return _redisAvailable ? _redis : null;
  } catch {
    _redis = false;
    _redisAvailable = false;
    return null;
  }
}

const DEFAULT_OPTIONS: Required<IdempotencyOptions> = {
  ttlMs: 24 * 60 * 60 * 1000,
  headerName: IDEMPOTENCY_HEADER,
  requiredForMethods: ['POST', 'PUT', 'PATCH'],
  keyPrefix: 'idem:http:',
};

export function idempotencyMiddleware(options?: IdempotencyOptions) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!opts.requiredForMethods.includes(req.method)) {
      next();
      return;
    }

    const idempotencyKey = req.headers[opts.headerName] as string | undefined;

    if (!idempotencyKey) {
      next();
      return;
    }

    if (idempotencyKey.length < 8 || idempotencyKey.length > 256) {
      res.status(400).json({
        error: 'Invalid idempotency key',
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency key must be between 8 and 256 characters',
      });
      return;
    }

    const tenantId = (req as any).user?.tenantId || req.headers['x-tenant-id'] || 'global';
    const fullKey = `${opts.keyPrefix}${tenantId}:${req.method}:${req.path}:${idempotencyKey}`;

    const existing = await getEntry(fullKey);

    if (existing) {
      if (existing.state === 'processing') {
        res.status(409).json({
          error: 'Request is already being processed',
          code: 'IDEMPOTENCY_CONFLICT',
          idempotencyKey,
        });
        return;
      }

      if (existing.state === 'completed' && existing.response) {
        res.setHeader('x-idempotency-replayed', 'true');
        for (const [key, value] of Object.entries(existing.response.headers)) {
          res.setHeader(key, value);
        }
        res.status(existing.response.status).json(existing.response.body);
        return;
      }
    }

    await setEntry(fullKey, { state: 'processing', createdAt: Date.now() }, opts.ttlMs);

    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const cached: CachedResponse = {
        status: res.statusCode,
        headers: {
          'content-type': 'application/json',
        },
        body,
        completedAt: new Date().toISOString(),
      };

      setEntry(fullKey, { state: 'completed', response: cached, createdAt: Date.now() }, opts.ttlMs)
        .catch(() => {});

      return originalJson(body);
    };

    const cleanup = () => {
      deleteEntry(fullKey).catch(() => {});
    };

    res.on('close', () => {
      if (!res.writableEnded) cleanup();
    });

    next();
  };
}

async function getEntry(key: string): Promise<IdempotencyEntry | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      // fall through to memory
    }
  }

  const entry = memoryStore.get(key);
  return entry || null;
}

async function setEntry(key: string, entry: IdempotencyEntry, ttlMs: number): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(entry), 'PX', ttlMs);
      return;
    } catch {
      // fall through to memory
    }
  }

  memoryStore.set(key, entry);
  setTimeout(() => memoryStore.delete(key), ttlMs).unref();
}

async function deleteEntry(key: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch {
      // fall through
    }
  }
  memoryStore.delete(key);
}
