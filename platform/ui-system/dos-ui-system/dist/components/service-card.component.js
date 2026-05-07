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
import { DosIconComponent } from './icon.component';
import { DosCarbonTileComponent } from '../carbon/dos-carbon-tile.component';
/**
 * DosServiceCard — workspace tile for a module, quick-action, or service.
 *
 * Refined enterprise styling: generous padding, optional icon badge, hover
 * lift, primary CTA at the bottom.
 */
let DosServiceCardComponent = class DosServiceCardComponent {
    title = '';
    subtitle = '';
    description = '';
    icon = null;
    tone = 'brand';
    ctaLabel = 'Open';
    ctaKind = 'primary';
    disabled = false;
    badge = null;
    open = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosServiceCardComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosServiceCardComponent.prototype, "subtitle", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosServiceCardComponent.prototype, "description", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosServiceCardComponent.prototype, "icon", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosServiceCardComponent.prototype, "tone", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosServiceCardComponent.prototype, "ctaLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosServiceCardComponent.prototype, "ctaKind", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosServiceCardComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosServiceCardComponent.prototype, "badge", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosServiceCardComponent.prototype, "open", void 0);
DosServiceCardComponent = __decorate([
    Component({
        selector: 'dos-service-card',
        standalone: true,
        imports: [CommonModule, DosIconComponent, DosCarbonTileComponent],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <dos-carbon-tile [clickable]="!disabled" (activated)="open.emit()">
      <div
        class="dos-service-card"
        [class.dos-service-card--disabled]="disabled"
      >
        <header class="dos-service-card__header">
          @if (icon) {
            <span
              class="dos-service-card__icon-badge"
              [attr.data-tone]="tone"
              aria-hidden="true"
            >
              <dos-icon [name]="icon" [size]="20"></dos-icon>
            </span>
          }
          @if (badge) {
            <span class="dos-service-card__badge">{{ badge }}</span>
          }
        </header>

        <div class="dos-service-card__body">
          @if (subtitle) {
            <span class="dos-service-card__subtitle">{{ subtitle }}</span>
          }
          <strong class="dos-service-card__title">{{ title }}</strong>
          @if (description) {
            <p class="dos-service-card__description">{{ description }}</p>
          }
        </div>

        <footer class="dos-service-card__footer">
          <div
            class="dos-service-card__cta dos-service-card__cta--{{ ctaKind }}"
            [attr.aria-disabled]="disabled"
          >
            <span>{{ ctaLabel }}</span>
            <dos-icon name="arrow-right" [size]="14"></dos-icon>
          </div>
        </footer>
      </div>
    </dos-carbon-tile>
  `,
        styles: [`
    :host { display: block; height: 100%; }
    .dos-service-card {
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-3);
      padding: 0;
      background: transparent;
      border: 0;
      box-shadow: none;
      height: 100%;
    }
    .dos-service-card--disabled {
      opacity: 0.6;
      pointer-events: none;
    }
    .dos-service-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--dos-space-2);
    }
    .dos-service-card__icon-badge {
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--dos-radius-md, 8px);
      background: var(--dos-color-primary-soft);
      color: var(--dos-color-primary-strong);
    }
    .dos-service-card__icon-badge[data-tone='accent']  { background: var(--dos-color-accent-soft); color: var(--dos-color-accent-text); }
    .dos-service-card__icon-badge[data-tone='success'] { background: var(--dos-color-success-soft); color: var(--dos-color-success-strong); }
    .dos-service-card__icon-badge[data-tone='warning'] { background: var(--dos-color-warning-soft); color: var(--dos-color-warning-strong); }
    .dos-service-card__icon-badge[data-tone='danger']  { background: var(--dos-color-danger-soft); color: var(--dos-color-danger-strong); }
    .dos-service-card__icon-badge[data-tone='neutral'] { background: var(--dos-color-surface-muted); color: var(--dos-color-text-muted); }
    .dos-service-card__badge {
      font-size: var(--dos-font-size-2xs, 0.6875rem);
      font-weight: var(--dos-font-weight-semibold);
      letter-spacing: var(--dos-letter-spacing-caps, 0.06em);
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: var(--dos-radius-pill);
      background: var(--dos-color-accent-bg);
      color: var(--dos-color-accent-text);
    }
    .dos-service-card__body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 auto;
    }
    .dos-service-card__subtitle {
      font-size: var(--dos-font-size-xs);
      color: var(--dos-color-text-subtle);
      letter-spacing: var(--dos-letter-spacing-caps, 0.06em);
      text-transform: uppercase;
      font-weight: var(--dos-font-weight-medium);
    }
    .dos-service-card__title {
      font-size: var(--dos-font-size-lg);
      line-height: 1.3;
      font-weight: var(--dos-font-weight-bold);
      letter-spacing: -0.005em;
      color: var(--dos-color-text-strong);
    }
    .dos-service-card__description {
      margin: 0;
      font-size: var(--dos-font-size-md);
      line-height: var(--dos-line-height-relaxed, 1.6);
      color: var(--dos-color-text-muted);
    }
    .dos-service-card__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin-top: auto;
    }
    .dos-service-card__cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font-size: var(--dos-font-size-md);
      font-weight: var(--dos-font-weight-semibold);
      border-radius: var(--dos-radius-sm);
      border: 1px solid transparent;
      transition:
        background var(--dos-transition-fast, 130ms ease-out),
        color var(--dos-transition-fast, 130ms ease-out),
        border-color var(--dos-transition-fast, 130ms ease-out);
    }
    .dos-service-card__cta--primary {
      background: var(--dos-color-primary);
      color: var(--dos-color-text-inverse);
    }
    .dos-service-card__cta--ghost {
      background: transparent;
      color: var(--dos-color-text);
      border-color: var(--dos-color-border);
    }
  `],
    })
], DosServiceCardComponent);
export { DosServiceCardComponent };
//# sourceMappingURL=service-card.component.js.map