# Module 1 — Foundation / Platform Core

**Canonical route manifest:** `platform/config-center/board-report/platform-manifests/module-routes-core/foundation.module.routes.ts`

---

## Pass 1 — Audit (current state)

### What exists

- **Overview:** `FoundationOverviewComponent` (`overview` child).
- **Most feature paths:** `DynamicPageHostComponent` + `data: { contractRoute, pageStyleVariant }` (reference data, org tree, locations, settings variants, profile, notifications, access reviews, trial, org design, org intelligence, etc.). Resolvers supply `foundationPageBinding`, `foundationPageMeta`, etc.
- **Explicit components:** e.g. `FoundationUserListComponent` / `FoundationUserDetailComponent` (`users`, `users/:id`), `FoundationRoleDetailComponent` (`roles/:id`), SSO/OIDC routes, trial routes (`trial/**`), workspace/tenant shell routes under `shell/**` + `workspace/**`.
- **Admin-gated:** `settings` and `permissions` use `canMatch: [adminPermissionCanMatchFn('admin.system.write')]`.
- **Standalone:** `platform/config-center/board-report/platform-manifests/module-routes-core/foundation-standalone.routes.ts` — AI lab, entitlements, identity, org-context, trial extras, UI preview, workspace-home, etc.

### Gaps vs delegation pack “target sidebar”

- Pack lists **linear** nav (Overview, Organization, Users, …). Live product mixes **static manifest children** with **DB-driven** module nav; do not duplicate sidebar entries in code — align labels/order via **Dynamic UI / bindings** where that is source of truth.
- **Roles “catalog + matrix + assigned users”:** partially split across `users`, `roles/:id`, `permissions` (admin); verify UX matches pack without adding parallel admin surfaces.
- **Audit logs** for foundation: confirm whether manifest `audit` / `security` / standalone `audit/**` cover tenant audit vs platform admin (avoid conflating trust zones).

### Duplication / conflicts

- Many routes are thin wrappers around the same dynamic host pattern — good for consistency; risk is **duplicate contractRoute** keys or overlapping labels in DB nav.

### Target structure (this module only)

- Treat **foundation.module.routes.ts** + **foundation-standalone.routes.ts** as the route truth.
- Map pack pages → existing keys: Overview ↔ `overview`; Users ↔ `users`; Roles detail ↔ `roles/:id`; Reference / org / locations ↔ dynamic `contractRoute` entries; Settings ↔ `settings` (admin).

### File-by-file plan (Pass 1 — no code yet)

| Action | Path / area |
|--------|-------------|
| Inventory | List every `contractRoute` in foundation manifest; cross-check `dos.ui_route_template_binding` / template registry if routes 404. |
| Document | Add one table in-repo (optional later): contractRoute → feature name. |
| Verify | `FoundationOverviewComponent` data sources (real KPIs vs placeholder). |

---

## Pass 2 — Implement (when approved)

- **Do not** add a second sidebar or hardcoded module nav in Shahin shell.
- Improve **Foundation overview** only if APIs exist; use `@dos/ui-system` primitives per AGENTS.md.
- **Users / roles:** consolidate copy and empty states; ensure list + detail + permission checks align with `AccessStore` / guards.
- **Settings / permissions:** keep behind `admin.system.write`; no new gateway routes.
- **Dynamic pages:** fix broken `contractRoute` or resolver gaps in foundation resolvers — **typed** fixes only, no fake stubs.

**Deliver:** PR scoped to `platform/foundation/**`, `platform/config-center/board-report/platform-manifests/module-routes-core/foundation*.routes.ts`, and any resolver/registry files touched; SPA build + customer-gate slice as applicable.

---

## Pass 3 — Polish / QA

- [ ] Guards: admin routes reject non-admin; workspace routes respect `workspaceShellGuard` / auth patterns.
- [ ] Breadcrumbs, page titles, i18n keys (EN/AR) consistent.
- [ ] Loading / empty / error on overview, user list, dynamic host.
- [ ] No duplicate brand or shell regressions (shell-host / workspace-header).
- [ ] Regression: open `/foundation`, `/foundation/users`, one dynamic reference-data contract; admin user hits `/foundation/settings` if present.
