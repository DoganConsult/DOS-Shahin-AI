# 01 — Executive summary (EN + AR)

**Dogan Consult Company Knowledge Pack — Dogan-AI OS Platform, Shahin-AI Product, Modules, AI, Sales, and Design Reference.**

---

## English (canonical)

**Dogan Consult** builds and operates **Dogan-AI OS**, the modular operating system for regulated and high-trust software. **Shahin-AI** is a product example and proof surface running on **Dogan-AI OS** (GRC / compliance workspace narrative in repo). The repository contains a large **DOS Platform** tree (module folders, manifests, registries), a **pnpm** workspace of shared packages, a **services** layer (Node microservices), and **PM2** ecosystem config that currently starts **four** processes (gateway, auth-service, tenant-service, product-shell) — **not** the full module fleet.

**Attribution:** *Powered by Dogan Consult* · *Built by Dogan Consult*

### Verbatim approved lines (English)

> Dogan-AI OS by Dogan Consult is an AI-native enterprise operating platform for governed products, regulated SaaS, and sovereign deployments.

> Shahin-AI by Dogan Consult, powered by Dogan-AI OS.

---

## Arabic (canonical)

**Dogan Consult** تبني وتشغّل **Dogan-AI OS** — نظام تشغيلي وحداتي للبرمجيات عالية الثقة والامتثال. **Shahin-AI** مثال منتج وواجهة إثبات تعمل على **Dogan-AI OS** (سرد GRC/امتثال في المستودع). المستودع يحتوي شجرة **DOS Platform** واسعة، مساحة عمل **pnpm**، طبقة **services**، وتكوين **PM2** يشغّل حاليًا **أربعة** تطبيقات فقط — وليس كامل أسطول الوحدات.

**الإسناد:** *Powered by Dogan Consult* · *Built by Dogan Consult*

### Verbatim approved lines (Arabic)

> منصة Dogan-AI OS من Dogan Consult هي منصة تشغيل مؤسسية مدعومة بالذكاء الاصطناعي لبناء وتشغيل منتجات منظمة وآمنة وقابلة للحوكمة.

> Shahin-AI من Dogan Consult، مدعوم بمنصة Dogan-AI OS.

---

## Forbidden wording (do not use)

- “Dogan-AI company” / “Dogan AI company” / “Dogan-AI is the company”  
Use **Dogan Consult** for the company and **Dogan-AI OS** for the platform.

---

## Evidence (workspace + PM2 scope)

```yaml
claim: "pnpm workspace lists nine packages; root package.json documents that no modules are wired into default build"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "pnpm-workspace.yaml"
  - path: "package.json"
    note: "scripts reference build:modules:noop; comment 'No modules wired'"
```

```yaml
claim: "PM2 ecosystem config defines four apps on ports 4000, 4001, 4002, 3000"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "ops/ecosystem.all.config.js"
```

```yaml
claim: "modules.registry.json contains 72 module entries"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "DOS Platform/registries/modules.registry.json"
    note: "jq '.modules | length' => 72"
```

```yaml
claim: "services.registry.json lists 37 service definitions"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "DOS Platform/registries/services.registry.json"
    note: "grep -c '\"serviceCode\"' => 37"
```
