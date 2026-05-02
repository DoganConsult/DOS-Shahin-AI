import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

interface EnvRule {
  name: string;
  required: boolean;
  description: string;
  secret?: boolean;
}

interface ParsedEnvFile {
  values: Map<string, { value: string; line: number }>;
  lines: string[];
}

const workspaceRoot = path.resolve(__dirname, '../..');

const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().url('Must be a PostgreSQL connection URL'),
  DB_POOL_MAX: z.coerce.number().int().min(1).default(10),
  REDIS_URL: z.string().url('Must be a Redis connection URL'),
  REDIS_PREFIX: z.string().min(1).default('dos:'),
  OTEL_TRACING_ENABLED: z.enum(['true', 'false', '1', '0']).default('false'),
}).passthrough();

const sharedServiceRules: EnvRule[] = [
  { name: 'NODE_ENV', required: true, description: 'Runtime environment' },
  { name: 'PORT', required: true, description: 'Service listen port' },
  { name: 'LOG_LEVEL', required: true, description: 'Structured log verbosity' },
  { name: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },
  { name: 'DB_POOL_MAX', required: true, description: 'Database connection pool size' },
  { name: 'REDIS_URL', required: true, description: 'Redis connection URL' },
  { name: 'REDIS_PREFIX', required: true, description: 'Redis key prefix' },
];

const serviceSpecificRules: Record<string, EnvRule[]> = {
  'auth-service': [
    { name: 'JWT_SECRET', required: true, secret: true, description: 'JWT signing secret used for access tokens' },
    { name: 'JWT_REFRESH_SECRET', required: true, secret: true, description: 'JWT signing secret used for refresh tokens' },
    { name: 'EMAIL_VERIFY_SIGNING_KEY', required: false, secret: true, description: 'HMAC key for email verification links' },
    { name: 'SSE_STREAM_KEY', required: false, secret: true, description: 'SSE stream signing / auth secret' },
    { name: 'CAPTCHA_SECRET', required: false, secret: true, description: 'Captcha provider secret' },
  ],
  'governance-policy-service': [
    { name: 'JWT_SECRET', required: true, secret: true, description: 'JWT signing secret used for access tokens' },
    { name: 'JWT_REFRESH_SECRET', required: true, secret: true, description: 'JWT signing secret used for refresh tokens' },
    { name: 'SECRETS_ENCRYPTION_KEY', required: true, secret: true, description: 'Encryption key for at-rest secrets/data' },
    { name: 'RLS_ENABLED', required: true, description: 'Row-level security toggle (must be true in production)' },
  ],
  'ai-engine-service': [
    { name: 'CLAUDE_API_KEY', required: false, secret: true, description: 'Anthropic API key for upstream LLM access' },
    { name: 'OPENAI_API_KEY', required: false, secret: true, description: 'OpenAI API key for upstream LLM access' },
  ],
  'ai-gateway-service': [
    { name: 'CLAUDE_API_KEY', required: false, secret: true, description: 'Anthropic API key for upstream LLM access' },
    { name: 'OPENAI_API_KEY', required: false, secret: true, description: 'OpenAI API key for upstream LLM access' },
  ],
  'notification-service': [
    { name: 'SMTP_PASS', required: false, secret: true, description: 'SMTP password for outbound email delivery' },
    { name: 'SLACK_WEBHOOK_URL', required: false, secret: true, description: 'Slack incoming webhook for notifications' },
    { name: 'TEAMS_WEBHOOK_URL', required: false, secret: true, description: 'Teams incoming webhook for notifications' },
  ],
  'notification-inbox-service': [
    { name: 'SMTP_PASS', required: false, secret: true, description: 'SMTP password for inbound notification handling' },
  ],
  'product-shell': [
    { name: 'GATEWAY_URL', required: true, description: 'Gateway origin that receives /api requests' },
    { name: 'SPA_DIR', required: true, description: 'Angular build output directory served by the product shell' },
  ],
};

const serviceRuleOverrides: Record<string, { exclude?: string[] }> = {
  'product-shell': {
    exclude: ['DATABASE_URL', 'DB_POOL_MAX', 'REDIS_URL', 'REDIS_PREFIX'],
  },
};

const opsEnvRules: EnvRule[] = [
  { name: 'NODE_ENV', required: true, description: 'Deployment environment label' },
  { name: 'PORT', required: true, description: 'Default service port for the stack' },
  { name: 'LOG_LEVEL', required: true, description: 'Default runtime log level' },
  { name: 'DATABASE_URL', required: true, secret: true, description: 'Primary PostgreSQL connection string' },
  { name: 'DB_POOL_MAX', required: true, description: 'Default database pool size' },
  { name: 'REDIS_URL', required: true, secret: true, description: 'Primary Redis connection string' },
  { name: 'REDIS_PREFIX', required: true, description: 'Redis key prefix for the environment' },
  { name: 'OTEL_TRACING_ENABLED', required: true, description: 'OpenTelemetry tracing toggle' },
];

