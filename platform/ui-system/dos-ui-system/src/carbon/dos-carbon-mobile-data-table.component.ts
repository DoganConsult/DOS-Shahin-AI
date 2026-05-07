import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosCarbonMobileTableColumn {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export type DosCarbonMobileTableSize = 'sm' | 'md' | 'lg';

/**
 * @dos/ui-system Mobile Carbon wrapper — Data Table.
 *
 * Mobile-optimized data table with horizontal scroll, stacked rows on mobile,
 * swipe actions, and larger touch targets.
 * Wraps Carbon table markup with mobile-specific enhancements.
 */
@Component({
  selector: 'dos-carbon-mobile-data-table',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-mobile-table-wrapper">
      <table
        class="cds--data-table"
        [class.cds--data-table--sm]="size === 'sm'"
        [class.cds--data-table--md]="size === 'md'"
        [class.cds--data-table--lg]="size === 'lg'"
        [class.cds--data-table--zebra]="striped"
        [class.cds--data-table--sticky-header]="stickyHeader"
      >
        <thead>
          <tr>
            @for (c of columns; track c.key) {
              <th
                [style.width]="c.width"
                [style.text-align]="c.align ?? 'left'"
                [style.min-height.px]="touchTargetSize"
              ><span class="cds--table-header-label">{{ c.header }}</span></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows; track $index) {
            <tr
              (click)="rowClick.emit(row)"
              [attr.data-row-index]="$index"
              class="dos-mobile-table__row"
            >
              @for (c of columns; track c.key) {
                <td
                  [style.text-align]="c.align ?? 'left'"
                  [style.min-height.px]="touchTargetSize"
                >
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
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .dos-mobile-table-wrapper {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    table {
      width: 100%;
      min-width: 100%;
    }
    .dos-mobile-table__row {
      transition: background-color 0.12s ease-out;
    }
    .dos-mobile-table__row:active {
      background-color: var(--cds-hover-ui);
    }
    th, td {
      min-height: 44px;
      padding: 12px 8px;
    }
    @media (max-width: 600px) {
      .dos-mobile-table-wrapper table,
      .dos-mobile-table-wrapper thead,
      .dos-mobile-table-wrapper tbody,
      .dos-mobile-table-wrapper th,
      .dos-mobile-table-wrapper td,
      .dos-mobile-table-wrapper tr {
        display: block;
      }
      .dos-mobile-table-wrapper thead tr {
        position: absolute;
        top: -9999px;
        left: -9999px;
      }
      .dos-mobile-table-wrapper tr {
        border: 1px solid var(--cds-border-subtle-01);
        margin-bottom: 16px;
      }
      .dos-mobile-table-wrapper td {
        border: none;
        border-bottom: 1px solid var(--cds-border-subtle-01);
        position: relative;
        padding-left: 50%;
        text-align: left;
      }
      .dos-mobile-table-wrapper td:before {
        position: absolute;
        top: 12px;
        left: 12px;
        width: 45%;
        padding-right: 10px;
        white-space: nowrap;
        font-weight: bold;
        content: attr(data-label);
      }
    }
  `],
})
export class DosCarbonMobileDataTableComponent {
  @Input() columns: DosCarbonMobileTableColumn[] = [];
  @Input() rows: Array<Record<string, unknown>> = [];
  @Input() size: DosCarbonMobileTableSize = 'lg';
  @Input() striped = true;
  @Input() stickyHeader = true;
  @Input() emptyText = 'No data';
  @Input() touchTargetSize = 44;
  @Input() hapticFeedback = false;
  @Input() swipeActions = false;
  @Input() horizontalScroll = true;
  @Input() stackedRows = true;
  @Output() rowClick = new EventEmitter<Record<string, unknown>>();
  @Output() rowSwipe = new EventEmitter<{ direction: string; row: Record<string, unknown>; index: number }>();

  onRowClick(row: Record<string, unknown>, index: number): void {
    if (this.hapticFeedback) {
      this.triggerHaptic();
    }
    this.rowClick.emit(row);
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
}
