/**
 * workspace-host-kit — internal DOS kit (NOT a third-party template).
 *
 * One-source rule:
 *   IBM Carbon Angular  →  @dos/ui-system Carbon wrappers (src/carbon/*)
 *                         →  this kit (src/shell/*)
 *                         →  product workspace shell host
 *
 * Hard rules (enforced by `ui-os-carbon-boundary-guard` +
 * `workspace-shell-coverage` + `workspace-platform-dna-vendor-guard`):
 *   - NO marketplace dashboard templates.
 *   - NO PrimeNG / Material / Tailwind drift.
 *   - All 10 surfaces register under workspace.* in
 *     dos.dynamic_ui_component_registry (vendor='ibm-carbon').
 *
 * Surface: 10 standalone Carbon-backed workspace shell surfaces +
 * shell hosts (app/desktop/mobile) + workspace contracts.
 */
export * from './workspace-shell.contracts';

// 10 workspace-shell surfaces (Phase WS-2..WS-6).
export * from './workspace-header.component';
export * from './workspace-sidebar.component';
export * from './mobile-bottom-nav.component';
export * from './command-search.component';
export * from './workspace-status-bar.component';
export * from './workspace-action-queue.component';
export * from './agent-activity-strip.component';
export * from './inbox-center.component';
export * from './context-panel.component';
export * from './quick-create.component';

// Shell hosts.
export * from './app-shell.component';
export * from './desktop-shell.component';
export * from './desktop-sidebar.component';
export * from './mobile-shell.component';
export * from './mobile-drawer.component';
