/**
 * Auth host consistency lint.
 *
 * Enforces that non-TS artifacts (env files, nginx config, Keycloak redirect
 * env vars) stay aligned with the single source of truth in
 * `@dos/platform-core/auth-host-policy`. Also flags stray hardcoded auth-host
 * literals in `services/**\/*.ts` outside an explicit allowlist.
 *
 * Run via: `pnpm lint:auth-hosts`
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  AUTH_HOSTS,
  ADMIN_HOST,
  IDP_ISSUER_HOST,
  PRODUCT_HOSTS,
  allAuthOrigins,
  corsAllowedOrigins,
} from '../../packages/dos-platform-core/src/auth-host-policy';
import {
  parseServerBlocks,
  findLocation,
  getProxyPass,
  getProxySetHeader,
} from './lib/nginx-parse';

const workspaceRoot = path.resolve(__dirname, '../..');

interface Violation {
  file: string;
  line?: number;
  detail: string;
}

const violations: Violation[] = [];

function fail(file: string, detail: string, line?: number): void {
  violations.push({ file: path.relative(workspaceRoot, file), line, detail });
}

// ─── env files ───────────────────────────────────────────────────────────
const envDir = path.join(workspaceRoot, 'platform/config-center/env');
const envFiles = fs.readdirSync(envDir)
  .filter((f) => f.endsWith('.env') || f.endsWith('.env.shared'))
  .map((f) => path.join(envDir, f));

const expectedCors = corsAllowedOrigins().join(',');

for (const file of envFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) return;
    const match = /^(CORS_ALLOWED_ORIGINS|CORS_ORIGINS)=(.*)$/.exec(trimmed);
    if (match) {
      const [, key, value] = match;
      if (value !== expectedCors) {
        fail(
          file,
          `${key} drift. Expected: ${expectedCors}  Actual: ${value}`,
          idx + 1,
        );
      }
    }
    const kcMatch = /^KEYCLOAK_OIDC_REDIRECT_URI=https:\/\/([^/]+)\//.exec(trimmed);
    if (kcMatch) {
      const host = kcMatch[1];
      if (!AUTH_HOSTS.has(host)) {
        fail(file, `KEYCLOAK_OIDC_REDIRECT_URI host "${host}" is not in AUTH_HOSTS`, idx + 1);
      }
    }
    // KEYCLOAK_BASE_URL / KEYCLOAK_ISSUER / KEYCLOAK_JWKS_URL must point at the
    // dedicated IdP host (auth.dogan-ai.com) or the loopback (backchannel only).
    // The P1 cutover removed the transition allowance for product hosts.
    const kcUrlMatch = /^(KEYCLOAK_BASE_URL|KEYCLOAK_ISSUER|KEYCLOAK_JWKS_URL)=(https?:\/\/[^/]+)/.exec(trimmed);
    if (kcUrlMatch) {
      const [, key, originRaw] = kcUrlMatch;
      const allowed = new Set([
        `https://${IDP_ISSUER_HOST}`,
        'http://127.0.0.1:8180',
      ]);
      if (!allowed.has(originRaw)) {
        fail(
          file,
          `${key} origin "${originRaw}" is not allowed. Use https://${IDP_ISSUER_HOST} (public) or http://127.0.0.1:8180 (loopback).`,
          idx + 1,
        );
      }
    }
  });
}

// ─── nginx frontend.conf ─────────────────────────────────────────────────
const nginxFile = path.join(workspaceRoot, 'ops/nginx/frontend.conf');
if (fs.existsSync(nginxFile)) {
  const content = fs.readFileSync(nginxFile, 'utf8');
  const lines = content.split('\n');
  const productHostsArr = [...PRODUCT_HOSTS].sort();

  let sawServerName = false;
  lines.forEach((line, idx) => {
    const sn = /^\s*server_name\s+(.+);\s*$/.exec(line);
    if (sn) {
      sawServerName = true;
      const names = sn[1].trim().split(/\s+/).sort();
      if (JSON.stringify(names) !== JSON.stringify(productHostsArr)) {
        fail(
          nginxFile,
          `server_name drift. Expected: ${productHostsArr.join(' ')}  Actual: ${names.join(' ')}`,
          idx + 1,
        );
      }
    }
  });
  if (!sawServerName) {
    fail(nginxFile, 'no server_name directive found');
  }

  const authOriginsExpected = allAuthOrigins(['https', 'wss']);
  for (const origin of authOriginsExpected) {
    if (!content.includes(origin)) {
      fail(nginxFile, `connect-src missing origin ${origin}`);
    }
  }
}

// ─── nginx dos-platform.conf — OIDC route invariants ─────────────────────
// Per-frontend-host assertions: /api/auth/oidc/start and /callback MUST
// proxy to the same upstream and preserve X-Forwarded-Host + X-Forwarded-Proto.
// A regression in any of these reproduces the OIDC drift incident class
// (STATE_COOKIE_MISSING, KC redirect_uri rejection, token-exchange mismatch).
const dosPlatformFile = path.join(workspaceRoot, 'ops/nginx/dos-platform.conf');
if (fs.existsSync(dosPlatformFile)) {
  const content = fs.readFileSync(dosPlatformFile, 'utf8');
  const blocks = parseServerBlocks(content);
  const frontendHosts: string[] = [...PRODUCT_HOSTS, ADMIN_HOST];

  for (const host of frontendHosts) {
    const block = blocks.find((b) => b.serverNames.includes(host));
    if (!block) {
      fail(dosPlatformFile, `oidc-routing: no server block for frontend host "${host}"`);
      continue;
    }
    const startLoc = findLocation(block, '= /api/auth/oidc/start');
    const cbLoc = findLocation(block, '= /api/auth/oidc/callback');
    if (!startLoc) {
      fail(dosPlatformFile, `oidc-routing: host "${host}" missing exact-match location for /api/auth/oidc/start`);
    }
    if (!cbLoc) {
      fail(dosPlatformFile, `oidc-routing: host "${host}" missing exact-match location for /api/auth/oidc/callback`);
    }
    if (!startLoc || !cbLoc) continue;

    const startUp = getProxyPass(startLoc);
    const cbUp = getProxyPass(cbLoc);
    if (!startUp || !cbUp) {
      fail(dosPlatformFile, `oidc-routing: host "${host}" missing proxy_pass on /start or /callback`);
    } else if (startUp !== cbUp) {
      fail(
        dosPlatformFile,
        `oidc-routing: host "${host}" /start proxy_pass=${startUp} but /callback=${cbUp} — must match`,
      );
    }

    for (const [name, loc] of [['/start', startLoc], ['/callback', cbLoc]] as const) {
      const xfh = getProxySetHeader(loc, 'X-Forwarded-Host');
      if (xfh !== '$host' && xfh !== '$http_host') {
        fail(
          dosPlatformFile,
          `oidc-routing: host "${host}" ${name} X-Forwarded-Host must be $host or $http_host (got: ${xfh ?? 'absent'})`,
        );
      }
      const xfp = getProxySetHeader(loc, 'X-Forwarded-Proto');
      if (xfp !== 'https' && xfp !== '$cf_forwarded_proto') {
        fail(
          dosPlatformFile,
          `oidc-routing: host "${host}" ${name} X-Forwarded-Proto must be https or $cf_forwarded_proto (got: ${xfp ?? 'absent'})`,
        );
      }
    }
  }
}

// ─── services/**/*.ts raw literals ───────────────────────────────────────
const TARGET_LITERALS = [
  'shahin-ai.com',
  'www.shahin-ai.com',
];

