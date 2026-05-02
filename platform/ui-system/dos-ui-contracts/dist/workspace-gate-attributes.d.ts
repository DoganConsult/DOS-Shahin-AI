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
export interface WorkspaceGateAttribute {
    /** Attribute name as it appears in the DOM (kebab-case). */
    attr: string;
    /** Whether the attribute is required on every workspace surface. */
    required: boolean;
    /** Spec section that justifies this attribute. */
    spec: string;
    /** One-line description for diagnostics + JSDoc. */
    description: string;
}
export declare const WORKSPACE_GATE_ATTRIBUTES: ReadonlyArray<WorkspaceGateAttribute>;
/** Just the required set — useful for a quick fail-fast assertion. */
export declare const WORKSPACE_GATE_REQUIRED_ATTRS: ReadonlyArray<string>;
/**
 * Result returned by the runtime probe.
 */
export interface WorkspaceGateAssertionResult {
    ready: boolean;
    missing: string[];
    empty: string[];
    warnings: string[];
    surfaceRoute: string | null;
    attrs: Record<string, string | null>;
}
/**
 * Standard custom event the probe emits when the gate is ready.
 * Listeners (e2e tests, observability) can wait for this:
 *   await page.evaluate(() => new Promise(r =>
 *     window.addEventListener('dos:gate:ready', r, { once: true })));
 */
export declare const DOS_GATE_READY_EVENT: "dos:gate:ready";
export declare const DOS_GATE_FAILED_EVENT: "dos:gate:failed";
