# Temporal — native install (bare metal, systemd)

This repo expects Temporal frontend on **`127.0.0.1:7233`** (see `platform/config-center/ops/ports.allocation.json` and PM2 workers such as `ai-temporal-worker` in `platform/config-center/ops/ecosystem.m1.config.js`).

Upstream OSS: [temporalio/temporal](https://github.com/temporalio/temporal).

## Prerequisites

- **PostgreSQL** reachable from the host (same patterns as the installer: local `sudo -u postgres` peer auth or `POSTGRES_SUPERUSER` + `POSTGRES_SUPERUSER_PASSWORD`).
- **systemd**, **curl**, **tar**, **python3** (YAML password patching).
- **openssl** (required only if you use **`--generate-secrets`**).

## One-shot install

From repo root:

```bash
sudo TEMPORAL_DB_PASSWORD='your-secret' bash platform/config-center/ops/bootstrap/install-temporal-native.sh
```

Or generate and persist a DB password (writes **`/etc/temporal/temporal.env`**, `chmod 600`):

```bash
sudo bash platform/config-center/ops/bootstrap/install-temporal-native.sh --generate-secrets
```

**Dangerous overwrite** (regenerates password even if already set):

```bash
sudo bash platform/config-center/ops/bootstrap/install-temporal-native.sh --generate-secrets --force-regenerate-secrets
```

Dry-run:

```bash
sudo bash platform/config-center/ops/bootstrap/install-temporal-native.sh --dry-run
```

Skip Postgres role/DB creation (already provisioned):

```bash
sudo bash platform/config-center/ops/bootstrap/install-temporal-native.sh --skip-postgres-bootstrap
```

If port **7233** is held by a **manual** `temporal-server` process so systemd cannot bind:

```bash
sudo bash platform/config-center/ops/bootstrap/install-temporal-native.sh --stop-conflicting
sudo systemctl daemon-reload
sudo systemctl enable --now temporal-server.service
```

Skip CLI install to `/usr/local/bin/temporal`:

```bash
sudo bash platform/config-center/ops/bootstrap/install-temporal-native.sh --without-cli
```

## Secrets

- **`TEMPORAL_DB_PASSWORD`** — required for Postgres bootstrap and YAML patching. Export before install, **or** use **`--generate-secrets`** so the installer fills a missing password.
- **Manual rotation example**: `openssl rand -hex 24` → update Postgres role password, re-run installer (or patch `development.yaml` consistently with ops process).
- Persisted env file: **`/etc/temporal/temporal.env`** (single line `TEMPORAL_DB_PASSWORD=...`). The installer **sources** this file before **preflight** so re-runs pick up the password. `--generate-secrets` does **not** overwrite a non-empty password unless **`--force-regenerate-secrets`**.

## After install

```bash
sudo systemctl status temporal-server.service
ss -tlnp | grep 7233 || true
```

Namespace **`ai-os`** + retention (matches docker-compose `DEFAULT_NAMESPACE=ai-os`):

```bash
export TEMPORAL_ADDRESS=127.0.0.1:7233
temporal operator namespace describe ai-os || temporal operator namespace create ai-os --retention 72h
```

## Alignment checklist

| Item | Expected |
|------|-----------|
| Listen | `127.0.0.1:7233` (bundled `development.yaml` + systemd unit) |
| Config | `${INSTALL_ROOT}/config/development.yaml` patched from installer |
| User | `temporal` system user, `/opt/temporal/current` symlink |
| Unit | `/etc/systemd/system/temporal-server.service` |

## Operational notes

- **7233 vs inactive unit**: If **`ss`** shows **7233** but **`systemctl is-active temporal-server`** is **inactive**, something else may own the port — use **`--stop-conflicting`** then **`systemctl enable --now temporal-server`**. See **`platform/config-center/ops/bootstrap/README.md`**.
- **Versions**: Override with **`TEMPORAL_VER`**, **`TEMPORAL_SCHEMA_VERSION`**, **`TEMPORAL_CLI_VER`** (see installer header comments).

## Bootstrap index

Ordered activation with Langfuse, prod-grade sidecars, PM2: **`platform/config-center/ops/bootstrap/README.md`**.
