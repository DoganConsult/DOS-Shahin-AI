# Governance AI Module — AS-BUILT

## Module Identity

| Field | Value |
|-------|-------|
| Module Code | `governance-ai` |
| Spec | MP-26 (`DOS-AIO-Specs/module-patch-26-governance-ai-end-to-end.md`) |
| Layer | AI-powered governance intelligence module |
| Criticality | P1 |
| Product Owner | `shahin` |
| Route Base | `/api/governance/ai` |

## Owned Artifacts

### Backend Services
| Service | Path | Purpose |
|---------|------|---------|
| Pipeline | `services/operations/governance-ai-pipeline.service.ts` | Full governance AI pipeline orchestration |
| Signal Detection | `services/intelligence/signal-detection.service.ts` | Signal scanning and detector management |
| Interpretation | `services/intelligence/interpretation.service.ts` | Signal interpretation and batch processing |
| Compliance Score | `services/intelligence/compliance-score.service.ts` | Compliance score computation |
| Health Intelligence | `services/intelligence/health-intelligence.service.ts` | Health dashboard, trends, score explanations |
| Escalation Engine | `services/intelligence/escalation-engine.service.ts` | Escalation scanning, board/executive summaries |
| Action Orchestration | `services/intelligence/action-orchestration.service.ts` | Recommendation generation, accept/reject |
| Narrative Engine | `services/intelligence/narrative-engine.service.ts` | Feedback, narrative summary generation |
| Lifecycle Auth | `services/operations/governance-ai-lifecycle-auth.service.ts` | DAuth lifecycle gate checks |
| Diagnostics | `diagnostics/governance-ai-diagnostics.service.ts` | Module health diagnostics |

### Backend Routes
| Mount Path | Route File | Key Endpoints |
|------------|-----------|---------------|
| `/api/governance/ai` | `routes/governance-ai.routes.ts` | Pipeline, signals, interpretation, compliance score, health, escalation, recommendations, feedback, narrative, admin, diagnostics |

### Owned Tables (tenant schema)
- `governance_ai_signals`
- `governance_ai_interpretations`
- `governance_ai_compliance_scores`
- `governance_ai_escalations`
- `governance_ai_recommendations`
- `governance_ai_feedback`
- `governance_ai_pipeline_runs`

### Shared Tables (consumed, not owned)
- `audit_trail` (platform)
- `module_configs` (platform)

## Protected Actions & DAuth Enforcement Points

| Action | Route | DAuth Gate |
|--------|-------|-----------|
| Pipeline execution | `POST /pipeline/run` | `checkLifecycleAuth('pipeline.execute')` |
| Signal scan | `POST /signals/scan` | `checkLifecycleAuth('signal.scan')` |
| Signal reinterpret | `POST /signals/:id/reinterpret` | `checkLifecycleAuth('signal.reinterpret')` |
| Batch interpret | `POST /interpretation/batch` | `checkLifecycleAuth('interpretation.batch')` |
| Compliance compute | `POST /compliance-score/compute` | `checkLifecycleAuth('compliance_score.compute')` |
| Score explanation | `POST /health/score-explanation/generate` | `checkLifecycleAuth('score_explanation.generate')` |
| Escalation evaluate | `POST /escalation/evaluate` | `checkLifecycleAuth('escalation.evaluate')` |
| Manual escalate | `POST /escalation/escalate` | `checkLifecycleAuth('escalation.manual')` |
| De-escalate | `POST /escalation/:id/deescalate` | `checkLifecycleAuth('escalation.deescalate')` |
| Recommendation generate | `POST /recommendations/generate` | `checkLifecycleAuth('recommendation.generate')` |
| Recommendation accept | `POST /recommendations/:id/accept` | `checkLifecycleAuth('recommendation.accept')` |

## Security Manifest

| Artifact | Count |
|----------|-------|
| Approval Matrix Rules | 5 (governance_signal 3, governance_model 2) |
| Lifecycle Entities | 2 (governance_signal, governance_model) |

## Approval Matrix (Rule 3.4 — Lifecycle-Aligned)

| Entity Type | Transitions | Notes |
|-------------|-------------|-------|
| `governance_signal` | interpreted→escalated, escalated→resolved, any→dismissed | Matches signal lifecycle states |
| `governance_model` | testing→active, active→retired | Matches model lifecycle states |

## Lifecycle Registration

| Entity | States | Initial | Terminal |
|--------|--------|---------|----------|
| `governance_signal` | detected, interpreting, interpreted, escalated, resolved, dismissed, archived | detected | archived |
| `governance_model` | training, testing, active, retired | training | retired |

## Audit Trail Coverage (Rule 6.2)

13 mutation endpoints have `setAuditData` calls: pipeline run, signal scan, detector upsert, signal interpret/reinterpret, batch interpret, compliance compute, score explanation generate, escalation evaluate/escalate/deescalate, recommendation accept/reject, feedback submit.

## Admin Surfaces (Rule 6.3)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/governance/ai/admin/sla` | GET | SLA configuration |
| `/api/governance/ai/admin/escalation-policy` | GET | Escalation policy |
| `/api/governance/ai/admin/runbooks` | GET | 6 bilingual runbook links |

## Scheduled Jobs

Registered in `products/shahin-ai/jobs/index.ts` via `getGovernanceAiJobs()`.

## Known Risks

1. Routes wired through governance module re-export (`governance/routes/governance/governance-ai.routes.ts`)
2. Some Zod schemas may need additional field validation tightening
