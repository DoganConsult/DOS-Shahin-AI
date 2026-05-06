# GRC module execution (repo-grounded passes)

Companion to [`../agent-delegation-pack.md`](../agent-delegation-pack.md).  
Each file below implements **Pass 1 (audit)**, **Pass 2 (implement)**, and **Pass 3 (polish)** for **this codebase** (DOS-Platform): manifest routes, Dynamic-UI vs direct components, and AGENTS.md boundaries.

| Module | File |
|--------|------|
| Foundation | [foundation.md](./foundation.md) |
| Governance | [governance.md](./governance.md) |
| Risk | [risk.md](./risk.md) |
| Compliance | [compliance.md](./compliance.md) |
| Evidence | [evidence.md](./evidence.md) |
| Audit & Findings | [audit.md](./audit.md) |
| Reporting / Analytics | [reporting.md](./reporting.md) |

**Order:** Foundation → Governance → Risk → Compliance → Evidence → Audit → Reporting.

**Hard boundaries:** Do not hardcode workspace shell or dynamic nav; do not mutate Dynamic-UI DB rows or edit gateway unless explicitly approved (see `AGENTS.md`).

**Module navigation:** Rows come only from Dynamic-UI bundles (`DynamicUiBootstrapService.visibleNavigation` → `buildFoundationNavChildren` in `platform/core/platform/navigation/navigation.config.ts`). There is no static nav tree as source of truth. Verify: `node scripts/ci-guards/lint-no-static-nav-fallback.mjs`.
