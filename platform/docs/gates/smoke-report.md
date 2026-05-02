# Gate 3 — UI_OS_CORRECTIVE_ACTION_COMPLETE

Run timestamp: 2026-05-01T08:30:00.799Z
Shell URL: http://127.0.0.1:3000
Gateway URL: http://127.0.0.1:4000
Auth cookie supplied: no

**18/20 checks passed**, 0 failed, 2 skipped.

| # | Check | Status | Detail |
|---|---|---|---|
| 1 | 1. product-shell serves SPA | PASS | HTTP 200, 5141b |
| 2 | 2. product-shell proxies /api/* to gateway | PASS | HTTP 200 |
| 3 | 3. gateway /api/auth/oidc/start redirects (302) | PASS | HTTP 302 |
| 4 | 4. Keycloak realm reachable through gateway redirect | PASS | HTTP 302; location header expected |
| 5 | 5. Keycloak JWKS endpoint reachable | PASS | HTTP 200, 4139b |
| 6 | 6. user-service /health | PASS | HTTP 200 |
| 7 | 7. tenant-service /health | PASS | HTTP 200 |
| 8 | 8. audit-service /health | PASS | HTTP 200 |
| 9 | 9. notification-service /health | PASS | HTTP 200 |
| 10 | 10. Foundation DNA health up | PASS | HTTP 200 |
| 11 | 11. /api/access/my-permissions auth-gated | PASS | HTTP 401 |
| 12 | 12. /api/trials/current auth-gated | PASS | HTTP 401 |
| 13 | 13. /api/subscription/current auth-gated | PASS | HTTP 401 |
| 14 | 14. authenticated /api/access/my-permissions returns 200 | SKIP | skipped (no --auth-cookie) |
| 15 | 15. authenticated /api/trials/current returns 200 | SKIP | skipped (no --auth-cookie) |
| 16 | 16. product manifest exposes trialChrome | PASS | trialChrome.{banner,card} present |
| 17 | 17. module-navigation registry codegen | PASS | foundation entry present |
| 18 | 18. Phase G tables present in DB | PASS | 5/5 tables: tenant_module_entitlements,tenant_product_entitlements,tenant_subscriptions,tenant_trials,trial_audit_log |
| 19 | 19. PM2 fleet online (gateway/auth/tenant/user/audit/notification/product-shell) | PASS | 7/7 online |
| 20 | 20. gateway /api/health final probe | PASS | HTTP 200 |

## How to re-run
```bash
pnpm gate:ui-os-smoke                     # unauth checks only
pnpm gate:ui-os-smoke --auth-cookie=<jwt> # full set including authenticated probes
```
