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
/**
 * Phase WS-2 — workspace.header wrapper.
 * Selector: dos-workspace-header
 * Carbon primitive: Header (composes ui-shell carbon_key).
 */
let DosWorkspaceHeaderComponent = class DosWorkspaceHeaderComponent {
    title = '';
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosWorkspaceHeaderComponent.prototype, "title", void 0);
DosWorkspaceHeaderComponent = __decorate([
    Component({
        selector: 'dos-workspace-header',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <header class="dos-workspace-header" role="banner" data-testid="dos-workspace-header">
      <div class="dos-workspace-header__start">
        <ng-content select="[headerStart]"></ng-content>
        @if (title) { <strong class="dos-workspace-header__title">{{ title }}</strong> }
      </div>
      <div class="dos-workspace-header__end">
        <ng-content select="[headerEnd]"></ng-content>
      </div>
    </header>
  `,
        styles: [`
    :host { display: block; }
    .dos-workspace-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--cds-spacing-05, 1rem);
      min-height: 48px; padding: 0 var(--cds-spacing-05, 1rem);
      background: var(--cds-background-inverse, #161616);
      color: var(--cds-text-on-color, #fff);
      border-block-end: 1px solid var(--cds-border-subtle-01, rgba(255,255,255,0.1));
    }
    .dos-workspace-header__start,
    .dos-workspace-header__end {
      display: inline-flex; align-items: center; gap: var(--cds-spacing-03, .5rem);
    }
    .dos-workspace-header__title { font-weight: 600; font-size: .875rem; }
  `],
    })
], DosWorkspaceHeaderComponent);
export { DosWorkspaceHeaderComponent };
//# sourceMappingURL=workspace-header.component.js.map