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
 * Carbon-backed data table wrapper. Use grid wrappers from
 * @dos/ui-system over this for app-level grids — this component is the
 * single primitive that owns Carbon's `cdsTable` markup and styles.
 */
let DosCarbonDataTableComponent = class DosCarbonDataTableComponent {
    columns = [];
    rows = [];
    size = 'md';
    striped = false;
    stickyHeader = false;
    emptyText = 'No data';
    rowClick = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonDataTableComponent.prototype, "columns", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonDataTableComponent.prototype, "rows", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonDataTableComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDataTableComponent.prototype, "striped", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDataTableComponent.prototype, "stickyHeader", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDataTableComponent.prototype, "emptyText", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonDataTableComponent.prototype, "rowClick", void 0);
DosCarbonDataTableComponent = __decorate([
    Component({
        selector: 'dos-carbon-data-table',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <table
      class="cds--data-table"
      [class.cds--data-table--xs]="size === 'xs'"
      [class.cds--data-table--sm]="size === 'sm'"
      [class.cds--data-table--md]="size === 'md'"
      [class.cds--data-table--lg]="size === 'lg'"
      [class.cds--data-table--xl]="size === 'xl'"
      [class.cds--data-table--zebra]="striped"
      [class.cds--data-table--sticky-header]="stickyHeader"
    >
      <thead>
        <tr>
          @for (c of columns; track c.key) {
            <th
              [style.width]="c.width"
              [style.text-align]="c.align ?? 'left'"
            ><span class="cds--table-header-label">{{ c.header }}</span></th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows; track $index) {
          <tr (click)="rowClick.emit(row)">
            @for (c of columns; track c.key) {
              <td [style.text-align]="c.align ?? 'left'">
                {{ row[c.key] }}
              </td>
            }
          </tr>
        }
        @if (!rows?.length) {
          <tr>
            <td [attr.colspan]="columns.length" class="dos-carbon-table__empty">
              {{ emptyText }}
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
    })
], DosCarbonDataTableComponent);
export { DosCarbonDataTableComponent };
//# sourceMappingURL=dos-carbon-data-table.component.js.map