/**
 * @dos/ui-system — Services barrel.
 *
 * Phase F — mobile route channel killed. The legacy
 *   - dos-mobile-tokens.service     (→ /api/ui-os/mobile-breakpoint-config)
 *   - dos-responsive-resolver.service (→ /api/ui-os/mobile-component-variants)
 *   - dos-haptic-pattern.service    (→ /api/ui-os/mobile-touch-gestures)
 * services have been deleted. All mobile config (breakpoints, touch
 * targets / gestures, component variants) is now folded into the
 * workspace-runtime envelope under
 *   shell.breakpoints, shell.touchTargets, shell.variants
 * and consumed via WorkspaceShellBindingService. There is exactly ONE
 * workspace runtime channel; no /api/ui-os/mobile-* duplicates.
 */

export * from './dos-haptic.service';
