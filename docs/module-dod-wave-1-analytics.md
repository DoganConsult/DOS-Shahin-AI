# Wave 1 — Baseline + canonical owners (pilot: `analytics`)

This is the **first execution batch** for the [five-wave roadmap](./module-definition-of-done.md#6-five-wave-roadmap-how-we-get-there). Scope is **only** the `analytics` business module until the pattern is validated and copied to other modules.

**Module code:** `analytics`  
**Manifest:** `modules/analytics/module.manifest.json`  
**Note:** Layout today mixes legacy paths (`source/backend/*/ports/`, multiple frontend trees). **Wave 1** inventories drift and locks **target** canonical paths; later waves execute the collapse.

---

## 1. Current reality (baseline)

**Observed issues (non-exhaustive):**

- **Duplicate port subtrees** under `modules/analytics/source/backend/` (`bcp/ports`, `workflow/ports`, `platform/ports`, `config/ports`, `shared/ports`, …) — same concern copied many times; **violates** single canonical business owner.
- **Multiple frontend entry patterns** (`source/frontend/analytics/`, top-level `analytics-hub/`, `analytics-dashboard/`) — risks duplicate route/component registration.
- **Legacy manifest fields** (`currentSources`, `frontendSources`) point at machine-local paths; should be cleaned for repo portability.
- **Workspace:** no `package.json` at `modules/analytics/` root (legacy); baseline should decide **one** package boundary for typecheck/filtering.

**Wave 1 goal:** document **exactly** what will become the three owners; **stop** new duplication; fix **build/typecheck baseline** for analytics slice only.

---

## 2. Target canonical surfaces (to converge)

| Owner | Target (proposal — adjust names in PR after team review) |
|--------|-------------------------------------------------------------|
| **Business** | Single file e.g. `modules/analytics/source/backend/analytics.module.ts` (or `bootstrap.ts`) that: registers routes, binds services, registers jobs, wires event subscriptions. **One** `ports/` directory at `source/backend/ports/`. |
| **Dynamic UI** | Single owner e.g. `modules/analytics/source/frontend/analytics/analytics.shell.ts` or extend **only** `analytics.routes.ts` as the **only** shell enrollment file; remove parallel route files from product unless composition-only. |
| **UI system** | Pages import from `@dos/ui-system` / contracts; document which shell layouts and tokens apply. |

Until convergence completes, README at `modules/analytics/README.md` must state **provisional** “start here” links and track open duplicates.

---

## 3. Week-by-week plan (analytics only)

### Week 1 — Baseline repair

- [ ] Inventory all `analytics` route registrations (module + products); diagram **one** target tree.
- [ ] Inventory all `*-monitor.job.ts` / job registration; ensure **JobDefinition** from platform only.
- [ ] Run filtered typecheck for any workspace package that includes analytics; fix **blocking** errors in analytics paths.
- [ ] Add or update `modules/analytics/README.md` with **three owner** links (even if provisional).

### Week 2 — Canonical owner pass (backend)

- [ ] Create **single** `source/backend/ports/` and migrate imports from duplicate port folders **mechanically** (one PR per subtree to avoid blast radius).
- [ ] Collapse bootstrap: **one** module entry that wires Express/Fastify routes (per service integration pattern).
- [ ] Remove or quarantine dead `auto-extracted` / generated files not used at runtime.

### Week 3 — Dynamic UI unification

- [ ] **One** route/manifest owner for shell; remove duplicate `/analytics` registrations.
- [ ] Align `module.manifest.json` with actual routes and permissions.
- [ ] Remove placeholder pages from **active** nav; gate WIP behind feature flags if needed.

### Week 4 — UI system normalization + enforcement seed

- [ ] Migrate primary analytics Hub/Dashboard to shared layout + tokens.
- [ ] Standardize loading / empty / error / forbidden states on main flows.
- [ ] Add module-local check script or extend CI: “no new duplicate `ports/` folders under analytics”.

---

## 4. Exit criteria for Wave 1 (pilot)

Wave 1 is **complete** for analytics when:

- [ ] README lists **three** canonical owners with **stable** paths (no “TBD” for business + UI enrollment).
- [ ] **No** duplicate `events.port.ts` / `jobs.port.ts` trees under `source/backend/*/ports` for the same role (one port layer).
- [ ] Primary user-facing analytics routes are **not** placeholders; states are defined.
- [ ] `module.manifest.json` does not reference **non-portable** absolute paths as the only source of truth (clean or replace with repo-relative docs).
- [ ] Stakeholders sign off to **copy the playbook** to the next module (e.g. `risk`, `evidence` — order TBD).

---

## 5. After analytics

Reuse this doc as a template: copy to `module-dod-wave-1-<module>.md`, replace `analytics` with the next module code, rerun week model. **Do not** parallelize many modules until analytics **exit criteria** are met.
