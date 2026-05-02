# PM2 env-change runbook

## Rule

After editing `platform/config-center/env/.env.shared` or any `platform/config-center/env/<service>.env`, restart the
affected services with **`pm2 delete && pm2 start`**, never with
`pm2 restart`, `pm2 reload`, or `pm2 restart --update-env`.

`pm2 restart` and `pm2 reload --update-env` reuse pm2's cached environment
from a prior incarnation. The cached env can persist across restarts even
when `--update-env` is set, because `pm2` reads from its own dump rather
than re-evaluating the ecosystem file. Reproduced in the 2026-04-27 KC
client-secret incident: `auth-service` ran for ~14 hours with a stale
`KEYCLOAK_OIDC_CLIENT_SECRET`, returning 502 on every OIDC callback. Only
a full delete/start cycle picked up the new secret.

## Commands

Per-service (most common):

```
pm2 delete <service>
pm2 start ops/ecosystem.m1.config.js --only <service>
```

Whole stack:

```
pm2 delete all
pm2 start ops/ecosystem.m1.config.js
```

Use whichever ecosystem file is currently authoritative — check first with:

```
pm2 jlist | python3 -c "import json,sys;[print(p['name'],'<-',p['pm2_env'].get('pm_exec_path','')) for p in json.load(sys.stdin)]"
```

## Verification

After the start completes:

```
pm2 status                            # all target services 'online', restart count 0

# Confirm the new env value is actually in the running process:
PID=$(pm2 jlist | python3 -c "import json,sys;[print(p['pid']) for p in json.load(sys.stdin) if p['name']=='<service>']")
tr '\0' '\n' < /proc/$PID/environ | grep <VAR_NAME>
```

If `/proc/$PID/environ` does not show the new value, the env was not
re-read — repeat the delete/start cycle.

## Related

- `MEMORY.md` → `feedback_keycloak_native_gotchas.md` (`#3` covers the same
  invariant for `.env.shared` edits).
- `ops/runbooks/deploy.md` cross-links here from the env-change section.
