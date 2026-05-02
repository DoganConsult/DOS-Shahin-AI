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
import { StructuredListModule } from 'carbon-components-angular';
/**
 * Carbon StructuredList wrapper used for label/value detail panes.
 * Pass either pre-built `rows` for simple key/value rendering, or use the
 * `customRow` slot for fully custom row content.
 */
let DosCarbonStructuredListComponent = class DosCarbonStructuredListComponent {
    rows = [];
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonStructuredListComponent.prototype, "rows", void 0);
DosCarbonStructuredListComponent = __decorate([
    Component({
        selector: 'dos-carbon-structured-list',
        standalone: true,
        imports: [CommonModule, StructuredListModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-structured-list>
      @for (r of rows; track r.key) {
        <cds-list-row>
          <cds-list-column>{{ r.label }}</cds-list-column>
          <cds-list-column>
            @if (r.chips?.length) {
              <span class="dos-carbon-sl__chips">
                @for (chip of r.chips; track chip) {
                  <span class="dos-carbon-sl__chip">{{ chip }}</span>
                }
              </span>
            } @else {
              {{ r.value }}
            }
          </cds-list-column>
        </cds-list-row>
      }
      <ng-content select="[customRow]"></ng-content>
    </cds-structured-list>
  `,
    })
], DosCarbonStructuredListComponent);
export { DosCarbonStructuredListComponent };
//# sourceMappingURL=dos-carbon-structured-list.component.js.map