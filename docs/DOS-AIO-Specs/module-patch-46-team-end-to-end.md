# Module Patch MP-46 — Team Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 46 — Team Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Team module** end to end.

It tells an agent exactly how to:
- inspect team creation, membership management, charter governance, skills tracking, and capacity planning
- compare the current implementation against the canonical team target
- know what belongs to Team, what belongs to DOS, what belongs to DAuth, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, admin surfaces, tests, and handover artifacts must exist

### 0.4 Module identity
- Module code: `team`
- Layer: core business domain module
- Criticality: **P2 medium**
- Runtime role: team registry, membership management, charter governance, skills matrix, capacity planning, cross-module team assignment resolution
- Primary dependency domains: DOS foundation, DAuth control spine, workflow, action

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0, Patch 1, Patch 3, Patch 4, Patch 5, Patch 7, Patch 9, Patch 11, Patch 12

---

## 2. Module Purpose and Boundaries

### 2.1 What Team owns directly
- Team registry (create, update, archive, dissolve teams)
- Team membership (add/remove members, role assignment within teams)
- Team charters (mission, objectives, KPIs, review cadence)
- Skills matrix (member competencies, certifications, skill gaps)
- Capacity planning (workload tracking, availability, allocation)
- Team diagnostics and admin surfaces

### 2.2 What Team consumes from DOS
- Foundation org structure (departments, hierarchies)
- Event backbone
- Observability and shell runtime

### 2.3 What Team consumes from DAuth
- Scoped access (team-level, department-level)
- Membership authorization
- Delegation support for team lead authority

### 2.4 What Team consumes from adjacent modules
- Action for team-assigned action items
- Workflow for team-based approval routing
- Governance for committee membership linkage

### 2.5 What Team must not implement
- Duplicate user management (consumed from DAuth/foundation)
- Duplicate org hierarchy (consumed from DOS foundation)
- Independent permission system outside DAuth

---

## 3. Canonical Backend Structure

```text
backend/src/modules/team/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  mappers/
  data/
  security/
  ports/
  index.ts
  team.module.ts
  lifecycle-registration.ts
```

### 3.1 Required backend service families
- Team registry service (CRUD, status management)
- Membership service (add/remove/transfer members, role assignment)
- Charter service (create/update/review charters)
- Skills matrix service (competency tracking, gap analysis)
- Capacity planning service (workload, availability, allocation)
- Diagnostics service
- Admin/configuration service

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/team/
  pages/
  components/
  services/
  contracts/
  index.ts
```

Required surfaces:
- Team hub (list all teams)
- Team detail (members, charter, skills, capacity)
- Membership management
- Charter management
- Skills matrix view
- Capacity planning view
- Diagnostics/admin views

---

## 5. Data Model Requirements

Team owns:
- `teams` — team registry (id, name_en, name_ar, code, status, department_id, lead_user_id, description)
- `team_members` — membership records (team_id, user_id, role, joined_at, status)
- `team_charters` — charter documents (team_id, mission, objectives, kpis, review_date)
- `team_skills` — skills matrix (team_id, user_id, skill_code, proficiency_level, certified)
- `team_capacity` — capacity records (team_id, user_id, allocation_pct, available_hours)

---

## 6. API Surface Requirements

Required route groups:
- Team CRUD (create, read, update, archive, dissolve)
- Membership management (add, remove, transfer, list members)
- Charter management (create, update, review)
- Skills matrix (list skills, update proficiency, gap report)
- Capacity planning (view allocation, update availability)
- Diagnostics/admin

Required contracts:
- TeamEntityContract
- TeamMemberContract
- TeamCharterContract
- TeamSkillContract
- TeamCapacityContract
- TeamDiagnosticsContract

---

## 7. Workflow and DAuth Integration

Team must integrate with workflow for:
- Charter review and approval flows
- Team dissolution approval

Team must integrate with DAuth for:
- Scoped access to team data
- Team lead delegation authority
- Membership authorization

---

## 8. AI Integration

Allowed AI participation:
- Skills gap analysis recommendations
- Capacity optimization suggestions
- Team composition recommendations

---

## 9. UI and Experience Requirements

Team UI must provide:
- Team hub with filterable team list
- Team detail with tabbed views (members, charter, skills, capacity)
- Member add/remove with role selection
- Skills matrix with proficiency visualization
- Capacity planning with allocation charts

Must define:
- empty/loading/error states
- no-team-assigned state for users
- capacity overallocation warnings


### 9.1 Cross-Module UX and Interactivity
- **Contextual Team Linking**: Any module (Action, Incident, Workflow) can surface interactive 'Team Cards' referencing this module without leaving the current view.
- **Capacity-Aware Assignments**: User assignment dropdowns globally reflect capacity limits from the Team module.

---

## 10. Settings/Admin/Runtime Control

Required controls:
- Maximum team size configuration
- Default team roles configuration
- Charter review cadence settings
- Skills catalog management
- Capacity threshold alerts

---

## 11. Observability and Operations

Required diagnostics:
- Orphaned members (users in teams that no longer exist)
- Stale charters (not reviewed within cadence)
- Capacity alerts (over-allocated members)
- Empty teams (teams with zero members)
- Teams without leads

---

## 12. Required Tests

- Team CRUD lifecycle tests
- Membership management tests
- Charter review workflow tests
- Skills matrix tests
- Capacity planning tests
- DAuth scoping tests
- Diagnostics tests

---

## 13. Exact Build Instructions

If team services are stubs:
- Implement real DB-backed CRUD for teams, members, charters, skills, capacity
- Wire lifecycle registration for team states (active, suspended, dissolved, archived)

If diagnostics are missing:
- Add orphaned member, stale charter, capacity alert, empty team checks

---

## 14. Acceptance Criteria

Pass only if:
- Team CRUD works end-to-end with real DB
- Membership management creates/removes real records
- Charter lifecycle has approval workflow
- Skills and capacity are queryable
- Diagnostics and admin surfaces are operational

---

## 15. Fail Conditions

FAIL if:
- Team data is stored in memory or hardcoded
- Membership changes bypass DAuth authorization
- Charter approval bypasses workflow
- Required artifact classes are skipped

---

## 16. Recommended Next Part

After this module patch, the next recommended module patch is:
**Module Patch 47 — Knowledge Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current team implementation against the full canonical team target, classify every team-layer gap, build only the missing team artifacts, validate against team pass/fail rules, and update the as-built ledger.
