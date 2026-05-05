# Native bootstrap — activation order (Temporal, Langfuse, prod-grade sidecars)

Single operator narrative for **OSS-aligned** native installers and **secret handling**. Application services (PM2 gateway, Node fleet, DB migrations) are documented in the root [`README.md`](../../../../README.md) and [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md).

**Port map:** [`../ports.allocation.json`](../ports.allocation.json).

---

## 1. Recommended activation order

Use this checklist on a fresh host (adjust for your topology).

1. **PostgreSQL + Redis** — prerequisites for Temporal, Langfuse, and most DOS services.
2. **Temporal** (native tarball + systemd)  
   - Installer: [`install-temporal-native.sh`](./install-temporal-native.sh)  
   - Runbook: [`../runbooks/temporal-native.md`](../runbooks/temporal-native.md)  
   - Optional: `TEMPORAL_DB_PASSWORD` set in env, or **`--generate-secrets`** (writes `/etc/temporal/temporal.env`; see runbook).
3. **Langfuse** (clone/build + systemd or PM2 launcher)  
   - Requires PostgreSQL, Redis, ClickHouse, S3-compatible storage (see Langfuse runbook).  
   - Installer: [`install-langfuse-native.sh`](./install-langfuse-native.sh)  
   - Runbook: [`../runbooks/langfuse-native.md`](../runbooks/langfuse-native.md)  
   - Env template: [`../../env/langfuse.env.example`](../../env/langfuse.env.example)  
   - Optional: **`--generate-secrets`** fills missing placeholders in `/etc/langfuse/langfuse.env`.
4. **`install-prod-grade.sh`** (optional slices) — Vault, OpenFeature **flagd**, GlitchTip (optional OSS error tracking), etc.  
   - [`install-prod-grade.sh`](./install-prod-grade.sh) already uses `openssl rand` for some secrets where applicable.
5. **systemd** — enable and start each unit after its installer succeeds:
   - `sudo systemctl enable --now temporal-server.service`
   - `sudo systemctl enable --now langfuse-web.service langfuse-worker.service` (if using systemd for Langfuse)
6. **PM2 / fleet** — reload or start workers that depend on Temporal/Langfuse:
   - Example config: [`../ecosystem.m1.config.js`](../ecosystem.m1.config.js) (`ai-temporal-worker`, Langfuse via `/opt/langfuse/start.sh`).
   - From repo: `pnpm boot` / ecosystem docs in root README.

**Database migrations** (platform): `pnpm migrate` (see repo norms in CONTRIBUTING).

**Keycloak / realm** scripts (manual client secrets): [`../keycloak/`](../keycloak/) — keep **`openssl`**-style client secrets unless you add a dedicated helper later.

---

## 2. Temporal troubleshooting — port `7233` vs inactive unit

Symptom: **`ss`** shows something listening on **`127.0.0.1:7233`**, but **`systemctl is-active temporal-server`** is **inactive** (often a leftover manual `temporal-server` process holding the port).

**Fix:**

1. Re-run the installer with **`--stop-conflicting`** so only listeners whose command line looks like **temporal** are terminated (see installer safety checks).
2. Enable and start the unit:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now temporal-server.service
   sudo systemctl status temporal-server.service
   ```

Details: [`../runbooks/temporal-native.md`](../runbooks/temporal-native.md).

---

## 3. Secrets layers

Three layers — dev helper vs installer flags vs production secret store:

| Layer | Purpose |
|-------|---------|
| **Dev helper** | Repo script [`../../../../scripts/generate-dev-secrets.sh`](../../../../scripts/generate-dev-secrets.sh) — prints **`openssl`**-generated placeholders (optional `--write FILE` with warnings). Never commit real secrets. |
| **Installers** | **`--generate-secrets`** on Temporal / Langfuse installers: fills **missing** secrets into root-owned env files (`chmod 600`). **`--force-regenerate-secrets`** overwrites existing values (dangerous; documented per runbook). |
| **Production** | Prefer your secret store + documented **`openssl rand`** / rotation in runbooks; installers are convenience only. |

---

## 4. Prerequisites per installer (host tools)

What each native script actually requires on the host (managed services like Postgres/Redis are separate).

| Requirement | **Temporal** [`install-temporal-native.sh`](./install-temporal-native.sh) | **Langfuse** [`install-langfuse-native.sh`](./install-langfuse-native.sh) |
|-------------|-------------------------------------------------------------------------|-------------------------------------------------------------------------|
| **Privilege** | Root / `sudo` | Root / `sudo` |
| **`curl`** | Required (`preflight`) | Not used by installer |
| **`tar`** | Required (`preflight`) | Not required on core path |
| **`git`** | Not required | Required (`clone_or_update`) |
| **`openssl`** | Required when **`--generate-secrets`** | Required when **`--generate-secrets`** (early check + generation) |
| **`python3`** | Required (`preflight`) | Not required |
| **`systemd` / `systemctl`** | Required (`preflight`) | Required unless **`--without-systemd`** |
| **`node`** | Not required | Required (`detect_node`) — Node ≥ 22 recommended upstream |
| **`pnpm`** | Not required | Required (`detect_pnpm`; corepack for `langfuse` user) |
| **Postgres** | Reachable; **`psql`** / superuser path used unless **`--skip-postgres-bootstrap`** | Reachable for **`pnpm run db:migrate`** |
| **Redis / ClickHouse / S3** | N/A | Operator-managed (Langfuse runbook) |

---

## 5. OSS / licensing transparency (operator choice)

| Component | Notes |
|-----------|--------|
| **Temporal** | OSS server + CLI from GitHub releases ([temporalio/temporal](https://github.com/temporalio/temporal)). |
| **Langfuse** | OSS self-hosted ([langfuse/langfuse](https://github.com/langfuse/langfuse)); pin release tags in prod. |
| **OpenFeature flagd** | OSS ([open-feature/flagd](https://github.com/open-feature/flagd)). |
| **GlitchTip** | Optional OSS Sentry-compatible path in `install-prod-grade.sh`. |
| **HashiCorp Vault** | Check current **license** (BUSL vs historical MPL) against your org’s FOSS-only policy before enabling. |

---

## 6. Verification checklist

- `systemctl is-active temporal-server` and listener **`127.0.0.1:7233`** owned by the **`temporal-server`** unit (not a stray process).
- Langfuse: **`systemctl is-active langfuse-web langfuse-worker`** **or** PM2 **`langfuse`** per Langfuse runbook; HTTP probe on configured port/path.
- Optional: Vault `:8200`, flagd ports per prod-grade script output.
- PM2: **`ai-temporal-worker`** healthy against Temporal frontend **`7233`**.

---

## Out of scope here

- Replacing Vault with another KMS.
- Automating Keycloak realm secrets beyond documented exports.
- Cloud-managed secrets (AWS Secrets Manager, etc.) — wire via your deployment runbooks.
