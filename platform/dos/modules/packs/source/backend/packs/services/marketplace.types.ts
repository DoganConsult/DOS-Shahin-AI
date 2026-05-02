import { safeQuery } from "@dos/db";

// ============================================
// Shahin-Ai — Pack Marketplace Types
// All types, interfaces, and union types for
// the marketplace domain.
// ============================================

export type ListingCategory =
  | "framework"
  | "controls"
  | "evidence"
  | "workflow"
  | "dashboard"
  | "integration"
  | "sector"
  | "regulator"
  | "standard"
  | "bundle";

export type ListingPricing = "free" | "paid" | "freemium";

export type ListingStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "published"
  | "suspended";

export type ReviewDecisionType = "approved" | "rejected";

export type ListingSortBy = "popular" | "recent" | "rating" | "downloads";

export interface MarketplaceListing {
  id: string;
  packCode: string;
  publisherId: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: ListingCategory;
  version: string;
  pricing: ListingPricing;
  price?: number;
  currency?: string;
  status: ListingStatus;
  artifactCounts: Record<string, number>;
  downloadCount: number;
  avgRating: number;
  ratingCount: number;
  tags: string[];
  screenshots: string[];
  compatibility: Record<string, unknown>;
}

export interface Publisher {
  id: string;
  name: string;
  email: string;
  website: string;
  verified: boolean;
  totalPacks: number;
  avgRating: number;
  joinedAt: string;
}

export interface MarketplaceReview {
  id: string;
  listingId: string;
  tenantId: string;
  userId: string;
  rating: number; // 1-5
  title: string;
  body: string;
  helpfulCount: number;
  createdAt: string;
}

export interface MarketplaceInstallation {
  id: string;
  listingId: string;
  tenantId: string;
  version: string;
  installedAt: string;
  status: string;
}

export interface ListingSubmission {
  packCode: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: ListingCategory;
  tags: string[];
  pricing: ListingPricing;
  manifestJson: Record<string, unknown>;
  artifactsJson: Record<string, unknown>;
}

export interface ReviewDecision {
  listingId: string;
  reviewerId: string;
  decision: ReviewDecisionType;
  reason: string;
  securityScanResult: Record<string, unknown>;
}

export interface MarketplaceSearchFilter {
  query?: string;
  category?: ListingCategory;
  pricing?: ListingPricing;
  minRating?: number;
  tags?: string[];
  sortBy: ListingSortBy;
  page: number;
  pageSize: number;
}

export interface MarketplaceStats {
  totalListings: number;
  totalPublishers: number;
  totalInstalls: number;
  topCategories: { category: string; count: number }[];
  trendingPacks: { listingId: string; title: string; installs: number }[];
}

export interface SecurityScanResult {
  passed: boolean;
  issues: string[];
  scannedAt: string;
}

export interface RatingDistribution {
  star: number;
  count: number;
}

export interface InstallTrend {
  date: string;
  count: number;
}

export interface PublisherAnalytics {
  totalDownloads: number;
  totalInstalls: number;
  avgRating: number;
  dailyDownloads: { date: string; count: number }[];
}
