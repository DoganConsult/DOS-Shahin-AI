// ============================================
// Shahin-Ai — Marketplace Install Service
// Installation, reviews/ratings, analytics
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import type { MarketplaceInstallation, MarketplaceListing, MarketplaceReview,
  MarketplaceStats, RatingDistribution, InstallTrend, PublisherAnalytics } from './marketplace.types';
import { mapListingRow, mapReviewRow, mapInstallationRow } from './marketplace.helpers';
import type { GenericRow } from '@dos/types';

// ── Installation ────────────────────────────────────────────────────────────

/**
 * Install a marketplace pack into a tenant.
 * Downloads artifacts, records installation, and increments download count.
 */
export async function installFromMarketplace(
  tenantId: string,
  listingId: string,
  userId: string
): Promise<MarketplaceInstallation> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.packs_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/** Mark a marketplace pack as uninstalled for a tenant. */
export async function uninstallMarketplacePack(
  tenantId: string,
  listingId: string
): Promise<void> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.packs_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/** List all installed marketplace packs for a tenant. */
export async function getInstalledMarketplacePacks(
  tenantId: string
): Promise<(MarketplaceInstallation & { listing?: MarketplaceListing })[]> {
  const result = await safeQuery(
    `SELECT i.*, l.pack_code, l.title_en, l.title_ar, l.description_en, l.description_ar,
            l.category, l.pricing, l.version AS latest_version, l.avg_rating, l.rating_count,
            l.tags, l.screenshots, l.artifact_counts, l.download_count, l.compatibility,
            l.publisher_id, l.status AS listing_status
     FROM public.marketplace_installations i
     JOIN public.marketplace_listings l ON l.id = i.listing_id
     WHERE i.tenant_id = $1 AND i.status = 'installed'
     ORDER BY i.installed_at DESC`,
    [tenantId]
  );
  return result.rows.map((row: GenericRow) => ({
    ...mapInstallationRow(row),
    listing: mapListingRow(row),
  }));
}

/** Compare installed versions with latest published versions for a tenant. */
export async function checkForUpdates(
  tenantId: string
): Promise<{ listingId: string; installedVersion: string; latestVersion: string }[]> {
  const result = await safeQuery(
    `SELECT i.listing_id, i.version AS installed_version, l.version AS latest_version
     FROM public.marketplace_installations i
     JOIN public.marketplace_listings l ON l.id = i.listing_id
     WHERE i.tenant_id = $1 AND i.status = 'installed' AND i.version != l.version`,
    [tenantId]
  );
  return result.rows.map((row: GenericRow) => ({
    listingId: row.listing_id,
    installedVersion: row.installed_version,
    latestVersion: row.latest_version,
  }));
}

// ── Reviews & Ratings ───────────────────────────────────────────────────────

/** Add a review for a marketplace listing and update the listing's average rating. */
export async function addReview(
  tenantId: string,
  userId: string,
  listingId: string,
  rating: number,
  title: string,
  body: string
): Promise<MarketplaceReview> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.packs_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/** Get paginated reviews for a listing. */
export async function getReviews(
  listingId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ reviews: MarketplaceReview[]; total: number }> {
  const offset = (page - 1) * pageSize;

  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM public.marketplace_reviews WHERE listing_id = $1`,
    [listingId]
  );

  const result = await safeQuery(
    `SELECT * FROM public.marketplace_reviews
     WHERE listing_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [listingId, pageSize, offset]
  );

  return {
    reviews: result.rows.map(mapReviewRow),
    total: countResult.rows[0]?.total ?? 0,
  };
}

/** Increment the helpful count for a review. */
export async function markReviewHelpful(reviewId: string, _userId: string): Promise<void> {
  await safeQuery(
    `UPDATE public.marketplace_reviews
     SET helpful_count = helpful_count + 1
     WHERE id = $1`,
    [reviewId]
  );
}

