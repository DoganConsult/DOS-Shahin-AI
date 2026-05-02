import { Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import * as os from 'os';

// Configured externally per service
let pgPool: Pool | null = null;
let redisClient: Redis | null = null;

export function initializeHealthContext(pool: Pool, redis: Redis) {
  pgPool = pool;
  redisClient = redis;
}

export async function healthCheck(req: Request, res: Response) {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    git_sha: process.env.GIT_COMMIT_SHA || 'unknown',
    last_deploy: process.env.LAST_DEPLOY_TIME || 'unknown',
    system: {
      load: os.loadavg(),
      memory_free: os.freemem(),
      memory_total: os.totalmem()
    },
    dependencies: {
      database: 'unknown',
      redis: 'unknown'
    },
    tracing: {
      sampled: process.env.OTEL_TRACING_ENABLED === 'true',
      success_rate: '10%',
      error_rate: '100% (Forced)'
    }
  };

  try {
    if (pgPool) {
      await pgPool.query('SELECT 1');
      health.dependencies.database = 'connected';
    } else {
      health.dependencies.database = 'unconfigured';
    }

    if (redisClient) {
      await redisClient.ping();
      health.dependencies.redis = 'connected';
    } else {
      health.dependencies.redis = 'unconfigured';
    }

    res.status(200).json(health);
  } catch (error) {
    health.status = 'degraded';
    if (error instanceof Error) {
        health.dependencies.database = error.message; 
    }
    
    // Push manual error spans if open-telemetry is running for 100% mapping tracking
    const spanHeader = req.headers['x-b3-traceid'];
    if (spanHeader) {
      // Logic pushing failing dependency span to tracer interface would exist here
    }

    res.status(503).json(health);
  }
}
