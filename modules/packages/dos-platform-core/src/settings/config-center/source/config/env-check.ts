export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface EnvRule {
  name: string;
  required: boolean;
  secret?: boolean;
  description?: string;
  validator?: (value: string) => boolean;
}

const CONFIG_CENTER_ENV_RULES: EnvRule[] = [
  { name: 'DATABASE_URL', required: true, secret: true, description: 'PostgreSQL connection string' },
  { name: 'JWT_SECRET', required: true, secret: true, description: 'JWT signing secret (≥32 chars)',
    validator: (v) => v.length >= 32 },
  { name: 'JWT_REFRESH_SECRET', required: true, secret: true, description: 'JWT refresh signing secret (≥32 chars)',
    validator: (v) => v.length >= 32 },
  { name: 'SECRETS_ENCRYPTION_KEY', required: true, secret: true, description: 'AES encryption key' },
  { name: 'NODE_ENV', required: false, description: 'Runtime environment' },
  { name: 'LOG_LEVEL', required: false, description: 'Logging level' },
  { name: 'REDIS_URL', required: false, description: 'Redis connection URL' },
  { name: 'CONFIG_CENTER_ENABLED', required: false, description: 'Enable config center features' },
  { name: 'CONFIG_ENCRYPTION_KEY', required: false, secret: true, description: 'Config value encryption key' },
];

export function validateAllConfigEntries(extraRules: EnvRule[] = []): EnvValidationResult {
  const rules = [...CONFIG_CENTER_ENV_RULES, ...extraRules];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    const value = process.env[rule.name];

    if (!value || value.trim() === '') {
      if (rule.required) {
        errors.push(`Missing required env var: ${rule.name} — ${rule.description ?? ''}`);
      } else {
        warnings.push(`Missing optional env var: ${rule.name} — ${rule.description ?? ''}`);
      }
      continue;
    }

    if (rule.validator && !rule.validator(value)) {
      if (rule.required) {
        errors.push(`Invalid env var ${rule.name}: failed validation — ${rule.description ?? ''}`);
      } else {
        warnings.push(`Env var ${rule.name} may have a placeholder value`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
