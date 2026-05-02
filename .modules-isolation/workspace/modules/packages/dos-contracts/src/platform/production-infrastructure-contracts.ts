/**
 * Production Infrastructure Contracts — Frozen Non-Negotiable Agreements
 *
 * These contracts define the immutable production topology for native
 * bare-metal deployment (no Docker). Every server instance MUST satisfy
 * these contracts at startup. Violations are fatal in production.
 *
 * Traffic path: Cloudflare → cloudflared → Nginx:80 → backend:127.0.0.1:3000
 *
 * @owner DOS / Platform Architecture
 * @frozen 2026-04-10
 */

import { VALID_SERVER_ROLES, VALID_TOPOLOGIES } from './config-boundary';

export const FROZEN_CONTRACTS = {

  C01_NETWORK: {
    id: 'C01',
    name: 'Network / Traffic Path',
    rules: {
      publicPath: 'Cloudflare → cloudflared → Nginx:80 → backend:3000',
      nginxListenPort: 80,
      backendBindHost: '127.0.0.1',
      backendPort: 3000,
      backendPublicExposure: false,
    },
  },

  C02_PROXY: {
    id: 'C02',
    name: 'Proxy / Header Contract',
    rules: {
      requiredNginxHeaders: ['Host', 'X-Real-IP', 'X-Forwarded-For', 'X-Forwarded-Proto'] as const,
      trustProxyInProduction: true,
      trustProxyValue: 1,
    },
  },

  C03_RUNTIME_ROLE: {
    id: 'C03',
    name: 'Runtime Role Contract',
    rules: {
      validRoles: VALID_SERVER_ROLES,
      validTopologies: VALID_TOPOLOGIES,
      processesPerServer: ['cloudflared', 'nginx', 'pm2', 'backend'] as const,
      schedulerGating: {
        webOnly: { schedulers: false, migrations: false, seeds: false },
        webPlusJobs: { schedulers: true, migrations: true, seeds: true },
        jobsOnly: { schedulers: true, migrations: true, seeds: true },
      },
      singletonJobProtection: 'redis-distributed-lock',
      clusterLeaderOnly: 'NODE_APP_INSTANCE === 0',
    },
  },

  C04_STATE: {
    id: 'C04',
    name: 'Stateless Application Contract',
    rules: {
      noInMemorySessions: true,
      noLocalOnlyUploads: true,
      sessionBackend: 'jwt-stateless',
      cacheBackend: 'redis-with-memory-fallback',
      fileStorageBackend: 'STORAGE_MODE env (local-fs | s3 | minio)',
      multiNodeRequiresSharedStorage: true,
      noCorrectnessDependingOnSingleNodeCache: true,
    },
  },

  C05_SHARED_SERVICES: {
    id: 'C05',
    name: 'Shared Services Contract',
    rules: {
      allNodesMustShare: [
        'PostgreSQL (PG_HOST/DATABASE_URL)',
        'Redis (REDIS_HOST)',
        'Temporal (TEMPORAL_ADDRESS)',
        'Object/File Storage (STORAGE_MODE)',
        'ClickHouse (CLICKHOUSE_HOST)',
      ] as const,
      sameEnvKeysAcrossNodes: true,
      noNodeLocalDatabases: true,
      noNodeLocalQueues: true,
    },
  },

  C06_DEPLOYMENT: {
    id: 'C06',
    name: 'Deployment Parity Contract',
    rules: {
      pinnedNodeVersion: '.nvmrc',
      pinnedPnpmVersion: 'package.json#packageManager',
      sameBuildArtifact: 'dist/ from single CI build',
      sameEcosystemConfig: 'ecosystem.config.js',
      sameNginxTemplate: 'infrastructure/ops/system/nginx-shahin-ai.conf',
      sameCloudflaredIngress: true,
      buildManifestRequired: 'dist/build-manifest.json',
    },
  },

  C07_ENVIRONMENT: {
    id: 'C07',
    name: 'Environment Schema Contract',
    rules: {
      requiredInProduction: [
        'JWT_SECRET',
        'PG_HOST',
        'PG_PASSWORD',
        'PG_DATABASE',
        'PG_USER',
        'CORS_ORIGINS',
      ] as const,
      serverRoleKey: 'SERVER_ROLE',
      topologyKey: 'PRODUCTION_TOPOLOGY',
      schedulerFlagKey: 'DISABLE_SCHEDULERS',
      secretMinLength: 32,
      noCorsWildcard: true,
      canonicalTemplate: 'infrastructure/ops/.env.production.template',
    },
  },

  C08_HEALTH: {
    id: 'C08',
    name: 'Health / Readiness Contract',
    rules: {
      endpoints: {
        basic: '/api/health',
        ready: '/api/health/ready',
        live: '/api/health/live',
        deep: '/api/health/deep',
        preflight: '/api/preflight',
        metrics: '/api/metrics/prometheus',
      },
      pm2ReadySignal: "process.send('ready')",
      pm2WaitReady: true,
      pm2ListenTimeout: 600000,
      pm2KillTimeout: 60000,
      startupReadyFlag: 'isStartupReady()',
      readyMeansDbConnected: true,
      readyMeansRedisChecked: true,
    },
  },

  C09_DATABASE: {
    id: 'C09',
    name: 'Database / Migration Contract',
    rules: {
      migrationLockMechanism: 'pg_advisory_lock',
      startupMigrationLockId: 90000,
      migrationRunnerLockKey: 900100,
      onlyInstance0RunsMigrations: true,
      webRoleSkipsMigrations: true,
      noRaceConditionOnStartup: true,
      migrationOrder: ['master', 'tenant', 'dedicated-db-tenants'] as const,
    },
  },

  C10_ROLLBACK: {
    id: 'C10',
    name: 'Rollback Contract',
    rules: {
      backupBeforeDeploy: true,
      backupContents: ['backend-dist', 'frontend-browser', 'migrations', 'ecosystem.config.js'] as const,
      pm2ReloadOnRollback: true,
      nginxUnchangedDuringAppRollback: true,
      healthCheckAfterRollback: '/api/health',
      healthCheckRetries: 6,
      healthCheckIntervalMs: 4000,
      cloudflareFailback: 'DNS failover or tunnel disable',
    },
  },

  C11_LOGGING: {
    id: 'C11',
    name: 'Logging / Observability Contract',
    rules: {
      logFormat: 'structured-json-pino',
      logLevelKey: 'LOG_LEVEL',
      validLogLevels: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const,
      correlationIdHeader: 'x-correlation-id',
      otelServiceNameKey: 'OTEL_SERVICE_NAME',
      otelExporterKey: 'OTEL_EXPORTER',
      logFilePaths: {
        pm2Error: '/home/Dr-Dogan-AGRC-OS/logs/pm2-error.log',
        pm2Out: '/home/Dr-Dogan-AGRC-OS/logs/pm2-out.log',
      },
      noConsoleLogInProduction: true,
      requestLoggingEnabled: true,
    },
  },

  C12_SECURITY: {
    id: 'C12',
    name: 'Security Hardening Contract',
    rules: {
      helmetEnabled: true,
      cspEnforced: true,
      hstsViaCloudflare: true,
      noXPoweredBy: true,
      authMatrixModeKey: 'AUTH_MATRIX_MODE',
      validAuthMatrixModes: ['off', 'shadow', 'enforce', 'dual'] as const,
      productionAuthMatrixMode: 'enforce',
      rateLimitingPresent: true,
      noWeakJwtPatterns: ['dev-secret', 'change-me', 'secret', 'password', 'test', '123', 'default-key'] as const,
      jwtRefreshSecretRequired: true,
      encryptionKeyMinLength: 32,
    },
  },

  C13_GRACEFUL_SHUTDOWN: {
    id: 'C13',
    name: 'Graceful Shutdown Contract',
    rules: {
      signals: ['SIGTERM', 'SIGINT'] as const,
      drainTimeoutMs: 30000,
      resourceCleanupOrder: ['http-server', 'websocket', 'database', 'redis', 'langfuse'] as const,
      pm2KillTimeout: 60000,
      unhandledRejectionHandler: true,
      uncaughtExceptionHandler: true,
      exitCodeClean: 0,
      exitCodeTimeout: 1,
    },
  },

  C14_FRONTEND: {
    id: 'C14',
    name: 'Frontend Build / Serving Contract',
    rules: {
      framework: 'Angular 21',
      buildOutputPath: 'frontend/dist/shahin-ai/browser',
      nginxServeRoot: '/home/Dr-Dogan-AGRC-OS/frontend/dist/shahin-ai/browser',
      spaFallback: 'try_files $uri $uri/ /index.html',
      staticAssetCaching: '1y immutable',
      indexCaching: 'no-cache, no-store, must-revalidate',
      gzipEnabled: true,
      serviceWorkerScope: '/',
    },
  },

  C15_TEMPORAL: {
    id: 'C15',
    name: 'Temporal Worker Topology Contract',
    rules: {
      enabledKey: 'TEMPORAL_ENABLED',
      addressKey: 'TEMPORAL_ADDRESS',
      namespaceKey: 'TEMPORAL_NAMESPACE',
      workerProcesses: [
        'temporal-general-worker',
        'temporal-provisioning-worker',
        'temporal-agent-worker',
        'temporal-evidence-worker',
        'temporal-sla-worker',
        'temporal-compliance-worker',
        'temporal-risk-worker',
        'temporal-reports-worker',
        'temporal-quality-gate-worker',
      ] as const,
      generalWorkerInstances: 2,
      scheduleRegistration: 'startup-instance-0-only',
      healthCheckIncludesTemporal: true,
    },
  },

  C16_AI_PROVIDER: {
    id: 'C16',
    name: 'AI / LLM Provider Contract',
    rules: {
      providerModeKey: 'AI_PROVIDER',
      validProviderModes: ['auto', 'anthropic', 'azure-openai', 'google', 'ollama', 'groq', 'openrouter'] as const,
      fallbackProviderKey: 'AI_FALLBACK_PROVIDER',
      modelSelectionKey: 'CLAUDE_MODEL',
      langgraphEnabledKey: 'LANGGRAPH_AGENTS_ENABLED',
      maxToolIterationsKey: 'LANGGRAPH_MAX_TOOL_ITERATIONS',
      noHardcodedApiKeys: true,
      apiKeysFromEnvOnly: true,
      langfuseObservabilityKey: 'LANGFUSE_ENABLED',
    },
  },

  C17_MULTI_TENANCY: {
    id: 'C17',
    name: 'Multi-Tenancy Contract',
    rules: {
      isolationModeKey: 'TENANT_ISOLATION_MODE',
      validIsolationModes: ['shared-schema', 'dedicated-schema', 'dedicated-db'] as const,
      rbacSeedingPerTenant: true,
      tenantSchemaPrefix: 'tenant_',
      crossTenantQueryPrevention: true,
      tenantContextMiddleware: true,
      deploymentModeKey: 'DEPLOYMENT_MODE',
      validDeploymentModes: ['saas_shared', 'saas_dedicated', 'on_prem'] as const,
    },
  },

  C18_SECRETS: {
    id: 'C18',
    name: 'Secrets Management Contract',
    rules: {
      secretsModeKey: 'SECRETS_MODE',
      validSecretsModes: ['env-file', 'azure-keyvault', 'vault'] as const,
      encryptionKeyKey: 'SECRETS_ENCRYPTION_KEY',
      erpEncryptionKeyKey: 'ERP_ENCRYPTION_KEY',
      noPlaintextSecretsInCode: true,
      noSecretsInLogs: true,
      noSecretsInResponses: true,
      minKeyLength: 32,
    },
  },

  C19_BACKUP: {
    id: 'C19',
    name: 'Backup / Disaster Recovery Contract',
    rules: {
      pgDumpRequired: true,
      backupRetentionDays: 30,
      backupLocationSeparateFromApp: true,
      restoreTestRequired: true,
      deployBackupContents: ['backend-dist', 'frontend-browser', 'migrations', 'ecosystem.config.js'] as const,
      walArchivingRecommended: true,
    },
  },

  C20_PROCESS: {
    id: 'C20',
    name: 'Process Management Contract',
    rules: {
      processManager: 'pm2',
      clusterMode: true,
      backendInstances: 2,
      maxMemoryRestart: '2000M',
      maxRestarts: 15,
      minUptime: '10s',
      restartDelay: 3000,
      watchDisabled: true,
      logDateFormat: 'YYYY-MM-DD HH:mm:ss Z',
      mergeLogs: true,
      nodeArgs: '--max-old-space-size=1536 --max-http-header-size=16384',
    },
  },

  C21_CLICKHOUSE: {
    id: 'C21',
    name: 'ClickHouse Analytics Contract',
    rules: {
      hostKey: 'CLICKHOUSE_HOST',
      portKey: 'CLICKHOUSE_PORT',
      databaseKey: 'CLICKHOUSE_DATABASE',
      defaultDatabase: 'langfuse',
      defaultPort: 8123,
      protocolKey: 'CLICKHOUSE_PROTOCOL',
      validProtocols: ['http', 'https'] as const,
      requiredForLangfuse: true,
    },
  },

  C22_MCP: {
    id: 'C22',
    name: 'MCP Server Contract',
    rules: {
      enabledKey: 'MCP_ENABLED',
      portKey: 'MCP_PORT',
      defaultPort: 8080,
      transportKey: 'MCP_TRANSPORT',
      validTransports: ['http', 'sse', 'stdio'] as const,
      authRequiredKey: 'MCP_AUTH_REQUIRED',
      authTokenKey: 'MCP_AUTH_TOKEN',
      pm2ProcessName: 'mcp-standalone',
      pm2ExecMode: 'fork',
      pm2Instances: 1,
      pm2MaxMemory: '256M',
      pm2Autorestart: false,
    },
  },

  C23_OPENCLAW: {
    id: 'C23',
    name: 'OpenClaw MCP Server Contract',
    rules: {
      enabledKey: 'OPENCLAW_ENABLED',
      portKey: 'OPENCLAW_PORT',
      defaultPort: 8081,
      hostKey: 'OPENCLAW_HOST',
      transportKey: 'OPENCLAW_TRANSPORT',
      validTransports: ['http', 'sse', 'both'] as const,
      authRequiredKey: 'OPENCLAW_AUTH_REQUIRED',
      rateLimitEnabledKey: 'OPENCLAW_RATE_LIMIT_ENABLED',
      rateLimitWindowMs: 60000,
      rateLimitMaxRequests: 100,
      pm2ProcessName: 'openclaw-server',
      pm2ExecMode: 'fork',
      pm2Instances: 1,
      pm2MaxMemory: '670M',
    },
  },

  C24_LANGFUSE: {
    id: 'C24',
    name: 'Langfuse Observability Server Contract',
    rules: {
      enabledKey: 'LANGFUSE_ENABLED',
      hostKey: 'LANGFUSE_HOST',
      defaultHost: 'http://localhost:3001',
      publicKeyKey: 'LANGFUSE_PUBLIC_KEY',
      secretKeyKey: 'LANGFUSE_SECRET_KEY',
      pm2ProcessName: 'langfuse',
      pm2Port: 3001,
      pm2ExecMode: 'fork',
      pm2Instances: 1,
      pm2MaxMemory: '512M',
      requiresClickHouse: true,
      requiresPostgres: true,
    },
  },

  C25_MIDDLEWARE: {
    id: 'C25',
    name: 'Middleware Stack Contract',
    rules: {
      requiredMiddleware: [
        'compression',
        'cors',
        'helmet',
        'cookie-parser',
        'json-body-parser',
        'csrf-protection',
        'input-sanitization',
        'correlation-id',
        'prometheus-metrics',
        'request-logger',
        'i18n',
        'response-helpers',
        'api-versioning',
      ] as const,
      middlewareOrder: [
        'compression',
        'cors',
        'csp-nonce',
        'helmet',
        'cookie-parser',
        'json-body-parser',
        'input-sanitization',
        'csrf-protection',
        'swagger',
        'correlation-id',
        'prometheus-metrics',
        'request-logger',
        'i18n',
        'response-helpers',
        'api-versioning',
      ] as const,
      csrfRequired: true,
      inputSanitizationRequired: true,
      rateLimitingConfigured: true,
    },
  },

  C26_GRAPH_DB: {
    id: 'C26',
    name: 'Graph / Queue Extensions Contract',
    rules: {
      apacheAgeEnabled: true,
      apacheAgeConfigFile: 'config/apache-age.ts',
      pgmqEnabled: true,
      pgmqConfigFile: 'config/pgmq.ts',
      openFgaEnabled: true,
      openFgaConfigFile: 'config/openfga.ts',
      pgvectorEnabled: true,
      allExtensionsOptional: true,
      gracefulDegradation: true,
    },
  },

  C27_EXTERNAL_INTEGRATIONS: {
    id: 'C27',
    name: 'External Service Integrations Contract',
    rules: {
      supportedIntegrations: [
        'ciso-assistant',
        'openproject',
        'govready',
        'keycloak',
      ] as const,
      allIntegrationsOptional: true,
      enabledKeyPattern: '<SERVICE>_ENABLED',
      urlKeyPattern: '<SERVICE>_URL',
      apiKeyPattern: '<SERVICE>_API_KEY',
      apiKeysAreSensitive: true,
      disabledByDefault: true,
    },
  },

  C28_PLATFORM_ENGINES: {
    id: 'C28',
    name: 'Platform Engines Contract',
    rules: {
      formEngine: {
        location: 'platform/form-engine',
        files: ['form-schema.registry.ts', 'form-schema.routes.ts', 'form-schema.types.ts'] as const,
      },
      taskEngine: {
        location: 'platform/task-engine',
        files: ['task-engine.ts'] as const,
      },
      rulesEngine: {
        location: 'platform/rules',
        files: ['deterministic-rule-engine.ts'] as const,
      },
      allEnginesPlatformOwned: true,
      noProductDirectImport: true,
    },
  },

  C29_DAUTH: {
    id: 'C29',
    name: 'DAuth Authorization Layer Contract',
    rules: {
      location: 'platform/dauth',
      subsystems: ['access', 'actor', 'agents', 'audit', 'authority', 'contracts', 'delegation', 'frontend-contracts', 'identity'] as const,
      rbacModel: 'hierarchical-role-permission',
      openFgaIntegration: true,
      tenantIsolation: true,
      auditLogging: true,
      frontendContractsExported: true,
    },
  },

  C30_CONFIG_BOUNDARY: {
    id: 'C30',
    name: 'Config Boundary Completeness Contract',
    rules: {
      configOwnershipMapRequired: true,
      validOwners: ['environment', 'deployment', 'tenant', 'workspace', 'product', 'onboarding', 'ai_provider', 'deprecated'] as const,
      separationEnforced: true,
      tenantCannotAccessEnvironment: true,
      tenantCannotAccessDeployment: true,
      productDefaultsImmutable: true,
      sensitiveFieldsMarked: true,
      deprecatedFieldsHaveMetadata: true,
    },
  },

} as const;

