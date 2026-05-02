/**
 * Phase 0.2 — Staging/production secret strength audit (exit non-zero on failure).
 * Complements ops/scripts/validate-env.ts (documentation markers).
 *
 * Usage: pnpm exec tsx ops/scripts/env-audit.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = path.resolve(__dirname, '../..');

const WEAK_SUBSTRINGS = [
  'dev-secret',
  'change-me',
  'password',
  'changeme',
  'secret',
  '123456',
  'placeholder',
];

interface ParsedLine {
  key: string;
  value: string;
  line: number;
}

function parseEnvLines(filePath: string): ParsedLine[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const out: ParsedLine[] = [];
  lines.forEach((line, i) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      out.push({ key: m[1], value: m[2], line: i + 1 });
    }
  });
  return out;
}

function getValue(entries: ParsedLine[], key: string): string | undefined {
  return entries.find((e) => e.key === key)?.value;
}

function isWeakSecret(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v.length < 32) {
    return true;
  }
  return WEAK_SUBSTRINGS.some((s) => v.includes(s));
}

function auditSecret(
  filePath: string,
  key: string,
  entries: ParsedLine[],
  errors: string[],
): void {
  const raw = getValue(entries, key);
  if (!raw || !raw.trim()) {
    errors.push(`${filePath}: missing or empty ${key}`);
    return;
  }
  if (isWeakSecret(raw)) {
    errors.push(
      `${filePath}: ${key} must be at least 32 characters and must not contain weak patterns (${WEAK_SUBSTRINGS.join(', ')})`,
    );
  }
}

function auditRequiredUrl(entries: ParsedLine[], filePath: string, key: string, errors: string[]): void {
  const raw = getValue(entries, key);
  if (!raw || !raw.trim()) {
    errors.push(`${filePath}: missing or empty ${key} (required for staging/production connectivity)`);
    return;
  }
  const v = raw.trim().toLowerCase();
  if (key === 'DATABASE_URL' && !v.startsWith('postgres')) {
    errors.push(`${filePath}: DATABASE_URL must start with postgres:// or postgresql://`);
  }
  if (key === 'REDIS_URL' && !v.startsWith('redis://') && !v.startsWith('rediss://')) {
    errors.push(`${filePath}: REDIS_URL must be a redis:// or rediss:// URL`);
  }
}

function auditSmtp(entries: ParsedLine[], filePath: string, errors: string[]): void {
  const host = getValue(entries, 'SMTP_HOST');
  const port = getValue(entries, 'SMTP_PORT');
  const user = getValue(entries, 'SMTP_USER');
  const pass = getValue(entries, 'SMTP_PASS');
  if (!host?.trim()) {
    errors.push(`${filePath}: SMTP_HOST required for staging/production email`);
  }
  if (!port?.trim()) {
    errors.push(`${filePath}: SMTP_PORT required for staging/production email`);
  }
  if (!user?.trim()) {
    errors.push(`${filePath}: SMTP_USER required for staging/production email`);
  }
  if (!pass?.trim() || pass.trim().length < 8) {
    errors.push(`${filePath}: SMTP_PASS required (min 8 chars) for staging/production email`);
  }
}

function main(): void {
  const targets = ['.env.staging', '.env.production'].map((f) =>
    path.join(workspaceRoot, 'platform', 'config-center', 'env', f),
  );
  const errors: string[] = [];

  for (const filePath of targets) {
    if (!fs.existsSync(filePath)) {
      errors.push(`${filePath}: file missing`);
      continue;
    }
    const entries = parseEnvLines(filePath);
    auditSecret(filePath, 'JWT_SECRET', entries, errors);
    auditSecret(filePath, 'JWT_REFRESH_SECRET', entries, errors);
    auditSecret(filePath, 'EMAIL_VERIFY_SIGNING_KEY', entries, errors);
    auditSecret(filePath, 'SSE_STREAM_KEY', entries, errors);
    auditSecret(filePath, 'CAPTCHA_SECRET', entries, errors);
    auditRequiredUrl(entries, filePath, 'DATABASE_URL', errors);
    auditRequiredUrl(entries, filePath, 'REDIS_URL', errors);
    auditSmtp(entries, filePath, errors);
  }

  if (errors.length > 0) {
    console.error('env-audit failed (staging/production gates):');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log('env-audit passed for platform/config-center/env/.env.staging and .env.production');
}

main();
