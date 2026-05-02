# Business module template (Definition of Done target shape)

Use this when **creating** a module or **refactoring** an existing one toward [module-definition-of-done.md](./module-definition-of-done.md).

## 1. Naming and location

- **Path:** `modules/<module-code>/` (kebab-case `moduleCode`, no spaces).
- **Manifest:** `module.manifest.json` at module root (required for enrollment).
- **Workspace package:** Prefer a single `package.json` for the module when the repo uses workspace packages; legacy layout may use `source/` — migration goal is **one package boundary** per module.

## 2. Target folder shape (conceptual)

Not every module matches this on day one; **convergence** is the goal.

```
modules/<module-code>/
  module.manifest.json
  README.md                           # “Start here” — links to three owners below
  # ─── Canonical business owner (pick ONE name; examples) ───
  <module>.module.ts                  # OR bootstrap.ts / module.runtime.ts
  # ─── Backend (thin outer layer) ───
  source/backend/
    routes/                           # thin: parse → service
    services/                         # business logic
    repositories/                     # typed data access (or single db.port usage)
    jobs/                             # uses shared JobDefinition only
    ports/                            # SINGLE tree: database, events, platform, jobs, …
  # ─── Contracts & shared types ───
  contracts/ / schemas/               # Zod/DTOs owned by module
  # ─── Frontend / Dynamic UI ───
  source/frontend/<area>/             # OR packages/<name>/ for SPA library
    <module>.routes.ts                # ONE route/manifest owner for shell enrollment
    pages/
    widgets/
```

**Anti-patterns to eliminate:**

- Multiple parallel copies of `ports/` (e.g. `backend/bcp/ports`, `backend/workflow/ports`, …) that duplicate the same interfaces.
- Multiple “bootstrap” or “index” entrypoints that both register routes/jobs/events.
- `auto-extracted.repo.ts` or generated files **without** a single regeneration story.

## 3. Three files to document in README

Every module README must list:

1. **Business owner:** path to the file that wires routes → services → jobs → events.
2. **Dynamic UI owner:** path to routes/manifest/Dynamic UI registration.
3. **UI system usage:** pointer to shared layout/widgets used; note any exceptions.

## 4. Jobs

- Import `JobDefinition` from `@dos/platform-core/jobs` (or re-export from **one** local `jobs.port.ts` that only re-exports that type).
- No `@ts-ignore` for `cron` or handler typing — fix types at the **declaration site**.

## 5. Events

- **One** `events.port.ts` pattern (publish/subscribe helpers) per module.
- Event **names** match `module.manifest.json` `events` section where applicable.

## 6. Validation commands (adjust per module)

- `pnpm --filter @dos/module-<code> typecheck` (when packaged).
- Module-specific tests under `src/__tests__/` or `**/*.spec.ts` as per repo convention.

## 7. Definition of Done gate

Before marking the module **GREEN_WORKING** (per AGENTS.md vertical-slice doctrine), confirm:

- [ ] Single business owner surface.
- [ ] Single dynamic UI enrollment surface.
- [ ] UI built on shared UI system primitives for active paths.
- [ ] No production placeholders on entitled routes.
- [ ] No unexplained TS suppressions in runtime code.
