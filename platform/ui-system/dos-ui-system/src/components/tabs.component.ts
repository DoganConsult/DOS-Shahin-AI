import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosCarbonTabsComponent, DosCarbonTabItem } from '../carbon/dos-carbon-tabs.component';

/**
 * DosTabs — tabbed navigation.
 * Refined to use Carbon Tabs policies.
 */
@Component({
  selector: 'dos-tabs',
  standalone: true,
  imports: [CommonModule, DosCarbonTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-carbon-tabs
      [items]="items"
      [selectedId]="selectedId"
      (selectedIdChange)="select($event)"
    >
      <ng-content></ng-content>
    </dos-carbon-tabs>
  `,
})
export class DosTabsComponent {
  @Input() items: DosCarbonTabItem[] = [];
  @Input() selectedId = '';
  @Output() selectedIdChange = new EventEmitter<string>();

  select(id: string): void {
    this.selectedId = id;
    this.selectedIdChange.emit(id);
  }
}
