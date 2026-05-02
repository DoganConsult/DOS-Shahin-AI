var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Directive, ElementRef, EventEmitter, Input, Output, inject, isDevMode, } from '@angular/core';
import { WORKSPACE_GATE_ATTRIBUTES, DOS_GATE_READY_EVENT, DOS_GATE_FAILED_EVENT, } from '@dos/ui-contracts';
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
let DosGateProbeDirective = class DosGateProbeDirective {
    host = inject((ElementRef));
    /** Optional — when false, the probe is silent (suppresses console + events). */
    dosGateProbe = true;
    /** Surface label for diagnostics. */
    probeName = 'workspace';
    /** Emits the assertion result on every re-probe. */
    probe = new EventEmitter();
    observer = typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => this.scheduleProbe())
        : null;
    timer = null;
    ngAfterViewInit() {
        if (this.dosGateProbe === false)
            return;
        this.observer?.observe(this.host.nativeElement, {
            attributes: true,
            attributeFilter: WORKSPACE_GATE_ATTRIBUTES.map(a => a.attr),
        });
        this.scheduleProbe();
    }
    ngOnDestroy() {
        this.observer?.disconnect();
        if (this.timer)
            clearTimeout(this.timer);
    }
    /** Public — run the probe synchronously and return the result. */
    runProbe() {
        const el = this.host.nativeElement;
        const attrs = {};
        const missing = [];
        const empty = [];
        const warnings = [];
        for (const def of WORKSPACE_GATE_ATTRIBUTES) {
            const v = el.getAttribute(def.attr);
            attrs[def.attr] = v;
            if (v === null) {
                if (def.required)
                    missing.push(def.attr);
                else
                    warnings.push(`${def.attr} (recommended, ${def.spec})`);
            }
            else if (v.trim() === '') {
                if (def.required)
                    empty.push(def.attr);
                else
                    warnings.push(`${def.attr} present but empty (${def.spec})`);
            }
        }
        return {
            ready: missing.length === 0 && empty.length === 0,
            missing,
            empty,
            warnings,
            surfaceRoute: attrs['data-route'],
            attrs,
        };
    }
    scheduleProbe() {
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = setTimeout(() => this.fireProbe(), 16);
    }
    fireProbe() {
        const result = this.runProbe();
        this.probe.emit(result);
        if (typeof window === 'undefined')
            return;
        const detail = { name: this.probeName, ...result };
        const evtName = result.ready ? DOS_GATE_READY_EVENT : DOS_GATE_FAILED_EVENT;
        window.dispatchEvent(new CustomEvent(evtName, { detail }));
        if (isDevMode() && !result.ready) {
            // eslint-disable-next-line no-console
            console.warn(`[DosGateProbe:${this.probeName}] FAILED — ` +
                `missing=[${result.missing.join(', ')}] ` +
                `empty=[${result.empty.join(', ')}]`, result.attrs);
        }
        else if (isDevMode() && result.warnings.length) {
            // eslint-disable-next-line no-console
            console.info(`[DosGateProbe:${this.probeName}] PASS (with warnings) — ` +
                result.warnings.join('; '));
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosGateProbeDirective.prototype, "dosGateProbe", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosGateProbeDirective.prototype, "probeName", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosGateProbeDirective.prototype, "probe", void 0);
DosGateProbeDirective = __decorate([
    Directive({
        selector: '[dosGateProbe]',
        standalone: true,
    })
], DosGateProbeDirective);
export { DosGateProbeDirective };
//# sourceMappingURL=dos-gate-probe.directive.js.map