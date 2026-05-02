# DOS Platform — Disaster Recovery Runbook

## Overview

| Metric | Target |
|--------|--------|
| **RPO** (Recovery Point Objective) | < 5 minutes (with WAL archiving) or last backup (without) |
| **RTO** (Recovery Time Objective) | < 30 minutes (full platform restore) |
| **Backup location** | `/var/backups/dos-platform/` |
| **Backup retention** | 30 days |
| **WAL archive** | `/var/backups/dos-platform/wal/` |

## Prerequisites

- PostgreSQL client tools (`psql`, `pg_dump`, `pg_restore`, `pg_basebackup`)
- PM2 installed globally (`npm install -g pm2`)
- Node.js >= 24.14.0, pnpm >= 10.33.0
- SSH access to the platform server
- Database credentials (see `platform/config-center/env/.env.shared`)
- Access to backup storage (`/var/backups/dos-platform/`)

## Emergency Contacts

| Role | Contact |
|------|---------|
| Platform Administrator | ahmet.dogan@doganconsult.com |
| Database Administrator | (fill in) |
| On-call Engineer | (fill in) |

---

## Scenario 1: Single Service Failure

**Estimated time: 2-3 minutes**

A single microservice is crashing or returning errors. Other services are healthy.

### Steps

1. **Identify the failing service**:
   ```bash
   pm2 status
   bash ops/scripts/health-check-all.sh
   ```

2. **Check service logs**:
   ```bash
   pm2 logs <service-name> --lines 100
   ```

3. **Restart the service**:
   ```bash
   pm2 restart <service-name>
   ```

4. **If restart doesn't fix it, rollback to previous version**:
   ```bash
   bash ops/scripts/rollback-service.sh <service-name> previous
   ```

5. **Verify health**:
   ```bash
   curl http://127.0.0.1:<port>/health
   ```

### Rollback to specific commit
```bash
bash ops/scripts/rollback-service.sh <service-name> <commit-hash>
```

---

## Scenario 2: Database Corruption

**Estimated time: 10-15 minutes**

Database is returning errors, queries fail, or data appears corrupted.

### Steps

1. **Stop all services immediately**:
   ```bash
   pm2 stop all
   ```

2. **Assess damage**:
   ```bash
   psql "${DATABASE_URL}" -c "SELECT count(*) FROM public.tenants;"
   psql "${DATABASE_URL}" -c "SELECT count(*) FROM dos.config_definitions;"
   ```

3. **Find the latest backup**:
   ```bash
   ls -lt /var/backups/dos-platform/*.sql.gz | head -5
   ```

4. **Restore from backup**:
   ```bash
   bash ops/scripts/restore-db.sh /var/backups/dos-platform/<latest-backup>.sql.gz
   ```
   This script will: stop services -> restore database -> run migrations -> restart services.

5. **Verify data integrity**:
   ```bash
   bash ops/scripts/health-check-all.sh
   psql "${DATABASE_URL}" -c "SELECT count(*) FROM public.tenants;"
   ```

---

## Scenario 3: Full Platform Failure

**Estimated time: 20-30 minutes**

Server crash, OS reinstall, or complete service loss.

### Prerequisites
- Fresh server with PostgreSQL, Node.js, pnpm, PM2 installed
- Access to git repository
- Access to backup files

### Steps

1. **Clone the repository**:
   ```bash
   git clone <repo-url> /root/DOS-AIO
   cd /root/DOS-AIO
   ```

2. **Checkout known-good commit** (from deploy logs or git tags):
   ```bash
   git checkout <known-good-commit>
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Restore environment configuration**:
   ```bash
   # Copy .env files from backup or recreate from template
   cp /backup/platform/config-center/env/.env.shared platform/config-center/env/.env.shared
   ```

5. **Create database and user**:
   ```bash
   sudo -u postgres createdb shahin_grc
   sudo -u postgres createuser dos_user
   sudo -u postgres psql -c "ALTER USER dos_user WITH PASSWORD '<password>';"
   ```

6. **Restore database from backup**:
   ```bash
   gunzip -c /var/backups/dos-platform/<latest>.sql.gz | \
     psql -h localhost -U dos_user -d shahin_grc
   ```

7. **Run any pending migrations**:
   ```bash
   bash ops/scripts/run-migrations.sh
   ```

8. **Build packages and services**:
   ```bash
   pnpm run build:all
   ```

9. **Create log directory**:
   ```bash
   mkdir -p /var/log/dos-platform
   ```

10. **Start all services**:
    ```bash
    pm2 start ops/ecosystem.all.config.js
    ```

11. **Verify all services are healthy**:
    ```bash
    bash ops/scripts/health-check-all.sh
    ```

12. **Verify application access**:
    - Login as platform admin
    - Navigate to tenant dashboard
    - Verify audit log is intact

---

## Scenario 4: Point-in-Time Recovery (PITR)

**Estimated time: 15-25 minutes**

**Requires**: WAL archiving enabled (see `ops/postgresql/wal-archiving.conf`).

Use this when you need to restore to a specific moment (e.g., just before accidental data deletion).

### Steps

1. **Determine target recovery time** (UTC):
   ```
   TARGET_TIME="2026-04-13 14:30:00 UTC"
   ```

2. **Run the PITR script**:
   ```bash
   bash ops/scripts/pitr-restore.sh "$TARGET_TIME" /var/backups/dos-platform/base_<timestamp>
   ```

3. **Verify data state**:
   - Check that the accidental change has been reversed
   - Verify tenant data integrity

4. **Run migrations** (in case PITR target predates some migrations):
   ```bash
   bash ops/scripts/run-migrations.sh
   ```

5. **Start services and verify health**:
   ```bash
   pm2 start ops/ecosystem.all.config.js
   bash ops/scripts/health-check-all.sh
   ```

---

## Verification Checklist

Run after every recovery:

- [ ] `bash ops/scripts/health-check-all.sh` — all services report `ok`
- [ ] Platform admin can log in via browser
- [ ] Tenant data is visible in dashboard
- [ ] Audit log contains entries up to expected timestamp
- [ ] Workflow orchestration (Temporal) is processing
- [ ] Notification delivery works (send test)
- [ ] No orphan PM2 processes: `pm2 list`

---

## Post-Incident Procedures

1. **Create incident record** in the audit system
2. **Root cause analysis** — document what failed and why
3. **Update as-built ledger** if infrastructure changed
4. **Review backup schedule** — consider increasing frequency if RPO was exceeded
5. **Test restore** — run `bash ops/scripts/verify-backup.sh` to confirm backup integrity
6. **Communicate** — notify stakeholders of the incident and resolution

---

## Maintenance Schedule

| Task | Frequency | Script |
|------|-----------|--------|
| Database backup | Daily | `bash ops/scripts/backup-db.sh` (cron) |
| Backup verification | Monthly | `bash ops/scripts/verify-backup.sh` |
| WAL cleanup | Weekly | `bash ops/scripts/cleanup-wal.sh` |
| DR drill (full restore test) | Quarterly | Manual (follow Scenario 3) |
| Runbook review | Semi-annually | Review this document |

---

## Migration Rollback

If a migration caused issues, rollback using:

```bash
bash ops/scripts/rollback-migration.sh <migration-filename>
```

Rollback scripts are in `ops/migrations/rollback/`. Each migration has a corresponding DOWN script.

**Example**:
```bash
# Rollback the soft-delete columns migration
bash ops/scripts/rollback-migration.sh 008_soft_delete_columns.sql
```
