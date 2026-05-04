import { Router, type Request, type Response, type NextFunction } from 'express';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { URL } from 'node:url';
import { authWhoami } from '../lib/dos-master-evidence.js';

/** DOS Master Phase 2 — admin-console-bff → data-governance-os-service proxy.
 *  Doctrine: Article 4 (admin BFF mediates every admin-FE call). */
export const dataGovernanceOsProxyRouter = Router();

const TARGET = process.env.DOS_DATA_GOVERNANCE_OS_SERVICE_URL || 'http://127.0.0.1:4022';

function readToken(req: Request): string | null {
  const h = req.header('authorization') ?? '';
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim();
  const c = req.header('x-dos-admin-token');
  return c ? String(c) : null;
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = readToken(req);
  if (!token) { res.status(401).json({ error: 'token_required' }); return; }
  const who = await authWhoami(token);
  if (!who) { res.status(401).json({ error: 'invalid_or_expired_token' }); return; }
  (req as Request & { admin?: unknown }).admin = who;
  next();
}

function forward(req: Request, res: Response): void {
  const url = new URL(`${TARGET}/api/admin/data-governance-os${req.url}`);
  const lib = url.protocol === 'https:' ? httpsRequest : httpRequest;
  const upstream = lib({
    protocol: url.protocol, hostname: url.hostname, port: url.port,
    path: url.pathname + url.search, method: req.method,
    headers: { 'content-type': req.header('content-type') ?? 'application/json', accept: 'application/json' },
  }, (r) => {
    res.status(r.statusCode ?? 502);
    const ct = r.headers['content-type']; if (ct) res.setHeader('content-type', String(ct));
    r.pipe(res);
  });
  upstream.on('error', (e) => res.status(502).json({ error: 'data-governance-os_upstream_error', detail: String(e.message) }));
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') upstream.write(JSON.stringify(req.body ?? {}));
  upstream.end();
}

dataGovernanceOsProxyRouter.use(requireAdmin);
dataGovernanceOsProxyRouter.all(/.*/, forward);
