import type { FeatureCatalogEntry } from './feature-catalog.model';

/**
 * Minimal feature catalog so FeatureCatalogService resolves.
 * Used by sidebar tooltips, feature-explorer, and global search.
 */
export const FEATURE_CATALOG_DATA: FeatureCatalogEntry[] = [
  { id: 'dashboard', route: '/workspace-home', category: 'main', order: 1, labelEn: 'Dashboard', valuePropositionEn: 'Overview of your GRC workspace' },
  { id: 'feature-explorer', route: '/feature-explorer', category: 'intelligence', order: 2, labelEn: 'Feature Explorer', valuePropositionEn: 'Discover and navigate platform features' },
  { id: 'copilot-chat', route: '/copilot-chat', category: 'intelligence', order: 3, labelEn: 'Copilot Chat', valuePropositionEn: 'AI-assisted conversations for GRC tasks' },
  { id: 'analytics-dashboard', route: '/analytics-dashboard', category: 'intelligence', order: 4, labelEn: 'Analytics Dashboard', valuePropositionEn: 'Analytics and reporting views' },
  { id: 'platform-config', route: '/platform-config', category: 'account', order: 5, labelEn: 'Platform Config', valuePropositionEn: 'Platform configuration and settings' },
  { id: 'copilot', route: '/copilot', category: 'intelligence', order: 6, labelEn: 'AI Copilot', valuePropositionEn: 'AI assistant for compliance and risk' },
  { id: 'global-search', route: '/global-search', category: 'main', order: 7, labelEn: 'Global Search', valuePropositionEn: 'Search across features and content' },
  { id: 'risks', route: '/risks', category: 'grc', order: 8, labelEn: 'Risks', valuePropositionEn: 'Risk register and treatment' },
  { id: 'compliance', route: '/compliance', category: 'grc', order: 9, labelEn: 'Compliance', valuePropositionEn: 'Compliance posture and controls' },
  { id: 'report-center', route: '/report-center', category: 'intelligence', order: 10, labelEn: 'Report Center', valuePropositionEn: 'Reports and audit packages' },
];
