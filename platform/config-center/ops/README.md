# Ops playbook — index

Single landing page for **native installers**, **runbooks**, **secrets**, **ports**, and **fleet** wiring under `platform/config-center/ops`.

Detailed activation order and verification lives in the [**bootstrap hub**](bootstrap/README.md).

---

## Bootstrap hub

| Topic | Location |
|--------|-----------|
| **Activation order** (PostgreSQL → Temporal → Langfuse → prod-grade slices → systemd → PM2) | [`bootstrap/README.md`](bootstrap/README.md) |
| **Temporal native installer** | [`bootstrap/install-temporal-native.sh`](bootstrap/install-temporal-native.sh) — bare-metal Temporal tarball + Postgres bootstrap + systemd `:7233`. Run **`sudo bash … --dry-run`** before applying on prod; `--generate-secrets` writes `/etc/temporal/temporal.env`. |
| **Langfuse native installer** | [`bootstrap/install-langfuse-native.sh`](bootstrap/install-langfuse-native.sh) — clone/build Langfuse v3, migrations, systemd (or PM2 via `/opt/langfuse/start.sh`). **`--dry-run`** prints actions only; **`--generate-secrets`** patches placeholders in `/etc/langfuse/langfuse.env`. |

---

## Runbooks

| Component | Runbook |
|-----------|---------|
| **Temporal** | [`runbooks/temporal-native.md`](runbooks/temporal-native.md) |
| **Langfuse** | [`runbooks/langfuse-native.md`](runbooks/langfuse-native.md) |

---

## Secrets & env templates

| Concern | Source |
|---------|--------|
| **Dev / CI placeholders** (printed values; optional `--write`) | Repo script [`scripts/generate-dev-secrets.sh`](../../../scripts/generate-dev-secrets.sh) |
| **Langfuse** env keys | Template [`platform/config-center/env/langfuse.env.example`](../env/langfuse.env.example) → canonical path **`/etc/langfuse/langfuse.env`** (see installer header). |
| **Temporal** DB password | Env variable **`TEMPORAL_DB_PASSWORD`** or installer **`--generate-secrets`** → **`/etc/temporal/temporal.env`** (`chmod 600`; pattern in Temporal installer header and temporal-native runbook). |

Installer **`--generate-secrets`** fills missing placeholders; **`--force-regenerate-secrets`** overwrites existing values (dangerous; documented per runbook).

---

## Ports & PM2 fleet

| Artifact | Path |
|----------|------|
| **Allocated ports** | [`ports.allocation.json`](ports.allocation.json) |
| **Example fleet** (Temporal worker, Langfuse launcher path) | [`ecosystem.m1.config.js`](ecosystem.m1.config.js) |
| **Broader platform fleet** | [`ecosystem.platform.config.js`](ecosystem.platform.config.js), [`ecosystem.observability.config.js`](ecosystem.observability.config.js), [`ecosystem.registry-sync.config.js`](ecosystem.registry-sync.config.js) |

Use **`pnpm validate:ports`** from repo root against `ports.allocation.json`.

---

## Credential / env matrix (concise)

| Concern | Canonical path / env file | Who generates | Suggested `chmod` | Notes |
|---------|---------------------------|---------------|-------------------|-------|
| Temporal Postgres DB password | `/etc/temporal/temporal.env` (`TEMPORAL_DB_PASSWORD`) or inline env before run | Operator or **`install-temporal-native.sh --generate-secrets`** | **600** (installer applies when writing file) | Superuser Postgres bootstrap uses password from env/file; keep file root-owned. |
| Langfuse app secrets | `/etc/langfuse/langfuse.env` | Operator editing template or **`install-langfuse-native.sh --generate-secrets`** | **600** after edits (**644** only when freshly copied from example until hardened) | `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `SALT`, etc. — see `langfuse.env.example`. |
| Dev/local placeholders | stdout or optional `--write FILE` via **`scripts/generate-dev-secrets.sh`** | Developer | **600** if written | Never commit real secrets; repo norms in CONTRIBUTING. |
| Service JWT / gateway secrets | Per-service **`platform/config-center/env/*.example`** | Ops / secret store | Per deployment | Cross-link templates under [`platform/config-center/env/`](../env/); Langfuse example named above. |

---

## Repo hygiene for ops scripts

From repo root, before changing bootstrap installers:

```bash
pnpm ops:shell-sanity
```

See [**CONTRIBUTING.md**](../../../CONTRIBUTING.md) for the contributing pointer.
