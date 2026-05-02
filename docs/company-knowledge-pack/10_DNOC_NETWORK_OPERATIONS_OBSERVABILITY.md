# 10 — DNOC (network / ops / observability)

**Dogan-AI OS** · **Dogan Consult**

---

## Repo evidence

- Directory: `DOS Platform/DNOC Module/`

```yaml
claim: "DNOC Module directory exists"
confidence: CONFIRMED_IN_CODE
evidence:
  - path: "DOS Platform/DNOC Module/"
```

---

## Relationship to default PM2 slice

Default PM2 does **not** list a separate “dnoc-service” in `ops/ecosystem.all.config.js` — DNOC may be **module-only** or deployed in extended profiles.

**NEEDS_RUNTIME_VERIFICATION:** Service name, port, metrics exporters, and dashboard wiring.
