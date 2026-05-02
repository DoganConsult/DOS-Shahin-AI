# 04 — Products and product layer

**Dogan Consult** delivers products such as **Shahin-AI** that run on **Dogan-AI OS**.

---

## Shahin-AI (product example in repo)

### Shahin-AI Website (Angular)

- Path: `DOS Platform/Shahin-AI Website/frontend/`  
- **package.json** description: “Shahin-AI GRC Platform - by Dogan Consult”  
- **public/manifest.json**: “Shahin-AI by Dogan Consult — KSA GRC Painkiller”

```yaml
claim: "Shahin-AI Website package and PWA manifest attribute product to Dogan Consult"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "DOS Platform/Shahin-AI Website/frontend/package.json"
  - path: "DOS Platform/Shahin-AI Website/frontend/public/manifest.json"
```

### product-shell

PM2 starts `dos-product-shell` on port **3000** per `ops/ecosystem.all.config.js`.

```yaml
claim: "product-shell is in default PM2 ecosystem on port 3000"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "ops/ecosystem.all.config.js"
```

**NEEDS_RUNTIME_VERIFICATION:** Which UI bundle is served in a given deploy (Shahin-AI Website vs other), and reverse-proxy path.

---

## Separation: UI marketing vs corporate naming

| Surface | Example | Interpretation |
|---------|---------|----------------|
| i18n / marketing | “AGRC-OS by Dogan Consult” in `en.json` | Product marketing string |
| Corporate | Dogan Consult | Company name for contracts and attribution |
| Platform | Dogan-AI OS | Technical platform name |

```yaml
claim: "en.json contains badge string referencing AGRC-OS by Dogan Consult"
confidence: CONFIRMED_IN_CODE
evidence:
  - path: "DOS Platform/Shahin-AI Website/frontend/src/app/blueprint/assets/i18n/en.json"
```

Do **not** merge marketing codenames into “company name” claims without explicit stakeholder approval.

---

## Powered by / Built by

Use **Powered by Dogan Consult** and **Built by Dogan Consult** on public sites and decks unless brand guidelines say otherwise.
