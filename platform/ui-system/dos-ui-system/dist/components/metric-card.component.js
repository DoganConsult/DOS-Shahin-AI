var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosCarbonTileComponent } from '../carbon/dos-carbon-tile.component';
let DosMetricCardComponent = class DosMetricCardComponent {
    label = '';
    value = '';
    delta = null;
    deltaSuffix = '%';
    route = null;
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosMetricCardComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosMetricCardComponent.prototype, "value", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], DosMetricCardComponent.prototype, "delta", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosMetricCardComponent.prototype, "deltaSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosMetricCardComponent.prototype, "route", void 0);
DosMetricCardComponent = __decorate([
    Component({
        selector: 'dos-metric-card',
        standalone: true,
        imports: [CommonModule, DosCarbonTileComponent],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <dos-carbon-tile [clickable]="!!route" [route]="route">
      <div class="dos-metric-card">
        <span class="dos-metric-card__label">{{ label }}</span>
        <span class="dos-metric-card__value">{{ value }}</span>
        @if (delta !== null && delta !== undefined) {
          <span
            class="dos-metric-card__delta"
            [class.dos-metric-card__delta--up]="delta > 0"
            [class.dos-metric-card__delta--down]="delta < 0"
          >
            {{ delta > 0 ? '↑' : '↓' }} {{ delta }}{{ deltaSuffix }}
          </span>
        }
      </div>
    </dos-carbon-tile>
  `,
        styles: [`
    :host { display: block; }
    /* Overriding base card styles to work within the Carbon tile container */
    .dos-metric-card {
      padding: 0;
      background: transparent;
      border: 0;
      box-shadow: none;
    }
  `]
    })
], DosMetricCardComponent);
export { DosMetricCardComponent };
//# sourceMappingURL=metric-card.component.js.map