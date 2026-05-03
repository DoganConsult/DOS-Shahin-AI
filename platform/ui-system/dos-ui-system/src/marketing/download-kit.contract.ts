/**
 * Phase M1.5 — Download-Kit contract.
 *
 * Source-of-truth for the 3 marketing download component_keys + the
 * downloadable asset shape served by GET /marketing/assets and event
 * keys posted to POST /marketing/downloads.
 */
import type { DosBrandCode } from '@dos/design-tokens';

export const MARKETING_DOWNLOAD_COMPONENT_KEYS = [
  'marketing.download-kit-card',
  'marketing.gated-download-modal',
  'marketing.download-success',
] as const;
export type MarketingDownloadComponentKey =
  (typeof MARKETING_DOWNLOAD_COMPONENT_KEYS)[number];

export const MARKETING_DOWNLOAD_EVENTS = [
  'marketing.download.opened',
  'marketing.download.submitted',
  'marketing.download.completed',
] as const;
export type MarketingDownloadEventKey =
  (typeof MARKETING_DOWNLOAD_EVENTS)[number];

export type MarketingAssetType = 'pdf' | 'xlsx' | 'pptx' | 'zip';

export interface MarketingAsset {
  assetKey: string;
  brandCode: DosBrandCode;
  locale: 'en' | 'ar';
  title: string;
  description: string;
  assetType: MarketingAssetType;
  fileUrl: string;
  thumbnailUrl?: string | null;
  isGated: boolean;
  version: number;
}

export interface MarketingDownloadFormPayload {
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  country: string;
  interestArea: string;
}

export interface MarketingDownloadEvent {
  key: MarketingDownloadEventKey;
  assetKey: string;
  brandCode: DosBrandCode;
  locale: 'en' | 'ar';
  occurredAt: string;
  payload?: Partial<MarketingDownloadFormPayload>;
}
