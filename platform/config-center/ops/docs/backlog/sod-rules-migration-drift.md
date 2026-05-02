# 131_sod_rules.sql / 132_sod_waivers.sql — duplicate-filename checksum drift

**Status:** Open — backlog (data-integrity / migration-tracker hygiene)
**Filed:** 2026-04-25
**Priority:** Backlog. Blocks `tsx migration/migration-runner.ts up --dir platform/dauth/migrations/public` with a checksum-drift abort, but **does not block tenant operations** — the live DB schema is correct (matches the platform/dauth shape) and tenant code paths are unaffected. The fix is required before the strict-tracker discipline (declared after Phase 4) can be enforced without per-file workarounds.

## Scope rules

- Do NOT touch the live `dos.*` / `tenant_*` schemas — the deployed shape is already correct.
- Do NOT modify any prior Phase-4 migration files.
- Do NOT broaden into a multi-root migration-runner refactor (`discoverAllMigrations` collision-warning is a separate ticket).
- Do NOT modify `133_sod_tenant_dogan_reconcile.sql` — it has no duplicate and no drift.

---

## 1. Exact affected files

**Primary pair (drift detected — currently blocking):**

- [`platform/dauth/migrations/public/131_sod_rules.sql`](platform/dauth/migrations/public/131_sod_rules.sql) (68 lines)
  sha256: `9cb384e94fd8f03c067705daa6c94c5bab0e233f837052f507df9666d7a90f71`
  committed: `b1b8e2f8a` (2026-04-22 17:07:03 UTC, "platform(dauth): session 2 — close all deferred items")
- [`modules/compliance/db/public/migrations/131_sod_rules.sql`](modules/compliance/db/public/migrations/131_sod_rules.sql) (45 lines)
  sha256: `5da7a1c97e82667113e7f2c4a41f4d1b667efb76149273028ca4f06db00e2418`
  committed: `74208204f` (2026-04-22 03:25:37 CST, "chore(auto-sync): SQL Reorg post-processing, canonical home")

**Secondary pair (same drift pattern, not yet hit by the runner):**

- [`platform/dauth/migrations/public/132_sod_waivers.sql`](platform/dauth/migrations/public/132_sod_waivers.sql) (113 lines)
  sha256: `40b3cd8dc7ee61879f422afc0157c9feaaf7ad64031b5fa94aa6088b5df4e5b9`
- [`modules/compliance/db/public/migrations/132_sod_waivers.sql`](modules/compliance/db/public/migrations/132_sod_waivers.sql) (38 lines)
  sha256: `1f85ec96c574ffe428c93871fa3693e9b673758513ed4f8e0c39003691231ee1`

**Tracker (`dos.platform_migrations` in shahin_grc, verified 2026-04-25):**

```
filename             | checksum                         | applied_at
131_sod_rules.sql    | 5da7a1c97e82667113e7f2c4a41f4d1b…| 2026-04-25 01:51:52.799019+00
132_sod_waivers.sql  | 1f85ec96c574ffe428c93871fa3693e9b…| 2026-04-25 01:51:52.813073+00
```

