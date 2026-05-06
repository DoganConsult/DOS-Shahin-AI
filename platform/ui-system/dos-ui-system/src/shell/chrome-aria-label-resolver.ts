// Chrome aria-label resolver — host-provided locale-aware lookup for
// runtime-resolved DB chrome keys (dos.ui_workspace_chrome).
//
// Doctrine: zero static / zero legacy / zero fallback. The wrapper
// component (`<dos-carbon-search>`) consumes this token to fail-closed
// when no aria-label can be resolved from runtime data. The host
// product binds the implementation at bootstrap so this leaf package
// (`@dos/ui-system`) does not depend on platform-core or i18n.
//
//   { provide: CHROME_ARIA_LABEL_RESOLVER, useClass: ... }
//
// The resolver is locale-aware: implementations must extract the
// correct value from `{ "en": "...", "ar": "..." }` JSONB chrome
// values according to the host i18n state.

import { InjectionToken } from '@angular/core';

export interface ChromeAriaLabelResolver {
  /**
   * Resolve a chrome key (e.g. `shell.module-records.search.ariaLabel`)
   * against the runtime chrome bag in the active locale.
   * Returns an empty string when the key is absent or the active
   * locale value is missing — never an English fallback.
   */
  resolve(key: string): string;
}

export const CHROME_ARIA_LABEL_RESOLVER = new InjectionToken<ChromeAriaLabelResolver>(
  'CHROME_ARIA_LABEL_RESOLVER',
);
