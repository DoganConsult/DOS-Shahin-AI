# Runbook — Admin-zone cert rotation

**Audience:** Ops on-call. **Doctrine binding:** §10 (no autonomous
cert mint), Article 4 (admin trust-zone).

## When to rotate
- `cert-expiry-baseline` CI guard reports `< 90d remaining`.
- Compromise / suspected key leak.
- Annual rotation per security policy.

## Pre-flight
```bash
node scripts/ci-guards/cert-expiry-baseline.mjs
ls platform/config-center/secrets/admin-mtls/
pm2 list | grep -E "<svc>"
```

## Dry-run (safe)
```bash
node scripts/dos-master/rotate-admin-cert.mjs <svc>
```
Prints openssl commands and exits without touching disk.

## Apply (modifies trust-zone)
```bash
node scripts/dos-master/rotate-admin-cert.mjs <svc> --apply
```
Performs atomic rename — old cert is overwritten. Old cert is NOT
backed up automatically; if you need a rollback artefact, copy
`.crt` / `.key` to `/var/backups/admin-mtls/$(date +%Y%m%d)/` first.

## Restart
```bash
pm2 delete <svc>-service
set -a
source platform/config-center/env/<svc>-service.env
source platform/config-center/env/platform.secrets.env
set +a
cd services/<svc>-service && pm2 start dist/server.js --name <svc>-service
```

## Verify
```bash
CA=platform/config-center/secrets/admin-mtls
curl -sS -o /dev/null -w "%{http_code}\n" \
  --cacert $CA/ca.crt --cert $CA/gateway-client.crt --key $CA/gateway-client.key \
  https://127.0.0.1:<port>/health
# expect 200

curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4000/api/admin/<svc>/health
# expect 200 via gateway HttpsAgent

node scripts/ci-guards/cert-expiry-baseline.mjs
# expect PASS
```

## Rollback
```bash
cp /var/backups/admin-mtls/<date>/<svc>.{crt,key} platform/config-center/secrets/admin-mtls/
# then re-run the Restart + Verify steps above
```

## Audit trail
Every rotation must be recorded as a row in `dos.platform_slo_event`
with `kind='cert_rotated'` (write via `dos-master` actor):
```sql
SET dos.actor='dos-master';
INSERT INTO dos.platform_slo_event (service_code, ok, error_message, emitted_by)
VALUES ('<svc>-service', true, 'cert_rotated', 'ops-runbook');
```
