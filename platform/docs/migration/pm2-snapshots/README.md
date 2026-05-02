# PM2 Snapshots — Forensic Audit Trail

Pre-restructure PM2 process dumps captured during Deployment Wave 1 (April 2026).

## Naming convention

```
pre-wipe-YYYYMMDD-HHMMSS.dump.json
post-wipe-YYYYMMDD-HHMMSS.dump.json
```

## Purpose

These snapshots preserve the exact PM2 daemon state (`~/.pm2/dump.pm2`)
**before and after** a full PM2 wipe. They serve three audit functions:

1. **Drift evidence** — record which processes were running from non-canonical
   paths (e.g., pre-restructure `/root/DOS-AIO/services/`) before consolidation
   to the canonical platform root (`/root/DOS-AIO/DOS Platform/`).
2. **Crash-loop forensics** — preserve `restart_time` counts that would
   otherwise be lost when `pm2 delete all` runs.
3. **Reversibility** — if a wave-1 boot fails post-wipe, the snapshot can be
   inspected (or replayed via `pm2 resurrect <file>` after copying back to
   `~/.pm2/dump.pm2`) to restore the pre-wipe state.

## Index

| Snapshot                               | Apps | Notes                                                                 |
|----------------------------------------|------|-----------------------------------------------------------------------|
| `pre-wipe-20260429-193501.dump.json`   | 14   | Drifted state before Wave-1 PM2 reset; integrations-service had 8745 restarts. |

## Replay (emergency only)

```bash
cp platform/docs/migration/pm2-snapshots/pre-wipe-20260429-193501.dump.json ~/.pm2/dump.pm2
pm2 resurrect
```

Only use for recovery — the canonical runtime is `pm2 start ops/ecosystem.all.config.js`.
