# M15 Status — Admin-zone mTLS LIVE (local CA) + KC realm guard ACTIVE

- **Date opened**: 2026-05-04
- **Date corrected**: 2026-05-04 (after probe diagnosis revealed M15 was
  already live; superseded the prior "DEFERRED" wording in this file)
- **Actor (audit ledger)**: doganlap@gmail.com
- **Doctrine articles affected**: 4 (admin trust zone hardening), 7 (PPD)

## Reality on this host (verified via mTLS probe + env inspection)

| Surface | State | Evidence |
|---------|-------|----------|
| `MTLS_ENFORCE` on rollout-service `:4017` | **`1` — HTTPS listener with mTLS active** | `platform/config-center/env/rollout-service.env` |
| `MTLS_ENFORCE` on admin-console-bff `:4013` | **`1` — HTTPS listener with mTLS active** | `platform/config-center/env/admin-console-bff.env` |
| `MTLS_ENFORCE` on workspace-bff `:4007` | `0` (tenant zone, plain HTTP — correct per doctrine) | `platform/config-center/env/workspace-bff.env` |
| Admin-zone CA + leaf certs | **PRESENT** — 19 certs (CA + 17 admin services + gateway-client) | `platform/config-center/secrets/admin-mtls/` |
| Cert validity baseline | **PASS — 19/19 ≥ 90d** | `dos-master-gate.mjs::cert-expiry-baseline` |
| `platformOpsRealmGuard` on admin-console-bff | **ACTIVE** — returns `401 {"error":"missing-bearer-token","realm":"platform-ops"}` for unauthenticated requests | live probe via gateway proxy |
| `KC_REQUIRE` (KC token verifier) | needs runtime verification (env value not yet inspected in this entry) | TBD |
| Tenant-zone cert isolation | **PASS — 2/2 tenant certs isolated from admin CA** | `dos-master-gate.mjs::tenant-zone-cert-isolation` |

## What is NOT yet closed (Article 4 closure conditions)

The local CA + local realm guard are sufficient to ride internal traffic
during the offline maintenance window, but the following must all be true
before the doctrine writer inserts an Article 4 closure ack:

1. **Production CA migration** — leaf certs reissued by an externally-
   managed CA (Vault PKI / cert-manager / managed AWS PCA / GCP CAS)
   instead of the local CA at
   `platform/config-center/secrets/admin-mtls/ca.crt`.
2. **Production Keycloak `platform-ops` realm** — provisioned in the
   real Keycloak cluster (issuer URL on a hostname under your control,
   JWKS endpoint reachable, `admin-console-bff` confidential client +
   PKCE, federation strategy decided per ops handoff §2.1, jurisdiction
   sign-off captured).
3. **Real signal adapters** wired (`ROLLOUT_SIGNAL_MODE=real`) so PPD
   auto-rollback is meaningful for Stage-1/Stage-2 ring promotions.
4. **PPD ring R5 (fleet)** for both Stage 1 and Stage 2 burn-in passed
   with zero auto-rollback (currently held — separate ack required per
   ops doctrine).
5. **Doctrine writer ack** inserted into
   `dos_master.doctrine_acknowledgement (actor='doganlap@gmail.com',
   article_no=4)` — currently **NOT** present (verify with
   `SELECT count(*) FROM dos_master.doctrine_acknowledgement
   WHERE article_no=4 AND actor='doganlap@gmail.com';`).

## Compensating controls active today

- Cloudflare → cloudflared (`c05988fa-471c-4e84-9e5d-d7d32ce43aad`) →
  nginx → PM2 origin: no public exposure of admin services.
- nginx upstream to `127.0.0.1` only.
- DOS Master `trg_dos_master_only` triggers on 48 controlled tables —
  DB-level rejection of any actor not setting `dos.actor='dos-master'`.
- `dos_master.platform_admin_session` JWE tokens for the SPA login path.
- 19/19 admin certs ≥ 90d remaining (`cert-expiry-baseline` guard).
- 2/2 tenant certs proven isolated from admin CA fingerprint
  (`tenant-zone-cert-isolation` guard).

## Operator probe cheatsheet

See `platform/docs/dos-master/probe-cheatsheet.md` for the canonical
curl flags + cert paths to reach each admin-zone health endpoint.
Plain-HTTP probes get "empty reply from server" because the TLS
listener rejects clear-text. That is the listener behaving correctly,
not a service outage.

## References

- `platform/docs/dos-master/m15-ops-handoff.md`
- `platform/docs/dos-master/probe-cheatsheet.md`
- `services/admin-console-bff/src/lib/mtls-options.ts`
- `services/admin-console-bff/src/lib/platform-ops-realm.ts`
