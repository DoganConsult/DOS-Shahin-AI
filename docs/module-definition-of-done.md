# Business module — Definition of Done (canonical)

This document is the **authoritative “done” bar** for a **tenant-entitled business module** under `modules/<module-code>/`. It aligns with the four-tier model in [architecture.md](./architecture.md) and the platform manifest in [platform/docs/PLATFORM_OPERATING_MANIFEST.md](../platform/docs/PLATFORM_OPERATING_MANIFEST.md).

**Constitution mantra (for PRs):**  
UI-OS renders. Dynamic UI resolves. Config OS configures. AccessStore authorizes. Workflow governs actions. AI OS orchestrates. Shahin consumes. Foundation is platform DNA. `modules/` are tenant-entitled. `products/` compose only.

---

## 1. How the destination should feel

When a module is **done**, the repo should feel like this:

| Area | Expectation |
|------|-------------|
| **Orientation** | Each business module has **one obvious place to start reading** (see “three owners” below). |
| **HTTP** | Routes are **thin**; they validate, authorize, delegate. |
| **Domain** | **Services** hold real business logic. |
| **Data** | **Repositories** are **typed and owned**, or **removed** in favor of a single data access strategy. |
| **Jobs** | **Jobs** conform to **one scheduler contract** (e.g. shared `JobDefinition` from `@dos/platform-core/jobs` — no ad-hoc shapes). |
| **Events** | **Event ports** are **standardized** (single pattern per module), not copy-pasted noise across subtrees. |
| **UI** | **Placeholder files** are **gone** from **active** business flows. |
| **Drift** | **Refactor candidates stop growing** because structure is **documented and enforced** (template + review gates). |

---

## 2. Success criteria (you are “there” when …)

Use this as a **release / milestone checklist** per module.

- [ ] **Canonical owner surfaces** — Each target module has **one** primary business owner and **one** primary dynamic UI enrollment owner (see §4).
- [ ] **No blanket suppressions** — All business-module **runtime** TypeScript files typecheck **without** `@ts-ignore`, `@ts-expect-error`, or file-level `@ts-nocheck`, **unless** explicitly justified in a short `SUPRESSIONS.md` in that module with owner + removal ticket.
- [ ] **Generated / drift** — Generated or drifted files are **regenerated cleanly** from the canonical generator, **or** removed from production paths.
- [ ] **No placeholder production paths** — No “TODO shell” routes, fake data APIs, or stub components on **entitled** navigation paths.
- [ ] **Module validation passes** — Filtered `typecheck` / tests / module-specific guards agreed for that module **pass in CI**.
- [ ] **Template compliance** — New modules **must** follow [module-dod-template.md](./module-dod-template.md).

---

## 3. Three clear owners (non-negotiable model)

The **end state** for each business module has **three** explicit owners:

### 3.1 Canonical business owner (module logic)

- **Single** primary entry for **routes registration**, **service wiring**, **jobs registration**, and **event subscribe/publish** contracts for that module’s backend surface.
- **Thin routes** → **services** → **repositories** (or equivalent data layer).
- **One** obvious file or barrel to open first (e.g. `module.runtime.ts`, `analytics.module.ts`, or `bootstrap.ts` — name per template, but **one** per module).

**Done means:** business logic has **one obvious owner**; no duplicate parallel “bootstrap” or “index” paths.

### 3.2 Canonical dynamic UI owner (enrollment & composition)

- **Single** source for how the module appears in the **shell**: route/manifest/Dynamic UI registration (per platform phase C when applicable).
- **Component registry** resolves **one** path for page/widget classes for that module.
- **Metadata** (title, permissions, nav slot, feature visibility) lives in **one** place and matches AccessStore / manifests.

**Done means:** enrollment is driven from **one source of truth**; no duplicate manifests across module and product layers; **no placeholder resolvers** on active paths.

### 3.3 Canonical UI system surface (presentation)

- Screens built from **shared** layout and primitives (`@dos/ui-system`, design tokens, contracts), not one-off parallel design systems.
- **Loading, empty, error, unauthorized** states are **defined** and consistent with the shell.
- **Responsive** and **accessibility** (keyboard, focus, semantics, contrast) are **part of the module**, not follow-up tickets.

**Done means:** pages use **UI system primitives**; labels/messages are **localizable** where the product requires i18n.

---

## 4. Dynamic UI criteria (checklist)

- [ ] One route or manifest owner controls shell appearance.
- [ ] One component registry path controls rendered page/widget class.
- [ ] Module metadata defines title, permissions, nav slot, feature visibility.
- [ ] No duplicate manifest/registry definitions between **module** and **product** (products **compose** only).
- [ ] No placeholder resolver entries on **active** business paths.
- [ ] Tenant, role, and permission gating are **declared consistently** (routes, metadata, and API).
- [ ] Dynamic pages can be **mounted and removed** without breaking the shell.
- [ ] All dynamic surfaces support **loading, empty, success, and failure** states.

---

## 5. UI system criteria (checklist)

- [ ] Shared layout/surface primitives instead of custom one-off wrappers.
- [ ] One token system for spacing, typography, color, elevation (`@dos/design-tokens`).
- [ ] Responsive behavior across desktop and mobile breakpoints.
- [ ] Accessibility: keyboard flow, focus visibility, semantic structure, contrast.
- [ ] Consistent state handling for forms, tables, dashboards, detail views.
- [ ] Events and errors observable (correlation, user-visible error pattern).
- [ ] Labels/messages localizable (no hardcoded copy on primary flows where i18n is required).
- [ ] No duplicate utility layers, duplicate registries, or shadow component systems inside the module.

---

## 6. Five-wave roadmap (how we get there)

Apply **in order** so validation stays meaningful.

| Wave | Name | Focus |
|------|------|--------|
| **1** | **Baseline repair** | Build, typing, and config baseline so progress is **measurable** (workspace installs, filtered typecheck, critical path tests). |
| **2** | **Canonical owner pass** | For each module: pick **one** primary business owner file and **one** primary UI enrollment owner; collapse or delete parallel copies. |
| **3** | **Dynamic UI unification** | Single manifest/registry path; remove duplicate resolver wiring and placeholder production routes. |
| **4** | **UI system normalization** | Migrate active screens to shared primitives; standardize page states, permissions UX, responsive + a11y. |
| **5** | **Enforcement** | CI/review gates: block duplicate enrollment, placeholder production routes, new blanket suppressions without justification file. |

**First execution batch (pilot):** [module-dod-wave-1-analytics.md](./module-dod-wave-1-analytics.md) — **`analytics`** only, until the pattern is proven.

---

## 7. Enforcement (anti-drift)

A module should **fail review** if it:

- Adds a **second** primary enrollment path for the same concern without retiring the old one.
- Ships **placeholder** screens or APIs on **production** entitled routes.
- Introduces **new** `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` in **runtime** paths without `SUPRESSIONS.md` justification.
- Duplicates **event port** or **jobs** shapes instead of importing the **platform contract**.

Pair with repo guards as they land (e.g. TS suppression guard under `scripts/ci-guards/`).

---

## 8. Related documents

- [module-dod-template.md](./module-dod-template.md) — Folder shape and mandatory entrypoints.
- [module-dod-wave-1-analytics.md](./module-dod-wave-1-analytics.md) — Pilot module execution plan.
- [architecture.md](./architecture.md) — Four-tier rules and dependency direction.
