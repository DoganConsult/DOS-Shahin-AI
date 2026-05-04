# M15 — Admin Trust-Zone Hardening: Ops Handoff Package

> **Status:** SCAFFOLDS LANDED, ENFORCEMENT NOT FLIPPED.
> **Doctrine binding:** Articles 4, 5, 7, 11; §10 (no autonomous KC/CA mint).
> **Authority required:** Platform-Ops lead (CA + realm), Security lead (jurisdiction), Doctrine writer (PPD ring approval).

This document is the **operator runbook** for flipping `KC_REQUIRE=0→1` and
`MTLS_ENFORCE=0→1` against the live admin trust zone. The DOS Master code
side is complete and disabled-by-default; the remaining work is **outside**
the engine: cert authority, realm provisioning, jurisdiction sign-off, and
PPD ring approval.

---

## 1. Current state (verified 2026-05-04)

| Surface | State | Source of truth |
|---------|-------|-----------------|
| `admin-console-bff` PM2 | **online** id 16, port 4013 | `pm2 jlist` |
| Gateway proxy `/api/admin/console/* → :4013` | **active** | `services/gateway/src/server.ts:792` |
| `/platform-admin` SPA | **HTTP 200**, lazy chunk live | `https://shahin-ai.com/` |
| `dos.actor='dos-master'` | **shipped** | `admin-console-bff.env` |
| KC `platform-ops` verifier code | **shipped, KC_REQUIRE=0** | `keycloak-verifier.ts` |
| Admin-zone mTLS code | **shipped, MTLS_ENFORCE=0** | `mtls-options.ts` + gateway middleware |
| `/api/admin/console/dos-master/m15/status` | **live, returns disabled state** | `dos-master-evidence.route.ts:23` |
| KC realm `platform-ops` (Keycloak) | **NOT created** | ops |
| Admin-zone CA + leaf certs | **NOT minted** | ops |

---

## 2. Ops decisions required (block (E))

### 2.1 Keycloak realm `platform-ops`
- [ ] Realm name confirmed: `platform-ops` (or alternative — update doctrine if changed).
- [ ] Issuer URL allocated: `https://kc.<domain>/realms/platform-ops`.
- [ ] JWKS endpoint allocated: `${KC_ISSUER}/protocol/openid-connect/certs`.
- [ ] Audience (`aud` claim) bound to: `admin-console-bff`.
- [ ] Client `admin-console-bff` provisioned (confidential, PKCE-enabled).
- [ ] Client secret rotation policy documented (≤ 90d, vaulted).
- [ ] Realm roles minted to mirror `platform_admin.platform_admin_role` rows
      (`platform-admin`, `dnoc-operator`, `dsoc-analyst`, `dauth-admin`,
      `dos-platform-admin`).
- [ ] Federation strategy decided (LDAP/OIDC IdP/local users).
- [ ] Jurisdiction confirmed (data residency for admin identities).
- [ ] First operator account migrated from `platform_admin.platform_admin_user`.

### 2.2 Admin-zone mTLS CA
- [ ] CA authority decided: in-house issuing CA / Vault PKI / managed CA.
- [ ] Root + intermediate published as `ADMIN_MTLS_CA` PEM bundle.
- [ ] Gateway leaf cert minted: subject `gateway.admin.<domain>`, `serverAuth + clientAuth` EKU, ≤ 30d validity.
- [ ] BFF leaf cert minted: subject `admin-console-bff.<domain>`, same EKU.
- [ ] Cert lifecycle policy documented (auto-renew via cert-manager / acme / Vault).
- [ ] Revocation strategy decided (CRL or OCSP).

---

## 3. Flip procedure (PPD ring R0 → R5)

> Both flips MUST ride the existing `services/rollout-service` ring engine.
> No big-bang cut-over. Auto-rollback on health-gate fail.

### 3.1 Stage 1 — `MTLS_ENFORCE=0 → 1`

