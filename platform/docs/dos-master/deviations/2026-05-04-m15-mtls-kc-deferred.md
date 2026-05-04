# M15 Deviation Log — Admin-zone mTLS + platform-ops KC realm DEFERRED

- **Date**: 2026-05-04
- **Actor (audit ledger)**: doganlap@gmail.com
- **Doctrine articles affected**: 4 (admin trust zone hardening)
- **Decision**: TEMPORARY DEVIATION. Article 4 NOT marked closed.
- **Scope of deviation**:
  - `MTLS_ENFORCE` remains `0` on gateway and admin-console-bff during the
    progressive production cut-over of `workspace-bff` and tenant surfaces.
  - `KC_REQUIRE` remains `0` on admin-console-bff; admin actor continues to
    use opaque `tmp.<base64url>` DB-session tokens via
    `platform_admin.platform_admin_session`.
- **Justification**:
  - Public edge boundary is enforced by Cloudflare → cloudflared tunnel →
    nginx → PM2 origin. Origin remains private (no direct public exposure).
  - Internal admin-zone service-to-service mTLS is a DIFFERENT control
    surface from edge protection and does not block tenant-zone
    `workspace-bff` from going progressive.
  - Real CA + KC realm provisioning requires Platform-Ops + Security
    sign-off and jurisdiction decision (see `m15-ops-handoff.md` §6).
- **Compensating controls (currently active)**:
  - cloudflared tunnel (token `c05988fa-471c-4e84-9e5d-d7d32ce43aad`) — no
    public origin exposure.
  - nginx upstream to PM2 origin (`platform_gateway`, `product_shell`,
    `keycloak_origin`) on `127.0.0.1`.
  - DOS Master `trg_dos_master_only` triggers on 48 controlled tables —
    DB-level rejection of any actor not setting `dos.actor='dos-master'`.
  - `dos_master.platform_admin_session` JWE tokens for admin SPA.
- **Closure conditions (must all be true to mark Article 4 CLOSED)**:
  1. Real admin-zone CA minted + leaf certs issued (Platform-Ops).
  2. KC realm `platform-ops` provisioned with `admin-console-bff` client.
  3. `MTLS_ENFORCE=1` rides PPD R0→R5 with 24h burn-in per ring; zero
     auto-rollback.
  4. `KC_REQUIRE=1` rides PPD R0→R5 with 24h burn-in per ring; zero
     auto-rollback.
  5. Real signal adapters (Prom/Loki/Jaeger) wired and proven; not stub.
  6. Doctrine writer ack inserted into
     `dos_master.doctrine_acknowledgement (actor='doganlap@gmail.com',
     article_no=4)`.
- **Reference**: `platform/docs/dos-master/m15-ops-handoff.md`
