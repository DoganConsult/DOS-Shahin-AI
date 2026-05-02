import { EventEmitter } from '@angular/core';
/**
 * DosWidgetFrame — the canonical chrome around every Dynamic-UI widget.
 *
 * One frame, declarative variants. The renderer body goes inside via
 * `<ng-content>`. The frame owns:
 *
 *   • visual variant       → surface treatment (solid/glass/gradient/aurora/minimal)
 *   • semantic tone        → accent stripe + icon tint (brand/accent/success/…)
 *   • density mode         → spacing/typography rhythm
 *   • signature flag       → larger hero treatment for `is_signature` widgets
 *   • status orchestration → loading / error / empty / ready (uniform UX)
 *   • header rhythm        → eyebrow / title / subtitle / right-actions
 *   • footer rhythm        → meta line (e.g. "updated 2 min ago") + CTA slot
 *
 * The frame does NOT fetch data, gate permissions, or interpret config.
 * It is purely a visual contract. Renderers wire data to it.
 *
 * Carbon coexistence: the frame renders pure DOS surfaces; the renderer
 * body MAY contain Carbon primitives (cds-data-table, cds-tag, cds-link)
 * — they paint correctly because Carbon's `--cds-*` vars are re-toned
 * to DOS tokens via `@dos/design-tokens/carbon-overrides.css`.
 */
export type DosWidgetVariant = 'solid' | 'glass' | 'gradient' | 'aurora' | 'minimal';
export type DosWidgetTone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
export type DosWidgetDensity = 'compact' | 'cozy' | 'comfortable';
export type DosWidgetStatus = 'ready' | 'loading' | 'error' | 'empty';
export declare class DosWidgetFrameComponent {
    variant: DosWidgetVariant;
    tone: DosWidgetTone;
    density: DosWidgetDensity;
    signature: boolean;
    full: boolean;
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    meta?: string;
    status: DosWidgetStatus;
    loadingLabel: string;
    errorTitle?: string;
    errorMessage?: string;
    canRetry: boolean;
    retryLabel: string;
    emptyTitle?: string;
    emptyMessage?: string;
    retry: EventEmitter<void>;
    readonly hasHeaderActions: import("@angular/core").WritableSignal<boolean>;
    readonly hasFooterSlot: import("@angular/core").WritableSignal<boolean>;
    readonly hasEmptySlot: import("@angular/core").WritableSignal<boolean>;
}
