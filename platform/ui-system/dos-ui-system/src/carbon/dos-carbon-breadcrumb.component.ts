import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreadcrumbModule } from 'carbon-components-angular';

export interface DosCarbonBreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

/**
 * Carbon-backed breadcrumb trail.
 */
@Component({
  selector: 'dos-carbon-breadcrumb',
  standalone: true,
  imports: [CommonModule, BreadcrumbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-breadcrumb [noTrailingSlash]="noTrailingSlash" [skeleton]="skeleton">
      <cds-breadcrumb-item
        *ngFor="let it of items"
        [href]="it.href || '#'"
        [aria-current]="it.current ? 'page' : null"
        (click)="itemClick.emit(it)"
      >{{ it.label }}</cds-breadcrumb-item>
    </cds-breadcrumb>
  `,
})
export class DosCarbonBreadcrumbComponent {
  @Input() items: DosCarbonBreadcrumbItem[] = [];
  @Input() noTrailingSlash = false;
  @Input() skeleton = false;
  @Output() itemClick = new EventEmitter<DosCarbonBreadcrumbItem>();
}
