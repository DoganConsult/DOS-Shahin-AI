# Gate 2 — UI_OS_WORKSPACE_CONSUMER_PASS

Run timestamp: 2026-05-01T10:05:42.189Z
Base URL: http://127.0.0.1:3000
Viewport (default): 1440×900
Auth cookie supplied: no

**13/13 surfaces captured**, 0 failed, 0 skipped.

| # | Surface | Path | Auth | HTTP | Bytes | File | Status |
|---|---|---|---|---|---|---|---|
| 01 | 01-landing | `/` | public | 200 | 2198981 | `platform/docs/gates/screenshots/01-landing.png` | PASS |
| 02 | 02-login-redirect | `/login` | public | 200 | 442245 | `platform/docs/gates/screenshots/02-login-redirect.png` | PASS |
| 03 | 03-register-redirect | `/register` | public | 200 | 403921 | `platform/docs/gates/screenshots/03-register-redirect.png` | PASS |
| 04 | 04-workspace-home | `/workspace-home` | required | 200 | 442321 | `platform/docs/gates/screenshots/04-workspace-home.png` | PASS |
| 04b | 04b-workspace-home-tablet | `/workspace-home` | required | 200 | 237094 | `platform/docs/gates/screenshots/04b-workspace-home-tablet.png` | PASS |
| 04c | 04c-workspace-home-mobile-iphone-pro | `/workspace-home` | required | 200 | 89501 | `platform/docs/gates/screenshots/04c-workspace-home-mobile-iphone-pro.png` | PASS |
| 05 | 05-foundation | `/foundation/overview` | required | 200 | 2197863 | `platform/docs/gates/screenshots/05-foundation.png` | PASS |
| 05b | 05b-foundation-tablet | `/foundation/overview` | required | 200 | 1826135 | `platform/docs/gates/screenshots/05b-foundation-tablet.png` | PASS |
| 06 | 06-profile | `/profile` | required | 200 | 442321 | `platform/docs/gates/screenshots/06-profile.png` | PASS |
| 07 | 07-tenant-profile | `/tenant-profile` | required | 200 | 442224 | `platform/docs/gates/screenshots/07-tenant-profile.png` | PASS |
| 08 | 08-settings | `/settings` | required | 200 | 441948 | `platform/docs/gates/screenshots/08-settings.png` | PASS |
| 09 | 09-trial-banner | `/workspace-home?gate=banner` | required | 200 | 442313 | `platform/docs/gates/screenshots/09-trial-banner.png` | PASS |
| 10 | 10-mobile-shell | `/workspace-home` | required | 200 | 124167 | `platform/docs/gates/screenshots/10-mobile-shell.png` | PASS |

## Pass criteria
- HTTP 200 / 302 / 401 (with rendered shell)
- PNG ≥ 4096 bytes (screen produced non-empty content)
- All authenticated surfaces require valid `dos_access_token` cookie when `--auth-cookie` is supplied

## How to re-run
```bash
pnpm gate:ui-os-screenshots   # default base-url http://127.0.0.1:3000
pnpm gate:ui-os-screenshots --auth-cookie=<token>     # for auth surfaces
pnpm gate:ui-os-screenshots --base-url=https://shahin-ai.com
```
