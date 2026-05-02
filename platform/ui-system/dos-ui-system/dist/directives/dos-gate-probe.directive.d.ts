import { EventEmitter, OnDestroy } from '@angular/core';
import { type WorkspaceGateAssertionResult } from '@dos/ui-contracts';
/**
 * DosGateProbe — PILLAR 2.B runtime page-quality-gate assertion.
 *
 * Apply to the root `<section>` of any workspace surface:
 *
 *   <section dosGateProbe ...>
 *     ...
 *   </section>
 *
 * On view init the directive:
 *   1. Reads every attribute declared in WORKSPACE_GATE_ATTRIBUTES
 *      and computes a `WorkspaceGateAssertionResult`.
 *   2. In dev mode (`ng serve`/`isDevMode()`), warns about every
 *      missing/empty required attribute via `console.warn`.
 *   3. Dispatches `dos:gate:ready` on `window` when all required
 *      attributes are present + non-empty, OR `dos:gate:failed` if not.
 *      e2e Playwright tests await this event to know the page is
 *      contract-compliant before asserting against it.
 *   4. Emits `(probe)` Angular output for in-component subscribers.
 *
 * The directive does NOT throw. A failed probe is a signal, not a
 * crash — the page should keep rendering for users while the gate
 * fails the build / blocks the deploy.
 *
 * Re-runs after Angular's microtask flush via a MutationObserver
 * pinned to the host element (5-tick debounce) so the probe stays
 * current as the page hydrates async data.
 */
export declare class DosGateProbeDirective implements OnDestroy {
    private readonly host;
    /** Optional — when false, the probe is silent (suppresses console + events). */
    dosGateProbe: boolean | '';
    /** Surface label for diagnostics. */
    probeName: string;
    /** Emits the assertion result on every re-probe. */
    probe: EventEmitter<WorkspaceGateAssertionResult>;
    private readonly observer;
    private timer;
    ngAfterViewInit(): void;
    ngOnDestroy(): void;
    /** Public — run the probe synchronously and return the result. */
    runProbe(): WorkspaceGateAssertionResult;
    private scheduleProbe;
    private fireProbe;
}
