# Environment Variable Matrix

## Core Infrastructure Variables

| Variable | Description | Services/Modules | Default | Secret | Validation |
|---|---|---|---|---|---|
| `NODE_ENV` | Ecosystem environment context (development/staging/production) | All | `development` | No | enum |
| `PORT` | Listening port for the service | All | `4000` | No | 1-65535 |
| `LOG_LEVEL` | Pino logging detail level (fatal/error/warn/info/debug/trace) | All | `info` | No | enum |
| `DATABASE_URL` | PostgreSQL connection URL | All backend services except `product-shell` | `postgresql://...` | Yes (`# SECRET`) | URL |
| `DB_POOL_MAX` | Max PG connection pool size (legacy; code default uses `PG_POOL_MAX`) | All backend services except `product-shell` | `20` | No | 1-100 |
| `REDIS_URL` | Redis connection URL | All backend services except `product-shell` | `redis://...` | Yes (`# SECRET`) | URL |
| `REDIS_PREFIX` | Redis cache partition prefix | All backend services except `product-shell` | `dos:` | No | string |
| `OTEL_ENABLED` | Master OpenTelemetry toggle | All | `true` | No | boolean |
| `OTEL_TRACING_ENABLED` | Tracing telemetry flag | All | `false` (dev), `true` (staging/prod) | No | boolean |
| `OTEL_SERVICE_NAME` | OTLP service name tag | All | `dos-platform` | No | string |
| `OTEL_EXPORTER` | OTLP exporter type | All | `otlp` | No | string |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint for traces | All backend services | `http://localhost:4318/v1/traces` | No | URL |
| `OTEL_SAMPLING_RATE` | Default trace sampling rate (`0.0`–`1.0`) | All | `0.5` (shared), `0.1` (prod) | No | 0.0-1.0 |
| `OTEL_ERROR_SAMPLING_RATE` | Error trace sampling rate | All | `1.0` | No | 0.0-1.0 |
| `OTEL_SUCCESS_SAMPLING_RATE` | Success trace sampling rate | All | `0.1` | No | 0.0-1.0 |

## Service Communication Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `AUTH_SERVICE_URL` | Internal auth-service base URL | Gateway, product shell, modules, most services | `http://127.0.0.1:4001` | No |
| `TENANT_SERVICE_URL` | Internal tenant-service base URL | Gateway, product shell, modules, most services | `http://127.0.0.1:4002` | No |
| `USER_SERVICE_URL` | Internal user-service base URL | Gateway, product shell, modules, most services | `http://127.0.0.1:4003` | No |
| `WORKFLOW_SERVICE_URL` | Internal workflow-service base URL | Gateway, product shell, modules, most services | `http://127.0.0.1:4004` | No |
| `NOTIFICATION_SERVICE_URL` | Internal notification-service base URL | Gateway, product shell, modules, most services | `http://127.0.0.1:4005` | No |
| `AUDIT_SERVICE_URL` | Internal audit-service base URL | Gateway, product shell, modules, most services | `http://127.0.0.1:4006` | No |
| `AI_GATEWAY_SERVICE_URL` | Internal AI gateway base URL | Gateway, product shell, modules, most services | `http://127.0.0.1:4007` | No |
| `GATEWAY_URL` | Public or internal platform gateway origin | Auth, tenant, product shell, most services | `http://127.0.0.1:4000` | No |

## Security & Authentication Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `JWT_SECRET` | Access-token signing secret (min 32 chars) | `auth-service` | none | Yes (`# SECRET`) |
| `JWT_EXPIRES_IN` | JWT token expiration in seconds | `auth-service` | `3600` | No |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration in seconds | `auth-service` | `86400` | No |
| `JWT_ALGORITHM` | JWT signing algorithm | `auth-service` | `HS256` (shared), `RS256` (service env) | No |
| `SESSION_TIMEOUT` | Session inactivity timeout | `auth-service` | `30m` | No |
| `MFA_SECRET_KEY` | MFA TOTP secret key | `auth-service` | none | Yes (`# SECRET`) |
| `SCIM_SECRET` | SCIM provisioning webhook secret | `auth-service` | none | Yes (`# SECRET`) |

