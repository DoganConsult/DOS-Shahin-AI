import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosBreadcrumbItem {
  label: string;
  route?: string;
}

@Component({
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
export class DosPageHeaderComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() breadcrumb: DosBreadcrumbItem[] = [];
}
