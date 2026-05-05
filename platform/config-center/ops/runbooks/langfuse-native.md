# Langfuse — native install (bare metal, systemd)

This repo expects Langfuse on **`127.0.0.1:4090`** with nginx/gateway path **`/admin/langfuse/`** (see `platform/config-center/ops/ports.allocation.json` and `platform/config-center/ops/nginx/dos-platform.conf`).

PM2 (`platform/config-center/ops/ecosystem.m1.config.js`) calls **`/opt/langfuse/start.sh`** with `cwd=/opt/langfuse`. The installer writes that launcher and symlinks **`/opt/langfuse/.env`** → **`/etc/langfuse/langfuse.env`**.

## Prerequisites

Langfuse **v3** needs **PostgreSQL**, **Redis**, **ClickHouse**, and **S3-compatible storage** (MinIO is typical). Variables mirror upstream [`docker-compose.yml`](https://github.com/langfuse/langfuse/blob/main/docker-compose.yml).

- **Node.js**: ≥ 22 (Langfuse `engines.node`; Node 24 recommended upstream).
- **pnpm**: v10 (`corepack prepare pnpm@10.22.0 --activate` or installer enables corepack).
- **Build**: several GB RAM for `pnpm run build` on first install.
- **openssl** (required only if you use **`--generate-secrets`**).

## One-shot install

From repo root (or path containing `platform/config-center`):

```bash
sudo cp platform/config-center/env/langfuse.env.example /etc/langfuse/langfuse.env
sudo chmod 0600 /etc/langfuse/langfuse.env
sudo nano /etc/langfuse/langfuse.env   # fill secrets + DATABASE_URL + ClickHouse + Redis + S3

sudo bash platform/config-center/ops/bootstrap/install-langfuse-native.sh
```

Or let the installer fill **missing** secrets into **`/etc/langfuse/langfuse.env`** (`chmod 600`; keys aligned with `platform/config-center/env/langfuse.env.example`):

```bash
sudo bash platform/config-center/ops/bootstrap/install-langfuse-native.sh --generate-secrets
```

**Dangerous overwrite** (regenerates secrets even when values are already set):

```bash
sudo bash platform/config-center/ops/bootstrap/install-langfuse-native.sh --generate-secrets --force-regenerate-secrets
```

With **`--dry-run`**, secret generation is logged but the env file is not patched.

Pin a release tag for production:

```bash
sudo LANGFUSE_REF=v3.131.0 bash platform/config-center/ops/bootstrap/install-langfuse-native.sh
```

Dry-run:

```bash
sudo bash platform/config-center/ops/bootstrap/install-langfuse-native.sh --dry-run
```

Skip DB migrations (already applied):

```bash
sudo bash platform/config-center/ops/bootstrap/install-langfuse-native.sh --skip-migrate
```

Skip frontend/worker build (reuse existing `dist`, CI artifact dir, or debugging):

```bash
sudo bash platform/config-center/ops/bootstrap/install-langfuse-native.sh --skip-build
```

Install app only; skip systemd unit writes (advanced):

```bash
sudo bash platform/config-center/ops/bootstrap/install-langfuse-native.sh --without-systemd
```

## Secrets

- **Env file**: **`/etc/langfuse/langfuse.env`** (installer symlinks **`/opt/langfuse/.env`** here). Use **`--generate-secrets`** only when placeholders are empty or literally `CHANGE_ME` / `CHANGE_ME*` for the managed keys; otherwise existing non-placeholder values are preserved.
- **Managed keys** (when generating): `NEXTAUTH_SECRET`, `SALT`, `ENCRYPTION_KEY`, `CLICKHOUSE_PASSWORD`, `REDIS_AUTH`, `LANGFUSE_S3_EVENT_UPLOAD_SECRET_ACCESS_KEY`, `LANGFUSE_S3_MEDIA_UPLOAD_SECRET_ACCESS_KEY`, and the password embedded in **`DATABASE_URL`** (`postgresql://…`).
- **`--force-regenerate-secrets`** requires **`--generate-secrets`** and overwrites those fields even if already set — rotate downstream creds (Postgres role, ClickHouse user, Redis ACL, MinIO keys) if they were tied to the old values.
- **Dev placeholders only**: prefer stdout-only `scripts/generate-dev-secrets.sh`; production should use your secret store after first bootstrap.
- **Manual rotation examples**: `openssl rand -hex 32` for `NEXTAUTH_SECRET` / `ENCRYPTION_KEY`; adjust `DATABASE_URL` and DB role password together.

## After install

```bash
sudo systemctl enable --now langfuse-web.service langfuse-worker.service
sudo systemctl status langfuse-web.service langfuse-worker.service
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4090/admin/langfuse/
```

If using **PM2** instead of systemd for the Node processes, keep **`langfuse`** disabled in systemd and run:

```bash
pm2 start ecosystem.m1.config.js --only langfuse
```

The **`start.sh`** launcher runs **worker + web** in one shell (worker background, web foreground) so a single PM2 app tracks the web PID tree; adjust if you prefer two PM2 apps.

## Alignment checklist

| Item | Expected |
|------|-----------|
| Listen | `127.0.0.1:4090` (`PORT` / `HOSTNAME` in env) |
| Base path | `NEXT_PUBLIC_BASE_PATH=/admin/langfuse` |
| Public URL | `NEXTAUTH_URL` = external URL users hit (HTTPS behind nginx) |
| Env file | `/etc/langfuse/langfuse.env` → symlink `/opt/langfuse/.env` |
| Sidecar probe | `ports.allocation.json` → `checkPath`: `/opt/langfuse/start.sh` |

## Operational notes

- **First login**: use optional `LANGFUSE_INIT_*` vars in env file or create org/project in UI.
- **ClickHouse / MinIO**: run via Docker on localhost for dev, or dedicated ops-managed services in prod.
- **Secrets**: rotate `NEXTAUTH_SECRET`, `SALT`, `ENCRYPTION_KEY`, `REDIS_AUTH`, DB passwords independently (see **Secrets** above for installer-assisted generation).
