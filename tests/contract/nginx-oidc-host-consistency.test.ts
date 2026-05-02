/**
 * nginx host-routing invariants for the OIDC start/callback flow.
 *
 * Locks in the assertions enforced by `pnpm lint:auth-hosts` so each
 * violation surfaces as a distinct failing test (not a single combined
 * lint exit code). A regression here is the same incident shape the
 * route-level suite catches at runtime.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

import {
  parseServerBlocks,
  findLocation,
  getProxyPass,
  getProxySetHeader,
  type NginxServerBlock,
  type NginxLocation,
} from '../../ops/scripts/lib/nginx-parse';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NGINX_FILE = path.join(ROOT, 'ops/nginx/dos-platform.conf');

const FRONTEND_HOSTS = ['shahin-ai.com', 'www.shahin-ai.com', 'admin.dogan-ai.com'] as const;
type FrontendHost = (typeof FRONTEND_HOSTS)[number];

const conf = fs.readFileSync(NGINX_FILE, 'utf8');
const blocks = parseServerBlocks(conf);

function blockFor(host: FrontendHost): NginxServerBlock {
  const b = blocks.find((blk) => blk.serverNames.includes(host));
  if (!b) throw new Error(`no server block for ${host}`);
  return b;
}

function loc(host: FrontendHost, pattern: string): NginxLocation {
  const l = findLocation(blockFor(host), pattern);
  if (!l) throw new Error(`${host} missing location ${pattern}`);
  return l;
}

describe('nginx OIDC host consistency — dos-platform.conf', () => {
  it.each(FRONTEND_HOSTS)('5.0 server block exists for %s', (host) => {
    expect(blocks.find((b) => b.serverNames.includes(host))).toBeDefined();
  });

  it.each(FRONTEND_HOSTS)('5.1 %s defines exact-match /start and /callback locations', (host) => {
    expect(findLocation(blockFor(host), '= /api/auth/oidc/start')).not.toBeNull();
    expect(findLocation(blockFor(host), '= /api/auth/oidc/callback')).not.toBeNull();
  });

  it.each(FRONTEND_HOSTS)('5.2 %s /start and /callback proxy to the SAME upstream', (host) => {
    const start = loc(host, '= /api/auth/oidc/start');
    const cb = loc(host, '= /api/auth/oidc/callback');
    const startUp = getProxyPass(start);
    const cbUp = getProxyPass(cb);
    expect(startUp).toBeTruthy();
    expect(cbUp).toBeTruthy();
    expect(startUp).toBe(cbUp);
  });

  it.each(FRONTEND_HOSTS)('5.3 %s preserves X-Forwarded-Host on /start and /callback', (host) => {
    const allowed = new Set(['$host', '$http_host']);
    for (const pattern of ['= /api/auth/oidc/start', '= /api/auth/oidc/callback']) {
      const v = getProxySetHeader(loc(host, pattern), 'X-Forwarded-Host');
      expect(v).not.toBeNull();
      expect(allowed.has(v!)).toBe(true);
    }
  });

  it.each(FRONTEND_HOSTS)('5.4 %s sets X-Forwarded-Proto to https or $cf_forwarded_proto on both routes', (host) => {
    const allowed = new Set(['https', '$cf_forwarded_proto']);
    for (const pattern of ['= /api/auth/oidc/start', '= /api/auth/oidc/callback']) {
      const v = getProxySetHeader(loc(host, pattern), 'X-Forwarded-Proto');
      expect(v).not.toBeNull();
      expect(allowed.has(v!)).toBe(true);
    }
  });
});
