# ADR 001: Centralized Telemetry and Service Stability Scaffolding

## Status
Accepted

## Context
With 32 active microservices within the `services/` ecosystem, managing explicit dependencies for Observability, Trace aggregation, and API generation natively code-deep presents unmanageable technical debt. Similarly, PM2 was suffering from boot loop risks where an unstable deployment could tear down existing user sessions implicitly.

## Decision
We decided to adopt a **centralized platform-core architecture** for these 150% enterprise capabilities:
1. **Zod Over OpenAPI Configuration**: `ops/scripts/generate-openapi.ts` abstracts schema generation away from individual Express routing patterns, forcing `Zod` to serve as the unified source of truth.
2. **PM2 Blue/Green Auto-Rollback**: `ops/scripts/auto-rollback-deploy.sh` asserts full HTTP integration verification pre-activation.
3. **Gateway Enforcement**: CORS, Tenant specific Rate Limiting, and DDOS Nginx bounding live at the Gateway, completely insulating the interior microservices from edge protocol variations.

## Consequences

### Positive
- Deployments require 0 downtime due to the pm2 reload boundary script evaluating `/health`.
- Rate Limiting dynamically adapts based on JWT boundaries and Premium tenant mappings implicitly at the Gateway layer, without touching `agrc-os-service`.

### Negative
- Localized testing protocols must simulate the Gateway to evaluate proper Rate Limiting. Code inside Microservices cannot access `RateLimit` contexts explicitly since it's ripped out upon egress.
- If Nginx or Gateway fails, all 32 microservices lock implicitly.
