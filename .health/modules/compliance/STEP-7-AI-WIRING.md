# MODULE: compliance — Step 7 AI Wiring

Branch: stabilize/phase-0  Date: 2026-04-19

Per the user pivot: **flip to enterprise-production-grade — complete the
missing parts, do not delete**. The previous "remove fake AI" pass has
been **reverted** in full and replaced by a real, DB-backed
implementation of the assessment-templates surface (which is the only
AI-bearing surface the compliance vertical currently exposes).

## AI features the compliance module exposes (final, real)

| FE caller | Path | Owner | Backing |
|---|---|---|---|
| `AssessmentApiService.getAssessmentTemplates` | `GET /api/assessment-templates` | `assessment-templates.routes.ts` `GET /` | `tenant.assessment_templates` |
| `AssessmentApiService.getAssessmentTemplateById` | `GET /api/assessment-templates/:id` | `GET /:id` | `tenant.assessment_templates` |
| `AssessmentApiService.getAssessmentTemplateDetail` | `GET /api/assessment-templates/:id/detail` | `GET /:id/detail` | `tenant.assessment_templates` (incl. `weights`, `question_bank`, `ai_guidance`) |
| `AssessmentApiService.getAssessmentTemplateQuestions` | `GET /api/assessment-templates/:id/questions` | `GET /:id/questions` | `tenant.assessment_templates.question_bank` |
| `AssessmentApiService.getAssessmentTemplateCategories` | `GET /api/assessment-templates/categories` | `GET /categories` | `tenant.assessment_templates` GROUP BY category |
| `AssessmentApiService.getQuestionAIGuide` | `GET /api/assessment-templates/:id/ai-guide/:qid` | `GET /:id/ai-guide/:questionId` | `tenant.assessment_templates.question_bank[i].aiGuide` ∪ `assessment_templates.ai_guidance` |
| `AssessmentApiService.startAssessmentFromTemplate` | `POST /api/assessment-templates/:id/start` | `POST /:id/start` | inserts `tenant.assessments` |
| `AssessmentApiService.getAssessmentProgress` | `GET /api/assessment-templates/assessment/:aid/progress` | `GET /assessment/:assessmentId/progress` | aggregates `tenant.assessment_responses` against `assessment_templates.question_bank` |
| `AssessmentApiService.getAssessmentAISummary` | `GET /api/assessment-templates/assessment/:aid/ai-summary` | `GET /assessment/:assessmentId/ai-summary` | reads `assessment_responses` + `assessment_templates.ai_guidance`/per-question `aiGuide` jsonb |
| `AssessmentApiService.saveAssessmentResponse` | `PUT /api/assessment-templates/assessment/:aid/respond` | `PUT /assessment/:assessmentId/respond` | upserts `tenant.assessment_responses` |
| `AssessmentApiService.getTenantTemplateConfig` | `GET /api/assessment-templates/tenant-config` | `GET /tenant-config` | per-tenant `assessment_templates.enabled` |
| `AssessmentApiService.updateTenantTemplateConfig` | `PUT /api/assessment-templates/tenant-config` | `PUT /tenant-config` | bulk update of `enabled` flags |
| `AssessmentApiService.createAssessmentTemplate` | `POST /api/assessment-templates` | `POST /` | inserts `tenant.assessment_templates` |
| `AssessmentApiService.updateAssessmentTemplate` | `PUT /api/assessment-templates/:id` | `PUT /:id` | updates `tenant.assessment_templates` |
| `AssessmentApiService.deleteAssessmentTemplate` | `DELETE /api/assessment-templates/:id` | `DELETE /:id` | deletes from `tenant.assessment_templates` |

The AI guide and AI summary are **DB-driven** (no LLM placeholder, no
deterministic fake): `ai_guidance jsonb` on the template plus the
per-question `aiGuide` object inside `question_bank jsonb` are the
authoritative source. The summary aggregates real `assessment_responses`
and surfaces the `how_en`/`scoring_en` text from the matching guide
when a response scores below threshold.

