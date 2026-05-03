import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosCarbonTableColumn {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export type DosCarbonTableSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Carbon-backed data table wrapper. Use grid wrappers from
 * @dos/ui-system over this for app-level grids — this component is the
 * single primitive that owns Carbon's `cdsTable` markup and styles.
 */
@Component({
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
export class DosCarbonDataTableComponent {
  @Input() columns: DosCarbonTableColumn[] = [];
  @Input() rows: Array<Record<string, unknown>> = [];
  @Input() size: DosCarbonTableSize = 'md';
  @Input() striped = false;
  @Input() stickyHeader = false;
  @Input() emptyText = 'No data';
  @Output() rowClick = new EventEmitter<Record<string, unknown>>();
}
