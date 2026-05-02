import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownModule } from 'carbon-components-angular';

export interface DosCarbonMultiSelectItem {
  content: string;
  selected?: boolean;
  disabled?: boolean;
}

/**
 * Carbon-backed multi-select. Renders a dropdown with checkboxes.
 */
@Component({
  selector: 'dos-carbon-multi-select',
  standalone: true,
  imports: [CommonModule, DropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-dropdown
      [label]="label"
      [helperText]="helperText"
      [placeholder]="placeholder"
      [size]="size"
      [theme]="theme"
      [disabled]="disabled"
      [skeleton]="skeleton"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [type]="'multi'"
      (selected)="onSelected($event)"
    >
      <cds-dropdown-list [items]="items"></cds-dropdown-list>
    </cds-dropdown>
  `,
})
export class DosCarbonMultiSelectComponent {
  @Input() label = '';
  @Input() helperText = '';
  @Input() placeholder = 'Select…';
  @Input() items: DosCarbonMultiSelectItem[] = [];
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() disabled = false;
  @Input() skeleton = false;
  @Input() invalid = false;
  @Input() invalidText = '';

  @Output() selected = new EventEmitter<DosCarbonMultiSelectItem[]>();

  onSelected(ev: { item: DosCarbonMultiSelectItem | DosCarbonMultiSelectItem[] | null }): void {
    const arr = Array.isArray(ev?.item) ? ev.item : (ev?.item ? [ev.item] : []);
    this.selected.emit(arr);
  }
}
