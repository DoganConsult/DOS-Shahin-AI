# RBAC / tenant migrations — verification runbook (20260505_2100–2900)

Use this when `pnpm migrate status` fails with **permission denied** on `dos.platform_migrations` (common for `dos_auth`), or when the ledger shows **no rows** while DDL already exists.

## 1. Preferred: migration ledger (owner role)

Run as the migration owner (often `postgres` or `dos_migrator`), same DB as `DATABASE_URL`:

```bash
PGPASSWORD='***' psql -h localhost -U <migrator_user> -d shahin_grc -c \
  "SELECT version, applied_at FROM dos.platform_migrations WHERE version LIKE '%20260505%' ORDER BY version;"
```

Expect rows covering `20260505_2100` … `20260505_2900` (exact filenames depend on migration runner naming).

## 2. DDL / comment proof (read-only `dos_auth`)

These work without owning `platform_migrations`:

```sql
-- Canonical RBAC: role_permissions table comment (2900)
SELECT obj_description('platform_dauth.role_permissions'::regclass, 'pg_class');

-- Sync triggers from 2800
SELECT tgname FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'platform_dauth' AND c.relname = 'functional_roles'
  AND tgname LIKE '%sync_role_permissions%';

-- Deprecation comment on permissions[] column (2900)
SELECT col_description('platform_dauth.functional_roles'::regclass,
  (SELECT attnum FROM pg_attribute WHERE attrelid = 'platform_dauth.functional_roles'::regclass AND attname = 'permissions' LIMIT 1));
```

## 3. Tenant product activation dedupe (2400)

```sql
SELECT tenant_id, product_key, COUNT(*) AS cnt
FROM dos.tenant_product_activation
WHERE tenant_id IS NOT NULL AND product_key IS NOT NULL
GROUP BY tenant_id, product_key
HAVING COUNT(*) > 1;
```

Must return **0 rows**. If duplicates appear, re-apply dedupe migration logic.

## 4. UNIQUE constraint follow-up

Constraint addition may require **table owner** / `ALTER` privilege — see migration `20260507_0100_tenant_product_activation_unique.sql`. If it fails in CI, run that statement as DBA.

## 5. Reconciliation policy

If **comments/triggers exist** but **ledger has no `20260505%` rows**:

1. Treat environment as **partially applied** until ledger backfilled or migrations re-run under owner.
2. Do **not** assume guards passed historically — run `node scripts/ci-guards/rbac-role-permissions-sync-check.mjs` after connecting with a role that can read `platform_dauth.*`.
