# dos.access_reviews schema mismatch: campaign_name vs title

**Status:** Open — backlog (next auth-governance hardening pass)
**Filed:** 2026-04-25
**Phase:** Follow-up to Phase 4 (deferred from scope; not a release blocker for Phase 4)
**Priority:** Backlog. Not a release blocker unless a live endpoint currently fails because of this mismatch (verify via Section 6 before triaging up).

## Scope rules (do not violate)

- Do NOT modify Phase 4 migrations (`platform/dos/migrations/public/20260425_001[0-6]_*.sql`).
- Do NOT add new tables.
- Do NOT broaden into RBAC/SoD redesign.
- Do NOT touch unrelated auth-service tests.

---

## 1. Exact affected files

- [Migration schema definition](platform/dos/migrations/public/20260425_0005_access_review_tables.sql#L18) — defines `campaign_name`; lacks `reviewer_id` and `review_type`
- [Service INSERT statement](modules/foundation/source/backend/foundation/routes/access-review.service.ts#L98-L105) — writes `title`, `reviewer_id`, `review_type` (none exist in schema)
- [Service AccessReview interface](modules/foundation/source/backend/foundation/routes/access-review.service.ts#L5-L18) — declares `title: string`
- [Service test expectations](modules/foundation/source/backend/foundation/routes/access-review.service.test.ts#L45-L49) — asserts `review_type` defaults to `'periodic'`
- [Validation schema](modules/foundation/source/backend/foundation/routes/foundation.schemas.ts#L129-L136) — input has `title`, `reviewer_id`, `review_type`
- [Frontend Campaign component](frontend/products/shahin/src/app/blueprint/features/foundation/pages/foundation-access-review.component.ts#L8) — Campaign model expects `name`/`title`
- [Frontend API service](frontend/products/shahin/src/app/blueprint/features/foundation/services/foundation-api.service.ts#L361-L368) — calls `/access-review/campaigns`

The user-service location (`services/user-service/src/domain/foundation/access-review.service.ts`) listed in the original Phase-4 plan no longer exists — the source moved to `modules/foundation/source/backend/foundation/routes/`. References below use the canonical post-extraction path.

## 2. Exact SQL/table/column mismatch

**Schema — migration `20260425_0005_access_review_tables.sql` lines 15–28 (already applied; live DB matches):**

```sql
CREATE TABLE IF NOT EXISTS dos.access_reviews (
  review_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  campaign_name    TEXT NOT NULL,
  description      TEXT,
  scope            JSONB DEFAULT '{}'::jsonb,
  status           TEXT NOT NULL DEFAULT 'draft',
  due_date         TIMESTAMPTZ,
  created_by       VARCHAR(64),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ,
  deleted_at       TIMESTAMPTZ
);
```

**Live `\d dos.access_reviews` (verified 2026-04-25):** confirms the schema above — `campaign_name` present, `reviewer_id` and `review_type` columns absent.

**Service INSERT — `access-review.service.ts` lines 98–105:**

```ts
const r = await c.query(
  `INSERT INTO dos.access_reviews
     (review_id, tenant_id, title, description, scope, reviewer_id, due_date, review_type, status, created_by, created_at, updated_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, NOW(), NOW())
   RETURNING *`,
  [id, tenantId, input.title, input.description ?? null, input.scope ?? null,
   input.reviewer_id ?? null, input.due_date ?? null, input.review_type ?? 'periodic', actorId],
);
```

**Mismatch summary:**
- Schema has: `campaign_name`. Code writes to: `title` → first INSERT raises `42703` "column title does not exist".
- Schema lacks: `reviewer_id`, `review_type`. Code references both in the column list and parameter array → same `42703` blocker.
- `SELECT *` returns rows, so reads work; the read path silently coerces missing fields to `undefined` and the FE renders empty cells.

## 3. Recommended canonical column name

**Rename schema column `campaign_name` → `title`, and add the two missing columns (`reviewer_id`, `review_type`).**

Rationale:
1. **FE + service alignment:** The TypeScript `AccessReview` interface, all validation schemas, and the FE component model all use `title` already. The schema is the only place using `campaign_name`. Three call sites > one definition.
2. **Repo convention:** Sibling governance/audit tables use `title` (policies, controls, attestations); `campaign_name` is an outlier idiom.
3. **Blast radius:** Live DB has `campaign_name` but **the table is empty in production today** (no service can write to it because of this very bug). Renaming costs zero data; fixing the code would require touching 5+ call sites, the validator, the FE model, and the Vitest suite. Net edits: 1 column rename + 2 column adds vs. 5+ code edits.

## 4. Backward-compatible migration plan

Production data on this table = 0 rows (the bug prevents inserts). No backward-compat shim needed. A single idempotent migration is enough.

**File to create:** `platform/dos/migrations/public/20260426_0001_access_review_schema_align.sql`

> Note: numbered `20260426_0001` so it lands after the Phase-4 sequence and doesn't collide with the next foundation patch. Adjust to the next free slot at implementation time.

```sql
-- =====================================================================
-- Align dos.access_reviews schema to service contract (20260426_0001)
--
-- Migration 20260425_0005 created the table with `campaign_name` and
-- omitted `reviewer_id` + `review_type`. The access-review service
-- (modules/foundation/.../access-review.service.ts) writes `title`,
-- `reviewer_id`, `review_type` — every INSERT raises 42703 today.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'dos' AND table_name = 'access_reviews'
       AND column_name = 'campaign_name'
  ) THEN
    ALTER TABLE dos.access_reviews RENAME COLUMN campaign_name TO title;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'dos' AND table_name = 'access_reviews'
       AND column_name = 'reviewer_id'
  ) THEN
    ALTER TABLE dos.access_reviews ADD COLUMN reviewer_id VARCHAR(64);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'dos' AND table_name = 'access_reviews'
       AND column_name = 'review_type'
  ) THEN
    ALTER TABLE dos.access_reviews ADD COLUMN review_type TEXT NOT NULL DEFAULT 'periodic';
  END IF;
END $$;

COMMIT;
```

**Rollback — `20260426_0001_access_review_schema_align_down.sql`:**

```sql
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'dos' AND table_name = 'access_reviews'
       AND column_name = 'review_type'
  ) THEN
    ALTER TABLE dos.access_reviews DROP COLUMN review_type;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'dos' AND table_name = 'access_reviews'
       AND column_name = 'reviewer_id'
  ) THEN
    ALTER TABLE dos.access_reviews DROP COLUMN reviewer_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'dos' AND table_name = 'access_reviews'
       AND column_name = 'title'
  ) THEN
    ALTER TABLE dos.access_reviews RENAME COLUMN title TO campaign_name;
  END IF;
END $$;

COMMIT;
```

## 5. Service code changes required

**None.** The service, validators, tests, and FE are already coherent on `title` / `reviewer_id` / `review_type`. The schema is the side that drifts; only the schema needs to change.

If the implementer disagrees and prefers to fix the service side instead, the punch list would be:
- `access-review.service.ts:98-105` — INSERT column list `title → campaign_name`, drop `reviewer_id` and `review_type` from VALUES + parameter array
- `access-review.service.ts:5-18` — rename `title` → `campaign_name` in `AccessReview` interface; remove `reviewer_id`, `review_type` fields
- `foundation.schemas.ts:129-136` — rename `title` → `campaign_name` in input zod schema; remove `reviewer_id`, `review_type`
- `access-review.service.test.ts:45-49` — drop the `review_type` default-to-`'periodic'` assertion
- `frontend/products/shahin/src/app/blueprint/features/foundation/pages/foundation-access-review.component.ts:8` — rename `name` field map to `campaign_name`
- `frontend/products/shahin/src/app/blueprint/features/foundation/services/foundation-api.service.ts:361-368` — adjust DTO field name

That path is **NOT recommended** — five files vs. one migration with three guarded `ALTER`s.

## 6. Verification SQL + service-level test path

**Verification SQL (run as `dos_migrator`):**

```sql
-- A. Column shape post-migration
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'dos' AND table_name = 'access_reviews'
   AND column_name IN ('title', 'campaign_name', 'reviewer_id', 'review_type')
 ORDER BY column_name;
-- Expect: title (text, NOT NULL), reviewer_id (varchar, nullable),
--         review_type (text, NOT NULL, default 'periodic'). NO row for campaign_name.

-- B. Tracker has the new migration
SELECT filename, applied_at, duration_ms
  FROM dos.platform_migrations
 WHERE filename = '20260426_0001_access_review_schema_align.sql';

-- C. Round-trip INSERT/SELECT/DELETE as the service role (dos_user)
SET ROLE dos_user;
INSERT INTO dos.access_reviews
  (tenant_id, title, description, reviewer_id, review_type, due_date, created_by)
VALUES
  ('smoke-tenant', 'Q2 2026 Access Review', 'quarterly cert',
   'user-789', 'periodic', NOW() + interval '30 days', 'admin-001')
RETURNING review_id, title, reviewer_id, review_type, status;
-- Expect: 1 row, status='draft' (table default).
DELETE FROM dos.access_reviews WHERE tenant_id = 'smoke-tenant';
RESET ROLE;
```

**Service-level smoke test (post-restart of user-service / foundation runtime):**

```bash
# Authenticated probe — replace $JWT with a valid tenant-admin token
JWT=...

curl -sS -X POST http://127.0.0.1:4000/api/access-review/campaigns \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q2 2026 Access Review",
    "description": "Quarterly user access certification",
    "reviewer_id": "user-789",
    "due_date": "2026-05-30",
    "review_type": "periodic"
  }' | jq '{review_id, title, reviewer_id, review_type, status}'

# Expect HTTP 201 + { title: "Q2 2026 Access Review", review_type: "periodic", status: "draft", ... }
# Pre-fix: HTTP 500 with detail "column \"title\" of relation \"access_reviews\" does not exist".
```

**Vitest path:**

```bash
cd /root/DOS-AIO/modules/foundation
npx vitest run source/backend/foundation/routes/access-review.service.test.ts
```

Expect: all tests pass. The existing test at line 45 covers the `review_type` default and is the canary for this fix.

---

## Operator notes

- The Phase-4 commit (`642ca78eb`) intentionally did NOT include this fix — keep them separate so a Phase-4 rollback (unlikely but possible) doesn't take this with it.
- Migration discipline reminder: apply via `tsx migration/migration-runner.ts up --dir platform/dos/migrations/public`. Do not psql-apply ad-hoc; the tracker is now the strict source of truth.
- After applying, restart `user-service` (or whichever foundation-routing service hosts the access-review router) with `pm2 restart <name> --update-env` so the runtime picks up any cached connection metadata.