const LITERAL_ALLOWLIST_PATTERNS: RegExp[] = [
  // Email branding — not auth host policy
  /@shahin-ai\.com/,
  /@dogan-ai\.com/,
  /SMTP_FROM/,
  /GRAPH_SENDER/,
  /Shahin-AI GRC/,
  /Shahin-Ai/,
  // JSDoc / block comment lines (single-line /** ... */, continuation *, //)
  /^\s*\/\*/,
  /^\s*\*/,
  /^\s*\/\//,
  // Env-default URL assignments (APP_URL, PLATFORM_URL, DEFAULT_APP_URL, etc.) —
  // not auth-host-policy; these are brand/public-URL defaults used by emails and
  // deep links. The policy module covers auth flows only.
  /process\.env\.[A-Z_]*(APP|PLATFORM|PUBLIC|SITE|BASE|HOME|MARKETING)[A-Z_]*_URL/,
  /(DEFAULT_APP_URL|PLATFORM_URL|APP_URL|VERIFY_URL|RESET_URL|INVITATION_URL|PUBLIC_BASE_URL)\s*[:=]/,
  // HTML template anchor text in email footers (brand labels, not CSP targets)
  /<a\s[^>]*href=/,
  // Examples in docstrings / tests
  /@example/,
  /data-lang=/,
  /\/\/ Example/,
];

function walk(dir: string, cb: (filePath: string) => void): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '__tests__', '__mocks__'].includes(entry.name)) continue;
      walk(full, cb);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      cb(full);
    }
  }
}

const servicesRoot = path.join(workspaceRoot, 'services');
if (fs.existsSync(servicesRoot)) {
  walk(servicesRoot, (file) => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (LITERAL_ALLOWLIST_PATTERNS.some((re) => re.test(line))) return;
      for (const literal of TARGET_LITERALS) {
        if (!line.includes(literal)) continue;
        fail(
          file,
          `raw host literal "${literal}" — import from @dos/platform-core/auth-host-policy`,
          idx + 1,
        );
      }
    });
  });
}

// ─── report ───────────────────────────────────────────────────────────────
if (violations.length === 0) {
  console.log('auth-host consistency: OK');
  process.exit(0);
}

console.error(`auth-host consistency: ${violations.length} violation(s)\n`);
for (const v of violations) {
  const loc = v.line ? `${v.file}:${v.line}` : v.file;
  console.error(`  ${loc}  ${v.detail}`);
}
process.exit(1);
