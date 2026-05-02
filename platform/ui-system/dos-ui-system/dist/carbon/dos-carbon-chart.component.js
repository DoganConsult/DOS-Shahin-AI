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
 * Carbon-backed chart facade — placeholder.
 *
 * The `@carbon/charts-angular` package ships a legacy NgModule
 * (`ChartsModule`) that does NOT publish the Angular 21 standalone
 * NgModule metadata (`ɵmod`), so it cannot be added to a standalone
 * component's `imports` array. This wrapper currently renders a
 * placeholder until one of the following lands:
 *
 *   1. `@carbon/charts-angular` ships a standalone-compatible build
 *      (tracked upstream).
 *   2. We host an NgModule-bridge component (non-standalone) that
 *      imports `ChartsModule` and re-exports the chart elements as
 *      directives the standalone wrapper can compose.
 *   3. We swap to an alternate engine (ECharts via `ngx-echarts`,
 *      already in deps) for the chart kinds we render today.
 *
 * Inputs are kept on the component so callers don't need to change
 * their template once one of the above paths lands.
 */
let DosCarbonChartComponent = class DosCarbonChartComponent {
    kind = 'line';
    data = [];
    options = {};
};
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonChartComponent.prototype, "kind", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonChartComponent.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonChartComponent.prototype, "options", void 0);
DosCarbonChartComponent = __decorate([
    Component({
        selector: 'dos-carbon-chart',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div class="dos-cb-chart" role="figure">
      <p class="dos-cb-chart__placeholder">
        Chart engine not yet wired — kind: <code>{{ kind }}</code>
      </p>
    </div>
  `,
        styles: [`
    :host { display: block; inline-size: 100%; }
    .dos-cb-chart {
      padding: var(--dos-space-4);
      background: var(--dos-color-surface-muted);
      border: 1px dashed var(--dos-color-border-subtle);
      border-radius: var(--dos-radius-card);
      text-align: center;
      color: var(--dos-color-text-muted);
      font-size: var(--dos-caption-size);
    }
    .dos-cb-chart__placeholder { margin: 0; }
  `],
    })
], DosCarbonChartComponent);
export { DosCarbonChartComponent };
//# sourceMappingURL=dos-carbon-chart.component.js.map