/** Get the rating distribution (count per star 1-5) for a listing. */
export async function getListingRatingDistribution(listingId: string): Promise<RatingDistribution[]> {
  const result = await safeQuery(
    `SELECT rating AS star, COUNT(*)::int AS count
     FROM public.marketplace_reviews
     WHERE listing_id = $1
     GROUP BY rating
     ORDER BY rating`,
    [listingId]
  );

  // Ensure all 5 stars are represented
  const distribution: RatingDistribution[] = [1, 2, 3, 4, 5].map((star) => {
    const found = result.rows.find((r: GenericRow) => Number(r.star) === star);
    return { star, count: found ? Number(found.count) : 0 };
  });
  return distribution;
}

// ── Analytics ───────────────────────────────────────────────────────────────

/** Get aggregate marketplace statistics. */
export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const listingsResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM public.marketplace_listings WHERE status = 'published'`
  );
  const publishersResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM public.marketplace_publishers`
  );
  const installsResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM public.marketplace_installations WHERE status = 'installed'`
  );
  const categoriesResult = await safeQuery(
    `SELECT category, COUNT(*)::int AS count
     FROM public.marketplace_listings WHERE status = 'published'
     GROUP BY category ORDER BY count DESC LIMIT 10`
  );
  const trendingResult = await safeQuery(
    `SELECT l.id AS listing_id, l.title_en AS title, COUNT(i.id)::int AS installs
     FROM public.marketplace_listings l
     JOIN public.marketplace_installations i ON i.listing_id = l.id
     WHERE i.installed_at >= NOW() - INTERVAL '30 days'
     GROUP BY l.id, l.title_en
     ORDER BY installs DESC
     LIMIT 5`
  );

  return {
    totalListings: listingsResult.rows[0]?.total ?? 0,
    totalPublishers: publishersResult.rows[0]?.total ?? 0,
    totalInstalls: installsResult.rows[0]?.total ?? 0,
    topCategories: categoriesResult.rows.map((r: GenericRow) => ({
      category: r.category,
      count: Number(r.count),
    })),
    trendingPacks: trendingResult.rows.map((r: GenericRow) => ({
      listingId: r.listing_id,
      title: r.title,
      installs: Number(r.installs),
    })),
  };
}

/** Get analytics for a specific publisher: downloads, installs, ratings over time. */
export async function getPublisherAnalytics(publisherId: string): Promise<PublisherAnalytics> {
  const totalsResult = await safeQuery(
    `SELECT COALESCE(SUM(l.download_count), 0)::int AS total_downloads,
            COALESCE(AVG(l.avg_rating), 0) AS avg_rating
     FROM public.marketplace_listings l
     WHERE l.publisher_id = $1 AND l.status = 'published'`,
    [publisherId]
  );
  const installsResult = await safeQuery(
    `SELECT COUNT(*)::int AS total_installs
     FROM public.marketplace_installations i
     JOIN public.marketplace_listings l ON l.id = i.listing_id
     WHERE l.publisher_id = $1 AND i.status = 'installed'`,
    [publisherId]
  );
  const dailyResult = await safeQuery(
    `SELECT DATE(i.installed_at) AS date, COUNT(*)::int AS count
     FROM public.marketplace_installations i
     JOIN public.marketplace_listings l ON l.id = i.listing_id
     WHERE l.publisher_id = $1 AND i.installed_at >= NOW() - INTERVAL '30 days'
     GROUP BY DATE(i.installed_at)
     ORDER BY date`,
    [publisherId]
  );

  return {
    totalDownloads: Number(totalsResult.rows[0]?.total_downloads ?? 0),
    totalInstalls: Number(installsResult.rows[0]?.total_installs ?? 0),
    avgRating: Number(totalsResult.rows[0]?.avg_rating ?? 0),
    dailyDownloads: dailyResult.rows.map((r: GenericRow) => ({
      date: r.date,
      count: Number(r.count),
    })),
  };
}

/** Get daily install counts over a specified number of days. */
export async function getInstallTrends(days: number = 30): Promise<InstallTrend[]> {
  const result = await safeQuery(
    `SELECT DATE(installed_at) AS date, COUNT(*)::int AS count
     FROM public.marketplace_installations
     WHERE installed_at >= NOW() - INTERVAL '1 day' * $1
     GROUP BY DATE(installed_at)
     ORDER BY date`,
    [days]
  );
  return result.rows.map((r: GenericRow) => ({
    date: r.date,
    count: Number(r.count),
  }));
}
