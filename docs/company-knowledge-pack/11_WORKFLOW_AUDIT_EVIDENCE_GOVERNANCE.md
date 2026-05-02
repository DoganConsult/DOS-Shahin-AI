# 11 — Workflow, audit, evidence, governance

**Dogan-AI OS** GRC-oriented modules · **Shahin-AI** as example product surface

---

## Module directories (examples)

- `DOS Platform/Workflow Module/`  
- `DOS Platform/Audit Module/`  
- `DOS Platform/Evidence Module/`  
- `DOS Platform/Governance Module/`

```yaml
claim: "Workflow, Audit, Evidence, Governance module folders exist"
confidence: CONFIRMED_IN_CODE
evidence:
  - path: "DOS Platform/Workflow Module/"
  - path: "DOS Platform/Audit Module/"
  - path: "DOS Platform/Evidence Module/"
  - path: "DOS Platform/Governance Module/"
```

---

## Registry / design breadth

`modules.registry.json` includes many GRC-adjacent module ids — **inventory**, not per-tenant feature flags.

**NEEDS_RUNTIME_VERIFICATION:** Case management, SoD rules, outbox, and export pipelines per AGENTS.md vertical slices (if claiming production completeness).

---

## Naming

Governance copy should say **Dogan Consult** operates the program; **Dogan-AI OS** hosts the modules — never “Dogan-AI company governance.”
