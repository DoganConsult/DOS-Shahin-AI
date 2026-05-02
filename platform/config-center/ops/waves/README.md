# Deployment waves

## Wave 2 — product microservices

`wave2-product.apps.json` lists PM2 **app names** (must exist in `ops/ecosystem.all.config.js` with a `port`). Used by `ops/scripts/deploy-wave-2-product.sh` and validated by `pnpm run validate:wave2-apps`.

After editing the manifest or ecosystem, run:

```bash
pnpm run validate:wave2-apps
pnpm run generate:edge-config
```
