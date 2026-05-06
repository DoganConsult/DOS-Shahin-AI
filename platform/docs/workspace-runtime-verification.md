# Workspace runtime verification (UI-OS)

Canonical shell payload for the workspace is served only by **UI-OS**:

- **Method / path:** `GET /api/ui-os/workspace-runtime`
- **Implementation:** `services/ui-os-service/src/routes/workspace-shell.routes.ts` (`router.get('/workspace-runtime', …)`).
- **Auth:** Requires verified principal (`req.principal` with `sub` and `tenantId`); otherwise `401` with `MISSING_PRINCIPAL` / `EMPTY_PRINCIPAL`.
- **Response envelope:** JSON with `shell.surfaces`, `shell.zones`, `shell.nav` (`groups` / `items`), `shell.chrome`, `shell.shortcuts`, `shell.banners`, `shell.policies`, plus metadata (`tenantId`, `userId`, `productCode`, `version`). Chrome may include DB-driven `landingRoute`, `tplStrings`, and `breadcrumbs` when rows exist (no client-side invention).

**Shell-only `/workspace-home`:** Route classification and empty main zone for landing are owned by DB (`dynamic_ui_route_metadata` / template binding), not by hardcoded frontend routes. The SPA must resolve post-login and breadcrumb targets from bootstrap + UI-OS chrome / tenant landing config, not from a static `/workspace-home` literal in source.

**How to prove at runtime (when gateway + ui-os-service are up):**

```bash
curl -sS -H "Authorization: Bearer <token>" -H "X-Tenant-Id: <tenant>" \
  -H "Accept-Language: en" \
  "https://<host>/api/ui-os/workspace-runtime" | jq '.shell | keys'
```

Expect `shell.nav`, `shell.zones`, etc. No `navigation` top-level alias.
