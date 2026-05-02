import { Type } from '@angular/core';
import { WidgetRegistryService } from './widget-registry.service';

/**
 * Resolves a widget ID to its detail component type for the slide-in panel.
 * Now works with the new manifest-based registry.
 *
 * For lazy-loaded widgets, returns null (detail view requires async resolution
 * via WidgetLoaderService instead).
 */
export function resolveWidgetDetail(
  widgetId: string,
  registry: WidgetRegistryService
): Type<any> | null {
  const manifest = registry.get(widgetId);
  if (!manifest) return null;

  // Only return if it's a direct component reference (not a lazy factory)
  if (typeof manifest.component === 'function' && 'ɵcmp' in manifest.component) {
    return manifest.component as Type<any>;
  }

  return null;
}

export function hasWidgetDetail(
  widgetId: string,
  registry: WidgetRegistryService
): boolean {
  return registry.has(widgetId);
}

export function getAllDetailWidgetIds(
  registry: WidgetRegistryService
): string[] {
  return registry.list().map(m => m.id);
}