## AI & External Services Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `CLAUDE_API_KEY` | Anthropic API key for upstream LLM access | `ai-engine-service`, `ai-gateway-service` | none | Yes (`# SECRET`) |
| `OPENAI_API_KEY` | OpenAI API key for upstream LLM access | `ai-engine-service`, `ai-gateway-service` | none | Yes (`# SECRET`) |
| `GOOGLE_AI_API_KEY` | Google AI API key for LLM access | `ai-engine-service`, `ai-gateway-service` | none | Yes (`# SECRET`) |
| `COHERE_API_KEY` | Cohere API key for LLM access | `ai-engine-service`, `ai-gateway-service` | none | Yes (`# SECRET`) |
| `AI_PROVIDER` | Primary AI provider | `ai-gateway-service` | `anthropic` | No |
| `AI_FALLBACK_PROVIDER` | Fallback AI provider | `ai-gateway-service` | `openai` | No |
| `CLAUDE_MODEL` | Claude model identifier | `ai-gateway-service` | `claude-sonnet-4-20250514` | No |
| `CLAUDE_TIMEOUT_MS` | Claude API timeout | `ai-gateway-service` | `120000` | No |
| `OPENAI_MODEL` | OpenAI model identifier | `ai-gateway-service` | `gpt-4o` | No |
| `OLLAMA_BASE_URL` | Local Ollama LLM endpoint | `ai-gateway-service` | `http://localhost:11434` | No |

## Communication & Notification Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `SMTP_HOST` | SMTP server host | `notification-service`, `notification-inbox-service` | `localhost` | No |
| `SMTP_PORT` | SMTP server port | `notification-service`, `notification-inbox-service` | `587` | No |
| `SMTP_USER` | SMTP username | `notification-service`, `notification-inbox-service` | none | Yes (`# SECRET`) |
| `SMTP_PASS` | SMTP password for mail delivery | `notification-service`, `notification-inbox-service` | none | Yes (`# SECRET`) |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook used for notifications | `notification-service`, CI notifications | none | Yes (`# SECRET`) |
| `TEAMS_WEBHOOK_URL` | Teams incoming webhook used for notifications | `notification-service`, CI notifications | none | Yes (`# SECRET`) |

## Frontend & UI Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `SPA_DIR` | Angular build output served by the product shell | `product-shell` | `../../frontend/products/shahin/dist/shahin-grc/browser` | No |
| `CSP_ENABLED` | Content Security Policy enabled | `product-shell` | `true` | No |
| `HSTS_ENABLED` | HTTP Strict Transport Security enabled | `product-shell` | `true` | No |
| `ANALYTICS_ENABLED` | Analytics tracking enabled | `product-shell` | `false` | No |
| `GA_TRACKING_ID` | Google Analytics tracking ID | `product-shell` | none | Yes (`# SECRET`) |

## Feature Flags Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `ENABLE_AI_FEATURES` | AI-powered features enabled | All services | `true` | No |
| `ENABLE_ANALYTICS` | Analytics and reporting enabled | All services | `true` | No |
| `ENABLE_DEBUG_MODE` | Debug mode with extra logging | All services | `false` | No |
| `ENABLE_BETA_FEATURES` | Beta features for testing | All services | `false` | No |
| `ENABLE_MULTI_TENANT` | Multi-tenant functionality enabled | All services | `true` | No |

## Workflow & Queue Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `TEMPORAL_ENABLED` | Enable Temporal workflow orchestration | `workflow-service` | `false` | No |
| `TEMPORAL_ADDRESS` | Temporal gRPC address | `workflow-service` | `localhost:7233` | No |
| `TEMPORAL_NAMESPACE` | Temporal namespace | `workflow-service` | `default` | No |
| `BULLMQ_ENABLED` | Enable BullMQ async jobs | All backend services | `true` | No |
| `BULLMQ_CONCURRENCY` | BullMQ worker concurrency | All backend services | `5` | No |
| `BULLMQ_DEFAULT_ATTEMPTS` | BullMQ retry attempts | All backend services | `3` | No |

## Azure / Entra ID Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `AZURE_TENANT_ID` | Azure AD tenant ID | `auth-service`, `ai-gateway-service` | none | No |
| `AZURE_CLIENT_ID` | Azure AD application client ID | `auth-service` | none | No |
| `AZURE_CLIENT_SECRET` | Azure AD client secret | `auth-service` | none | Yes (`# SECRET`) |
| `AZURE_APPLICATION_ID_URI` | Azure AD app ID URI | `auth-service` | none | No |
| `GRAPH_API_ENDPOINT` | Microsoft Graph API base URL | `auth-service` | `https://graph.microsoft.com/v1.0` | No |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection | Platform | empty | Yes (`# SECRET`) |
| `AZURE_STORAGE_CONTAINER` | Azure storage container name | Platform | `dos-platform` | No |
| `STORAGE_PROVIDER` | File storage backend (local/azure) | Platform | `local` | No |