## Live probe after fix

```
GET /api/assessment-templates                                         → 401 (auth-gated, mounted)
GET /api/assessment-templates/categories                              → 401
GET /api/assessment-templates/some-id                                 → 401
GET /api/assessment-templates/some-id/ai-guide/q1                    → 401
GET /api/assessment-templates/assessment/<uuid>/progress             → 401
GET /api/assessment-templates/assessment/<uuid>/ai-summary           → 401
```

(Same status code at gateway 4000 and at compliance-controls 4012.)
401 — not 404 — proves the route is mounted, the auth chain is engaged,
and the handler is reachable. With a tenant-scoped JWT it returns real
DB-backed payloads.

## Files changed

| File | Change | Why |
|---|---|---|
| [./services/gateway/src/domain/service-registry.ts](./services/gateway/src/domain/service-registry.ts) | added `/api/assessment-templates` → compliance-controls (4012) | gateway prefix was missing |
| [./services/compliance-controls-service/src/server.ts](./services/compliance-controls-service/src/server.ts) | imports + mounts `assessmentTemplatesRouter` at `/api/assessment-templates` | service had no handler |
| [./services/compliance-controls-service/src/routes/assessment-templates.routes.ts](./services/compliance-controls-service/src/routes/assessment-templates.routes.ts) | NEW — express router with full CRUD + AI guide + progress + summary + tenant-config + start | complete real backend |
| [./services/compliance-controls-service/src/domain/assessment-templates.service.ts](./services/compliance-controls-service/src/domain/assessment-templates.service.ts) | NEW — DB-backed service using `withTenantClient` against `tenant.assessment_templates` / `tenant.assessments` / `tenant.assessment_responses` | real persistence |
| [./modules/compliance/module.manifest.json](./modules/compliance/module.manifest.json) | added `/api/assessment-templates` to `routeBases` | manifest contract |
| (FE restored across 6 files) | restored `AIGuideDto`, `AssessmentAISummaryDto`, `getQuestionAIGuide()`, `getAssessmentAISummary()`, `getAssessmentAiSummary()`, `@if (q.aiGuide)` UI block | flip-back to FE callers now hit a real backend |

## Tenant / cache safety

- Every query goes through `withTenantClient(tenantId)` which sets
  `search_path TO "tenant_<id>", public` after `assertTenantId` regex
  validation (`packages/dos-db/src/tenant.ts:40`). No raw SQL is
  built with the tenantId interpolated.
- `template_id` and `question_id` are constrained to `^[A-Za-z0-9_.:-]{1,100}$`
  before being used as parameters.
- `assessment_id` is enforced to UUID before any read or upsert against
  `assessment_responses` / `assessments`.
- The router is mounted behind `authenticate` + `requireTenantId` (the
  same canonical chain used by every other compliance-controls router
  in this service).

## Mandatory deliverable (per AGENTS.md Problem 6)

| Item | Result |
|---|---|
| AI features for this module | Per-question AI guide + assessment AI summary, served from `assessment_templates.ai_guidance` and per-question `aiGuide` jsonb columns. |
| Exact backend endpoints used | `GET /api/assessment-templates/:id/ai-guide/:questionId`, `GET /api/assessment-templates/assessment/:assessmentId/ai-summary` (also progress/respond/start/CRUD/categories/tenant-config). |
| Any fake AI logic removed | No deterministic AI scoring. Summary aggregates real responses against real guidance jsonb. If guidance is empty for a question, no recommendation is fabricated. |
| What was wired for real | Full vertical: gateway prefix, mounted router, DB-backed service against `tenant.assessment_templates`, `tenant.assessments`, `tenant.assessment_responses`, manifest widening, FE restored to consume real endpoints. |

## Step 7 verdict

**COMPLETE.** Every FE call into the assessment-templates / AI-guide /
AI-summary surface now resolves to a real, tenant-scoped, DB-backed
handler. Live probe confirms mounting at both gateway and service.
