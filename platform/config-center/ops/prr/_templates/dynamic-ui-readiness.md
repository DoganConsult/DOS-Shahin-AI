# PRR Checklist — Dynamic UI Readiness

> Append this checklist to every module's PRR (`ops/prr/<module>.md`).
> Phase 1+2 gates run on every PR; Phase 3 schema-level enforcement
> requires the 009 migration + canonical permission seed; Phase 4
> telemetry surfaces in Grafana once the SPA build deploys.

Module: `<module_code>` (e.g. `foundation`, `compliance`, `risk`, …)

---

## DUI Gates

- [ ] **DUI-1 Drift Gate** — `pnpm dynamic-ui:drift-gate` exits 0 with no
      new entries in `scripts/ci-guards/baselines/dynamic-ui-drift-gate.json`
      attributable to this module. Removed-violation count for this
      module's seeds is reported and committed back to the baseline if
      any are cleared.

- [ ] **DUI-2 Loader Resolvability** — `pnpm dynamic-ui:loader-resolvability`
      exits 0. Every `widget_key` and `component_key` registered for this
      module resolves to a real file with the named export.

- [ ] **DUI-3 YAML SoT Coverage** — module's widgets and components are
      declared in `platform/dynamic-ui/contracts/registry.yaml` AND
      `pnpm dynamic-ui:yaml-coverage` reports zero structural failures.
      Permission warnings (D4/D5) are tolerated until Phase 3 migration
      lands; set `DYNAMIC_UI_YAML_STRICT_PERMS=1` in CI to flip them
      to hard-fail once the catalogue is populated.

- [ ] **DUI-4 Signature Widget Permission Parity** — for every signature
      widget row this module seeds, `dynamic_ui_widgets.permission` matches
      the corresponding `dynamic_ui_routes.permission_key`. Use `INSERT
      … SELECT FROM dos.dynamic_ui_routes` rather than VALUES literals so
      drift cannot be re-introduced. Verifiable post-apply with the D1
      query in `platform/dynamic-ui/db/public/migrations/009_README.md`.

- [ ] **DUI-5 Permission Catalogue Membership** — every `permission_key`
      and `widgets.permission` referenced by this module's seeds exists
      in `dos.permission_catalogue` after the canonical seeder runs (`pnpm
      dynamic-ui:seed-perm-catalogue`). Residual `source='self-heal'`
      rows attributable to this module are documented as Phase 3.5
      follow-ups (legacy colon-format perms to be migrated to canonical
      dotted form).

- [ ] **DUI-6 RBAC Grant Coverage** — every permission used by this
      module's routes/widgets is granted to ≥1 canonical role in
      `ops/scripts/seed-data/role-permission-map.ts`. Required for
      end-users to actually pass the route + widget gates.

- [ ] **DUI-7 Route Smoke** — `DOS_DYNAMIC_UI_BASE=<staging-url> pnpm
      dynamic-ui:route-smoke <module>` exits 0 against staging. Asserts
      every contract route's `signature_widget` and `component_key`
      resolve in the SPA registries and that signature widgets have
      matching widgets[] rows in the bundle.

- [ ] **DUI-8 STRICT Boot** — staging SPA boots with
      `window.DOS_DYNAMIC_UI_STRICT=true` set, with zero unhandled
      `[ui.strict]` exceptions reported during a smoke walk through
      every module-owned route. Production keeps STRICT off (telemetry
      sink still posts to Grafana).

---

## Apply procedure for Phase 3 (one-time, platform-wide)

Run on each environment in order:

```bash
# 1. Apply migration 009
DATABASE_URL=... pnpm migrate up

# 2. Seed canonical permission catalogue
DATABASE_URL=... pnpm dynamic-ui:seed-perm-catalogue

# 3. Verify
pnpm dynamic-ui:drift-report
psql "$DATABASE_URL" -f - <<'SQL'
\i platform/dynamic-ui/db/public/migrations/009_README.md
-- (run the verification queries listed at the bottom of the README)
SQL
```

Expected end state (per environment):
- `dos.permission_catalogue` populated with ≥570 rows tagged `canonical` plus a small `self-heal` set.
- `pg_constraint` shows `fk_dynamic_ui_routes_permission_key`, `fk_dynamic_ui_widgets_permission`, and `uq_dynamic_ui_widgets_signature_per_route`.
- `pg_trigger` shows `trg_dynamic_ui_widgets_signature_perm`.
- `pnpm dynamic-ui:drift-report` reports D1=0 and D4 reduced to legacy self-heal entries only.

---

## Owner sign-off

| Role | Name | Date |
|------|------|------|
| Module owner | | |
| Platform Dynamic-UI owner | | |
| DAuth (RBAC) | | |
| DSOC (telemetry) | | |
| QA (route smoke) | | |
