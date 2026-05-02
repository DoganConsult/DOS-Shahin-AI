import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownModule } from 'carbon-components-angular';

export interface DosCarbonDropdownItem {
  content: string;
  selected?: boolean;
  disabled?: boolean;
}

/**
 * Carbon-backed single-select dropdown. For multi-select use
 * `dos-carbon-multi-select`.
 */
@Component({
  selector: 'dos-carbon-dropdown',
  standalone: true,
  imports: [CommonModule, DropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-dropdown
      [label]="label"
      [helperText]="helperText"
      [placeholder]="placeholder"
      [size]="size"
      [disabled]="disabled"
      [skeleton]="skeleton"
      [readonly]="readonly"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [warn]="warn"
      [warnText]="warnText"
      [type]="type"
      (selected)="onSelected($event)"
    >
      <cds-dropdown-list [items]="items"></cds-dropdown-list>
    </cds-dropdown>
  `,
})
export class DosCarbonDropdownComponent {
  @Input() label = '';
  @Input() helperText = '';
  @Input() placeholder = 'Select…';
  @Input() items: DosCarbonDropdownItem[] = [];
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() skeleton = false;
  @Input() invalid = false;
  @Input() invalidText = '';
  @Input() warn = false;
  @Input() warnText = '';
  @Input() type: 'single' | 'multi' = 'single';

  @Output() selected = new EventEmitter<DosCarbonDropdownItem | null>();

  onSelected(ev: { item: DosCarbonDropdownItem | DosCarbonDropdownItem[] | null }): void {
    const item = Array.isArray(ev?.item) ? ev.item[0] : ev?.item;
    this.selected.emit(item ?? null);
  }
}
