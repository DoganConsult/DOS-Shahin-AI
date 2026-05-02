# Shahin-AI (First Product)

Shahin-AI is the **first product** composed on top of Dogan-AI OS. It is **not** the platform.

Layout:
- app/ — Angular SPA
- routes/ — product route composition
- navigation/ — product navigation composition
- composition/ — product-shell composition root
- theme/, assets/, i18n/, state/ — product-owned UI
- services/ — product-only service code (no platform code)
- dynamic-ui/ — product-side enrollment of platform Dynamic UI surfaces
- agents/ — product-side enrollment of platform agents
- tests/ — product-level tests
- product.manifest.json — canonical product registration
- product.config.ts — typed accessor wrapper around the manifest
