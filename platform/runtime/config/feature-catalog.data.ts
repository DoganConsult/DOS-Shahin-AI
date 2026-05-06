import type { FeatureCatalogEntry } from './feature-catalog.model';

/**
 * Minimal feature catalog so FeatureCatalogService resolves.
 * Used by sidebar tooltips, feature-explorer, and global search.
 */
export const FEATURE_CATALOG_DATA: FeatureCatalogEntry[] = [
  // Doctrine: feature catalog is publisher-owned and DB-driven via UI-OS
  // resolver. The static seed array below is intentionally empty —
  // any prior `/workspace-home` / `/feature-explorer` / `/copilot` / etc.
  // entries were frontend invention. If a feature must surface, seed it
  // through the canonical DB route catalog (dos.dynamic_ui_route_catalog
  // + workspace_shell_i18n) and the resolver will emit it. NO FRONTEND
  // INVENTION (AGENTS.md NO STATIC RULE).
];
