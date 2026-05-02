import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'carbon-components-angular';

export interface DosCarbonTabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'dos-carbon-tabs',
  standalone: true,
  imports: [CommonModule, TabsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-tabs (selected)="onSelected($event)">
      @for (t of items; track t.id) {
        <cds-tab
          [heading]="t.label"
          [disabled]="!!t.disabled"
          [active]="t.id === selectedId"
        >
          @if (t.id === selectedId) {
            <ng-content></ng-content>
          }
        </cds-tab>
      }
    </cds-tabs>
  `,
})
export class DosCarbonTabsComponent {
  @Input() items: DosCarbonTabItem[] = [];
  @Input() selectedId = '';
  @Output() selectedIdChange = new EventEmitter<string>();

  onSelected(idx: number): void {
    const item = this.items[idx];
    if (!item || item.disabled) return;
    this.selectedId = item.id;
    this.selectedIdChange.emit(item.id);
  }
}
