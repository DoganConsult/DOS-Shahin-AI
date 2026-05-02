# 07 — AI power stack

**Platform:** Dogan-AI OS · **Company:** Dogan Consult

---

## What the repo shows today

### Langfuse / LangGraph (mostly under `_sources`)

Dependencies and paths appear under `DOS Platform/AI-OS Module/_sources/` (vendor mirror layout). Treat as **platform AI direction + reference code**, not guaranteed production wiring in the 4-app PM2 slice.

```yaml
claim: "Langfuse/langgraph-related packages exist under AI-OS _sources"
confidence: CONFIRMED_IN_CODE
evidence:
  - path: "DOS Platform/AI-OS Module/_sources/"
    note: "NEEDS_RUNTIME_VERIFICATION for deployed AI endpoints"
```

### Onboarding service comments

Onboarding service README or source may reference AI — verify per-file before sales claims.

**NEEDS_RUNTIME_VERIFICATION:** Live `/api/ai/*` routes, model keys, RAG corpora, tenant isolation for prompts.

---

## Safe wording for prospects

- “The platform includes **AI-OS** module material and reference stacks for future or selective deployment.”  
- “Exact AI features in your tenant depend on **deployment profile** and **NEEDS_RUNTIME_VERIFICATION**.”

---

## Forbidden

Do not say “**Dogan-AI company** AI” — say **Dogan Consult** delivers AI features on **Dogan-AI OS**.
