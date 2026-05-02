import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StructuredListModule } from 'carbon-components-angular';

export interface DosCarbonStructuredListRow {
  key: string;
  label: string;
  value?: string | null;
  chips?: string[];
}

/**
 * Carbon StructuredList wrapper used for label/value detail panes.
 * Pass either pre-built `rows` for simple key/value rendering, or use the
 * `customRow` slot for fully custom row content.
 */
@Component({
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
export class DosCarbonStructuredListComponent {
  @Input() rows: DosCarbonStructuredListRow[] = [];
}
