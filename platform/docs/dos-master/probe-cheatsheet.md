# DOS Master — Operator Probe Cheatsheet

> Canonical curl invocations for each DOS Master service, accounting for
> trust-zone transport. Plain-HTTP probes against admin-zone services
> get **"empty reply from server"** — that is the TLS listener refusing
> clear-text, not an outage. Use the right protocol + cert flags.

| Trust zone | Transport | Cert posture |
|------------|-----------|--------------|
| **public** | plain HTTP loopback (Cloudflare → cloudflared → nginx → PM2 origin handles TLS termination at the edge) | none |
| **tenant** | plain HTTP loopback (gateway/auth headers carry tenant identity) | none |
| **admin**  | HTTPS w/ mTLS — server presents leaf signed by `admin-mtls/ca.crt`, **client must present `gateway-client` leaf** | `--cacert ca.crt --cert gateway-client.crt --key gateway-client.key` |

Cert directory: `platform/config-center/secrets/admin-mtls/`

---

## 1. Public-zone services (plain HTTP)

```bash
# signup-bff       :4009   — public trust zone
curl -sSf http://127.0.0.1:4009/api/public/signup/flows?product_code=shahin-ai

# anti-abuse       :4010   — public trust zone
curl -sSf -X POST http://127.0.0.1:4010/api/public/anti-abuse/evaluate \
     -H 'content-type: application/json' \
     -d '{"email":"u@example.com","captcha_token":"x","ip":"127.0.0.1","fp":"abc"}'

# marketing-shell  :4011   — public trust zone
curl -sSf 'http://127.0.0.1:4011/api/public/site/site-bootstrap?product=shahin-ai'
```

## 2. Tenant-zone services (plain HTTP loopback)

```bash
# workspace-bff    :4007   — tenant trust zone
curl -sSf http://127.0.0.1:4007/api/workspace/health
# → {"ok":true,"service":"workspace-bff"}

# Bootstrap (requires JWE-tenant token from gateway/auth):
# curl -sSf http://127.0.0.1:4007/api/workspace/bootstrap \
#      -H "authorization: Bearer ${WORKSPACE_BOOTSTRAP_JWE}"

# tenant-admin-bff :4014   — tenant trust zone
curl -sSf 'http://127.0.0.1:4014/api/tenant-admin/composer-bootstrap?tenant_id=14f273cf260a4736'
```

## 3. Admin-zone services (HTTPS + mTLS REQUIRED)

```bash
CERTS=/root/DOS-Platform/platform/config-center/secrets/admin-mtls
MTLS=( --cacert "$CERTS/ca.crt" --cert "$CERTS/gateway-client.crt" --key "$CERTS/gateway-client.key" --resolve admin-console-bff:4013:127.0.0.1 --resolve rollout-service:4017:127.0.0.1 --resolve publish-service:4012:127.0.0.1 )

# admin-console-bff :4013  — admin trust zone (M11 + Platform Admin SPA)
curl -sSf "${MTLS[@]}" https://127.0.0.1:4013/api/admin/console/health
# → {"ok":true,"service":"admin-console-bff"}

curl -sSf "${MTLS[@]}" https://127.0.0.1:4013/api/admin/console/dos-master/m15/status \
     -H 'authorization: Bearer dos-master-platform' | jq

# rollout-service   :4017  — admin trust zone (M14 PPD engine)
curl -sSf "${MTLS[@]}" https://127.0.0.1:4017/api/admin/rollout/health
# → {"ok":true,"service":"rollout-service"}

curl -sSf "${MTLS[@]}" https://127.0.0.1:4017/api/admin/rollout/plans | jq

# publish-service   :4012  — admin trust zone (M10)
curl -sSf "${MTLS[@]}" https://127.0.0.1:4012/api/admin/publish/revisions | jq
```

### Diagnosing "empty reply from server"

If you see:

```
curl: (52) Empty reply from server
```

…you almost certainly probed an admin-zone service over plain HTTP. The
TLS listener accepted the TCP socket and immediately closed it because
the client did not negotiate TLS. The fix is **not** to "restart the
service" — it's to add `https://` + the mTLS triplet above.

If you see:

```
curl: (35) error:0A00045C:SSL routines::tlsv13 alert certificate required
```

…the server is up and demanding a client cert. Add `--cert gateway-client.crt --key gateway-client.key`.

If you see:

```
401 {"error":"missing-bearer-token","realm":"platform-ops"}
```

…mTLS succeeded; the `platformOpsRealmGuard` is now demanding a Bearer
token. Either an opaque DB session (`tmp.<base64url>` minted via
`scripts/dos-master/provision-temp-admin.mjs`) or an actual KC-issued
JWT (when `KC_REQUIRE=1`) will pass.

## 4. Gateway proxy (the operator-friendly path)

The gateway terminates the admin mTLS at one hop so SPAs don't have to
ship client certs. Hit the gateway in plain HTTP and let it dial the
upstream over mTLS:

```bash
# Plain HTTP to gateway → mTLS upstream → admin-console-bff
curl -sS http://127.0.0.1:4000/api/admin/console/health
# → may 401 (missing Bearer) but proves the proxy chain

# With Bearer (opaque DB session):
TOKEN=$(node scripts/dos-master/provision-temp-admin.mjs --email doganlap@gmail.com --print-token)
curl -sS http://127.0.0.1:4000/api/admin/console/dos-master/m15/status \
     -H "authorization: Bearer ${TOKEN}" | jq
```

## 5. Cloudflare → cloudflared → nginx → origin (production-shaped)

```bash
# Public marketing shell (what real visitors hit)
curl -sSI https://shahin-ai.com/

# Platform Admin SPA (Cloudflare Access fronted, then admin-console-bff /platform-admin)
# (Requires CF Access cookie — only your provisioned email reaches here.)
```

---

## Quick port → zone reference

| Port  | Service              | Zone    | Probe form |
|-------|----------------------|---------|------------|
| 4000  | gateway              | edge    | http://127.0.0.1:4000 |
| 4007  | workspace-bff        | tenant  | http://127.0.0.1:4007 |
| 4009  | signup-bff           | public  | http://127.0.0.1:4009 |
| 4010  | anti-abuse-service   | public  | http://127.0.0.1:4010 |
| 4011  | marketing-shell      | public  | http://127.0.0.1:4011 |
| 4012  | publish-service      | admin   | https + mTLS |
| 4013  | admin-console-bff    | admin   | https + mTLS |
| 4014  | tenant-admin-bff     | tenant  | http://127.0.0.1:4014 |
| 4015  | onboarding-service   | admin   | https + mTLS |
| 4017  | rollout-service      | admin   | https + mTLS |

> If a port answers "empty reply" on `http://`, try `https://` with the
> mTLS triplet before declaring the service down.
