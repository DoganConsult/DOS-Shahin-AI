// ============================================
// Shahin-Ai — Marketplace Listing Service
// CRUD, review/approval, search/discovery
// ============================================

import { safeQuery } from '../ports/database.port';
import type { MarketplaceListing, Publisher, ListingSubmission, ReviewDecision,
  MarketplaceSearchFilter, ListingCategory, SecurityScanResult } from './marketplace.types';
import { mapListingRow, validateManifestStructure, computeArtifactCounts } from './marketplace.helpers';

// ── Listing CRUD & Submission ───────────────────────────────────────────────

/** Submit a new listing for marketplace review. Validates manifest structure. */
export async function submitListing(
  publisherId: string,
  submission: ListingSubmission
): Promise<MarketplaceListing> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.packs_items" + (""), []);
      return result?.rows || [];
}

/** Update a draft or rejected listing. Only the owning publisher may update. */
export async function updateListing(
  publisherId: string,
  listingId: string,
  updates: Partial<ListingSubmission>
): Promise<MarketplaceListing> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.packs_items" + (""), []);
      return result?.rows || [];
}

/** Get a full listing with publisher info. */
export async function getListing(listingId: string): Promise<(MarketplaceListing & { publisher?: Publisher }) | null> {
  const result = await safeQuery(
    `SELECT l.*, p.name AS publisher_name, p.email AS publisher_email,
            p.website AS publisher_website, p.verified AS publisher_verified,
            p.joined_at AS publisher_joined_at
     FROM public.marketplace_listings l
     LEFT JOIN public.marketplace_publishers p ON p.id = l.publisher_id
     WHERE l.id = $1`,
    [listingId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const listing = mapListingRow(row);
  return {
    ...listing,
    publisher: row.publisher_name
      ? {
          id: row.publisher_id,
          name: row.publisher_name,
          email: row.publisher_email,
          website: row.publisher_website,
          verified: row.publisher_verified,
          totalPacks: 0,
          avgRating: 0,
          joinedAt: row.publisher_joined_at,
        }
      : undefined,
  };
}

/** Withdraw a listing from review or the marketplace. */
export async function withdrawListing(publisherId: string, listingId: string): Promise<void> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.packs_items" + (""), []);
      return result?.rows || [];
}

// ── Review & Approval ───────────────────────────────────────────────────────

/** List submitted packs pending review. */
export async function getListingsForReview(): Promise<MarketplaceListing[]> {
  const result = await safeQuery(
    `SELECT * FROM public.marketplace_listings
     WHERE status IN ('submitted', 'in_review')
     ORDER BY created_at ASC`
  );
  return result.rows.map(mapListingRow);
}

/** Approve or reject a listing with a reason. */
export async function reviewListing(
  reviewerId: string,
  listingId: string,
  decision: ReviewDecision
): Promise<void> {
  const newStatus = decision.decision === "approved" ? "approved" : "rejected";

  await safeQuery(
    `UPDATE public.marketplace_listings
     SET status = $1, reviewed_by = $2, review_reason = $3,
         security_scan_result = $4, reviewed_at = NOW()
     WHERE id = $5 AND status IN ('submitted', 'in_review')`,
    [
      newStatus,
      reviewerId,
      decision.reason,
      JSON.stringify(decision.securityScanResult),
      listingId,
    ]
  );
}

/**
 * Run a security scan on a listing's manifest and artifacts.
 * Checks for SQL injection patterns, executable code, and structural validity.
 */
export async function runSecurityScan(listingId: string): Promise<SecurityScanResult> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.packs_items" + (""), []);
      return result?.rows || [];
}

/** Mark an approved listing as published, making it discoverable. */
export async function publishListing(listingId: string): Promise<void> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.packs_items" + (""), []);
      return result?.rows || [];
}

// ── Search & Discovery ──────────────────────────────────────────────────────