Tracker recorded the modules/compliance checksums (the older copies). These rows came from the baseline import on 2026-04-25 (`migration-runner.ts baseline`), which selected the lexicographically first path within each filename group via [discoverAllMigrations()](migration/migration-runner.ts#L155-L213).

**Migration-runner discovery code:**

- [`migration/migration-runner.ts:155-213`](migration/migration-runner.ts#L155-L213) — `discoverAllMigrations()` walks `platform/*/migrations` + `modules/*/db/{tenant,public}/migrations` recursively, dedupes by filename only (line 200, `seenRel.has(rel)`), sorts lexicographically (lines 208-212). No collision warning when the same basename appears in multiple roots.
- [`migration/migration-runner.ts:369-389`](migration/migration-runner.ts#L369-L389) — drift check in `migrateUp()`: when the on-disk checksum differs from the tracker, raises `Checksum drift detected for "<filename>": recorded=… current=…`.

**Related code mention (documentary only — no filename dependency):**

- [`platform/dauth/packages/shared/src/middleware/sod-clearance.middleware.ts:7`](platform/dauth/packages/shared/src/middleware/sod-clearance.middleware.ts#L7) — a comment line `* tenant migrations 131_sod_rules.sql / 132_sod_waivers.sql + the …`. Purely descriptive; behavior does not depend on the filename strings.

**Ownership manifest:**

- [`modules/compliance/db/manifest.yml`](modules/compliance/db/manifest.yml) lists `sod` in the tenant `prefix:` array — so the SoD tables are formally compliance-module-owned per the canonical ownership catalog. The platform/dauth copies are an unauthorized homing of the same files.

## 2. Exact mismatch

**modules/compliance/db/public/migrations/131_sod_rules.sql** (45 lines, simple per-tenant catalog):

```sql
CREATE TABLE IF NOT EXISTS sod_rules (
  policy_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code            VARCHAR(100) NOT NULL,
  role_code_a          VARCHAR(100) NOT NULL,
  role_code_b          VARCHAR(100) NOT NULL,
  conflict_level       VARCHAR(20)  NOT NULL DEFAULT 'warn'
    CHECK (conflict_level IN ('block','escalate','warn','allow')),
  enforcement          VARCHAR(20)  NOT NULL DEFAULT 'block'
    CHECK (enforcement IN ('block','warn','log')),
  module_code          VARCHAR(100),
  -- + temporary_waiver_allowed, waiver_max_days, is_active, created_by/at, updated_at
  UNIQUE (rule_code)
);
```

- Implicit per-tenant isolation (no `tenant_id`, deployed inside `tenant_<hex>` schema).
- Scalar role pair, simple 4-state `conflict_level`, `enforcement` enum.

**platform/dauth/migrations/public/131_sod_rules.sql** (68 lines, multi-tenant rich-metadata):

```sql
CREATE TABLE IF NOT EXISTS %I.sod_rules (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     UUID NOT NULL,
  rule_code     TEXT NOT NULL,
  rule_name     TEXT NOT NULL,
  description   TEXT,
  severity      TEXT NOT NULL DEFAULT 'high'
    CHECK (severity IN ('low','medium','high','critical')),
  conflict_a    TEXT[] NOT NULL,
  conflict_b    TEXT[] NOT NULL,
  scope         TEXT NOT NULL DEFAULT 'tenant'
    CHECK (scope IN ('tenant','workspace','module')),
  scope_value   TEXT,
  action        TEXT NOT NULL DEFAULT 'block'
    CHECK (action IN ('block','warn','audit')),
  enabled       BOOLEAN NOT NULL DEFAULT true,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sod_rules_tenant_code_uk UNIQUE (tenant_id, rule_code)
);
```

- Explicit `tenant_id UUID` (parameterized `%I` schema-name + tenant_id column for cross-tenant queries).
- `BIGSERIAL id` for sequential audit-readable IDs.
- `TEXT[]` arrays for `conflict_a/b` (one rule can name many roles per side).
- 4-level `severity`, 3-level `scope`, 3-level `action`, `enabled` flag, `JSONB metadata`.
- Removes `temporary_waiver_allowed` / `waiver_max_days` (waiver semantics moved into 132_sod_waivers).

**Live DB shape (verified 2026-04-25 across 5+ tenant schemas — `tenant_003d6d1f266e`, `tenant_084e492569fb`, `tenant_088998ce759f`, …):**

```
                 Table "tenant_<hex>.sod_rules"
   Column     |   Type                 | Default
--------------+------------------------+----------------------------
 id           | bigint                 | nextval(.../sod_rules_id_seq)
 tenant_id    | uuid                   |
 rule_code    | text                   |
 rule_name    | text                   |
 description  | text                   |
 severity     | text                   | 'high'
 conflict_a   | ARRAY                  |
 conflict_b   | ARRAY                  |
 scope        | text                   | 'tenant'
 scope_value  | text                   |
 action       | text                   | 'block'
 enabled      | boolean                | true
 metadata     | jsonb                  | '{}'::jsonb
 created_at   | timestamptz            | now()
 updated_at   | timestamptz            | now()
 CONSTRAINT sod_rules_tenant_code_uk UNIQUE (tenant_id, rule_code)
```

The deployed schema is the **platform/dauth** shape, not the modules/compliance shape. The two source files are real schema rewrites of the same filename — not whitespace drift.

## 3. Recommended canonical resolution

**Option (a) with twist: modules/compliance is the canonical *home*; platform/dauth has the canonical *content*. Promote content into modules/compliance, delete the platform/dauth duplicates, update tracker checksums to match.**

Rationale:
1. **Ownership:** `modules/compliance/db/manifest.yml` lists `sod` in the tenant `prefix:` array — compliance owns these tables per the canonical catalog. The SQL Reorg (2026-04-22 03:25:37 CST, commit `74208204f`) explicitly homed the SoD migrations there as part of the post-Reorg canonical layout.
2. **Live DB is correct:** the deployed schema is the platform/dauth shape (rich multi-tenant). It evolved past the older modules/compliance shape; reverting the on-disk SQL to the older version would create drift with prod, which is much worse.
3. **Single source of truth:** both copies must not coexist — every future schema change to SoD would have to be made twice and stay coordinated. Collapsing to one copy at the canonical home eliminates the drift class entirely.
4. **No DB DDL:** since the live DB already matches the platform/dauth shape, no schema migration is needed. Just file moves + tracker checksum updates.

Rejected alternatives: (a-pure) keeping modules/compliance content would require a re-migration to revert the live DB → drift-with-prod risk. (b) declaring platform/dauth canonical violates the manifest. (c) renaming both files to coexist would entrench the duplication.

## 4. Backward-compatible resolution plan

**File operations** (run from repo root):

```bash
# Step 1: Verify no _down.sql companions in either location (none expected)
ls -la platform/dauth/migrations/public/13[12]_sod*_down.sql 2>&1
ls -la modules/compliance/db/public/migrations/13[12]_sod*_down.sql 2>&1
# Both should return "No such file or directory".

# Step 2: Promote platform/dauth content into modules/compliance (overwrite older shape)
cp platform/dauth/migrations/public/131_sod_rules.sql \
   modules/compliance/db/public/migrations/131_sod_rules.sql
cp platform/dauth/migrations/public/132_sod_waivers.sql \
   modules/compliance/db/public/migrations/132_sod_waivers.sql

# Step 3: Delete the duplicate copies in platform/dauth
git rm platform/dauth/migrations/public/131_sod_rules.sql \
       platform/dauth/migrations/public/132_sod_waivers.sql

# Step 4: Verify checksums of the now-canonical files match the platform/dauth originals
sha256sum modules/compliance/db/public/migrations/131_sod_rules.sql \
          modules/compliance/db/public/migrations/132_sod_waivers.sql
# Expect:
#   9cb384e94fd8f03c067705daa6c94c5bab0e233f837052f507df9666d7a90f71  …/131_sod_rules.sql
#   40b3cd8dc7ee61879f422afc0157c9feaaf7ad64031b5fa94aa6088b5df4e5b9  …/132_sod_waivers.sql
```

**Tracker update** (run as `dos_migrator` in shahin_grc):

```sql
BEGIN;

-- Snapshot prior values for audit + rollback (write to a temp table or just log)
SELECT filename, checksum, applied_at, duration_ms
  FROM dos.platform_migrations
 WHERE filename IN ('131_sod_rules.sql', '132_sod_waivers.sql');

UPDATE dos.platform_migrations
   SET checksum = '9cb384e94fd8f03c067705daa6c94c5bab0e233f837052f507df9666d7a90f71'
 WHERE filename = '131_sod_rules.sql';

UPDATE dos.platform_migrations
   SET checksum = '40b3cd8dc7ee61879f422afc0157c9feaaf7ad64031b5fa94aa6088b5df4e5b9'
 WHERE filename = '132_sod_waivers.sql';

-- Verify exactly two rows updated, both with the platform/dauth checksums
SELECT filename, checksum FROM dos.platform_migrations
 WHERE filename IN ('131_sod_rules.sql', '132_sod_waivers.sql')
 ORDER BY filename;

COMMIT;
```

**Alternative tracker mechanism:** the runner supports `-- dos:supersedes-checksum: <sha256>` headers in the file (see [`migration-runner.ts:117`](migration/migration-runner.ts#L117) `parseSupersedesChecksums`). Adding `-- dos:supersedes-checksum: 5da7a1c97e…` to the top of the new modules/compliance/131_sod_rules.sql would let the runner accept the new checksum on next `up` without manual `UPDATE`. This is the cleaner mechanism if direct SQL writes to the tracker are policy-restricted; it does not need an `UPDATE` and is auditable in git history.

**Rollback:** snapshot the prior checksums in step 1; if anything goes wrong, `UPDATE` them back. Re-add the platform/dauth files from `git revert` of the file deletion commit. The files were never independently applied to live DB (they're identical filenames against an already-applied tracker entry), so no DDL rollback is needed.

## 5. Service code changes required

**None.**

Verified via grep: only one source code mention of either filename:

```
platform/dauth/packages/shared/src/middleware/sod-clearance.middleware.ts:7:
  * tenant migrations 131_sod_rules.sql / 132_sod_waivers.sql + the …
```

That is a documentation comment in the SoD clearance middleware — no behavior depends on the filename string. The runtime SoD engine reads the deployed `sod_rules` table directly; the on-disk SQL filename is not in the data path.

## 6. Verification SQL + procedural test

**A. Tracker shows the new checksums (post-resolution):**

```sql
SELECT filename, checksum, applied_at
  FROM dos.platform_migrations
 WHERE filename IN ('131_sod_rules.sql', '132_sod_waivers.sql')
 ORDER BY filename;
-- Expect:
--   131_sod_rules.sql   | 9cb384e94fd8f03c067705daa6c94c5bab0e233f837052f507df9666d7a90f71 | <applied_at preserved>
--   132_sod_waivers.sql | 40b3cd8dc7ee61879f422afc0157c9feaaf7ad64031b5fa94aa6088b5df4e5b9 | <applied_at preserved>
```

**B. Live schema matches expected platform/dauth shape (sample one tenant schema):**

```sql
SELECT column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_schema LIKE 'tenant_%' AND table_name = 'sod_rules'
   AND column_name IN ('id','tenant_id','rule_name','severity','conflict_a','scope','action','enabled','metadata')
 ORDER BY table_schema, ordinal_position
 LIMIT 20;
-- Expect: id (bigint, nextval), tenant_id (uuid), rule_name (text), severity (text 'high'),
--         conflict_a (ARRAY), scope (text 'tenant'), action (text 'block'), enabled (bool true), metadata (jsonb '{}').
```

**C. Schema parity across all tenant schemas (no per-tenant drift):**

```sql
SELECT COUNT(DISTINCT t.column_count) AS distinct_shapes
  FROM (
    SELECT table_schema, COUNT(*) AS column_count
      FROM information_schema.columns
     WHERE table_schema LIKE 'tenant_%' AND table_name = 'sod_rules'
     GROUP BY table_schema
  ) t;
-- Expect: 1 (every tenant has the same number of columns).
```

**D. Migration runner no longer aborts on these filenames:**

```bash
DATABASE_URL=postgresql://dos_migrator:dos_migrator_pass_2026@localhost:5432/shahin_grc \
  npx tsx migration/migration-runner.ts plan 2>&1 | grep -E "131_sod|132_sod|drift" || echo "(no drift, no pending)"
# Expect: "(no drift, no pending)" — both files now match tracker, runner skips them.

DATABASE_URL=postgresql://dos_migrator:dos_migrator_pass_2026@localhost:5432/shahin_grc \
  npx tsx migration/migration-runner.ts up --dir platform/dauth/migrations/public 2>&1 | tail -5
# Expect: clean run, "0 applied, N skipped" — no Checksum drift detected error.
```

**E. Git state is clean (no orphaned platform/dauth duplicates):**

```bash
ls platform/dauth/migrations/public/131_sod_rules.sql platform/dauth/migrations/public/132_sod_waivers.sql 2>&1
# Expect both: "No such file or directory".

git status --short platform/dauth/migrations/public/ modules/compliance/db/public/migrations/ | head
# Expect clean tree (changes already committed).
```

---

## Operator notes

- **Tracker is strict source of truth (post-Phase-4 directive):** this incident is the first concrete proof of why the rule matters. Apply the fix via the runner where possible; the `dos:supersedes-checksum:` header is the auditable, in-source-tree mechanism for legitimate checksum updates.
- **Multi-root collision class:** the runner's `discoverAllMigrations()` walks two roots (`platform/*/migrations`, `modules/*/db/*/migrations`) and silently picks one when basenames collide. A separate runner-improvement ticket should add a `WARNING: duplicate filename` log during discovery so future drift surfaces at scan time, not at apply time.
- **Sweep for siblings:** before working this ticket, run a one-shot grep to enumerate every `platform/dauth/migrations/public/*.sql` filename that *also* exists in `modules/*/db/public/migrations/`. The two found here may not be the only pair — bundle any peers into the same fix-PR rather than chasing them one ticket at a time.
- **Live DB is correct** — do not run any DDL during this ticket. The fix is purely on-disk + tracker.
