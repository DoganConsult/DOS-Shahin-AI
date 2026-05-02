import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject,
  isDevMode,
} from '@angular/core';
import {
  WORKSPACE_GATE_ATTRIBUTES,
  type WorkspaceGateAssertionResult,
  DOS_GATE_READY_EVENT,
  DOS_GATE_FAILED_EVENT,
} from '@dos/ui-contracts';

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
@Directive({
  selector: '[dosGateProbe]',
  standalone: true,
})
export class DosGateProbeDirective implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Optional — when false, the probe is silent (suppresses console + events). */
  @Input() dosGateProbe: boolean | '' = true;

  /** Surface label for diagnostics. */
  @Input() probeName = 'workspace';

  /** Emits the assertion result on every re-probe. */
  @Output() probe = new EventEmitter<WorkspaceGateAssertionResult>();

  private readonly observer = typeof MutationObserver !== 'undefined'
    ? new MutationObserver(() => this.scheduleProbe())
    : null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    if (this.dosGateProbe === false) return;
    this.observer?.observe(this.host.nativeElement, {
      attributes: true,
      attributeFilter: WORKSPACE_GATE_ATTRIBUTES.map(a => a.attr),
    });
    this.scheduleProbe();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.timer) clearTimeout(this.timer);
  }

  /** Public — run the probe synchronously and return the result. */
  runProbe(): WorkspaceGateAssertionResult {
    const el = this.host.nativeElement;
    const attrs: Record<string, string | null> = {};
    const missing: string[] = [];
    const empty: string[] = [];
    const warnings: string[] = [];

    for (const def of WORKSPACE_GATE_ATTRIBUTES) {
      const v = el.getAttribute(def.attr);
      attrs[def.attr] = v;
      if (v === null) {
        if (def.required) missing.push(def.attr);
        else warnings.push(`${def.attr} (recommended, ${def.spec})`);
      } else if (v.trim() === '') {
        if (def.required) empty.push(def.attr);
        else warnings.push(`${def.attr} present but empty (${def.spec})`);
      }
    }

    return {
      ready:        missing.length === 0 && empty.length === 0,
      missing,
      empty,
      warnings,
      surfaceRoute: attrs['data-route'],
      attrs,
    };
  }

  private scheduleProbe(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.fireProbe(), 16);
  }

  private fireProbe(): void {
    const result = this.runProbe();
    this.probe.emit(result);

    if (typeof window === 'undefined') return;
    const detail = { name: this.probeName, ...result };
    const evtName = result.ready ? DOS_GATE_READY_EVENT : DOS_GATE_FAILED_EVENT;
    window.dispatchEvent(new CustomEvent(evtName, { detail }));

    if (isDevMode() && !result.ready) {
      // eslint-disable-next-line no-console
      console.warn(
        `[DosGateProbe:${this.probeName}] FAILED — ` +
        `missing=[${result.missing.join(', ')}] ` +
        `empty=[${result.empty.join(', ')}]`,
        result.attrs
      );
    } else if (isDevMode() && result.warnings.length) {
      // eslint-disable-next-line no-console
      console.info(
        `[DosGateProbe:${this.probeName}] PASS (with warnings) — ` +
        result.warnings.join('; ')
      );
    }
  }
}
