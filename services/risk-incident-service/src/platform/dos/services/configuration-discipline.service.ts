import { safeQuery } from '@dos/db';
import { logger } from '@dos/module-sdk';

export interface ConfigurationItem {
  key: string;
  value: unknown;
  source: 'env' | 'db' | 'default';
  validatedAt?: string;
  isValid: boolean;
  violations: string[];
}

export interface ConfigurationDisciplineResult {
  items: ConfigurationItem[];
  totalViolations: number;
  healthScore: number;
  summary: string;
}

export interface ConfigurationRule {
  key: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'uuid';
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  description?: string;
}

const REQUIRED_CONFIGURATION_RULES: ConfigurationRule[] = [
  { key: 'DATABASE_URL', required: true, type: 'url', description: 'Primary database connection URL' },
  { key: 'REDIS_URL', required: false, type: 'url', description: 'Redis connection URL' },
  { key: 'JWT_SECRET', required: true, type: 'string', minLength: 32, description: 'JWT signing secret' },
  { key: 'NODE_ENV', required: true, type: 'string', description: 'Runtime environment' },
  { key: 'API_BASE_URL', required: false, type: 'url', description: 'API base URL' },
  { key: 'LOG_LEVEL', required: false, type: 'string', description: 'Logging level' },
];

function validateValue(rule: ConfigurationRule, value: unknown): string[] {
  const violations: string[] = [];
  if (value === undefined || value === null || value === '') {
    if (rule.required) violations.push(`Required configuration '${rule.key}' is missing`);
    return violations;
  }

  const strVal = String(value);

  if (rule.type === 'url') {
    try { new URL(strVal); } catch {
      violations.push(`'${rule.key}' must be a valid URL`);
    }
  }

  if (rule.type === 'number' && isNaN(Number(value))) {
    violations.push(`'${rule.key}' must be a number`);
  }

  if (rule.type === 'boolean' && !['true', 'false', '1', '0'].includes(strVal.toLowerCase())) {
    violations.push(`'${rule.key}' must be a boolean`);
  }

  if (rule.minLength && strVal.length < rule.minLength) {
    violations.push(`'${rule.key}' must be at least ${rule.minLength} characters`);
  }

  if (rule.maxLength && strVal.length > rule.maxLength) {
    violations.push(`'${rule.key}' must be at most ${rule.maxLength} characters`);
  }

  if (rule.pattern && !rule.pattern.test(strVal)) {
    violations.push(`'${rule.key}' does not match required format`);
  }

  return violations;
}

async function validateConfiguration(): Promise<ConfigurationDisciplineResult> {
  const items: ConfigurationItem[] = [];
  let totalViolations = 0;

  for (const rule of REQUIRED_CONFIGURATION_RULES) {
    const value = process.env[rule.key];
    const violations = validateValue(rule, value);
    const maskedValue = rule.key.toLowerCase().includes('secret') ||
      rule.key.toLowerCase().includes('password') ||
      rule.key.toLowerCase().includes('key')
      ? (value ? '***MASKED***' : undefined)
      : value;

    items.push({
      key: rule.key,
      value: maskedValue,
      source: value !== undefined ? 'env' : 'default',
      validatedAt: new Date().toISOString(),
      isValid: violations.length === 0,
      violations,
    });

    totalViolations += violations.length;
  }

  const healthScore = items.length > 0
    ? Math.round(((items.filter((i) => i.isValid).length) / items.length) * 100)
    : 100;

  const summary = totalViolations === 0
    ? 'All configuration items are valid'
    : `${totalViolations} configuration violation(s) detected`;

  if (totalViolations > 0) {
    logger.warn('[ConfigurationDiscipline] violations detected', { totalViolations, healthScore });
  }

  return { items, totalViolations, healthScore, summary };
}

async function persistAudit(tenantId: string, result: ConfigurationDisciplineResult): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO public.configuration_discipline_audits
         (tenant_id, health_score, total_violations, summary, items_json, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [tenantId, result.healthScore, result.totalViolations, result.summary, JSON.stringify(result.items)],
    );
  } catch (err) {
    logger.warn('[ConfigurationDiscipline] audit persist failed', { err, tenantId });
  }
}

// Phase 0.5 build-compat stubs: the legacy module-config boot files call
// createStandardSchema(moduleCode) and registerConfiguration(config) on this
// service. Both were removed when the service was trimmed; they are not
// runtime-critical for Wave 1 (risk is not user-certified). These stubs keep
// the module-config compile path working.
export interface ModuleConfigurationShape {
  moduleCode: string;
  requirements: Array<Record<string, unknown>>;
  featureFlags: Array<Record<string, unknown>>;
  validationRules: Array<Record<string, unknown>>;
}

function createStandardSchema(moduleCode: string): ModuleConfigurationShape {
  return {
    moduleCode,
    requirements: [],
    featureFlags: [],
    validationRules: [],
  };
}

function registerConfiguration(_config: ModuleConfigurationShape): void {
  return;
}

export const configurationDisciplineService = {
  validateConfiguration,
  persistAudit,
  createStandardSchema,
  registerConfiguration,
};
