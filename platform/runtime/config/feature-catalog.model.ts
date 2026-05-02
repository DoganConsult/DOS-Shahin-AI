/**
 * Feature catalog entry for sidebar tooltips, page headers, empty states, and global search.
 */
export interface FeatureCatalogEntry {
  id: string;
  route: string;
  category: string;
  order: number;
  labelEn: string;
  labelAr?: string;
  valuePropositionEn: string;
  valuePropositionAr?: string;
  whenToUseEn?: string;
  whenToUseAr?: string;
  /** Role codes this feature is relevant for (e.g. for feature-explorer filter). */
  roleRelevance?: string[];
}
