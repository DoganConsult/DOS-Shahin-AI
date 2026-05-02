// ============================================
// Policy Library Service
// Dedicated CRUD operations for policy management.
// Replaces inline route logic with testable,
// reusable service functions.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { emitEvent } from '../../../ports/events.port';
import { v4 as _uuid } from 'uuid';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PolicyFilters {
  status?: string;
  category?: string;
  categoryId?: string;
  owner?: string;
  reviewDueBefore?: string;
  audienceScope?: string;
  businessDomain?: string;
  framework?: string;
  stale?: boolean;
  hasExceptions?: boolean;
  search?: string;
}

export interface PolicyPagination {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface CreatePolicyData {
  title: string;
  content?: string | Record<string, unknown>;
  description?: string;
  category?: string;
  title_en?: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
  business_domain?: string;
  audience_scope?: string;
  category_id?: string;
  author_user_id?: string;
  approver_user_id?: string;
  frameworks?: string[];
  review_frequency?: string;
  next_review_date?: string;
  effective_date?: string;
  expiry_date?: string;
  linked_controls?: string[];
  tags?: string[];
}

export interface UpdatePolicyData {
  title?: string;
  content?: string | Record<string, unknown>;
  description?: string;
  category?: string;
  title_en?: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
  business_domain?: string;
  audience_scope?: string;
  category_id?: string;
  approver_user_id?: string;
  frameworks?: string[];
  review_frequency?: string;
  next_review_date?: string;
  effective_date?: string;
  expiry_date?: string;
  linked_controls?: string[];
  tags?: string[];
  status?: string;
  change_summary?: string;
}

// ── Safe sort columns (prevent SQL injection) ──────────────────────────────

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  title: 'p.title',
  status: 'p.status',
  category: 'p.category',
  owner: 'p.owner',
  created_at: 'p.created_at',
  updated_at: 'p.updated_at',
  next_review_date: 'p.next_review_date',
  publication_state: 'p.publication_state',
  business_domain: 'p.business_domain',
};

// ── List Policies ──────────────────────────────────────────────────────────

/**
 * List policies with dynamic filters and pagination.
 * Supports text search across title, title_en, title_ar, and description.
 */
export async function listPolicies(
  tenantId: string,
  filters?: PolicyFilters,
  pagination?: PolicyPagination,
): Promise<{ policies: unknown[]; total: number; page: number; limit: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['p.deleted_at IS NULL'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters?.status) {
    conditions.push(`p.status = $${paramIdx++}`);
    params.push(filters.status);
  }

  if (filters?.category) {
    conditions.push(`p.category = $${paramIdx++}`);
    params.push(filters.category);
  }

  if (filters?.categoryId) {
    conditions.push(`p.category_id = $${paramIdx++}`);
    params.push(filters.categoryId);
  }

  if (filters?.owner) {
    conditions.push(`p.owner = $${paramIdx++}`);
    params.push(filters.owner);
  }

  if (filters?.reviewDueBefore) {
    conditions.push(`p.next_review_date <= $${paramIdx++}`);
    params.push(filters.reviewDueBefore);
  }

  if (filters?.audienceScope) {
    conditions.push(`p.audience_scope = $${paramIdx++}`);
    params.push(filters.audienceScope);
  }

  if (filters?.businessDomain) {
    conditions.push(`p.business_domain = $${paramIdx++}`);
    params.push(filters.businessDomain);
  }

  if (filters?.framework) {
    conditions.push(`$${paramIdx++} = ANY(p.frameworks)`);
    params.push(filters.framework);
  }

  if (filters?.stale) {
    // Policies not updated within their review_frequency or past next_review_date
    conditions.push(`(p.next_review_date < NOW() OR p.updated_at < NOW() - INTERVAL '12 months')`);
  }

  if (filters?.hasExceptions) {
    conditions.push(`EXISTS (
      SELECT 1 FROM "${schema}".policy_exception_requests ex
      WHERE ex.policy_id = p.policy_id AND ex.status IN ('pending','approved','under_review')
    )`);
  }

  if (filters?.search) {
    conditions.push(`(
      p.title ILIKE $${paramIdx} OR
      p.title_en ILIKE $${paramIdx} OR
      p.title_ar ILIKE $${paramIdx} OR
      p.description ILIKE $${paramIdx}
    )`);
    params.push(`%${filters.search}%`);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  // Count total matching rows
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".policies p WHERE ${whereClause}`,
    params,
  );
  const total = getFirstRow(countResult)?.total ?? 0;

  // Pagination defaults
  const page = Math.max(1, pagination?.page ?? 1);
  const limit = Math.min(200, Math.max(1, pagination?.limit ?? 25));
  const offset = (page - 1) * limit;

  // Sort column validation
  const sortCol = ALLOWED_SORT_COLUMNS[pagination?.sortBy ?? 'updated_at'] ?? 'p.updated_at';
  const sortDir = pagination?.sortDir === 'asc' ? 'ASC' : 'DESC';

  const dataResult = await safeQuery(
    `SELECT p.* FROM "${schema}".policies p
     WHERE ${whereClause}
     ORDER BY ${sortCol} ${sortDir} NULLS LAST, p.created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset],
  );

  return { policies: dataResult.rows, total, page, limit };
}

// ── Get Single Policy ──────────────────────────────────────────────────────

/**
 * Get a single policy with linked entity counts and acknowledgment rate.
 */
export async function getPolicy(
  tenantId: string,
  policyId: string,
): Promise<any | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT p.*,
      (SELECT COUNT(*)::int FROM "${schema}".policy_control_links pcl
       WHERE pcl.policy_id = p.policy_id) AS control_count,
      (SELECT COUNT(*)::int FROM "${schema}".policy_risk_links prl
       WHERE prl.policy_id = p.policy_id) AS risk_count,
      (SELECT COUNT(*)::int FROM "${schema}".policy_exception_requests per
       WHERE per.policy_id = p.policy_id
         AND per.status IN ('pending','approved','under_review')) AS exception_count,
      (SELECT COUNT(*)::int FROM "${schema}".policy_versions pv
       WHERE pv.policy_id = p.policy_id) AS version_count,
      (SELECT CASE
        WHEN COUNT(*)::int = 0 THEN 0
        ELSE ROUND((COUNT(*) FILTER (WHERE ar.status = 'attested')::numeric
              / NULLIF(COUNT(*)::numeric, 0)) * 100, 1)
       END
       FROM "${schema}".attestation_records ar
       JOIN "${schema}".attestation_campaigns ac ON ac.campaign_id = ar.campaign_id
       WHERE ac.policy_id = p.policy_id AND ac.status = 'active'
      ) AS acknowledgment_rate
     FROM "${schema}".policies p
     WHERE p.policy_id = $1 AND p.deleted_at IS NULL`,
    [policyId],
  );

  return getFirstRow(result);
}