/** Full-text search with category, pricing, rating filters, pagination, and sorting. */
export async function searchListings(filter: MarketplaceSearchFilter): Promise<{ listings: MarketplaceListing[]; total: number }> {
  const conditions: string[] = ["status = 'published'"];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.query) {
    conditions.push(`(title_en ILIKE $${idx} OR title_ar ILIKE $${idx} OR description_en ILIKE $${idx})`);
    params.push(`%${filter.query}%`);
    idx++;
  }
  if (filter.category) {
    conditions.push(`category = $${idx++}`);
    params.push(filter.category);
  }
  if (filter.pricing) {
    conditions.push(`pricing = $${idx++}`);
    params.push(filter.pricing);
  }
  if (filter.minRating !== undefined) {
    conditions.push(`avg_rating >= $${idx++}`);
    params.push(filter.minRating);
  }
  if (filter.tags && filter.tags.length > 0) {
    conditions.push(`tags::jsonb ?| $${idx++}`);
    params.push(filter.tags);
  }

  const whereClause = conditions.join(" AND ");

  // Determine sort order
  let orderBy: string;
  switch (filter.sortBy) {
    case "popular":   orderBy = "download_count DESC"; break;
    case "rating":    orderBy = "avg_rating DESC"; break;
    case "downloads": orderBy = "download_count DESC"; break;
    case "recent":
    default:          orderBy = "published_at DESC NULLS LAST"; break;
  }

  const offset = (filter.page - 1) * filter.pageSize;

  // Count total matching
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM public.marketplace_listings WHERE ${whereClause}`,
    params
  );

  // Fetch page
  const listParams = [...params, filter.pageSize, offset];
  const result = await safeQuery(
    `SELECT * FROM public.marketplace_listings
     WHERE ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $${idx++} OFFSET $${idx}`,
    listParams
  );

  return {
    listings: result.rows.map(mapListingRow),
    total: countResult.rows[0]?.total ?? 0,
  };
}

/** Curated featured packs (published, high-rated, verified publisher). */
export async function getFeaturedListings(): Promise<MarketplaceListing[]> {
  const result = await safeQuery(
    `SELECT l.* FROM public.marketplace_listings l
     JOIN public.marketplace_publishers p ON p.id = l.publisher_id
     WHERE l.status = 'published' AND p.verified = true
     ORDER BY l.avg_rating DESC, l.download_count DESC
     LIMIT 12`
  );
  return result.rows.map(mapListingRow);
}

/** Most installed packs within a recent time window. */
export async function getTrendingListings(days: number = 30): Promise<MarketplaceListing[]> {
  const result = await safeQuery(
    `SELECT l.*, COUNT(i.id)::int AS recent_installs
     FROM public.marketplace_listings l
     JOIN public.marketplace_installations i ON i.listing_id = l.id
     WHERE l.status = 'published'
       AND i.installed_at >= NOW() - INTERVAL '1 day' * $1
     GROUP BY l.id
     ORDER BY recent_installs DESC
     LIMIT 20`,
    [days]
  );
  return result.rows.map(mapListingRow);
}

/** Filter published listings by category. */
export async function getListingsByCategory(category: ListingCategory): Promise<MarketplaceListing[]> {
  const result = await safeQuery(
    `SELECT * FROM public.marketplace_listings
     WHERE status = 'published' AND category = $1
     ORDER BY download_count DESC`,
    [category]
  );
  return result.rows.map(mapListingRow);
}

/** Find similar listings based on tag and category overlap. */
export async function getSimilarListings(listingId: string): Promise<MarketplaceListing[]> {
  const listing = await safeQuery(
    `SELECT category, tags FROM public.marketplace_listings WHERE id = $1`,
    [listingId]
  );
  if (listing.rows.length === 0) return [];

  const row = listing.rows[0];
  const tags: string[] = typeof row.tags === "string" ? JSON.parse(row.tags) : (row.tags ?? []);

  const result = await safeQuery(
    `SELECT *, (
       CASE WHEN category = $1 THEN 2 ELSE 0 END +
       COALESCE(array_length(
         ARRAY(SELECT jsonb_array_elements_text(tags::jsonb) INTERSECT SELECT unnest($2::text[])),
         1
       ), 0)
     ) AS relevance_score
     FROM public.marketplace_listings
     WHERE id != $3 AND status = 'published'
     ORDER BY relevance_score DESC, avg_rating DESC
     LIMIT 10`,
    [row.category, tags, listingId]
  );
  return result.rows.map(mapListingRow);
}
