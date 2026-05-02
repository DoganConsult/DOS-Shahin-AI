/**
 * @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) — Widget registration is now handled by `provideWidgetRegistry()` in app.config.ts.
 * This file is kept as a no-op compatibility shim for any remaining callers.
 *
 * Old callers like `dashboard.component.ts` called `registerAllWidgets(registry)` in the constructor.
 * With the new APP_INITIALIZER-based registration, this is no longer needed.
 */
import { WidgetRegistryService } from './widget-registry.service';

/** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) — No-op. Widgets are now registered via APP_INITIALIZER. */
export function registerAllWidgets(_registry: WidgetRegistryService): void {
  // Intentional no-op — registration happens in provideWidgetRegistry() at bootstrap.
}
