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
let DosPageHeaderComponent = class DosPageHeaderComponent {
    title = '';
    description = '';
    breadcrumb = [];
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosPageHeaderComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosPageHeaderComponent.prototype, "description", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosPageHeaderComponent.prototype, "breadcrumb", void 0);
DosPageHeaderComponent = __decorate([
    Component({
        selector: 'dos-page-header',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <header class="dos-page-header">
      <nav class="dos-page-header__breadcrumb" aria-label="Breadcrumb">
        <ng-content select="[pageHeaderBreadcrumb]"></ng-content>
        @if (breadcrumb && breadcrumb.length > 0) {
          @for (b of breadcrumb; track b.label; let last = $last) {
            <span>{{ b.label }}</span>@if (!last) { <span> / </span> }
          }
        }
      </nav>
      <div class="dos-page-header__row">
        <div class="dos-page-header__main">
          <h1 class="dos-page-header__title">{{ title }}</h1>
          @if (description) {
            <p class="dos-page-header__description">{{ description }}</p>
          }
          <ng-content select="[pageHeaderMeta]"></ng-content>
        </div>
        <div class="dos-page-header__actions dos-stack-h">
          <ng-content select="[pageHeaderActions]"></ng-content>
        </div>
      </div>
      <ng-content select="[pageHeaderExtra]"></ng-content>
    </header>
  `,
    })
], DosPageHeaderComponent);
export { DosPageHeaderComponent };
//# sourceMappingURL=page-header.component.js.map