## Inter-Service & CORS Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `INTER_SERVICE_SECRET` | Shared secret for service-to-service auth (min 32 chars) | All backend services | none | Yes (`# SECRET`) |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | Gateway, product-shell | `https://shahin-ai.com,https://www.shahin-ai.com,https://dogan-ai.com,https://www.dogan-ai.com` | No |

## External Integrations Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `CISO_ASSISTANT_ENABLED` | CISO Assistant integration | Platform | `false` | No |
| `CISO_ASSISTANT_URL` | CISO Assistant endpoint | Platform | `http://localhost:8600` | No |
| `OPENPROJECT_ENABLED` | OpenProject integration | Platform | `false` | No |
| `OPENPROJECT_URL` | OpenProject endpoint | Platform | `http://localhost:8602` | No |
| `JIRA_BASE_URL` | Jira instance URL | `integrations-service` | empty | No |
| `JIRA_API_TOKEN` | Jira API token | `integrations-service` | empty | Yes (`# SECRET`) |
| `SERVICENOW_INSTANCE_URL` | ServiceNow instance | `integrations-service` | empty | No |

## LLM Observability Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `LANGFUSE_ENABLED` | Enable Langfuse LLM tracing | `ai-gateway-service` | `false` | No |
| `LANGFUSE_HOST` | Langfuse server URL | `ai-gateway-service` | empty | No |
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key | `ai-gateway-service` | empty | Yes (`# SECRET`) |
| `LANGFUSE_SECRET_KEY` | Langfuse secret key | `ai-gateway-service` | empty | Yes (`# SECRET`) |

## Performance & Scaling Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `ENABLE_METRICS` | Prometheus metrics enabled | All services | `true` | No |
| `METRICS_PORT` | Metrics endpoint port | All services | `9090` | No |
| `CLUSTER_MODE` | PM2 cluster mode enabled | Gateway, critical services | `false` | No |
| `CLUSTER_INSTANCES` | Number of cluster instances | Gateway, critical services | `2` | No |
| `RATE_LIMIT_WINDOW` | Rate limiting time window | Gateway, auth-service | `60s` | No |
| `RATE_LIMIT_MAX` | Max requests per window | Gateway, auth-service | `100` | No |

## Monitoring & Observability Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `HEALTH_CHECK_INTERVAL` | Health check frequency | All services | `30s` | No |
| `HEALTH_CHECK_TIMEOUT` | Health check timeout | All services | `5s` | No |
| `GRACEFUL_SHUTDOWN_TIMEOUT` | Graceful shutdown timeout | All services | `30s` | No |
| `MEMORY_LIMIT_MB` | Memory limit in MB | All services | `512` | No |
| `CPU_LIMIT_PERCENT` | CPU usage limit | All services | `80` | No |

## Data & Backup Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `BACKUP_ENABLED` | Automated backups enabled | All services | `true` | No |
| `BACKUP_SCHEDULE` | Backup schedule (cron) | All services | `0 2 * * *` | No |
| `BACKUP_RETENTION_DAYS` | Backup retention period | All services | `30` | No |
| `DATA_EXPORT_ENABLED` | Tenant data export enabled | All services | `true` | No |
| `PII_ENCRYPTION_KEY` | PII encryption key | All services | none | Yes (`# SECRET`) |

## Compliance & Audit Variables

| Variable | Description | Services/Modules | Default | Secret |
|---|---|---|---|---|
| `AUDIT_LOG_RETENTION_DAYS` | Audit log retention period | All services | `2555` | No |
| `COMPLIANCE_MODE` | Compliance mode (SOC2/ISO27001/GDPR) | All services | `SOC2` | No |
| `DATA_CLASSIFICATION_ENABLED` | Data classification enabled | All services | `true` | No |
| `GDPR_COMPLIANT` | GDPR compliance enabled | All services | `true` | No |
| `PDPL_COMPLIANT` | PDPL compliance enabled | All services | `true` | No |

## Environment-Specific Overrides

### Development
- `LOG_LEVEL=debug`
- `ENABLE_DEBUG_MODE=true`
- `ENABLE_METRICS=false`
- `BACKUP_ENABLED=false`

### Staging
- `LOG_LEVEL=info`
- `ENABLE_DEBUG_MODE=false`
- `ENABLE_METRICS=true`
- `BACKUP_ENABLED=true`
- `CLUSTER_MODE=false`

### Production
- `LOG_LEVEL=warn`
- `ENABLE_DEBUG_MODE=false`
- `ENABLE_METRICS=true`
- `BACKUP_ENABLED=true`
- `CLUSTER_MODE=true`
- `HSTS_ENABLED=true`
- `CSP_ENABLED=true`
