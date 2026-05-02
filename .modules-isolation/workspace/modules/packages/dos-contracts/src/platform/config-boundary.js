"use strict";
/**
 * Config Boundary — ownership classification for all configuration fields.
 *
 * HIERARCHY SEPARATION RULES:
 *   - environment/deployment: infrastructure, never tenant-visible
 *   - product: product defaults (Shahin-specific), separate from tenant overrides
 *   - tenant: per-customer overrides only (branding, toggles, preferences)
 *   - workspace: workspace-level settings (subset of tenant)
 *   - onboarding: onboarding-flow-specific settings
 *   - ai_provider: AI provider keys and model selection
 *
 * CRITICAL: tenant config ≠ product config ≠ environment config
 * See platform/hierarchy-contracts.ts for full hierarchy.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_TOPOLOGIES = exports.VALID_SERVER_ROLES = exports.CONFIG_OWNERSHIP_MAP = void 0;
exports.getServerRole = getServerRole;
exports.getProductionTopology = getProductionTopology;
exports.isSchedulerEnabled = isSchedulerEnabled;
exports.isMigrationOwner = isMigrationOwner;
exports.getConfigFieldsByOwner = getConfigFieldsByOwner;
exports.getConfigFieldOwner = getConfigFieldOwner;
exports.isEnvironmentSecret = isEnvironmentSecret;
exports.isTenantVisibleConfig = isTenantVisibleConfig;
exports.isTenantForbiddenConfig = isTenantForbiddenConfig;
exports.isProductConfig = isProductConfig;
exports.validateConfigBoundarySeparation = validateConfigBoundarySeparation;
exports.CONFIG_OWNERSHIP_MAP = [
    // ── Environment / Infrastructure ──
    { key: 'PG_HOST', owner: 'environment', description: 'PostgreSQL host', sensitive: false, mutable: false },
    { key: 'PG_PORT', owner: 'environment', description: 'PostgreSQL port', sensitive: false, mutable: false },
    { key: 'PG_DATABASE', owner: 'environment', description: 'PostgreSQL database name', sensitive: false, mutable: false },
    { key: 'PG_USER', owner: 'environment', description: 'PostgreSQL user', sensitive: false, mutable: false },
    { key: 'PG_PASSWORD', owner: 'environment', description: 'PostgreSQL password', sensitive: true, mutable: false },
    { key: 'DATABASE_URL', owner: 'environment', description: 'PostgreSQL connection URL', sensitive: true, mutable: false },
    { key: 'PG_SSL', owner: 'environment', description: 'PostgreSQL SSL enabled', sensitive: false, mutable: false },
    { key: 'PG_SSL_CA', owner: 'environment', description: 'PostgreSQL SSL CA cert path', sensitive: false, mutable: false },
    { key: 'PG_POOL_MAX', owner: 'environment', description: 'PostgreSQL pool max connections', sensitive: false, mutable: false },
    { key: 'REDIS_HOST', owner: 'environment', description: 'Redis host', sensitive: false, mutable: false },
    { key: 'REDIS_PORT', owner: 'environment', description: 'Redis port', sensitive: false, mutable: false },
    { key: 'REDIS_PASSWORD', owner: 'environment', description: 'Redis password', sensitive: true, mutable: false },
    { key: 'JWT_SECRET', owner: 'environment', description: 'JWT signing secret', sensitive: true, mutable: false },
    { key: 'JWT_EXPIRES_IN', owner: 'environment', description: 'JWT token expiry', sensitive: false, mutable: false },
    { key: 'SECRETS_ENCRYPTION_KEY', owner: 'environment', description: 'Encryption key for credentials', sensitive: true, mutable: false },
    { key: 'ERP_ENCRYPTION_KEY', owner: 'environment', description: 'ERP data encryption key', sensitive: true, mutable: false },
    { key: 'NODE_ENV', owner: 'environment', description: 'Runtime environment mode', sensitive: false, mutable: false },
    { key: 'PORT', owner: 'environment', description: 'Server listen port', sensitive: false, mutable: false },
    { key: 'LOG_LEVEL', owner: 'environment', description: 'Logging verbosity', sensitive: false, mutable: false },
    { key: 'CORS_ORIGINS', owner: 'environment', description: 'Allowed CORS origins', sensitive: false, mutable: false },
    // ── Deployment ──
    { key: 'TEMPORAL_ENABLED', owner: 'deployment', description: 'Temporal workflow engine enabled', sensitive: false, mutable: false },
    { key: 'TEMPORAL_ADDRESS', owner: 'deployment', description: 'Temporal server address', sensitive: false, mutable: false },
    { key: 'TEMPORAL_NAMESPACE', owner: 'deployment', description: 'Temporal namespace', sensitive: false, mutable: false },
    { key: 'TEMPORAL_PROVISIONING_ENABLED', owner: 'deployment', description: 'Temporal provisioning workflows', sensitive: false, mutable: false },
    { key: 'LANGGRAPH_AGENTS_ENABLED', owner: 'deployment', description: 'LangGraph agent runtime', sensitive: false, mutable: false },
    { key: 'OTEL_ENABLED', owner: 'deployment', description: 'OpenTelemetry tracing', sensitive: false, mutable: false },
    { key: 'OTEL_EXPORTER', owner: 'deployment', description: 'Telemetry exporter type', sensitive: false, mutable: false },
    { key: 'DISABLE_SCHEDULERS', owner: 'deployment', description: 'Disable background schedulers', sensitive: false, mutable: false },
    { key: 'SETUP_TOKEN', owner: 'deployment', description: 'Admin setup/diagnostics token', sensitive: true, mutable: false },
    { key: 'KEYCLOAK_URL', owner: 'deployment', description: 'Keycloak SSO endpoint', sensitive: false, mutable: false },
    { key: 'KEYCLOAK_REALM', owner: 'deployment', description: 'Keycloak realm', sensitive: false, mutable: false },
    // ── AI / Provider ──
    { key: 'AI_PROVIDER', owner: 'ai_provider', description: 'Primary AI provider mode', sensitive: false, mutable: true },
    { key: 'AI_FALLBACK_PROVIDER', owner: 'ai_provider', description: 'Fallback provider preference', sensitive: false, mutable: true },
    { key: 'ANTHROPIC_API_KEY', owner: 'ai_provider', description: 'Claude API key', sensitive: true, mutable: true },
    { key: 'CLAUDE_API_KEY', owner: 'ai_provider', description: 'Claude API key (alias)', sensitive: true, mutable: true },
    { key: 'CLAUDE_MODEL', owner: 'ai_provider', description: 'Claude model selection', sensitive: false, mutable: true },
    { key: 'AZURE_OPENAI_ENDPOINT', owner: 'ai_provider', description: 'Azure OpenAI endpoint', sensitive: false, mutable: true },
    { key: 'AZURE_OPENAI_API_KEY', owner: 'ai_provider', description: 'Azure OpenAI API key', sensitive: true, mutable: true },
    { key: 'AZURE_OPENAI_API_VERSION', owner: 'ai_provider', description: 'Azure OpenAI API version', sensitive: false, mutable: true },
    { key: 'AZURE_EMBEDDING_DEPLOYMENT', owner: 'ai_provider', description: 'Azure embedding deployment', sensitive: false, mutable: true },
    { key: 'OLLAMA_HOST', owner: 'ai_provider', description: 'Ollama local LLM endpoint', sensitive: false, mutable: true },
    { key: 'OLLAMA_EMBED_MODEL', owner: 'ai_provider', description: 'Ollama embedding model', sensitive: false, mutable: true },
    { key: 'GROQ_API_KEY', owner: 'ai_provider', description: 'Groq free LLM key', sensitive: true, mutable: true },
    { key: 'GOOGLE_API_KEY', owner: 'ai_provider', description: 'Google Gemini API key', sensitive: true, mutable: true },
    { key: 'OPENROUTER_API_KEY', owner: 'ai_provider', description: 'OpenRouter API key', sensitive: true, mutable: true },
    { key: 'TOGETHER_API_KEY', owner: 'ai_provider', description: 'Together AI API key', sensitive: true, mutable: true },
    { key: 'CEREBRAS_API_KEY', owner: 'ai_provider', description: 'Cerebras API key', sensitive: true, mutable: true },
    { key: 'MISTRAL_API_KEY', owner: 'ai_provider', description: 'Mistral API key', sensitive: true, mutable: true },
    { key: 'DEEPSEEK_API_KEY', owner: 'ai_provider', description: 'DeepSeek API key', sensitive: true, mutable: true },
    { key: 'SAMBANOVA_API_KEY', owner: 'ai_provider', description: 'SambaNova API key', sensitive: true, mutable: true },
    { key: 'AZURE_SEARCH_ENDPOINT', owner: 'ai_provider', description: 'Azure AI Search endpoint', sensitive: false, mutable: true },
    { key: 'AZURE_SEARCH_INDEX', owner: 'ai_provider', description: 'Azure AI Search index', sensitive: false, mutable: true },
    { key: 'LANGCHAIN_API_KEY', owner: 'ai_provider', description: 'LangChain tracing key', sensitive: true, mutable: true },
    { key: 'LANGCHAIN_PROJECT', owner: 'ai_provider', description: 'LangChain project name', sensitive: false, mutable: true },
    { key: 'LANGGRAPH_MAX_TOOL_ITERATIONS', owner: 'ai_provider', description: 'Max tool iterations', sensitive: false, mutable: true },
    // ── Azure Identity (deployment + environment) ──
    { key: 'AZURE_TENANT_ID', owner: 'deployment', description: 'Azure AD tenant ID', sensitive: false, mutable: false },
    { key: 'AZURE_CLIENT_ID', owner: 'deployment', description: 'Azure app client ID', sensitive: false, mutable: false },
    { key: 'AZURE_CLIENT_SECRET', owner: 'deployment', description: 'Azure app client secret', sensitive: true, mutable: false },
    { key: 'AZURE_SUBSCRIPTION_ID', owner: 'deployment', description: 'Azure subscription ID', sensitive: false, mutable: false },
    { key: 'AZURE_RESOURCE_GROUP', owner: 'deployment', description: 'Azure resource group', sensitive: false, mutable: false },
    { key: 'AZURE_COPILOT_CLIENT_ID', owner: 'deployment', description: 'Copilot Studio client ID', sensitive: false, mutable: false },
    { key: 'AZURE_COPILOT_CLIENT_SECRET', owner: 'deployment', description: 'Copilot Studio client secret', sensitive: true, mutable: false },
    { key: 'AZURE_BOT_SERVICE_NAME', owner: 'deployment', description: 'Azure Bot Service name', sensitive: false, mutable: false },
    { key: 'AZURE_BOT_SECRET_KEY', owner: 'deployment', description: 'Azure Bot secret key', sensitive: true, mutable: false },
    { key: 'AZURE_MAINSERVER_CLIENT_ID', owner: 'deployment', description: 'Main server app registration', sensitive: false, mutable: false },
    // ── Email (deployment-level infrastructure) ──
    { key: 'EMAIL_AUTH_TYPE', owner: 'deployment', description: 'Email auth method (oauth2/smtp)', sensitive: false, mutable: false },
    { key: 'EMAIL_FROM', owner: 'deployment', description: 'Default email sender', sensitive: false, mutable: false },
    { key: 'SMTP_HOST', owner: 'deployment', description: 'SMTP server host', sensitive: false, mutable: false },
    { key: 'SMTP_PORT', owner: 'deployment', description: 'SMTP server port', sensitive: false, mutable: false },
    { key: 'SMTP_USER', owner: 'deployment', description: 'SMTP username', sensitive: false, mutable: false },
    { key: 'SMTP_PASS', owner: 'deployment', description: 'SMTP password', sensitive: true, mutable: false },
    // ── Platform admin (deployment) ──
    { key: 'PLATFORM_ADMIN_EMAIL', owner: 'deployment', description: 'Platform admin email', sensitive: false, mutable: false },
    { key: 'PLATFORM_ADMIN_PASSWORD', owner: 'deployment', description: 'Platform admin password', sensitive: true, mutable: false },
    { key: 'PLATFORM_ADMIN_NAME', owner: 'deployment', description: 'Platform admin display name', sensitive: false, mutable: false },
    // ── Deployment Profile ──
    { key: 'DEPLOYMENT_MODE', owner: 'deployment', description: 'Deployment mode (saas/on-prem-single/on-prem-multi/hybrid)', sensitive: false, mutable: false },
    { key: 'TENANT_ISOLATION_MODE', owner: 'deployment', description: 'Tenant isolation (shared-schema/dedicated-schema/dedicated-db)', sensitive: false, mutable: false },
    { key: 'DEFAULT_PRODUCT_KEY', owner: 'deployment', description: 'Default product key for new tenants', sensitive: false, mutable: false },
    { key: 'ON_PREM_SINGLE_TENANT', owner: 'deployment', description: 'On-prem single tenant mode flag', sensitive: false, mutable: false },
    { key: 'ON_PREM_TENANT_ID', owner: 'deployment', description: 'On-prem single tenant identifier', sensitive: false, mutable: false },
    { key: 'ON_PREM_PRODUCT_KEY', owner: 'deployment', description: 'On-prem product key override', sensitive: false, mutable: false },
    { key: 'STORAGE_MODE', owner: 'deployment', description: 'File storage mode (azure-blob/local-fs/s3)', sensitive: false, mutable: false },
    { key: 'LOGGING_MODE', owner: 'deployment', description: 'Logging mode (cloud/file/syslog)', sensitive: false, mutable: false },
    { key: 'SECRETS_MODE', owner: 'deployment', description: 'Secrets management mode', sensitive: false, mutable: false },
    { key: 'AIR_GAPPED', owner: 'deployment', description: 'Air-gapped deployment flag', sensitive: false, mutable: false },
    { key: 'AZURE_KEY_VAULT_URL', owner: 'deployment', description: 'Azure Key Vault URL', sensitive: false, mutable: false },
    { key: 'TENANT_DB_PROVISIONER', owner: 'deployment', description: 'Tenant DB provisioning strategy', sensitive: false, mutable: false },
    { key: 'SERVER_ROLE', owner: 'deployment', description: 'Server runtime role (web|web+jobs|jobs-only)', sensitive: false, mutable: false },
    { key: 'PRODUCTION_TOPOLOGY', owner: 'deployment', description: 'Production topology (single-node|multi-node)', sensitive: false, mutable: false },
    // ── Tenant-scoped (per-tenant overrides via DB) ──
    // These are tenant-specific overrides ONLY. Product defaults belong to 'product' owner.
    { key: 'TENANT_CUSTOM_DOMAIN', owner: 'tenant', description: 'Custom domain for tenant', sensitive: false, mutable: true },
    { key: 'TENANT_LOGO_URL', owner: 'tenant', description: 'Tenant branding logo URL', sensitive: false, mutable: true },
    { key: 'TENANT_PRIMARY_COLOR', owner: 'tenant', description: 'Tenant primary brand color', sensitive: false, mutable: true },
    { key: 'TENANT_LANGUAGE', owner: 'tenant', description: 'Default language for tenant', sensitive: false, mutable: true },
    { key: 'TENANT_TIMEZONE', owner: 'tenant', description: 'Default timezone for tenant', sensitive: false, mutable: true },
    { key: 'TENANT_MFA_REQUIRED', owner: 'tenant', description: 'MFA enforcement for tenant', sensitive: false, mutable: true },
    { key: 'TENANT_SESSION_TIMEOUT_MIN', owner: 'tenant', description: 'Session timeout in minutes', sensitive: false, mutable: true },
    { key: 'TENANT_PASSWORD_POLICY', owner: 'tenant', description: 'Password policy configuration', sensitive: false, mutable: true },
    { key: 'TENANT_DATA_RETENTION_DAYS', owner: 'tenant', description: 'Data retention period in days', sensitive: false, mutable: true },
    { key: 'TENANT_BACKUP_ENABLED', owner: 'tenant', description: 'Per-tenant backup enabled', sensitive: false, mutable: true },
    { key: 'TENANT_ENABLED_MODULES', owner: 'tenant', description: 'Tenant-enabled module overrides', sensitive: false, mutable: true },
    { key: 'TENANT_AI_PROVIDERS', owner: 'tenant', description: 'Allowed AI providers for tenant', sensitive: false, mutable: true },
    { key: 'TENANT_ONBOARDING_MODE', owner: 'tenant', description: 'Onboarding mode for tenant', sensitive: false, mutable: true },
    { key: 'TENANT_WORKFLOW_TOGGLES', owner: 'tenant', description: 'Workflow feature toggles', sensitive: false, mutable: true },
    { key: 'TENANT_FEATURE_FLAGS', owner: 'tenant', description: 'Tenant-level feature flag overrides', sensitive: false, mutable: true },
    // ── ClickHouse (analytics + Langfuse backing store) ──
    { key: 'CLICKHOUSE_HOST', owner: 'environment', description: 'ClickHouse host', sensitive: false, mutable: false },
    { key: 'CLICKHOUSE_PORT', owner: 'environment', description: 'ClickHouse port', sensitive: false, mutable: false },
    { key: 'CLICKHOUSE_DATABASE', owner: 'environment', description: 'ClickHouse database name', sensitive: false, mutable: false },
    { key: 'CLICKHOUSE_USER', owner: 'environment', description: 'ClickHouse user', sensitive: false, mutable: false },
    { key: 'CLICKHOUSE_PASSWORD', owner: 'environment', description: 'ClickHouse password', sensitive: true, mutable: false },
    { key: 'CLICKHOUSE_PROTOCOL', owner: 'environment', description: 'ClickHouse protocol (http/https)', sensitive: false, mutable: false },
    // ── PostgreSQL extended ──
    { key: 'PG_IDLE_TIMEOUT_MS', owner: 'environment', description: 'PostgreSQL idle timeout (ms)', sensitive: false, mutable: false },
    { key: 'PG_CONNECTION_TIMEOUT_MS', owner: 'environment', description: 'PostgreSQL connection timeout (ms)', sensitive: false, mutable: false },
    { key: 'PG_STATEMENT_TIMEOUT_MS', owner: 'environment', description: 'PostgreSQL statement timeout (ms)', sensitive: false, mutable: false },
    // ── Redis extended ──
    { key: 'REDIS_DB', owner: 'environment', description: 'Redis database index', sensitive: false, mutable: false },
    { key: 'REDIS_PREFIX', owner: 'environment', description: 'Redis key prefix', sensitive: false, mutable: false },
    // ── JWT extended ──
    { key: 'JWT_REFRESH_SECRET', owner: 'environment', description: 'JWT refresh token signing secret', sensitive: true, mutable: false },
    // ── OpenFGA Authorization ──
    { key: 'OPENFGA_ENABLED', owner: 'deployment', description: 'OpenFGA authorization enabled', sensitive: false, mutable: false },
    { key: 'OPENFGA_API_URL', owner: 'deployment', description: 'OpenFGA server API URL', sensitive: false, mutable: false },
    { key: 'OPENFGA_STORE_ID', owner: 'deployment', description: 'OpenFGA store identifier', sensitive: false, mutable: false },
    { key: 'OPENFGA_MODEL_ID', owner: 'deployment', description: 'OpenFGA authorization model ID', sensitive: false, mutable: false },
    // ── Langfuse Observability ──
    { key: 'LANGFUSE_ENABLED', owner: 'deployment', description: 'Langfuse AI observability enabled', sensitive: false, mutable: false },
    { key: 'LANGFUSE_PUBLIC_KEY', owner: 'deployment', description: 'Langfuse public key', sensitive: false, mutable: false },
    { key: 'LANGFUSE_SECRET_KEY', owner: 'deployment', description: 'Langfuse secret key', sensitive: true, mutable: false },
    { key: 'LANGFUSE_HOST', owner: 'deployment', description: 'Langfuse server URL', sensitive: false, mutable: false },
    { key: 'LANGFUSE_PROJECT', owner: 'deployment', description: 'Langfuse project name', sensitive: false, mutable: false },
    // ── LangSmith (deprecated) ──
    { key: 'LANGCHAIN_TRACING_V2', owner: 'deprecated', description: 'LangSmith tracing (deprecated)', sensitive: false, mutable: false, deprecation: { removalVersion: '2.0.0', replacementKey: 'LANGFUSE_ENABLED', rationale: 'Migrated from LangSmith to Langfuse' } },
    { key: 'LANGSMITH_ENDPOINT', owner: 'deprecated', description: 'LangSmith endpoint (deprecated)', sensitive: false, mutable: false, deprecation: { removalVersion: '2.0.0', replacementKey: 'LANGFUSE_HOST', rationale: 'Migrated from LangSmith to Langfuse' } },
    // ── OTEL extended ──
    { key: 'OTEL_EXPORTER_OTLP_ENDPOINT', owner: 'deployment', description: 'OTel OTLP exporter endpoint', sensitive: false, mutable: false },
    { key: 'OTEL_SERVICE_NAME', owner: 'deployment', description: 'OTel service name', sensitive: false, mutable: false },
    { key: 'OTEL_SAMPLING_RATE', owner: 'deployment', description: 'OTel trace sampling rate', sensitive: false, mutable: false },
    { key: 'OTEL_DEBUG', owner: 'deployment', description: 'OTel SDK debug logging', sensitive: false, mutable: false },
    { key: 'OTEL_DISABLED', owner: 'deployment', description: 'OTel fully disabled flag', sensitive: false, mutable: false },
    // ── MCP Server ──
    { key: 'MCP_ENABLED', owner: 'deployment', description: 'MCP server enabled', sensitive: false, mutable: false },
    { key: 'MCP_PORT', owner: 'deployment', description: 'MCP server port', sensitive: false, mutable: false },
    { key: 'MCP_TRANSPORT', owner: 'deployment', description: 'MCP transport mode (http/sse)', sensitive: false, mutable: false },
    { key: 'MCP_AUTH_REQUIRED', owner: 'deployment', description: 'MCP auth requirement flag', sensitive: false, mutable: false },
    { key: 'MCP_AUTH_TOKEN', owner: 'deployment', description: 'MCP authentication token', sensitive: true, mutable: false },
    { key: 'MCP_DYNAMIC_MODE', owner: 'deployment', description: 'MCP dynamic mode flag', sensitive: false, mutable: false },
    { key: 'MCP_DEFAULT_TENANT', owner: 'deployment', description: 'MCP default tenant for requests', sensitive: false, mutable: false },
    { key: 'MCP_AGENTS_PATH', owner: 'deployment', description: 'MCP agents directory path', sensitive: false, mutable: false },
    { key: 'MCP_TOOLS_PATH', owner: 'deployment', description: 'MCP tools directory path', sensitive: false, mutable: false },
    { key: 'TOOLS_API_BASE', owner: 'deployment', description: 'Base URL for tool API calls', sensitive: false, mutable: false },
    // ── OpenClaw ──
    { key: 'OPENCLAW_ENABLED', owner: 'deployment', description: 'OpenClaw MCP server enabled', sensitive: false, mutable: false },
    { key: 'OPENCLAW_PORT', owner: 'deployment', description: 'OpenClaw server port', sensitive: false, mutable: false },
    { key: 'OPENCLAW_HOST', owner: 'deployment', description: 'OpenClaw bind host', sensitive: false, mutable: false },
    { key: 'OPENCLAW_TRANSPORT', owner: 'deployment', description: 'OpenClaw transport mode', sensitive: false, mutable: false },
    { key: 'OPENCLAW_AUTH_REQUIRED', owner: 'deployment', description: 'OpenClaw auth requirement', sensitive: false, mutable: false },
    { key: 'OPENCLAW_CORS_ORIGINS', owner: 'deployment', description: 'OpenClaw CORS allowed origins', sensitive: false, mutable: false },
    { key: 'OPENCLAW_RATE_LIMIT_ENABLED', owner: 'deployment', description: 'OpenClaw rate limiting enabled', sensitive: false, mutable: false },
    { key: 'OPENCLAW_RATE_LIMIT_WINDOW_MS', owner: 'deployment', description: 'OpenClaw rate limit window (ms)', sensitive: false, mutable: false },
    { key: 'OPENCLAW_RATE_LIMIT_MAX_REQUESTS', owner: 'deployment', description: 'OpenClaw max requests per window', sensitive: false, mutable: false },
    { key: 'OPENCLAW_API_KEY_HEADER', owner: 'deployment', description: 'OpenClaw API key header name', sensitive: false, mutable: false },
    { key: 'OPENCLAW_CONNECTOR_TIMEOUT_MS', owner: 'deployment', description: 'OpenClaw connector timeout (ms)', sensitive: false, mutable: false },
    { key: 'OPENCLAW_EXPOSE_CONNECTORS', owner: 'deployment', description: 'OpenClaw expose connector tools', sensitive: false, mutable: false },
    // ── Security / Feature Flags ──
    { key: 'AUTH_MATRIX_MODE', owner: 'deployment', description: 'Auth matrix enforcement mode', sensitive: false, mutable: false },
    { key: 'MOUNT_FILTER_MODE', owner: 'deployment', description: 'Route mount filter mode', sensitive: false, mutable: false },
    { key: 'METRICS_AUTH_TOKEN', owner: 'deployment', description: 'Prometheus metrics auth token', sensitive: true, mutable: false },
    // ── Temporal extended ──
    { key: 'TEMPORAL_CLIENT_CERT_PATH', owner: 'deployment', description: 'Temporal mTLS client cert path', sensitive: false, mutable: false },
    { key: 'TEMPORAL_CLIENT_KEY_PATH', owner: 'deployment', description: 'Temporal mTLS client key path', sensitive: false, mutable: false },
    // ── External Service Integrations ──
    { key: 'CISO_ASSISTANT_ENABLED', owner: 'deployment', description: 'CISO Assistant integration enabled', sensitive: false, mutable: false },
    { key: 'CISO_ASSISTANT_URL', owner: 'deployment', description: 'CISO Assistant server URL', sensitive: false, mutable: false },
    { key: 'CISO_ASSISTANT_API_KEY', owner: 'deployment', description: 'CISO Assistant API key', sensitive: true, mutable: false },
    { key: 'OPENPROJECT_ENABLED', owner: 'deployment', description: 'OpenProject integration enabled', sensitive: false, mutable: false },
    { key: 'OPENPROJECT_URL', owner: 'deployment', description: 'OpenProject server URL', sensitive: false, mutable: false },
    { key: 'OPENPROJECT_API_KEY', owner: 'deployment', description: 'OpenProject API key', sensitive: true, mutable: false },
    { key: 'GOVREADY_ENABLED', owner: 'deployment', description: 'GovReady integration enabled', sensitive: false, mutable: false },
    { key: 'GOVREADY_URL', owner: 'deployment', description: 'GovReady server URL', sensitive: false, mutable: false },
    { key: 'GOVREADY_API_KEY', owner: 'deployment', description: 'GovReady API key', sensitive: true, mutable: false },
    // ── Azure Key Vault ──
    { key: 'AZURE_KEYVAULT_ENABLED', owner: 'deployment', description: 'Azure Key Vault enabled', sensitive: false, mutable: false },
    { key: 'AZURE_KEYVAULT_URL', owner: 'deployment', description: 'Azure Key Vault URL', sensitive: false, mutable: false },
    // ── SMTP extended ──
    { key: 'SMTP_FROM', owner: 'deployment', description: 'SMTP from address (alias)', sensitive: false, mutable: false },
    // ── Vector Search ──
    { key: 'VECTOR_INDEX_PATH', owner: 'deployment', description: 'Vector index storage path', sensitive: false, mutable: false },
    // ── PM2 / Build Metadata ──
    { key: 'PM2_APP_NAME', owner: 'deployment', description: 'PM2 application name', sensitive: false, mutable: false },
    { key: 'APP_ROOT', owner: 'deployment', description: 'Application root directory', sensitive: false, mutable: false },
    { key: 'BUILD_COMMIT', owner: 'deployment', description: 'Git commit SHA (injected by CI)', sensitive: false, mutable: false },
    { key: 'BUILD_TIME', owner: 'deployment', description: 'Build timestamp (injected by CI)', sensitive: false, mutable: false },
    // ── Tenant pool management ──
    { key: 'MAX_TENANT_POOLS', owner: 'deployment', description: 'Max tenant DB connection pools', sensitive: false, mutable: false },
    { key: 'POOL_IDLE_TIMEOUT_MS', owner: 'deployment', description: 'Tenant pool idle timeout (ms)', sensitive: false, mutable: false },
    // ── Workspace / UI Configuration (admin-configurable at runtime) ──
    // These keys control the platform UI experience. The platform admin
    // can change them via Config Gateway Super-Seed to customize workspace appearance,
    // layout behavior, and shell defaults — no code changes required.
    { key: 'WORKSPACE_THEME', owner: 'workspace', description: 'UI theme mode (light/dark/system)', sensitive: false, mutable: true },
    { key: 'WORKSPACE_ACCENT_COLOR', owner: 'workspace', description: 'Primary accent color token (hex or CSS var)', sensitive: false, mutable: true },
    { key: 'WORKSPACE_FONT_FAMILY', owner: 'workspace', description: 'Primary font family', sensitive: false, mutable: true },
    { key: 'WORKSPACE_DENSITY', owner: 'workspace', description: 'UI density (compact/comfortable/spacious)', sensitive: false, mutable: true },
    { key: 'WORKSPACE_SIDEBAR_COLLAPSED', owner: 'workspace', description: 'Sidebar default collapsed state', sensitive: false, mutable: true },
    { key: 'WORKSPACE_SIDEBAR_WIDTH', owner: 'workspace', description: 'Sidebar width in px', sensitive: false, mutable: true },
    { key: 'WORKSPACE_LANDING_PAGE', owner: 'workspace', description: 'Default landing page route after login', sensitive: false, mutable: true },
    { key: 'WORKSPACE_DEFAULT_LANG', owner: 'workspace', description: 'Default UI language (en/ar)', sensitive: false, mutable: true },
    { key: 'WORKSPACE_DEFAULT_VIEW', owner: 'workspace', description: 'Default list view mode (table/cards/kanban)', sensitive: false, mutable: true },
    { key: 'WORKSPACE_KPI_MAX_VISIBLE', owner: 'workspace', description: 'Max KPI cards visible in module strip', sensitive: false, mutable: true },
    { key: 'WORKSPACE_DETAIL_DRAWER_POS', owner: 'workspace', description: 'Detail drawer position (right/bottom)', sensitive: false, mutable: true },
    { key: 'WORKSPACE_DETAIL_DRAWER_WIDTH', owner: 'workspace', description: 'Detail drawer width', sensitive: false, mutable: true },
    { key: 'WORKSPACE_FOOTER_ENABLED', owner: 'workspace', description: 'Sticky footer enabled by default', sensitive: false, mutable: true },
    { key: 'WORKSPACE_CONTEXT_RAIL_VISIBLE', owner: 'workspace', description: 'Context rail visible by default', sensitive: false, mutable: true },
    { key: 'WORKSPACE_AI_PANEL_VISIBLE', owner: 'workspace', description: 'AI recommendations panel visible', sensitive: false, mutable: true },
    { key: 'WORKSPACE_WORKFLOW_RIBBON', owner: 'workspace', description: 'Workflow ribbon visible by default', sensitive: false, mutable: true },
    { key: 'WORKSPACE_NAV_ORDERING', owner: 'workspace', description: 'Navigation item ordering (JSON array of module codes)', sensitive: false, mutable: true },
    { key: 'WORKSPACE_DASHBOARD_LAYOUT', owner: 'workspace', description: 'Default dashboard widget layout (JSON)', sensitive: false, mutable: true },
    { key: 'WORKSPACE_DATE_FORMAT', owner: 'workspace', description: 'Date display format (iso/us/eu/ar)', sensitive: false, mutable: true },
    { key: 'WORKSPACE_TIMEZONE', owner: 'workspace', description: 'Display timezone override', sensitive: false, mutable: true },
    { key: 'WORKSPACE_ANIMATIONS_ENABLED', owner: 'workspace', description: 'UI transition animations enabled', sensitive: false, mutable: true },
    { key: 'WORKSPACE_TABLE_PAGE_SIZE', owner: 'workspace', description: 'Default table page size', sensitive: false, mutable: true },
    { key: 'WORKSPACE_TOAST_POSITION', owner: 'workspace', description: 'Toast notification position', sensitive: false, mutable: true },
    { key: 'WORKSPACE_LOGO_OVERRIDE', owner: 'workspace', description: 'Platform logo URL override', sensitive: false, mutable: true },
    { key: 'WORKSPACE_FAVICON_URL', owner: 'workspace', description: 'Platform favicon URL', sensitive: false, mutable: true },
    { key: 'WORKSPACE_APP_TITLE', owner: 'workspace', description: 'Platform browser tab title', sensitive: false, mutable: true },
    // ── Product-scoped (product defaults, NOT tenant overrides) ──
    // These belong to the product (Shahin) and define default behavior.
    // Tenant config may override some of these per-tenant, but these are the product baselines.
    { key: 'PRODUCT_DEFAULT_MODULES', owner: 'product', description: 'Default modules enabled for product', sensitive: false, mutable: false },
    { key: 'PRODUCT_DEFAULT_WORKFLOWS', owner: 'product', description: 'Default workflow templates', sensitive: false, mutable: false },
    { key: 'PRODUCT_DEFAULT_ROLES', owner: 'product', description: 'Default role set for product', sensitive: false, mutable: false },
    { key: 'PRODUCT_DEFAULT_DASHBOARDS', owner: 'product', description: 'Default dashboard layouts', sensitive: false, mutable: false },
    { key: 'PRODUCT_FEATURE_FLAGS', owner: 'product', description: 'Product-level feature flag defaults', sensitive: false, mutable: false },
    { key: 'PRODUCT_SEED_DATA', owner: 'product', description: 'Product seed data configuration', sensitive: false, mutable: false },
    { key: 'PRODUCT_AGENT_PROFILES', owner: 'product', description: 'Product AI agent profiles', sensitive: false, mutable: false },
    { key: 'PRODUCT_NAV_ITEMS', owner: 'product', description: 'Product navigation items', sensitive: false, mutable: false },
    { key: 'PRODUCT_KPI_DEFINITIONS', owner: 'product', description: 'Product KPI/metric definitions', sensitive: false, mutable: false },
];
exports.VALID_SERVER_ROLES = ['web', 'web+jobs', 'jobs-only'];
exports.VALID_TOPOLOGIES = ['single-node', 'multi-node'];
function getServerRole() {
    const raw = process.env.SERVER_ROLE || 'web+jobs';
    if (!exports.VALID_SERVER_ROLES.includes(raw)) {
        throw new Error(`Invalid SERVER_ROLE '${raw}' — must be one of: ${exports.VALID_SERVER_ROLES.join(', ')}`);
    }
    return raw;
}
function getProductionTopology() {
    const raw = process.env.PRODUCTION_TOPOLOGY || 'single-node';
    if (!exports.VALID_TOPOLOGIES.includes(raw)) {
        throw new Error(`Invalid PRODUCTION_TOPOLOGY '${raw}' — must be one of: ${exports.VALID_TOPOLOGIES.join(', ')}`);
    }
    return raw;
}
function isSchedulerEnabled() {
    if (process.env.DISABLE_SCHEDULERS === 'true')
        return false;
    const role = getServerRole();
    return role === 'web+jobs' || role === 'jobs-only';
}
function isMigrationOwner() {
    const role = getServerRole();
    return role === 'web+jobs' || role === 'jobs-only';
}
function getConfigFieldsByOwner(owner) {
    return exports.CONFIG_OWNERSHIP_MAP.filter(f => f.owner === owner);
}
function getConfigFieldOwner(key) {
    return exports.CONFIG_OWNERSHIP_MAP.find(f => f.key === key)?.owner;
}
function isEnvironmentSecret(key) {
    const entry = exports.CONFIG_OWNERSHIP_MAP.find(f => f.key === key);
    return !!entry && entry.sensitive && (entry.owner === 'environment' || entry.owner === 'deployment');
}
const TENANT_VISIBLE_OWNERS = ['tenant', 'workspace', 'product', 'onboarding'];
const TENANT_FORBIDDEN_OWNERS = ['environment', 'deployment'];
function isTenantVisibleConfig(key) {
    const owner = getConfigFieldOwner(key);
    if (!owner)
        return false;
    return TENANT_VISIBLE_OWNERS.includes(owner);
}
function isTenantForbiddenConfig(key) {
    const owner = getConfigFieldOwner(key);
    if (!owner)
        return false;
    return TENANT_FORBIDDEN_OWNERS.includes(owner);
}
function isProductConfig(key) {
    return getConfigFieldOwner(key) === 'product';
}
function validateConfigBoundarySeparation() {
    const errors = [];
    const tenantKeys = exports.CONFIG_OWNERSHIP_MAP.filter(f => f.owner === 'tenant');
    const productKeys = exports.CONFIG_OWNERSHIP_MAP.filter(f => f.owner === 'product');
    for (const tk of tenantKeys) {
        if (tk.key.startsWith('PRODUCT_')) {
            errors.push(`Tenant-owned config '${tk.key}' has PRODUCT_ prefix — should be owner 'product'`);
        }
    }
    for (const pk of productKeys) {
        if (pk.key.startsWith('TENANT_')) {
            errors.push(`Product-owned config '${pk.key}' has TENANT_ prefix — should be owner 'tenant'`);
        }
        if (pk.mutable) {
            errors.push(`Product config '${pk.key}' is mutable — product defaults should be immutable (tenant overrides are mutable)`);
        }
    }
    return errors;
}
//# sourceMappingURL=config-boundary.js.map