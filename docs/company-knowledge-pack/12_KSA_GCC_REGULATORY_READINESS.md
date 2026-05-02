# 12 — KSA / GCC regulatory readiness

**Shahin-AI** product messaging references KSA GRC context; **Dogan Consult** is the company.

---

## Evidence (marketing / product strings)

```yaml
claim: "PWA manifest describes KSA GRC painkiller narrative for Shahin-AI"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "DOS Platform/Shahin-AI Website/frontend/public/manifest.json"
```

```yaml
claim: "i18n en.json includes KSA / AGRC-OS by Dogan Consult badge string"
confidence: CONFIRMED_IN_CODE
evidence:
  - path: "DOS Platform/Shahin-AI Website/frontend/src/app/blueprint/assets/i18n/en.json"
```

---

## Module hint

`DOS Platform/ksa-regulatory Module/` exists — **INFERRED_FROM_STRUCTURE** for regulatory content engines until APIs are verified live.

```yaml
claim: "ksa-regulatory Module folder exists"
confidence: CONFIRMED_IN_CODE
evidence:
  - path: "DOS Platform/ksa-regulatory Module/"
```

---

## NEEDS_RUNTIME_VERIFICATION

- Mapped controls per SAMA / NCA / PDPL (or customer-selected frameworks) in DB.  
- Lawyer-reviewed compliance of public marketing strings.
