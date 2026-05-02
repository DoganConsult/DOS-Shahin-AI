var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter, signal, } from '@angular/core';
import { CommonModule } from '@angular/common';
let DosWidgetFrameComponent = class DosWidgetFrameComponent {
    variant = 'solid';
    tone = 'neutral';
    density = 'cozy';
    signature = false;
    full = false;
    eyebrow;
    title;
    subtitle;
    meta;
    status = 'ready';
    loadingLabel = 'Loading';
    errorTitle;
    errorMessage;
    canRetry = false;
    retryLabel = 'Retry';
    emptyTitle;
    emptyMessage;
    retry = new EventEmitter();
    hasHeaderActions = signal(false);
    hasFooterSlot = signal(false);
    hasEmptySlot = signal(false);
};
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWidgetFrameComponent.prototype, "variant", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWidgetFrameComponent.prototype, "tone", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWidgetFrameComponent.prototype, "density", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosWidgetFrameComponent.prototype, "signature", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosWidgetFrameComponent.prototype, "full", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWidgetFrameComponent.prototype, "eyebrow", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWidgetFrameComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWidgetFrameComponent.prototype, "subtitle", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWidgetFrameComponent.prototype, "meta", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWidgetFrameComponent.prototype, "status", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosWidgetFrameComponent.prototype, "loadingLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWidgetFrameComponent.prototype, "errorTitle", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWidgetFrameComponent.prototype, "errorMessage", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosWidgetFrameComponent.prototype, "canRetry", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosWidgetFrameComponent.prototype, "retryLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWidgetFrameComponent.prototype, "emptyTitle", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWidgetFrameComponent.prototype, "emptyMessage", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosWidgetFrameComponent.prototype, "retry", void 0);
DosWidgetFrameComponent = __decorate([
    Component({
        selector: 'dos-widget-frame',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <article
      class="dos-wf"
      [class.dos-wf--signature]="signature"
      [class.dos-wf--full]="full"
      [attr.data-variant]="variant"
      [attr.data-tone]="tone"
      [attr.data-density]="density"
      [attr.data-status]="status"
      [attr.aria-busy]="status === 'loading' ? 'true' : null"
    >
      <!-- Mesh accent layer (signature + gradient/aurora variants only) -->
      @if (signature || variant === 'gradient' || variant === 'aurora') {
        <div class="dos-wf__mesh" aria-hidden="true"></div>
      }

      <!-- Top accent hairline (KPI tile signature) -->
      @if (signature) {
        <div class="dos-wf__hairline" aria-hidden="true"></div>
      }

      <!-- Header -->
      @if (eyebrow || title || subtitle || hasHeaderActions) {
        <header class="dos-wf__head">
          <div class="dos-wf__head-text">
            @if (eyebrow) {
              <span class="dos-wf__eyebrow">{{ eyebrow }}</span>
            }
            @if (title) {
              <h3 class="dos-wf__title">{{ title }}</h3>
            }
            @if (subtitle) {
              <p class="dos-wf__subtitle">{{ subtitle }}</p>
            }
          </div>
          <div class="dos-wf__head-actions">
            <ng-content select="[slot=actions]"></ng-content>
          </div>
        </header>
      }

      <!-- Body (status-driven) -->
      <div class="dos-wf__body">
        @switch (status) {
          @case ('loading') {
            <div class="dos-wf__skeleton" role="status" [attr.aria-label]="loadingLabel">
              <div class="dos-wf__skel-row dos-wf__skel-row--lg"></div>
              <div class="dos-wf__skel-row dos-wf__skel-row--md"></div>
              <div class="dos-wf__skel-row dos-wf__skel-row--sm"></div>
            </div>
          }
          @case ('error') {
            <div class="dos-wf__state dos-wf__state--error" role="alert">
              <span class="dos-wf__state-ic" aria-hidden="true">!</span>
              <div class="dos-wf__state-body">
                <strong>{{ errorTitle || 'Something went wrong' }}</strong>
                @if (errorMessage) { <span>{{ errorMessage }}</span> }
              </div>
              @if (canRetry) {
                <button
                  type="button"
                  class="dos-wf__state-cta"
                  (click)="retry.emit()"
                >
                  {{ retryLabel }}
                </button>
              }
            </div>
          }
          @case ('empty') {
            <div class="dos-wf__empty" role="status">
              <ng-content select="[slot=empty]"></ng-content>
              <span class="dos-wf__empty-glyph" aria-hidden="true">
                <svg viewBox="0 0 56 56" width="44" height="44" fill="none">
                  <circle cx="28" cy="28" r="24" stroke="currentColor" stroke-width="1.25" stroke-dasharray="3 4" opacity=".42"/>
                  <path d="M19 26c0-2.5 1.7-4.2 4.2-4.2h9.6c2.5 0 4.2 1.7 4.2 4.2v9.6c0 2.5-1.7 4.2-4.2 4.2h-9.6c-2.5 0-4.2-1.7-4.2-4.2z" stroke="currentColor" stroke-width="1.4" opacity=".82"/>
                  <path d="M23.5 33.5h9M23.5 29.5h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".82"/>
                </svg>
              </span>
              <strong class="dos-wf__empty-title">{{ emptyTitle || 'Nothing here yet' }}</strong>
              @if (emptyMessage) {
                <span class="dos-wf__empty-msg">{{ emptyMessage }}</span>
              }
            </div>
          }
          @default {
            <ng-content></ng-content>
          }
        }
      </div>

      <!-- Footer -->
      @if (meta || hasFooterSlot) {
        <footer class="dos-wf__foot">
          @if (meta) {
            <span class="dos-wf__meta">{{ meta }}</span>
          }
          <div class="dos-wf__foot-cta">
            <ng-content select="[slot=footer]"></ng-content>
          </div>
        </footer>
      }
    </article>
  `,
        styles: [`
    /* ── Frame base ─────────────────────────────────────────────── */
    .dos-wf {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--dos-density-gap, var(--dos-space-3));
      padding: var(--dos-density-pad-y, var(--dos-space-4))
               var(--dos-density-pad-x, var(--dos-space-5));
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border-subtle);
      border-radius: var(--dos-density-radius, var(--dos-radius-card));
      box-shadow: var(--dos-shadow-card);
      overflow: hidden;
      transition:
        transform var(--dos-duration-fast) var(--dos-ease-out),
        box-shadow var(--dos-duration-normal) var(--dos-ease-emphasized),
        border-color var(--dos-duration-fast) var(--dos-ease-out);
    }
    .dos-wf:hover {
      box-shadow: var(--dos-shadow-md);
      border-color: var(--dos-color-border);
    }
    .dos-wf--full {
      grid-column: 1 / -1;
    }

    /* ── Mesh accent layer (gradient/aurora/signature) ──────────── */
    .dos-wf__mesh {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: .85;
      background:
        var(--dos-gradient-mesh-1),
        var(--dos-gradient-mesh-2),
        var(--dos-gradient-mesh-3);
    }

    /* ── Top hairline (signature only) ──────────────────────────── */
    .dos-wf__hairline {
      position: absolute;
      inset: 0 0 auto 0;
      height: 2px;
      background: var(--dos-gradient-kpi-line);
      opacity: .85;
      pointer-events: none;
    }

    /* ── Variants ───────────────────────────────────────────────── */
    .dos-wf[data-variant='minimal'] {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
      padding-inline: 0;
    }
    .dos-wf[data-variant='glass'] {
      background: var(--dos-glass-tint);
      backdrop-filter: var(--dos-glass-backdrop-md);
      -webkit-backdrop-filter: var(--dos-glass-backdrop-md);
      border-color: var(--dos-glass-edge);
      box-shadow: var(--dos-shadow-md), var(--dos-glass-rim);
    }
    .dos-wf[data-variant='gradient'] {
      background: var(--dos-gradient-brand-soft);
      border-color: var(--dos-color-border-subtle);
    }
    .dos-wf[data-variant='aurora'] {
      background: var(--dos-gradient-aurora);
      border-color: transparent;
      color: var(--dos-color-text-inverse);
      box-shadow: var(--dos-shadow-lg);
    }
    .dos-wf[data-variant='aurora'] .dos-wf__title,
    .dos-wf[data-variant='aurora'] .dos-wf__subtitle,
    .dos-wf[data-variant='aurora'] .dos-wf__eyebrow,
    .dos-wf[data-variant='aurora'] .dos-wf__meta {
      color: var(--dos-color-text-inverse);
      opacity: .92;
    }
    .dos-wf[data-variant='aurora'] .dos-wf__eyebrow { opacity: .72; }

    /* ── Tones (left rail accent) ──────────────────────────────── */
    .dos-wf[data-tone='brand']::before,
    .dos-wf[data-tone='accent']::before,
    .dos-wf[data-tone='success']::before,
    .dos-wf[data-tone='warning']::before,
    .dos-wf[data-tone='danger']::before,
    .dos-wf[data-tone='info']::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 3px;
      pointer-events: none;
    }
    [dir='rtl'] .dos-wf[data-tone]::before { inset: 0 0 0 auto; }
    .dos-wf[data-tone='brand']::before   { background: var(--dos-color-primary); }
    .dos-wf[data-tone='accent']::before  { background: var(--dos-color-accent); }
    .dos-wf[data-tone='success']::before { background: var(--dos-color-success); }
    .dos-wf[data-tone='warning']::before { background: var(--dos-color-warning); }
    .dos-wf[data-tone='danger']::before  { background: var(--dos-color-danger); }
    .dos-wf[data-tone='info']::before    { background: var(--dos-color-info); }

    /* ── Signature (hero) ──────────────────────────────────────── */
    .dos-wf--signature {
      padding: var(--dos-space-6) var(--dos-space-8);
      box-shadow: var(--dos-shadow-lg);
      background: var(--dos-gradient-brand-soft);
    }
    .dos-wf--signature .dos-wf__title {
      font-size: var(--dos-display-md);
      font-weight: var(--dos-display-weight);
      letter-spacing: var(--dos-display-tracking-tight);
      line-height: var(--dos-display-line-tight);
    }

    /* ── Header ────────────────────────────────────────────────── */
    .dos-wf__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--dos-density-gap-tight, var(--dos-space-2));
      position: relative;
    }
    .dos-wf__head-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .dos-wf__eyebrow {
      font-size: var(--dos-eyebrow-size);
      letter-spacing: var(--dos-eyebrow-tracking);
      text-transform: uppercase;
      font-weight: var(--dos-eyebrow-weight);
      color: var(--dos-eyebrow-color);
      margin: 0;
    }
    .dos-wf__title {
      margin: 0;
      font-size: var(--dos-density-title, var(--dos-font-size-lg));
      font-weight: 500;
      color: var(--dos-color-text-strong);
      letter-spacing: -0.005em;
      line-height: 1.25;
    }
    .dos-wf__subtitle {
      margin: 0;
      font-size: var(--dos-caption-size);
      color: var(--dos-caption-color);
      line-height: var(--dos-caption-line);
    }
    .dos-wf__head-actions {
      display: flex;
      gap: var(--dos-space-2);
      align-items: center;
      flex-shrink: 0;
    }
    .dos-wf__head-actions:empty { display: none; }

    /* ── Body ──────────────────────────────────────────────────── */
    .dos-wf__body {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--dos-density-gap-tight, var(--dos-space-2));
      flex: 1 1 auto;
      min-height: 0;
    }
    /* Make the host element fill its grid cell so empty/loading
       states inside the frame stretch to a balanced height. */
    :host { display: block; block-size: 100%; }
    .dos-wf { block-size: 100%; }

    /* ── Skeleton (shimmer) ────────────────────────────────────── */
    .dos-wf__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-2);
      padding: var(--dos-space-2) 0;
    }
    .dos-wf__skel-row {
      height: 12px;
      border-radius: var(--dos-radius-sm);
      background: var(--dos-color-surface-muted);
      position: relative;
      overflow: hidden;
    }
    .dos-wf__skel-row--lg { width: 72%; height: 18px; }
    .dos-wf__skel-row--md { width: 56%; }
    .dos-wf__skel-row--sm { width: 38%; }
    .dos-wf__skel-row::after {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--dos-gradient-shimmer);
      animation: dos-wf-shimmer 1.6s var(--dos-ease-emphasized) infinite;
    }
    @keyframes dos-wf-shimmer {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .dos-wf__skel-row::after { animation: none; opacity: .4; }
    }

    /* ── Empty state — illustrated, centered, intentional ──────── */
    .dos-wf__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--dos-space-2);
      padding: var(--dos-space-5) var(--dos-space-4);
      flex: 1 1 auto;            /* fills the available card height */
      min-height: 11rem;
      text-align: center;
      color: var(--dos-color-text-muted);
      background: var(--dos-color-surface-muted);
      border-radius: var(--dos-radius-md);
      border: 1px dashed var(--dos-color-border-subtle);
    }
    .dos-wf__empty-glyph {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--dos-color-text-subtle);
      opacity: .85;
      margin-bottom: 8px;
      transform: scale(1.15);
    }
    .dos-wf__empty-title {
      font-size: var(--dos-font-size-md);
      font-weight: 500;
      color: var(--dos-color-text-strong);
      letter-spacing: -0.005em;
      max-width: 36ch;
    }
    .dos-wf__empty-msg {
      font-size: var(--dos-caption-size);
      color: var(--dos-caption-color);
      max-width: 38ch;
      line-height: var(--dos-caption-line);
    }
    /* Tone-aware tinting for the empty glyph (matches frame tone). */
    .dos-wf[data-tone='brand']   .dos-wf__empty-glyph { color: var(--dos-color-primary); }
    .dos-wf[data-tone='accent']  .dos-wf__empty-glyph { color: var(--dos-color-accent); }
    .dos-wf[data-tone='success'] .dos-wf__empty-glyph { color: var(--dos-color-success); }
    .dos-wf[data-tone='warning'] .dos-wf__empty-glyph { color: var(--dos-color-warning); }
    .dos-wf[data-tone='danger']  .dos-wf__empty-glyph { color: var(--dos-color-danger); }
    .dos-wf[data-tone='info']    .dos-wf__empty-glyph { color: var(--dos-color-info); }

    /* ── State (error) ─────────────────────────────────────────── */
    .dos-wf__state {
      display: flex;
      align-items: center;
      gap: var(--dos-space-3);
      padding: var(--dos-space-3) var(--dos-space-4);
      background: var(--dos-color-surface-muted);
      border-radius: var(--dos-radius-md);
    }
    .dos-wf__state--error {
      background: var(--dos-color-danger-soft);
      color: var(--dos-color-danger-text);
    }
    .dos-wf__state-ic {
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font: 700 .875rem/1 inherit;
      flex-shrink: 0;
      background: rgba(255, 255, 255, .55);
    }
    .dos-wf__state--error .dos-wf__state-ic {
      background: var(--dos-color-danger);
      color: #fff;
    }
    .dos-wf__state-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1 1 auto;
    }
    .dos-wf__state-body strong { font-size: var(--dos-font-size-sm); }
    .dos-wf__state-body span {
      font-size: var(--dos-caption-size);
      color: var(--dos-caption-color);
    }
    .dos-wf__state--error .dos-wf__state-body span {
      color: var(--dos-color-danger-text);
      opacity: .8;
    }
    .dos-wf__state-cta {
      appearance: none;
      cursor: pointer;
      padding: var(--dos-space-1) var(--dos-space-3);
      border-radius: var(--dos-radius-pill);
      border: 1px solid currentColor;
      background: transparent;
      font: 600 var(--dos-caption-size)/1 inherit;
      color: inherit;
      transition: background var(--dos-duration-fast) var(--dos-ease-out);
    }
    .dos-wf__state-cta:hover { background: rgba(255,255,255,.4); }

    /* ── Footer ────────────────────────────────────────────────── */
    .dos-wf__foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--dos-space-2);
      padding-top: var(--dos-space-2);
      border-top: 1px solid var(--dos-color-border-subtle);
      margin-top: auto;
    }
    .dos-wf__meta {
      font-size: var(--dos-caption-size);
      color: var(--dos-caption-color);
    }
    .dos-wf__foot-cta { display: flex; gap: var(--dos-space-2); }

    /* ── Entrance choreography (single frame fade+rise) ────────── */
    @keyframes dos-wf-enter {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .dos-wf {
      animation: dos-wf-enter var(--dos-duration-slow) var(--dos-ease-emphasized) both;
    }
    @media (prefers-reduced-motion: reduce) {
      .dos-wf { animation: none; }
    }

    /* ── Focus ring ────────────────────────────────────────────── */
    .dos-wf:focus-within {
      outline: none;
      box-shadow: var(--dos-shadow-md), var(--dos-shadow-focus);
    }
  `],
    })
], DosWidgetFrameComponent);
export { DosWidgetFrameComponent };
//# sourceMappingURL=widget-frame.component.js.map