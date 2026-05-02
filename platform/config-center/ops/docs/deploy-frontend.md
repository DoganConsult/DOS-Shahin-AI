# Frontend deploy — Shahin-AI

The Shahin-AI Angular frontend (`products/shahin-ai/website/`) is built and deployed by the staging/production deploy jobs in [.github/workflows/ci.yml](../../.github/workflows/ci.yml). This doc covers the secrets and the one-time nginx cutover that those jobs depend on.

> **Phase 4A note (2026-04-29):** the marketing site source moved from
> `platform/Shahin-AI Website/spa/` (legacy) to `products/shahin-ai/website/`
> via history-preserving `git mv`. All paths below have been updated; if you
> are diffing against an older deploy script or runbook, search-and-replace
> the legacy path before applying.

## Required GitHub Actions secrets

Set these on the repo (Settings → Secrets and variables → Actions). Without them, deploy still succeeds, but the CDN won't be purged and users may keep seeing the previous bundle until Cloudflare's TTL expires.

| Secret | Scope | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | staging + production | API token with `Zone → Cache Purge` permission on the shahin-ai.com zone. Generate via Cloudflare dashboard → My Profile → API Tokens → Create Token → "Custom token" with permission `Zone / Cache Purge / Purge`. |
| `CLOUDFLARE_ZONE_ID` | production | Zone ID for `shahin-ai.com` (dashboard → domain overview → right sidebar). |
| `CLOUDFLARE_ZONE_ID_STAGING` | staging | Zone ID for the staging zone (if staging uses its own Cloudflare zone). If staging shares the production zone, set it to the same value. |

The deploy script checks that both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` are non-empty before calling the purge API, and logs a `WARN` line if either is missing — so a missing secret won't fail the deploy, just skip the purge.

## Nginx cutover (one-time, manual)

The repo's [ops/nginx/frontend.conf](../nginx/frontend.conf) now points at the current build output layout:

```
root /opt/dos-aio/DOS Platform/products/shahin-ai/website/dist/shahin-grc/browser;
```

Production nginx is expected to still be serving from the legacy path `/opt/dos-aio/frontend/dist/shahin-ai/browser`. The CI deploy keeps that legacy path populated via an `rsync` mirror, so production stays functional while the cutover is pending.

When you're ready to cut over:

1. SSH to the prod host, take a backup: `cp /etc/nginx/sites-available/shahin-ai.conf{,.bak-YYYYMMDD}`.
2. Sync the repo's `ops/nginx/frontend.conf` into place (diff first).
3. `nginx -t` to validate.
4. `systemctl reload nginx`.
5. `curl -fsS https://shahin-ai.com/manifest.webmanifest` — expect JSON with `"short_name":"Shahin-AI"`.
6. Once stable for a release cycle, remove the legacy-mirror `rsync` block from the deploy script in `.github/workflows/ci.yml` and delete `/opt/dos-aio/frontend/dist/shahin-ai/` on the prod box.

## What the deploy script now does for the frontend

Order, per [.github/workflows/ci.yml](../../.github/workflows/ci.yml) (both `deploy-staging` and `deploy`):

1. `pnpm run build:all` — backend packages/modules/services (unchanged).
2. `pnpm run build:frontend` — Angular production build into `products/shahin-ai/website/dist/shahin-grc/browser`.
3. Verify the build: `index.html` exists and references `manifest.webmanifest`; `manifest.webmanifest` parses as JSON.
4. Mirror the new dist into the legacy nginx path (rollback-safety until cutover).
5. `pnpm run migrate` → `pm2 reload` (unchanged).
6. Purge Cloudflare cache for `/`, `/index.html`, `/manifest.webmanifest`, `/ngsw.json`, `/ngsw-worker.js` (both apex and `www.`).
7. `health-check-all.sh` now additionally curls the live manifest + index.html; failing either triggers the existing auto-rollback.

If any of steps 2–4 fail, the deploy exits non-zero before touching PM2 — the previous frontend stays live.

## Verifying after a deploy

```
# From your machine
curl -sI https://shahin-ai.com/manifest.webmanifest | head -1          # expect 200
curl -s  https://shahin-ai.com/manifest.webmanifest | python3 -m json.tool
curl -s  https://shahin-ai.com/ | grep -o 'manifest\.[a-z]*'           # expect manifest.webmanifest
```

Browser DevTools → Application → Manifest should show "Shahin-AI — KSA GRC Platform" parse-clean. The console-visible `cdn.aitopia.ai` CSP violations are a browser extension (Aitopia AI) hitting the CSP — expected, not a regression.
