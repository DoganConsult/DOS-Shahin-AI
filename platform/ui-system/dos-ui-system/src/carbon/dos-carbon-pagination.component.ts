import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginationModule } from 'carbon-components-angular';

/**
 * Carbon-backed pagination control. Use with smart-grid surfaces.
 */
@Component({
  selector: 'dos-carbon-pagination',
  standalone: true,
  imports: [CommonModule, PaginationModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-pagination
      [model]="{
        currentPage: currentPage,
        pageLength: pageLength,
        totalDataLength: totalDataLength
      }"
      [pageInputDisabled]="pageInputDisabled"
      [pagesUnknown]="pagesUnknown"
      [skeleton]="skeleton"
      [itemsPerPageOptions]="pageOptions"
      (selectPage)="pageChange.emit($event)"
    ></cds-pagination>
  `,
})
export class DosCarbonPaginationComponent {
  @Input() currentPage = 1;
  @Input() pageLength = 10;
  @Input() totalDataLength = 0;
  @Input() pageInputDisabled = false;
  @Input() pagesUnknown = false;
  @Input() skeleton = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() pageOptions: number[] = [10, 20, 30, 50, 100];
  @Output() pageChange = new EventEmitter<number>();
}
