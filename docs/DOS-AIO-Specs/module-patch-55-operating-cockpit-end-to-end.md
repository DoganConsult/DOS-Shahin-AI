# Module Patch MP-55 — Operating Cockpit Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 55 — Operating Cockpit Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Operating Cockpit module** end to end. 

It tells an agent exactly how to:
- inspect the unified operational command center, cross-module health aggregations, and SLA alert management
- compare the current implementation against the canonical operating-cockpit target
- know exactly what files, services, and diagnostic aggregations must exist

### 0.4 Module identity
- Module code: `operating-cockpit`
- Layer: technical support surface
- Criticality: **P3 low**
- Runtime role: unified operational command center, cross-module technical health aggregation, SLA breach visualization, and rapid-response operations
- Primary dependency domains: DOS foundation, DAuth control spine, dashboard, platform-stats, analytics

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0 (Common Enforcement Standard)
- Patch 1 (Platform Full-Stack Core)
- Patch 3 (DAuth Access)
- Patch 9 (UI/UX Standards)
- Patch 11 (Observability)
- Patch 12 (Reporting Core)

---

## 2. Module Purpose and Boundaries

### 2.1 What Operating Cockpit owns directly
- The unified command center layout (a single-pane-of-glass super-admin screen)
- Cross-module high-level health traffic routing (polling modules to assemble the global picture)
- SLA tracking and breach alerting visualization
- Operational action routing (providing shortcuts to restart tasks or assign tickets)

### 2.2 What Operating Cockpit consumes from DOS
- Observability metrics
- Event backbone (intercepting error bursts)

### 2.3 What Operating Cockpit consumes from DAuth
- Restricted admin-level and SOC-level access authorization.

### 2.4 What Operating Cockpit consumes from adjacent modules
- **Platform Stats**: Pulls computed KPIs
- **Dashboard**: Utilizes the layout rendering capability
- **All Modules**: Calls the `/diagnostics` endpoint of every active module mapped in the registry

### 2.5 What Operating Cockpit must not implement
- Duplicate module-specific diagnostics logic. It relies on each module reporting its own state accurately.

---

## 3. Canonical Backend Structure

```text
backend/src/modules/operating-cockpit/
  controllers/
  routes/
  services/
  contracts/
  types/
  events/
  diagnostics/
  ports/
  index.ts
  operating-cockpit.module.ts
```

### 3.1 Required backend service families
- **Health Aggregation Service**: Fan-out polling of all module `/diagnostics`
- **SLA Tracking Service**: Engine identifying SLA rules and firing events on breaches
- **Alert Management Service**: Centralizing operational alerts (DB disconnects, queue backups)
- **Diagnostics Service**: Monitoring the Cockpit itself

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/operating-cockpit/
  pages/
  components/
  services/
  contracts/
  index.ts
```

Required surfaces:
- Command Center Dashboard (Dark-mode optimized for NOC/SOC displays)
- Module Health Grid (Visual matrix of 57 modules)
- Alert Feed Panel
- SLA Breach List

---

## 5. Data Model Requirements

Operating Cockpit creates temporary aggregated views rather than storing permanent data:
- `operational_alerts` — alert_id, source_module, severity, message, timestamp, acknowledged_by
- `operational_sla_tracking` — sla_id, entity_type, entity_id, breach_time, SLA_config

---

## 6. API Surface Requirements

Required route groups:
- **Health Aggregation**: `/api/operating-cockpit/health-grid`
- **Alert Management**: `/api/operating-cockpit/alerts`
- **SLA Tracking**: `/api/operating-cockpit/slas`
- **Diagnostics**: `/api/operating-cockpit/diagnostics`

Required contracts:
- `OperationalHealthContract`
- `OperationalAlertContract`

Validation powered by Zod for all query bounds and acknowledgment POSTs.

---

## 7. Workflow and DAuth Integration

- DAuth exclusively restricts `/api/operating-cockpit/*` to admins.

---

## 8. AI Integration

Allowed AI participation:
- Correlating multiple module diagnostic failures into a root-cause hypothesis ("Because RabbitMQ is down, 5 modules report failed jobs").

---

## 9. UI and Experience Requirements

The UI must provide:
- Real-time WebSockets integration for instantaneous alert popups.
- A design aesthetic matched to SOC operational monitors (high contrast, distinct color coding for Warning/Critical).


### 9.1 Cross-Module UX and Interactivity
- **Single-Pane Command Mastery**: Absorbs the entire 57-module surface area into a single NOC-style dark mode interface.
- **One-Click Remediation Spawns**: Alerts allow immediate generation of corrective actions without context switching.

---

## 10. Settings/Admin/Runtime Control

Required controls:
- SLA definitions (hours until breach across different domains)
- Alert quiet hours
- Module exclusion toggles

---

## 11. Observability and Operations

Required diagnostics:
- Network fan-out latency inside the Aggregation service
- Unacknowledged critical alerts count

---

## 12. Required Tests

- Health grid fan-out map/reduce tests
- SLA countdown calculation tests
- Alert state handling tests

---

## 13. Exact Build Instructions

If `operating-cockpit` is a thin view:
- Expand it with the `OperationalAlert` database tables and bridge it over the event bus to listen for system faults.

---

## 14. Acceptance Criteria

Pass only if:
- The command center successfully paints a holistic map of the repository's modules.
- SLA breaches are identified and flagged.

---

## 15. Fail Conditions

FAIL if:
- The cockpit hardcodes its list of modules rather than reading the DOS registry.
- Health endpoints block synchronously, causing the cockpit response to lock up.

---

## 16. Recommended Next Part

After this module patch, the next recommended module patch is:
**Module Patch 56 — MCP Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to build the SOC operating layer, implement non-blocking health aggregations across 57 domains, and log in the ledger.
