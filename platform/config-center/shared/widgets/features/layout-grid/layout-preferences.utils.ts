import { LayoutPreferences } from './layout-grid.types';

/** Current schema version for layout preferences. */
const CURRENT_VERSION = 2;

/**
 * Serializes LayoutPreferences to a JSON string.
 * Ensures the version field is always set for future migration support.
 */
export function serializeLayoutPreferences(prefs: LayoutPreferences): string {
  return JSON.stringify({
    ...prefs,
    version: prefs.version ?? CURRENT_VERSION,
  });
}

/**
 * Deserializes a JSON string to LayoutPreferences.
 * Throws on invalid JSON.
 */
export function deserializeLayoutPreferences(json: string): LayoutPreferences {
  const parsed = JSON.parse(json);
  return {
    widgets: parsed.widgets,
    displayMode: parsed.displayMode,
    version: parsed.version ?? CURRENT_VERSION,
  };
}
