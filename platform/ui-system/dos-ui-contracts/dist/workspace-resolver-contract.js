"use strict";
/**
 * Workspace Resolver Contract — F.3
 *
 * Strongly-typed shape returned by the platform Dynamic UI resolver when
 * a product asks "what should /workspace-home (or /tenant-settings, or
 * any other surface) render right now, for THIS user, in THIS tenant,
 * at THIS locale?"
 *
 * Every string the user sees is pre-resolved by the resolver — products
 * never look up i18n keys themselves, never compute setup-step "done"
 * states, never decide which AI tip to render. They consume the
 * payload and dispatch to <dos-widget-frame>.
 *
 * Keep this file dependency-free (pure types). Backend implementations
 * (dynamic-ui-service) and frontend consumers (Shahin SPA, Foundation
 * pages) both import from here so the wire shape never drifts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=workspace-resolver-contract.js.map