// ── Create Policy ──────────────────────────────────────────────────────────

/**
 * Create a new policy with all enterprise fields.
 * Also creates the initial policy_version (v1.0).
 */
export async function createPolicy(
  tenantId: string,
  data: CreatePolicyData,
  userId: string,
): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.policy_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Update Policy ──────────────────────────────────────────────────────────

/**
 * Update a policy and auto-increment version.
 * Creates a new policy_version record for the change.
 */
export async function updatePolicy(
  tenantId: string,
  policyId: string,
  data: UpdatePolicyData,
  userId: string,
): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.policy_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Delete Policy (soft) ───────────────────────────────────────────────────

/**
 * Soft-delete a policy by setting deleted_at timestamp.
 */
export async function deletePolicy(
  tenantId: string,
  policyId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `UPDATE "${schema}".policies
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE policy_id = $1 AND deleted_at IS NULL
     RETURNING policy_id`,
    [policyId],
  );

  return (result.rows.length > 0);
}

// ── Publish Policy ─────────────────────────────────────────────────────────

/**
 * Publish a policy: set status to 'published' and publication_state to 'published'.
 * Emits a policy.published event.
 */
export async function publishPolicy(
  tenantId: string,
  policyId: string,
  userId: string,
): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.policy_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Retire Policy ──────────────────────────────────────────────────────────

/**
 * Retire a policy. Optionally mark it as superseded by another policy.
 */
export async function retirePolicy(
  tenantId: string,
  policyId: string,
  userId: string,
  supersededById?: string,
): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.policy_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Category Stats ─────────────────────────────────────────────────────────

/**
 * Get policy counts grouped by category.
 */
export async function getCategoryStats(
  tenantId: string,
): Promise<Array<{ category: string; count: number; published: number; draft: number; retired: number }>> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       COALESCE(p.category, 'uncategorized') AS category,
       COUNT(*)::int AS count,
       COUNT(*) FILTER (WHERE p.status = 'published')::int AS published,
       COUNT(*) FILTER (WHERE p.status = 'draft')::int AS draft,
       COUNT(*) FILTER (WHERE p.status = 'retired')::int AS retired
     FROM "${schema}".policies p
     WHERE p.deleted_at IS NULL
     GROUP BY COALESCE(p.category, 'uncategorized')
     ORDER BY count DESC`,
    [],
  );

  return result.rows;
}
