# Modules/ Isolation Audit (Stage 1)

Snapshot date: 2026-05-02
Source tree: `<repo>`
Snapshot: `.modules-isolation/snapshot-modules.tar` (51 MB tar of `modules/`, excludes node_modules/dist/.angular)

## 1. Footprint

| Metric | Value |
|---|---|
| Source files in `modules/` (.ts/.tsx/.js) | 8,468 |
| Disk size | 80 MB |
| Top-level entries in `modules/` | 60+ business modules + `packages/`, `core/`, `modules/` (nested) |

## 2. Outbound dependencies (modules/ → external)

`modules/` only references **18 unique `@dos/*` packages**. Most of them already live INSIDE `modules/packages/`.

| Package | Imports | Physical location | Class |
|---|---:|---|---|
| `@dos/platform-core`     | 2,271 | `modules/packages/dos-platform-core`        | INTERNAL |
| `@dos/module-sdk`        | 1,678 | `modules/packages/dos-module-sdk`           | INTERNAL |
| `@dos/db`                | 1,237 | `modules/packages/dos-db`                   | INTERNAL |
| `@dos/types`             | 1,147 | `modules/packages/dos-types`                | INTERNAL |
| `@dos/module-auth`       |   254 | `platform/dauth/packages/module-auth`       | EXTERNAL |
| `@dos/contracts`         |    88 | `modules/packages/dos-contracts`            | INTERNAL |
| `@dos/ports`             |    37 | `modules/packages/ports`                    | INTERNAL |
| `@dos/dauth-shared`      |    30 | `platform/dauth/packages/shared`            | EXTERNAL |
| `@dos/service-client`    |    24 | `modules/packages/dos-service-client`       | INTERNAL |
| `@dos/event-backbone`    |    18 | `modules/packages/dos-event-backbone`       | INTERNAL |
| `@dos/service-bootstrap` |    15 | `modules/packages/dos-service-bootstrap`    | INTERNAL |
| `@dos/module-dos`        |    12 | `modules/packages/module-dos`               | INTERNAL |
| `@dos/module-soc`        |    10 | `modules/packages/module-soc`               | INTERNAL |
| `@dos/runtime-config`    |     9 | `modules/packages/dos-runtime-config`       | INTERNAL |
| `@dos/auth`              |     8 | (typo / legacy alias)                       | TO RESOLVE |
| `@dos/module-telemetry`  |     7 | `modules/packages/module-telemetry`         | INTERNAL |
| `@dos/ui-system`         |     4 | `platform/ui-system/dos-ui-system`          | EXTERNAL |
| `@dos/ai-gateway`        |     1 | `platform/ai/packages/ai-gateway`           | EXTERNAL |

**Headline:** `modules/` is already ~99% self-contained. Only **4 external `@dos/*` packages** with **289 imports** cross the boundary. `@dos/auth` (8) is a stray that needs resolution.

## 3. Inbound dependencies (platform/services/products → modules/)

**410 imports** cross IN to packages whose sources live in `modules/`:

| Package consumed | Imports | Top consumers |
|---|---:|---|
| `@dos/module-sdk`        | 363 | platform/ai (136), platform/config-center (115), platform/workflow (88), services/notification-service (14), platform/dos (14) |
| `@dos/module-auth`       |  42 | platform/* (auth surface, lives in platform/) |
| `@dos/module-risk`       |   2 | |
| `@dos/module-foundation` |   2 | |
| `@dos/module-telemetry`  |   1 | |

**Headline:** `@dos/module-sdk` is a *de-facto* platform SDK that physically lives in `modules/packages/dos-module-sdk`. This is the largest four-tier violation.

## 4. Per-module summary

See `per-module/summary.txt`. Top modules by size:

| Module | files | out_deps | reverse_refs |
|---|---:|---:|---:|
| compliance | 1147 | 15 | 5 |
| governance |  632 |  8 | 0 |
| analytics  |  427 |  5 | 0 |
| risk       |  330 | 10 | 2 |
| privacy    |  292 |  5 | 0 |
| action     |  269 |  5 | 0 |
| audit      |  243 |  6 | 7 |
| knowledge  |  242 |  5 | 0 |
| evidence   |  209 |  5 | 0 |
| policy     |  205 |  5 | 0 |
| asset      |  184 |  5 | 0 |
| bcp        |  155 | 11 | 0 |
| qiyas      |  129 | 12 | 0 |
| incident   |  124 |  5 | 1 |

## 5. Structural issues found

1. **Triple-nested "modules" trees**: `modules/`, `modules/modules/`, `modules/packages/modules/`.
2. **`modules/core/` duplicates platform DNA** (`platform/`, `runtime/`, `services/`, `admin/`, `ngrx/`, `i18n/`).
3. **`modules/packages/dos-module-sdk` is the platform's real SDK** but lives in the modules tier.
4. **Workspace omits most modules.** `pnpm-workspace.yaml` only declares 4 module packages explicitly + `modules/packages/*`; the other ~55 module folders are Angular feature trees.

## 6. Verdict

`modules/` is far more isolated than appearances suggest. Only 4 external `@dos/*` packages (~289 imports) flow IN. The pain is OUT: 410 platform/service imports of `@dos/module-sdk` & friends.

Stages 2-4 below execute the safe path: build a standalone preview workspace at `.modules-isolation/workspace/` with shims for the 4 external deps. Live `modules/` and live `platform/` are NOT modified.