**R0 (dev):**
```bash
# 1. Place PEM materials.
sudo install -m 0640 -o root -g root ca.pem        /etc/dos/admin-mtls/ca.pem
sudo install -m 0640 -o root -g root gateway.crt   /etc/dos/admin-mtls/gateway.crt
sudo install -m 0600 -o root -g root gateway.key   /etc/dos/admin-mtls/gateway.key
sudo install -m 0640 -o root -g root bff.crt       /etc/dos/admin-mtls/bff.crt
sudo install -m 0600 -o root -g root bff.key       /etc/dos/admin-mtls/bff.key

# 2. Update env (ledger requires DOS Master row, not direct edit).
node scripts/dos-master/dos.mjs rollout:plan:add \
  --title=admin-zone-mtls-enforce \
  --doctrine-articles=4,5,7

# 3. Flip env via rollout-service.
ADMIN_MTLS_CA=/etc/dos/admin-mtls/ca.pem \
ADMIN_MTLS_GATEWAY_CERT=/etc/dos/admin-mtls/gateway.crt \
ADMIN_MTLS_GATEWAY_KEY=/etc/dos/admin-mtls/gateway.key \
MTLS_ENFORCE=1 pm2 restart gateway --update-env

ADMIN_MTLS_CA=/etc/dos/admin-mtls/ca.pem \
ADMIN_MTLS_CERT=/etc/dos/admin-mtls/bff.crt \
ADMIN_MTLS_KEY=/etc/dos/admin-mtls/bff.key \
MTLS_ENFORCE=1 pm2 restart admin-console-bff --update-env

# 4. Verify.
curl -sS http://127.0.0.1:4000/api/admin/console/dos-master/m15/status \
  | jq '.mtls_status'   # → "enforcing"
pm2 logs gateway --nostream --lines 10 | grep "admin-zone mTLS"
# → [gateway] admin-zone mTLS: enforcing
```

**Health gates (auto-rollback if any breach for ≥ 5m):**
- `prom_error_rate_5xx_admin_console < 0.01`
- `loki_error_volume_admin_console < 50/min`
- `jaeger_p95_latency_admin_console < 500ms`
- `synthetic_admin_login_success > 0.99`

**R1 → R5:** internal → canary tenant → region cohort → product cohort → fleet, gates revalidated each ring.

### 3.2 Stage 2 — `KC_REQUIRE=0 → 1`

Pre-condition: Stage 1 at R5 for ≥ 24h with zero rollback.

**R0 (dev):**
```bash
KC_REQUIRE=1 \
KC_ISSUER=https://kc.<domain>/realms/platform-ops \
KC_JWKS_URL=https://kc.<domain>/realms/platform-ops/protocol/openid-connect/certs \
KC_REALM=platform-ops \
KC_AUDIENCE=admin-console-bff \
pm2 restart admin-console-bff --update-env

# Verify.
curl -sS http://127.0.0.1:4000/api/admin/console/dos-master/m15/status \
  | jq '{kc_require,kc_issuer_present,kc_jwks_url_present}'
# → {"kc_require":1,"kc_issuer_present":true,"kc_jwks_url_present":true}
```

Same health gates as Stage 1 + an extra synthetic: real KC-issued JWT
exchanged for a 200 `/dos-master/whoami`.

---

## 4. Rollback procedure

```bash
# Either stage:
MTLS_ENFORCE=0 pm2 restart gateway admin-console-bff --update-env
KC_REQUIRE=0 pm2 restart admin-console-bff --update-env

# Verify.
curl -sS http://127.0.0.1:4000/api/admin/console/dos-master/m15/status
```

`auto_evaluator` (`services/rollout-service`) will fire this automatically
when a health gate breaches its `rollback_threshold`. Manual rollback ledger:
```bash
node scripts/dos-master/dos.mjs rollout:rollback --plan=admin-zone-mtls-enforce
```

---

## 5. Hard guarantees the engine already enforces

- (B) JWT-shaped Bearer tokens that fail KC verify get `401`; opaque `tmp.<base64url>` DB tokens still bypass to legacy path (so M11 stays usable during migration).
- (C) `adminZoneMtlsAgent()` returns `null` on any path missing → gateway falls back to plain HTTP loopback (no half-broken upstream).
- `/dos-master/m15/status` is always queryable (no auth) so ops dashboards can prove the current flag state.
- Article 11 is preserved — neither flip writes to controlled tables; both are transport-layer hardening.

---

## 6. Sign-off matrix

| Gate | Owner | Status |
|------|-------|--------|
| Realm spec frozen | Platform-Ops lead | ☐ |
| CA authority decision | Platform-Ops lead | ☐ |
| Cert lifecycle policy | Platform-Ops lead | ☐ |
| Jurisdiction sign-off | Security lead | ☐ |
| Doctrine PPD ring approval | Doctrine writer | ☐ |
| Stage 1 R5 24h burn-in | Platform-Ops lead | ☐ |
| Stage 2 R5 24h burn-in | Platform-Ops lead | ☐ |
| Article 4 closure ack in `dos_master.doctrine_acknowledgement` | Doctrine writer | ☐ |
