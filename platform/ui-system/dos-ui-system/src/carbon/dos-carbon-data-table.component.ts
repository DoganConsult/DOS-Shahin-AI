import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'carbon-components-angular';

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
  imports: [CommonModule, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table cdsTable [attr.data-size]="size" [attr.data-striped]="striped" [attr.data-sticky]="stickyHeader">
      <thead>
        <tr>
          @for (c of columns; track c.key) {
            <th
              cdsTableHead
              [style.width]="c.width"
              [style.text-align]="c.align ?? 'left'"
            >{{ c.header }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows; track $index) {
          <tr cdsTableRow (click)="rowClick.emit(row)">
            @for (c of columns; track c.key) {
              <td cdsTableData [style.text-align]="c.align ?? 'left'">
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
