var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
/**
 * DosWhyChip — §15.1 "Why am I seeing this?" inline chip.
 *
 * Renders a small "?" pill with a tooltip explaining why a UI element
 * is visible (or hidden / disabled). Use everywhere the spec demands
 * explainability:
 *   - on KPI tiles (data scope rationale)
 *   - on disabled nav items (missing-permission / not-entitled / …)
 *   - on hidden actions (whyHidden from ResolvedPageAction)
 *   - on page mastheads (page-level audience rationale)
 *
 * The reason string itself is i18n-resolved by the caller; this
 * component is purely presentational.
 */
let DosWhyChipComponent = class DosWhyChipComponent {
    reason = '';
    label;
    showLabel = false;
    tone = 'neutral';
    size = 'md';
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosWhyChipComponent.prototype, "reason", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWhyChipComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosWhyChipComponent.prototype, "showLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWhyChipComponent.prototype, "tone", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWhyChipComponent.prototype, "size", void 0);
DosWhyChipComponent = __decorate([
    Component({
        selector: 'dos-why-chip',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <span
      class="dos-why"
      [attr.data-tone]="tone"
      [attr.data-size]="size"
      [title]="reason"
      role="note"
      tabindex="0"
    >
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <path d="M8 11.5v.01M6.5 6.5a1.5 1.5 0 1 1 2.4 1.2c-.5.4-.9.7-.9 1.3v.5"
              stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      </svg>
      @if (showLabel && label) {
        <span class="dos-why__label">{{ label }}</span>
      }
    </span>
  `,
        styles: [`
    .dos-why {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: var(--dos-radius-pill);
      background: var(--dos-color-surface-muted);
      color: var(--dos-color-text-subtle);
      font-size: var(--dos-caption-size);
      cursor: help;
      border: 1px solid transparent;
      transition: background var(--dos-duration-fast) var(--dos-ease-out),
                  color var(--dos-duration-fast) var(--dos-ease-out);
    }
    .dos-why:hover, .dos-why:focus-visible {
      background: var(--dos-color-surface-sunken);
      color: var(--dos-color-text);
      outline: none;
    }
    .dos-why[data-tone='warning'] { color: var(--dos-color-warning-text); background: var(--dos-color-warning-soft); }
    .dos-why[data-tone='danger']  { color: var(--dos-color-danger-text);  background: var(--dos-color-danger-soft); }
    .dos-why[data-tone='info']    { color: var(--dos-color-info-text);    background: var(--dos-color-info-soft); }
    .dos-why[data-size='sm']      { padding: 0 4px; font-size: 0.625rem; }
    .dos-why__label { font-weight: 500; }
  `],
    })
], DosWhyChipComponent);
export { DosWhyChipComponent };
//# sourceMappingURL=why-chip.component.js.map