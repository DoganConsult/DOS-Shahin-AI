"use strict";
/**
 * Workspace Gate Attribute Manifest — PILLAR 2.A.
 *
 * The runtime contract between a workspace surface (`<section>` root)
 * and the Page Quality Gate / Playwright probe / DOM-based audit. Every
 * page that claims to be enrolled MUST stamp these attributes on its
 * root element so:
 *
 *   1. The validator script can grep + assert at static-build time.
 *   2. The DosGateProbe directive can assert at runtime in dev mode.
 *   3. e2e tests can locate the surface and verify the contract.
 *   4. Drift detectors can fail-fast when a refactor drops a contract
 *      field (catches the regression before it reaches production).
 *
 * Mirrors §10 hard gates + §21 #2-#5 + §3.5 page-experience requirements.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOS_GATE_FAILED_EVENT = exports.DOS_GATE_READY_EVENT = exports.WORKSPACE_GATE_REQUIRED_ATTRS = exports.WORKSPACE_GATE_ATTRIBUTES = void 0;
exports.WORKSPACE_GATE_ATTRIBUTES = [
    // §10 hard gates — required on every enrolled route.
    { attr: 'data-route', required: true, spec: '§10', description: 'Route this surface implements (e.g. /foundation/overview)' },
    { attr: 'data-module', required: true, spec: '§10', description: 'Owning moduleCode from ui.contract.json' },
    { attr: 'data-page-type', required: true, spec: '§10/§21#2', description: 'overview|list|object|workflow|analytics|audit|settings|report|builder' },
    { attr: 'data-layout', required: true, spec: '§10/§21#3', description: 'dashboard|full-page|split-view|object-page|wizard|report|canvas' },
    { attr: 'data-kpi-scope', required: true, spec: '§10/§21#4', description: 'module-overview|page-local|none' },
    { attr: 'data-title-key', required: true, spec: '§10/§21#5', description: 'i18n title key (dotted, never raw text)' },
    // §21 recommended (warn, not fail).
    { attr: 'data-signature-widget', required: false, spec: '§21 #6', description: 'Signature widget identifier' },
    { attr: 'data-empty-state-key', required: false, spec: '§3.2', description: 'Localized empty-state key' },
    { attr: 'data-error-state-key', required: false, spec: '§3.2', description: 'Localized error-state key' },
    { attr: 'data-help-key', required: false, spec: '§3.2', description: 'Inline help key' },
    { attr: 'data-user-intent', required: false, spec: '§3.2', description: 'monitor|manage|review|approve|investigate|configure|report' },
    // §3.5 page-experience runtime gates.
    { attr: 'data-readonly', required: true, spec: '§3.5 #4', description: 'true when auditor profile or role-locked' },
    { attr: 'data-profile', required: true, spec: '§3.5 #5', description: 'Resolved persona profile' },
    { attr: 'data-scope-mode', required: true, spec: '§3.5 #5', description: 'tenant|org_scope|department_scope|self|global' },
    { attr: 'data-realtime-channels', required: false, spec: '§13/§21#25', description: 'Comma-separated SSE channels declared by this surface' },
    // §31 module style tokens (recommended).
    { attr: 'data-module-accent', required: false, spec: '§31', description: 'moduleStyleTokens.accent for visual probes' },
    { attr: 'data-module-mood', required: false, spec: '§31', description: 'moduleStyleTokens.mood' },
    // §3.2 page actions count.
    { attr: 'data-primary-actions', required: false, spec: '§3.2', description: 'Count of visible primary actions' },
    // §11 / §15 locale + direction (a11y signal).
    { attr: 'data-density', required: false, spec: '§11.3', description: 'compact|cozy|comfortable' },
    { attr: 'lang', required: true, spec: '§11.5', description: 'BCP-47 locale (mirror of <html lang>)' },
    { attr: 'dir', required: true, spec: '§11.5', description: 'ltr|rtl' },
];
/** Just the required set — useful for a quick fail-fast assertion. */
exports.WORKSPACE_GATE_REQUIRED_ATTRS = exports.WORKSPACE_GATE_ATTRIBUTES.filter(a => a.required).map(a => a.attr);
/**
 * Standard custom event the probe emits when the gate is ready.
 * Listeners (e2e tests, observability) can wait for this:
 *   await page.evaluate(() => new Promise(r =>
 *     window.addEventListener('dos:gate:ready', r, { once: true })));
 */
exports.DOS_GATE_READY_EVENT = 'dos:gate:ready';
exports.DOS_GATE_FAILED_EVENT = 'dos:gate:failed';
//# sourceMappingURL=workspace-gate-attributes.js.map