/** Required only for platform/config-center/env/.env.staging and platform/config-center/env/.env.production (new-user / auth gates). */
const opsEnvStagingProductionRules: EnvRule[] = [
  { name: 'JWT_SECRET', required: true, secret: true, description: 'JWT signing secret for access tokens (min entropy enforced by env-audit)' },
  { name: 'JWT_REFRESH_SECRET', required: true, secret: true, description: 'JWT signing secret for refresh tokens' },
  { name: 'EMAIL_VERIFY_SIGNING_KEY', required: true, secret: true, description: 'HMAC key for email verification tokens' },
  { name: 'SSE_STREAM_KEY', required: true, secret: true, description: 'Shared secret for SSE stream authentication' },
  { name: 'CAPTCHA_SECRET', required: true, secret: true, description: 'Captcha provider shared secret' },
  { name: 'SMTP_HOST', required: true, description: 'Outbound SMTP host' },
  { name: 'SMTP_PORT', required: true, description: 'Outbound SMTP port' },
  { name: 'SMTP_USER', required: true, description: 'SMTP authentication username' },
  { name: 'SMTP_PASS', required: true, secret: true, description: 'SMTP authentication password' },
];

function parseEnvFile(filePath: string): ParsedEnvFile {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const values = new Map<string, { value: string; line: number }>();

  lines.forEach((line, index) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) {
      return;
    }
    values.set(match[1], { value: match[2], line: index });
  });

  return { values, lines };
}

function findNearbyComment(lines: string[], lineIndex: number, predicate: (comment: string) => boolean): boolean {
  let commentsSeen = 0;

  for (let index = lineIndex - 1; index >= 0 && commentsSeen < 2; index -= 1) {
    const line = lines[index].trim();
    if (!line) {
      continue;
    }
    if (line.startsWith('#')) {
      commentsSeen += 1;
      if (predicate(line)) {
        return true;
      }
      continue;
    }
    if (line.includes('=')) {
      continue;
    }
  }

  return false;
}

function validateFileAgainstRules(filePath: string, rules: EnvRule[]): string[] {
  const parsed = parseEnvFile(filePath);
  const errors: string[] = [];

  for (const rule of rules) {
    const entry = parsed.values.get(rule.name);

    if (!entry) {
      if (rule.required) {
        errors.push(`${filePath}: missing ${rule.name} (${rule.description})`);
      }
      continue;
    }

    if (!findNearbyComment(parsed.lines, entry.line, comment => comment.length > 1)) {
      errors.push(`${filePath}:${entry.line + 1} missing documentation comment for ${rule.name}`);
    }

    if (rule.secret && !findNearbyComment(parsed.lines, entry.line, comment => comment.includes('SECRET'))) {
      errors.push(`${filePath}:${entry.line + 1} missing # SECRET marker for ${rule.name}`);
    }
  }
  return errors;
}

function getServiceRules(serviceCode: string): EnvRule[] {
  const exclusions = new Set(serviceRuleOverrides[serviceCode]?.exclude ?? []);
  return [
    ...sharedServiceRules.filter(rule => !exclusions.has(rule.name)),
    ...(serviceSpecificRules[serviceCode] ?? []),
  ];
}

function validateRuntimeEnv(env: NodeJS.ProcessEnv = process.env) {
  const result = runtimeEnvSchema.safeParse(env);
  if (!result.success) {
    console.error('Critical validation error: missing or invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

function validateRepositoryEnvFiles(): void {
  const failures: string[] = [];
  const servicesDir = path.join(workspaceRoot, 'services');

  for (const entry of fs.readdirSync(servicesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    // Template / shared-utility directories are not runtime services and do
    // not own an .env.example of their own. Skip them so they don't trip the
    // "missing .env.example" failure.
    if (entry.name.startsWith('_')) {
      continue;
    }

    const envExamplePath = path.join(servicesDir, entry.name, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      failures.push(`${envExamplePath}: missing .env.example file`);
      continue;
    }

    failures.push(...validateFileAgainstRules(envExamplePath, getServiceRules(entry.name)));
  }

  const opsEnvFiles = ['.env.development', '.env.staging', '.env.production']
    .map(fileName => path.join(workspaceRoot, 'platform', 'config-center', 'env', fileName));

  for (const filePath of opsEnvFiles) {
    if (!fs.existsSync(filePath)) {
      failures.push(`${filePath}: missing environment template`);
      continue;
    }

    failures.push(...validateFileAgainstRules(filePath, opsEnvRules));
    const base = path.basename(filePath);
    if (base === '.env.staging' || base === '.env.production') {
      failures.push(...validateFileAgainstRules(filePath, opsEnvStagingProductionRules));
    }
  }

  if (failures.length > 0) {
    console.error('Environment documentation validation failed:');
    failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exit(1);
  }
}

export { runtimeEnvSchema as EnvSchema, validateRuntimeEnv as validateEnv };

if (require.main === module) {
  if (process.argv.includes('--runtime')) {
    validateRuntimeEnv();
    console.log('Environment variable validation passed. Safe to boot.');
  } else {
    validateRepositoryEnvFiles();
    console.log('Environment example validation passed.');
  }
}
