var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
/**
 * DosEmptyState — illustrated, brand-voiced empty state.
 *
 * Backwards-compatible: existing `title` + `description` + projected
 * content continues to work. New optional inputs add an icon glyph,
 * primary/secondary actions, and a tone variant. Projected content
 * still renders below the optional CTAs.
 */
let DosEmptyStateComponent = class DosEmptyStateComponent {
    title = '';
    description = '';
    icon;
    showDefaultGlyph = true;
    tone = 'neutral';
    primaryAction;
    secondaryAction;
    primary = new EventEmitter();
    secondary = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosEmptyStateComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosEmptyStateComponent.prototype, "description", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosEmptyStateComponent.prototype, "icon", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosEmptyStateComponent.prototype, "showDefaultGlyph", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosEmptyStateComponent.prototype, "tone", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosEmptyStateComponent.prototype, "primaryAction", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosEmptyStateComponent.prototype, "secondaryAction", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosEmptyStateComponent.prototype, "primary", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosEmptyStateComponent.prototype, "secondary", void 0);
DosEmptyStateComponent = __decorate([
    Component({
        selector: 'dos-empty-state',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div class="dos-empty" [attr.data-tone]="tone" role="status">
      @if (icon) {
        <span class="dos-empty__icon" aria-hidden="true">{{ icon }}</span>
      } @else if (showDefaultGlyph) {
        <span class="dos-empty__glyph" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
            <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="1.25" stroke-dasharray="3 4" opacity=".4"/>
            <path d="M22 30c0-3 2-5 5-5h10c3 0 5 2 5 5v10c0 3-2 5-5 5H27c-3 0-5-2-5-5z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M27 38h10M27 33h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </span>
      }
      @if (title) { <strong class="dos-empty__title">{{ title }}</strong> }
      @if (description) { <p class="dos-empty__desc">{{ description }}</p> }
      @if (primaryAction || secondaryAction) {
        <div class="dos-empty__cta">
          @if (primaryAction) {
            <button
              type="button"
              class="dos-empty__btn dos-empty__btn--primary"
              (click)="primary.emit()"
            >{{ primaryAction }}</button>
          }
          @if (secondaryAction) {
            <button
              type="button"
              class="dos-empty__btn dos-empty__btn--ghost"
              (click)="secondary.emit()"
            >{{ secondaryAction }}</button>
          }
        </div>
      }
      <ng-content></ng-content>
    </div>
  `,
        styles: [`
    .dos-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--dos-space-2);
      padding: var(--dos-space-6) var(--dos-space-5);
      text-align: center;
      color: var(--dos-color-text);
      background: var(--dos-color-surface-muted);
      border-radius: var(--dos-radius-card);
      border: 1px dashed var(--dos-color-border);
      min-height: 8rem;
    }
    .dos-empty[data-tone='brand']   { color: var(--dos-color-primary); }
    .dos-empty[data-tone='accent']  { color: var(--dos-color-accent-text); }
    .dos-empty[data-tone='success'] { color: var(--dos-color-success-text); }
    .dos-empty[data-tone='warning'] { color: var(--dos-color-warning-text); }
    .dos-empty[data-tone='danger']  { color: var(--dos-color-danger-text); }

    .dos-empty__icon {
      font-size: 2rem;
      line-height: 1;
      opacity: .8;
    }
    .dos-empty__glyph { color: var(--dos-color-text-subtle); opacity: .7; }
    .dos-empty__title {
      font-size: var(--dos-font-size-md);
      font-weight: 500;
      color: var(--dos-color-text-strong);
      margin-top: var(--dos-space-1);
    }
    .dos-empty__desc {
      margin: 0;
      font-size: var(--dos-caption-size);
      color: var(--dos-caption-color);
      max-width: 36ch;
      line-height: var(--dos-caption-line);
    }
    .dos-empty__cta {
      display: flex;
      gap: var(--dos-space-2);
      margin-top: var(--dos-space-2);
    }
    .dos-empty__btn {
      appearance: none;
      cursor: pointer;
      padding: var(--dos-space-2) var(--dos-space-4);
      border-radius: var(--dos-radius-pill);
      font: 600 var(--dos-font-size-sm)/1 inherit;
      transition:
        background var(--dos-duration-fast) var(--dos-ease-out),
        box-shadow var(--dos-duration-fast) var(--dos-ease-out);
    }
    .dos-empty__btn--primary {
      background: var(--dos-color-primary);
      color: var(--dos-color-text-inverse);
      border: 1px solid var(--dos-color-primary);
      box-shadow: var(--dos-shadow-xs);
    }
    .dos-empty__btn--primary:hover { background: var(--dos-color-primary-hover); }
    .dos-empty__btn--ghost {
      background: transparent;
      border: 1px solid var(--dos-color-border-strong);
      color: var(--dos-color-text);
    }
    .dos-empty__btn--ghost:hover { background: var(--dos-color-surface); }
  `],
    })
], DosEmptyStateComponent);
export { DosEmptyStateComponent };
//# sourceMappingURL=empty-state.component.js.map