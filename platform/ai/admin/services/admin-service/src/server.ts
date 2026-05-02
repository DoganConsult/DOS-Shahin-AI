import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { routes } from './routes/index';
import pm2Dashboard from './routes/pm2-dashboard.routes';
import { authenticate, errorHandler, requirePlatformAdmin, requireMutationAllowed, AdminRequest } from './middleware';
import { pool } from './db';

const SERVICE_CODE = 'platform-admin-service';
const PORT = Number(process.env.PORT || 4080);

const app = express();
app.set('trust proxy', 1);

const origins = (process.env.ADMIN_CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:4200').split(',');
app.use(cors({ origin: origins, credentials: true, allowedHeaders: ['Content-Type','Authorization','X-Api-Key','X-Csrf','X-Requested-With','X-Tenant-Id','X-User-Id','X-Roles'] }));
app.use(express.json({ limit: '2mb' }));

const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'rate_limited' },
});

// public health (no auth)
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: SERVICE_CODE });
  } catch (e: any) {
    res.status(503).json({ status: 'unhealthy', service: SERVICE_CODE, error: e.message });
  }
});

// PM2 Dashboard — mounted OUTSIDE the platform JWT layer (its own HTTP Basic
// gate from PM2_DASHBOARD_USER/PASS). Public URL via gateway/nginx:
//   https://shahin-ai.com/admin/pm2/
// Mirrors the langfuse mount pattern so the fleet board stays reachable
// even when KC / DAuth is degraded — exactly when it is needed most.
app.use('/admin/pm2', pm2Dashboard);

// authenticated + authorized API
app.use('/api/admin', authenticate, requirePlatformAdmin, requireMutationAllowed, writeLimiter, routes);

// expose current identity for FE bootstrapping
app.get('/api/admin/whoami', authenticate, (req: AdminRequest, res: Response) => {
  res.json({ data: req.actor });
});

app.use(errorHandler);

app.listen(PORT, () => {
  // Startup signal — intentional console output, no structured logger available at this scope.
  console.log(`[${SERVICE_CODE}] listening on :${PORT} (origins=${origins.join(',')}, dev_headers=${process.env.ADMIN_ALLOW_DEV_HEADERS === '1'})`);
});