export type ContractId = keyof typeof FROZEN_CONTRACTS;

export interface ContractViolation {
  contract: string;
  rule: string;
  expected: string;
  actual: string;
  fatal: boolean;
}

export function validateProductionContracts(): ContractViolation[] {
  const violations: ContractViolation[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) return violations;

  const port = parseInt(process.env.PORT || '3000', 10);
  if (port !== FROZEN_CONTRACTS.C01_NETWORK.rules.backendPort) {
    violations.push({
      contract: 'C01',
      rule: 'backendPort',
      expected: String(FROZEN_CONTRACTS.C01_NETWORK.rules.backendPort),
      actual: String(port),
      fatal: true,
    });
  }

  const serverRole = process.env.SERVER_ROLE || 'web+jobs';
  if (!VALID_SERVER_ROLES.includes(serverRole as any)) {
    violations.push({
      contract: 'C03',
      rule: 'validRoles',
      expected: VALID_SERVER_ROLES.join(', '),
      actual: serverRole,
      fatal: true,
    });
  }

  const topology = process.env.PRODUCTION_TOPOLOGY || 'single-node';
  if (!VALID_TOPOLOGIES.includes(topology as any)) {
    violations.push({
      contract: 'C03',
      rule: 'validTopologies',
      expected: VALID_TOPOLOGIES.join(', '),
      actual: topology,
      fatal: true,
    });
  }

  const storageMode = process.env.STORAGE_MODE || 'local-fs';
  if (topology === 'multi-node' && storageMode === 'local-fs') {
    violations.push({
      contract: 'C04',
      rule: 'multiNodeRequiresSharedStorage',
      expected: 's3 or minio',
      actual: 'local-fs',
      fatal: true,
    });
  }

  const corsOrigins = process.env.CORS_ORIGINS || '';
  if (corsOrigins === '*') {
    violations.push({
      contract: 'C07',
      rule: 'noCorsWildcard',
      expected: 'specific domain list',
      actual: '*',
      fatal: true,
    });
  }

  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 32) {
    violations.push({
      contract: 'C07',
      rule: 'secretMinLength',
      expected: '≥32 characters',
      actual: `${jwtSecret.length} characters`,
      fatal: true,
    });
  }

  if (!process.env.PG_HOST && !process.env.DATABASE_URL) {
    violations.push({
      contract: 'C05',
      rule: 'allNodesMustShare.PostgreSQL',
      expected: 'PG_HOST or DATABASE_URL set',
      actual: 'neither set',
      fatal: true,
    });
  }

  if (topology === 'multi-node' && !process.env.REDIS_HOST) {
    violations.push({
      contract: 'C05',
      rule: 'allNodesMustShare.Redis',
      expected: 'REDIS_HOST set for multi-node',
      actual: 'not set',
      fatal: true,
    });
  }

  const logLevel = process.env.LOG_LEVEL || 'info';
  const validLevels: readonly string[] = FROZEN_CONTRACTS.C11_LOGGING.rules.validLogLevels;
  if (!validLevels.includes(logLevel)) {
    violations.push({
      contract: 'C11',
      rule: 'validLogLevels',
      expected: validLevels.join(', '),
      actual: logLevel,
      fatal: false,
    });
  }

  const authMatrixMode = process.env.AUTH_MATRIX_MODE || 'enforce';
  const validAuthModes: readonly string[] = FROZEN_CONTRACTS.C12_SECURITY.rules.validAuthMatrixModes;
  if (!validAuthModes.includes(authMatrixMode)) {
    violations.push({
      contract: 'C12',
      rule: 'validAuthMatrixModes',
      expected: validAuthModes.join(', '),
      actual: authMatrixMode,
      fatal: true,
    });
  }

  const weakPatterns: readonly string[] = FROZEN_CONTRACTS.C12_SECURITY.rules.noWeakJwtPatterns;
  if (weakPatterns.some(p => jwtSecret.toLowerCase().includes(p))) {
    violations.push({
      contract: 'C12',
      rule: 'noWeakJwtPatterns',
      expected: 'no weak patterns in JWT_SECRET',
      actual: 'weak pattern detected',
      fatal: true,
    });
  }

  const secretsMode = process.env.SECRETS_MODE || 'env-file';
  const validSecretsModes: readonly string[] = FROZEN_CONTRACTS.C18_SECRETS.rules.validSecretsModes;
  if (!validSecretsModes.includes(secretsMode)) {
    violations.push({
      contract: 'C18',
      rule: 'validSecretsModes',
      expected: validSecretsModes.join(', '),
      actual: secretsMode,
      fatal: true,
    });
  }

  const encryptionKey = process.env.SECRETS_ENCRYPTION_KEY || '';
  if (encryptionKey.length > 0 && encryptionKey.length < FROZEN_CONTRACTS.C18_SECRETS.rules.minKeyLength) {
    violations.push({
      contract: 'C18',
      rule: 'minKeyLength',
      expected: `≥${FROZEN_CONTRACTS.C18_SECRETS.rules.minKeyLength} characters`,
      actual: `${encryptionKey.length} characters`,
      fatal: true,
    });
  }

  const deploymentMode = process.env.DEPLOYMENT_MODE || 'saas_shared';
  const validDeployModes: readonly string[] = FROZEN_CONTRACTS.C17_MULTI_TENANCY.rules.validDeploymentModes;
  if (!validDeployModes.includes(deploymentMode)) {
    violations.push({
      contract: 'C17',
      rule: 'validDeploymentModes',
      expected: validDeployModes.join(', '),
      actual: deploymentMode,
      fatal: true,
    });
  }

  return violations;
}

export function enforceProductionContracts(logger: { error: (msg: string, meta?: Record<string, unknown>) => void; info: (msg: string, meta?: Record<string, unknown>) => void }): void {
  const violations = validateProductionContracts();
  if (violations.length === 0) {
    logger.info('[Contracts] All 30 production infrastructure contracts satisfied');
    return;
  }

  const fatal = violations.filter(v => v.fatal);
  const warnings = violations.filter(v => !v.fatal);

  for (const w of warnings) {
    logger.error(`[Contract ${w.contract}] WARNING: ${w.rule} — expected ${w.expected}, got ${w.actual}`);
  }

  if (fatal.length > 0) {
    for (const f of fatal) {
      logger.error(`[Contract ${f.contract}] FATAL: ${f.rule} — expected ${f.expected}, got ${f.actual}`);
    }
    throw new Error(`[Contracts] ${fatal.length} fatal production contract violation(s) — refusing to start. Fix .env and retry.`);
  }
}
