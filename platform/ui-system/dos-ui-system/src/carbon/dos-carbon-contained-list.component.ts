import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContainedListModule } from 'carbon-components-angular';

export interface DosCarbonContainedListItem {
  id?: string;
  content: string;
  disabled?: boolean;
}

/**
 * Carbon-backed contained list. Three kinds (on-page / disclosed / pageable).
 */
@Component({
  selector: 'dos-carbon-contained-list',
  standalone: true,
  imports: [CommonModule, ContainedListModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-contained-list
      [label]="label"
      [size]="size"
      [kind]="kind"
      [action]="action"
      [isInset]="isInset"
    >
      <cds-contained-list-item
        *ngFor="let item of items"
        [disabled]="item.disabled || false"
        (clicked)="itemClick.emit(item)"
      >{{ item.content }}</cds-contained-list-item>
    </cds-contained-list>
  `,
})
export class DosCarbonContainedListComponent {
  @Input() label = '';
  @Input() items: DosCarbonContainedListItem[] = [];
  @Input() kind: 'on-page' | 'disclosed' = 'on-page';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() action: 'expand' | 'select' | null = null;
  @Input() isInset = false;
  @Output() itemClick = new EventEmitter<DosCarbonContainedListItem>();
}
