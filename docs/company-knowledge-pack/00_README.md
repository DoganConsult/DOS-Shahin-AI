# Dogan Consult Company Knowledge Pack — README

**Official documentation product name**

**Dogan Consult Company Knowledge Pack — Dogan-AI OS Platform, Shahin-AI Product, Modules, AI, Sales, and Design Reference.**

**Attribution (all materials in this pack)**  
*Powered by Dogan Consult* · *Built by Dogan Consult*

---

## Path canonicalization notice (Phase 4A — 2026-04-29)

> **Evidence paths in this pack are a point-in-time snapshot.** They were written
> before the canonical-source restructure. The legacy paths still appear in the
> evidence blocks below for audit-trail fidelity; do **not** rewrite them silently.

| Legacy path (in evidence blocks) | Current canonical path |
| --- | --- |
| `DOS Platform/Shahin-AI Website/frontend/` | `DOS Platform/products/shahin-ai/app/` (Batch 1) |
| `DOS Platform/Shahin-AI Website/spa/` | `DOS Platform/products/shahin-ai/website/` (Phase 4A) |
| `DOS Platform/Shahin-AI Website/` (parent) | removed; split between `products/shahin-ai/app/` and `products/shahin-ai/website/` |

Authoritative migration record: `platform/docs/migration/` (per-phase reports +
`quarantine-register.json`). When you re-author this pack, update each evidence
path *and* update this table; do not delete the historical row.

---

## Naming hierarchy (mandatory)

| # | Role | Name |
|---|------|------|
| 1 | **Company** | **Dogan Consult** |
| 2 | **Platform** | **Dogan-AI OS** (do not rename the platform) |
| 3 | **Product example / proof** | **Shahin-AI** (runs on Dogan-AI OS; future products may too) |
| 4 | **Attribution** | *Powered by Dogan Consult* / *Built by Dogan Consult* |
| 5 | **Forbidden** | **“Dogan-AI company”**, “Dogan AI company”, or implying Dogan-AI is the company |

---

## Canonical public wording (verbatim)

Use these **verbatim** in decks, footers, and press-style copy unless legal/marketing approves a deviation. Still tag technical claims with the evidence taxonomy below.

**English — platform**

> Dogan-AI OS by Dogan Consult is an AI-native enterprise operating platform for governed products, regulated SaaS, and sovereign deployments.

**Arabic — platform**

> منصة Dogan-AI OS من Dogan Consult هي منصة تشغيل مؤسسية مدعومة بالذكاء الاصطناعي لبناء وتشغيل منتجات منظمة وآمنة وقابلة للحوكمة.

**English — Shahin-specific**

> Shahin-AI by Dogan Consult, powered by Dogan-AI OS.

**Arabic — Shahin-specific**

> Shahin-AI من Dogan Consult، مدعوم بمنصة Dogan-AI OS.

---

## What this pack is

Evidence-grounded reference for **Dogan Consult** as company, **Dogan-AI OS** as platform, **Shahin-AI** as a product example on that platform. **Truth first, marketing second.** UI strings are cited separately from backend or registry proof.

---

## File index

| # | File | Purpose |
|---|------|---------|
| 00 | `00_README.md` | This file |
| 01 | `01_EXECUTIVE_SUMMARY.md` | EN + AR elevator copy; canonical phrases |
| 02 | `02_PLATFORM_TRUTH_DOGAN_AI_OS.md` | Narrow runtime vs broad design |
| 03 | `03_ARCHITECTURE_AND_RUNTIME_INVENTORY.md` | Services, PM2, ports, registry |
| 04 | `04_PRODUCTS_AND_PRODUCT_LAYER.md` | Shahin-AI Website, product-shell |
| 05 | `05_MODULE_CATALOG_DEEP_DIVE.md` | Modules, manifests, `_sources` |
| 06 | `06_PLATFORM_CAPABILITIES_FOR_SALES.md` | Sales-safe claims |
| 07 | `07_AI_POWER_STACK.md` | AI / LangGraph / Langfuse signals |
| 08 | `08_DAUTH_IDENTITY_AUTHORIZATION_TRUST.md` | DAuth, gateway, Keycloak |
| 09 | `09_DSOC_SECURITY_OPERATIONS.md` | DSOC module |
| 10 | `10_DNOC_NETWORK_OPERATIONS_OBSERVABILITY.md` | DNOC module |
| 11 | `11_WORKFLOW_AUDIT_EVIDENCE_GOVERNANCE.md` | Workflow, audit, evidence |
| 12 | `12_KSA_GCC_REGULATORY_READINESS.md` | Regulatory modules / wording |
| 13 | `13_COMPETITIVE_POSITIONING_AND_DIFFERENTIATORS.md` | Positioning with proof |
| 14 | `14_DESIGN_CONTENT_VIDEO_PPT_INFOGRAPHIC_BRIEF.md` | Creative + attribution |
| 15 | `15_SALES_TALK_TRACKS_BY_AUDIENCE.md` | Audience scripts |
| 16 | `16_CLAIMS_REGISTER_AND_EVIDENCE_MAP.md` | Claims table |
| 17 | `17_OPEN_QUESTIONS_AND_VERIFICATION_GAPS.md` | Unknowns |
| — | `MASTER_DOGAN_CONSULT_COMPANY_KNOWLEDGE_PACK.md` | Merged reference + TOC |

---

## Evidence taxonomy

Each substantive claim should carry:

- **CONFIRMED_IN_CODE** — Readable source in repo.
- **CONFIRMED_IN_CONFIG** — Committed JSON/YAML/PM2/manifest.
- **CONFIRMED_IN_DOCS** — Committed markdown (e.g. audits).
- **INFERRED_FROM_STRUCTURE** — Directory/manifest presence without runtime mount proof.
- **NEEDS_RUNTIME_VERIFICATION** — Requires live process, DB, browser, or gateway matrix.

---

## How to update

1. Change code or config first; then update claims + evidence paths.  
2. Re-run naming check (see `MASTER_…` final report): no forbidden company phrasing.

---

## Evidence (pack location)

```yaml
claim: "This pack lives under DOS Platform/docs/company-knowledge-pack/"
confidence: CONFIRMED_IN_CODE
evidence:
  - path: "DOS Platform/docs/company-knowledge-pack/00_README.md"
```
