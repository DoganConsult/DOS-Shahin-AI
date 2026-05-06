# Module 2 — Governance

**Canonical route manifest:** `platform/config-center/board-report/platform-manifests/module-routes-governance/governance.module.routes.ts`  
**Also:** `governance-standalone.routes.ts` (library, obligations-intelligence, GRC copilot, etc.)

---

## Pass 1 — Audit

### What exists (children snapshot)

Rich **direct** feature set: overview, dashboard, work-queue, committees, programs, policies, procedures, standards, guidelines, policy-versions, controls-documentation, hierarchy, applicability, **decisions**, **actions**, board packs, calendar, meetings, agendas, minutes, voting, audit, risk summary, attestations, **audit-actions**, CAPA, issues, vendor risk, BCM, training, stakeholders, data classification, DPIA, RoPA, RoCo, retention, Privacy by Design, breach readiness, SAR, consent, legitimate interest, privacy notices, AI governance, external portals, contracts, legacy map, imports, settings, admin, and more.

**Redirects:** `obligations` and `exceptions` redirect into **compliance** paths (`/compliance/obligations`, `/compliance/exceptions`) — intentional split: obligations/exceptions UI owned by compliance module.

### Gaps vs pack

- Pack lists **Procedures & Standards** as one group; manifest has separate `procedures`, `standards`, `guidelines` — **naming alignment** only unless product wants consolidation.
- **Calendar** vs committee **meetings** — both exist; ensure nav does not confuse operators (copy/IA).

### File plan (Pass 1)

| Action | Path |
|--------|------|
| Map | Each governance child → owning feature folder under `modules/governance` or `platform/...` (grep `loadComponent` imports in manifest). |
| Check | Policy / exception **lifecycle** parity with backend enums and workflows. |
| Note | Cross-module: obligations/exceptions live under compliance routes. |

---

## Pass 2 — Implement

- Wire **overview KPIs** from real services only.
- **Policies:** status, version, owner, review date — align component + API.
- **Exceptions:** if only compliance route hosts exceptions UI, document in governance README; do not duplicate page — link or embed via shared component.
- **Decisions / actions:** link records where FKs exist; avoid orphan lists.

**Scope:** `modules/governance/**`, governance manifests, shared types; no gateway/DB Dynamic-UI seed changes unless approved wave.

---

## Pass 3 — Polish / QA

- [ ] Lifecycle badges (draft/review/approved/expired) consistent.
- [ ] Overdue review / action highlighting.
- [ ] Permissions per feature (`governance.*` or module guard pattern).
- [ ] Drill-down from overview counts to filtered lists.
- [ ] Regression: create policy draft → approval path (if enabled); committee meeting → minutes → action item.
