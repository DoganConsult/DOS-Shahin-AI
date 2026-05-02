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
export declare const FROZEN_CONTRACTS: {
    readonly C01_NETWORK: {
        readonly id: "C01";
        readonly name: "Network / Traffic Path";
        readonly rules: {
            readonly publicPath: "Cloudflare → cloudflared → Nginx:80 → backend:3000";
            readonly nginxListenPort: 80;
            readonly backendBindHost: "127.0.0.1";
            readonly backendPort: 3000;
            readonly backendPublicExposure: false;
        };
    };
    readonly C02_PROXY: {
        readonly id: "C02";
        readonly name: "Proxy / Header Contract";
        readonly rules: {
            readonly requiredNginxHeaders: readonly ["Host", "X-Real-IP", "X-Forwarded-For", "X-Forwarded-Proto"];
            readonly trustProxyInProduction: true;
            readonly trustProxyValue: 1;
        };
    };
    readonly C03_RUNTIME_ROLE: {
        readonly id: "C03";
        readonly name: "Runtime Role Contract";
        readonly rules: {
            readonly validRoles: readonly ["web", "web+jobs", "jobs-only"];
            readonly validTopologies: readonly ["single-node", "multi-node"];
            readonly processesPerServer: readonly ["cloudflared", "nginx", "pm2", "backend"];
            readonly schedulerGating: {
                readonly webOnly: {
                    readonly schedulers: false;
                    readonly migrations: false;
                    readonly seeds: false;
                };
                readonly webPlusJobs: {
                    readonly schedulers: true;
                    readonly migrations: true;
                    readonly seeds: true;
                };
                readonly jobsOnly: {
                    readonly schedulers: true;
                    readonly migrations: true;
                    readonly seeds: true;
                };
            };
            readonly singletonJobProtection: "redis-distributed-lock";
            readonly clusterLeaderOnly: "NODE_APP_INSTANCE === 0";
        };
    };
    readonly C04_STATE: {
        readonly id: "C04";
        readonly name: "Stateless Application Contract";
        readonly rules: {
            readonly noInMemorySessions: true;
            readonly noLocalOnlyUploads: true;
            readonly sessionBackend: "jwt-stateless";
            readonly cacheBackend: "redis-with-memory-fallback";
            readonly fileStorageBackend: "STORAGE_MODE env (local-fs | s3 | minio)";
            readonly multiNodeRequiresSharedStorage: true;
            readonly noCorrectnessDependingOnSingleNodeCache: true;
        };
    };
    readonly C05_SHARED_SERVICES: {
        readonly id: "C05";
        readonly name: "Shared Services Contract";
        readonly rules: {
            readonly allNodesMustShare: readonly ["PostgreSQL (PG_HOST/DATABASE_URL)", "Redis (REDIS_HOST)", "Temporal (TEMPORAL_ADDRESS)", "Object/File Storage (STORAGE_MODE)", "ClickHouse (CLICKHOUSE_HOST)"];
            readonly sameEnvKeysAcrossNodes: true;
            readonly noNodeLocalDatabases: true;
            readonly noNodeLocalQueues: true;
        };
    };
    readonly C06_DEPLOYMENT: {
        readonly id: "C06";
        readonly name: "Deployment Parity Contract";
        readonly rules: {
            readonly pinnedNodeVersion: ".nvmrc";
            readonly pinnedPnpmVersion: "package.json#packageManager";
            readonly sameBuildArtifact: "dist/ from single CI build";
            readonly sameEcosystemConfig: "ecosystem.config.js";
            readonly sameNginxTemplate: "infrastructure/ops/system/nginx-shahin-ai.conf";
            readonly sameCloudflaredIngress: true;
            readonly buildManifestRequired: "dist/build-manifest.json";
        };
    };
    readonly C07_ENVIRONMENT: {
        readonly id: "C07";
        readonly name: "Environment Schema Contract";
        readonly rules: {
            readonly requiredInProduction: readonly ["JWT_SECRET", "PG_HOST", "PG_PASSWORD", "PG_DATABASE", "PG_USER", "CORS_ORIGINS"];
            readonly serverRoleKey: "SERVER_ROLE";
            readonly topologyKey: "PRODUCTION_TOPOLOGY";
            readonly schedulerFlagKey: "DISABLE_SCHEDULERS";
            readonly secretMinLength: 32;
            readonly noCorsWildcard: true;
            readonly canonicalTemplate: "infrastructure/ops/.env.production.template";
        };
    };
    readonly C08_HEALTH: {
        readonly id: "C08";
        readonly name: "Health / Readiness Contract";
        readonly rules: {
            readonly endpoints: {
                readonly basic: "/api/health";
                readonly ready: "/api/health/ready";
                readonly live: "/api/health/live";
                readonly deep: "/api/health/deep";
                readonly preflight: "/api/preflight";
                readonly metrics: "/api/metrics/prometheus";
            };
            readonly pm2ReadySignal: "process.send('ready')";
            readonly pm2WaitReady: true;
            readonly pm2ListenTimeout: 600000;
            readonly pm2KillTimeout: 60000;
            readonly startupReadyFlag: "isStartupReady()";
            readonly readyMeansDbConnected: true;
            readonly readyMeansRedisChecked: true;
        };
    };
    readonly C09_DATABASE: {
        readonly id: "C09";
        readonly name: "Database / Migration Contract";
        readonly rules: {
            readonly migrationLockMechanism: "pg_advisory_lock";
            readonly startupMigrationLockId: 90000;
            readonly migrationRunnerLockKey: 900100;
            readonly onlyInstance0RunsMigrations: true;
            readonly webRoleSkipsMigrations: true;
            readonly noRaceConditionOnStartup: true;
            readonly migrationOrder: readonly ["master", "tenant", "dedicated-db-tenants"];
        };
    };
    readonly C10_ROLLBACK: {
        readonly id: "C10";
        readonly name: "Rollback Contract";
        readonly rules: {
            readonly backupBeforeDeploy: true;
            readonly backupContents: readonly ["backend-dist", "frontend-browser", "migrations", "ecosystem.config.js"];
            readonly pm2ReloadOnRollback: true;
            readonly nginxUnchangedDuringAppRollback: true;
            readonly healthCheckAfterRollback: "/api/health";
            readonly healthCheckRetries: 6;
            readonly healthCheckIntervalMs: 4000;
            readonly cloudflareFailback: "DNS failover or tunnel disable";
        };
    };
    readonly C11_LOGGING: {
        readonly id: "C11";
        readonly name: "Logging / Observability Contract";
        readonly rules: {
            readonly logFormat: "structured-json-pino";
            readonly logLevelKey: "LOG_LEVEL";
            readonly validLogLevels: readonly ["fatal", "error", "warn", "info", "debug", "trace"];
            readonly correlationIdHeader: "x-correlation-id";
            readonly otelServiceNameKey: "OTEL_SERVICE_NAME";
            readonly otelExporterKey: "OTEL_EXPORTER";
            readonly logFilePaths: {
                readonly pm2Error: "/home/Dr-Dogan-AGRC-OS/logs/pm2-error.log";
                readonly pm2Out: "/home/Dr-Dogan-AGRC-OS/logs/pm2-out.log";
            };
            readonly noConsoleLogInProduction: true;
            readonly requestLoggingEnabled: true;
        };
    };
    readonly C12_SECURITY: {
        readonly id: "C12";
        readonly name: "Security Hardening Contract";
        readonly rules: {
            readonly helmetEnabled: true;
            readonly cspEnforced: true;
            readonly hstsViaCloudflare: true;
            readonly noXPoweredBy: true;
            readonly authMatrixModeKey: "AUTH_MATRIX_MODE";
            readonly validAuthMatrixModes: readonly ["off", "shadow", "enforce", "dual"];
            readonly productionAuthMatrixMode: "enforce";
            readonly rateLimitingPresent: true;
            readonly noWeakJwtPatterns: readonly ["dev-secret", "change-me", "secret", "password", "test", "123", "default-key"];
            readonly jwtRefreshSecretRequired: true;
            readonly encryptionKeyMinLength: 32;
        };
    };
    readonly C13_GRACEFUL_SHUTDOWN: {
        readonly id: "C13";
        readonly name: "Graceful Shutdown Contract";
        readonly rules: {
            readonly signals: readonly ["SIGTERM", "SIGINT"];
            readonly drainTimeoutMs: 30000;
            readonly resourceCleanupOrder: readonly ["http-server", "websocket", "database", "redis", "langfuse"];
            readonly pm2KillTimeout: 60000;
            readonly unhandledRejectionHandler: true;
            readonly uncaughtExceptionHandler: true;
            readonly exitCodeClean: 0;
            readonly exitCodeTimeout: 1;
        };
    };
    readonly C14_FRONTEND: {
        readonly id: "C14";
        readonly name: "Frontend Build / Serving Contract";
        readonly rules: {
            readonly framework: "Angular 21";
            readonly buildOutputPath: "frontend/dist/shahin-ai/browser";
            readonly nginxServeRoot: "/home/Dr-Dogan-AGRC-OS/frontend/dist/shahin-ai/browser";
            readonly spaFallback: "try_files $uri $uri/ /index.html";
            readonly staticAssetCaching: "1y immutable";
            readonly indexCaching: "no-cache, no-store, must-revalidate";
            readonly gzipEnabled: true;
            readonly serviceWorkerScope: "/";
        };
    };
    readonly C15_TEMPORAL: {
        readonly id: "C15";
        readonly name: "Temporal Worker Topology Contract";
        readonly rules: {
            readonly enabledKey: "TEMPORAL_ENABLED";
            readonly addressKey: "TEMPORAL_ADDRESS";
            readonly namespaceKey: "TEMPORAL_NAMESPACE";
            readonly workerProcesses: readonly ["temporal-general-worker", "temporal-provisioning-worker", "temporal-agent-worker", "temporal-evidence-worker", "temporal-sla-worker", "temporal-compliance-worker", "temporal-risk-worker", "temporal-reports-worker", "temporal-quality-gate-worker"];
            readonly generalWorkerInstances: 2;
            readonly scheduleRegistration: "startup-instance-0-only";
            readonly healthCheckIncludesTemporal: true;
        };
    };
    readonly C16_AI_PROVIDER: {
        readonly id: "C16";
        readonly name: "AI / LLM Provider Contract";
        readonly rules: {
            readonly providerModeKey: "AI_PROVIDER";
            readonly validProviderModes: readonly ["auto", "anthropic", "azure-openai", "google", "ollama", "groq", "openrouter"];
            readonly fallbackProviderKey: "AI_FALLBACK_PROVIDER";
            readonly modelSelectionKey: "CLAUDE_MODEL";
            readonly langgraphEnabledKey: "LANGGRAPH_AGENTS_ENABLED";
            readonly maxToolIterationsKey: "LANGGRAPH_MAX_TOOL_ITERATIONS";
            readonly noHardcodedApiKeys: true;
            readonly apiKeysFromEnvOnly: true;
            readonly langfuseObservabilityKey: "LANGFUSE_ENABLED";
        };
    };
    readonly C17_MULTI_TENANCY: {
        readonly id: "C17";
        readonly name: "Multi-Tenancy Contract";
        readonly rules: {
            readonly isolationModeKey: "TENANT_ISOLATION_MODE";
            readonly validIsolationModes: readonly ["shared-schema", "dedicated-schema", "dedicated-db"];
            readonly rbacSeedingPerTenant: true;
            readonly tenantSchemaPrefix: "tenant_";
            readonly crossTenantQueryPrevention: true;
            readonly tenantContextMiddleware: true;
            readonly deploymentModeKey: "DEPLOYMENT_MODE";
            readonly validDeploymentModes: readonly ["saas_shared", "saas_dedicated", "on_prem"];
        };
    };
    readonly C18_SECRETS: {
        readonly id: "C18";
        readonly name: "Secrets Management Contract";
        readonly rules: {
            readonly secretsModeKey: "SECRETS_MODE";
            readonly validSecretsModes: readonly ["env-file", "azure-keyvault", "vault"];
            readonly encryptionKeyKey: "SECRETS_ENCRYPTION_KEY";
            readonly erpEncryptionKeyKey: "ERP_ENCRYPTION_KEY";
            readonly noPlaintextSecretsInCode: true;
            readonly noSecretsInLogs: true;
            readonly noSecretsInResponses: true;
            readonly minKeyLength: 32;
        };
    };
    readonly C19_BACKUP: {
        readonly id: "C19";
        readonly name: "Backup / Disaster Recovery Contract";
        readonly rules: {
            readonly pgDumpRequired: true;
            readonly backupRetentionDays: 30;
            readonly backupLocationSeparateFromApp: true;
            readonly restoreTestRequired: true;
            readonly deployBackupContents: readonly ["backend-dist", "frontend-browser", "migrations", "ecosystem.config.js"];
            readonly walArchivingRecommended: true;
        };
    };
    readonly C20_PROCESS: {
        readonly id: "C20";
        readonly name: "Process Management Contract";
        readonly rules: {
            readonly processManager: "pm2";
            readonly clusterMode: true;
            readonly backendInstances: 2;
            readonly maxMemoryRestart: "2000M";
            readonly maxRestarts: 15;
            readonly minUptime: "10s";
            readonly restartDelay: 3000;
            readonly watchDisabled: true;
            readonly logDateFormat: "YYYY-MM-DD HH:mm:ss Z";
            readonly mergeLogs: true;
            readonly nodeArgs: "--max-old-space-size=1536 --max-http-header-size=16384";
        };
    };
    readonly C21_CLICKHOUSE: {
        readonly id: "C21";
        readonly name: "ClickHouse Analytics Contract";
        readonly rules: {
            readonly hostKey: "CLICKHOUSE_HOST";
            readonly portKey: "CLICKHOUSE_PORT";
            readonly databaseKey: "CLICKHOUSE_DATABASE";
            readonly defaultDatabase: "langfuse";
            readonly defaultPort: 8123;
            readonly protocolKey: "CLICKHOUSE_PROTOCOL";
            readonly validProtocols: readonly ["http", "https"];
            readonly requiredForLangfuse: true;
        };
    };
    readonly C22_MCP: {
        readonly id: "C22";
        readonly name: "MCP Server Contract";
        readonly rules: {
            readonly enabledKey: "MCP_ENABLED";
            readonly portKey: "MCP_PORT";
            readonly defaultPort: 8080;
            readonly transportKey: "MCP_TRANSPORT";
            readonly validTransports: readonly ["http", "sse", "stdio"];
            readonly authRequiredKey: "MCP_AUTH_REQUIRED";
            readonly authTokenKey: "MCP_AUTH_TOKEN";
            readonly pm2ProcessName: "mcp-standalone";
            readonly pm2ExecMode: "fork";
            readonly pm2Instances: 1;
            readonly pm2MaxMemory: "256M";
            readonly pm2Autorestart: false;
        };
    };
    readonly C23_OPENCLAW: {
        readonly id: "C23";
        readonly name: "OpenClaw MCP Server Contract";
        readonly rules: {
            readonly enabledKey: "OPENCLAW_ENABLED";
            readonly portKey: "OPENCLAW_PORT";
            readonly defaultPort: 8081;
            readonly hostKey: "OPENCLAW_HOST";
            readonly transportKey: "OPENCLAW_TRANSPORT";
            readonly validTransports: readonly ["http", "sse", "both"];
            readonly authRequiredKey: "OPENCLAW_AUTH_REQUIRED";
            readonly rateLimitEnabledKey: "OPENCLAW_RATE_LIMIT_ENABLED";
            readonly rateLimitWindowMs: 60000;
            readonly rateLimitMaxRequests: 100;
            readonly pm2ProcessName: "openclaw-server";
            readonly pm2ExecMode: "fork";
            readonly pm2Instances: 1;
            readonly pm2MaxMemory: "670M";
        };
    };
    readonly C24_LANGFUSE: {
        readonly id: "C24";
        readonly name: "Langfuse Observability Server Contract";
        readonly rules: {
            readonly enabledKey: "LANGFUSE_ENABLED";
            readonly hostKey: "LANGFUSE_HOST";
            readonly defaultHost: "http://localhost:3001";
            readonly publicKeyKey: "LANGFUSE_PUBLIC_KEY";
            readonly secretKeyKey: "LANGFUSE_SECRET_KEY";
            readonly pm2ProcessName: "langfuse";
            readonly pm2Port: 3001;
            readonly pm2ExecMode: "fork";
            readonly pm2Instances: 1;
            readonly pm2MaxMemory: "512M";
            readonly requiresClickHouse: true;
            readonly requiresPostgres: true;
        };
    };
    readonly C25_MIDDLEWARE: {
        readonly id: "C25";
        readonly name: "Middleware Stack Contract";
        readonly rules: {
            readonly requiredMiddleware: readonly ["compression", "cors", "helmet", "cookie-parser", "json-body-parser", "csrf-protection", "input-sanitization", "correlation-id", "prometheus-metrics", "request-logger", "i18n", "response-helpers", "api-versioning"];
            readonly middlewareOrder: readonly ["compression", "cors", "csp-nonce", "helmet", "cookie-parser", "json-body-parser", "input-sanitization", "csrf-protection", "swagger", "correlation-id", "prometheus-metrics", "request-logger", "i18n", "response-helpers", "api-versioning"];
            readonly csrfRequired: true;
            readonly inputSanitizationRequired: true;
            readonly rateLimitingConfigured: true;
        };
    };
    readonly C26_GRAPH_DB: {
        readonly id: "C26";
        readonly name: "Graph / Queue Extensions Contract";
        readonly rules: {
            readonly apacheAgeEnabled: true;
            readonly apacheAgeConfigFile: "config/apache-age.ts";
            readonly pgmqEnabled: true;
            readonly pgmqConfigFile: "config/pgmq.ts";
            readonly openFgaEnabled: true;
            readonly openFgaConfigFile: "config/openfga.ts";
            readonly pgvectorEnabled: true;
            readonly allExtensionsOptional: true;
            readonly gracefulDegradation: true;
        };
    };
    readonly C27_EXTERNAL_INTEGRATIONS: {
        readonly id: "C27";
        readonly name: "External Service Integrations Contract";
        readonly rules: {
            readonly supportedIntegrations: readonly ["ciso-assistant", "openproject", "govready", "keycloak"];
            readonly allIntegrationsOptional: true;
            readonly enabledKeyPattern: "<SERVICE>_ENABLED";
            readonly urlKeyPattern: "<SERVICE>_URL";
            readonly apiKeyPattern: "<SERVICE>_API_KEY";
            readonly apiKeysAreSensitive: true;
            readonly disabledByDefault: true;
        };
    };
    readonly C28_PLATFORM_ENGINES: {
        readonly id: "C28";
        readonly name: "Platform Engines Contract";
        readonly rules: {
            readonly formEngine: {
                readonly location: "platform/form-engine";
                readonly files: readonly ["form-schema.registry.ts", "form-schema.routes.ts", "form-schema.types.ts"];
            };
            readonly taskEngine: {
                readonly location: "platform/task-engine";
                readonly files: readonly ["task-engine.ts"];
            };
            readonly rulesEngine: {
                readonly location: "platform/rules";
                readonly files: readonly ["deterministic-rule-engine.ts"];
            };
            readonly allEnginesPlatformOwned: true;
            readonly noProductDirectImport: true;
        };
    };
    readonly C29_DAUTH: {
        readonly id: "C29";
        readonly name: "DAuth Authorization Layer Contract";
        readonly rules: {
            readonly location: "platform/dauth";
            readonly subsystems: readonly ["access", "actor", "agents", "audit", "authority", "contracts", "delegation", "frontend-contracts", "identity"];
            readonly rbacModel: "hierarchical-role-permission";
            readonly openFgaIntegration: true;
            readonly tenantIsolation: true;
            readonly auditLogging: true;
            readonly frontendContractsExported: true;
        };
    };
    readonly C30_CONFIG_BOUNDARY: {
        readonly id: "C30";
        readonly name: "Config Boundary Completeness Contract";
        readonly rules: {
            readonly configOwnershipMapRequired: true;
            readonly validOwners: readonly ["environment", "deployment", "tenant", "workspace", "product", "onboarding", "ai_provider", "deprecated"];
            readonly separationEnforced: true;
            readonly tenantCannotAccessEnvironment: true;
            readonly tenantCannotAccessDeployment: true;
            readonly productDefaultsImmutable: true;
            readonly sensitiveFieldsMarked: true;
            readonly deprecatedFieldsHaveMetadata: true;
        };
    };
};
export type ContractId = keyof typeof FROZEN_CONTRACTS;
export interface ContractViolation {
    contract: string;
    rule: string;
    expected: string;
    actual: string;
    fatal: boolean;
}
export declare function validateProductionContracts(): ContractViolation[];
export declare function enforceProductionContracts(logger: {
    error: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
}): void;
