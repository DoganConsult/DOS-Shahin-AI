// ============================================
// Shahin-Ai — Pack Marketplace Helpers
// Internal helper functions for manifest validation,
// artifact counting, and database row mapping.
// ============================================

import {
  MarketplaceListing,
  MarketplaceReview,
  MarketplaceInstallation,
  Publisher,
} from "./marketplace.types";
import { safeQuery } from "@dos/db";

/** Validate that a manifest JSON has the required structure. */
export function validateManifestStructure(manifest: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!manifest) {
    errors.push("manifest is required");
    return errors;
  }
  if (!manifest.packId || typeof manifest.packId !== "string") {
    errors.push("manifest.packId is required and must be a string");
  }
  if (!manifest.version || typeof manifest.version !== "string") {
    errors.push("manifest.version is required and must be a string");
  }
  if (!manifest.artifacts || typeof manifest.artifacts !== "object") {
    errors.push("manifest.artifacts is required and must be an object");
  }
  return errors;
}

/** Compute artifact counts from artifacts JSON for display purposes. */
export function computeArtifactCounts(artifactsJson: Record<string, unknown>): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!artifactsJson || typeof artifactsJson !== "object") return counts;
  for (const [key, value] of Object.entries(artifactsJson)) {
    if (Array.isArray(value)) {
      counts[key] = value.length;
    }
  }
  return counts;
}

/** Map a database row to a MarketplaceListing object. */
export function mapListingRow(row: Record<string, unknown>): MarketplaceListing {
  const parseSafe = (val: unknown, fallback: unknown = []): unknown => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return fallback; }
    }
    return val;
  };

  return {

    id: row.id,

    packCode: row.pack_code,

    publisherId: row.publisher_id,

    titleEn: row.title_en,

    titleAr: row.title_ar,

    descriptionEn: row.description_en,

    descriptionAr: row.description_ar,

    category: row.category,

    version: row.version ?? row.latest_version,

    pricing: row.pricing,

    price: row.price ?? undefined,

    currency: row.currency ?? undefined,

    status: row.status ?? row.listing_status,

    artifactCounts: parseSafe(row.artifact_counts, {}),
    downloadCount: Number(row.download_count ?? 0),
    avgRating: Number(row.avg_rating ?? 0),
    ratingCount: Number(row.rating_count ?? 0),

    tags: parseSafe(row.tags, []),

    screenshots: parseSafe(row.screenshots, []),

    compatibility: parseSafe(row.compatibility, {}),
  };
}

/** Map a database row to a MarketplaceReview object. */
export function mapReviewRow(row: Record<string, unknown>): MarketplaceReview {
  return {

    id: row.id,

    listingId: row.listing_id,

    tenantId: row.tenant_id,

    userId: row.user_id,
    rating: Number(row.rating),

    title: row.title,

    body: row.body,
    helpfulCount: Number(row.helpful_count ?? 0),

    createdAt: row.created_at,
  };
}

/** Map a database row to a MarketplaceInstallation object. */
export function mapInstallationRow(row: Record<string, unknown>): MarketplaceInstallation {
  return {

    id: row.id,

    listingId: row.listing_id,

    tenantId: row.tenant_id,

    version: row.version,

    installedAt: row.installed_at,

    status: row.status,
  };
}

/** Map a database row to a Publisher object. */
export function mapPublisherRow(row: Record<string, unknown>): Publisher {
  return {

    id: row.id,

    name: row.name,

    email: row.email,

    website: row.website,

    verified: row.verified,
    totalPacks: Number(row.total_packs ?? 0),
    avgRating: Number(row.avg_rating ?? 0),

    joinedAt: row.joined_at,
  };
}
