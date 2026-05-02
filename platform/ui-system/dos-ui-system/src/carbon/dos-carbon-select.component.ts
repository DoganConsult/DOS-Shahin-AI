import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownModule } from 'carbon-components-angular';

export interface DosCarbonSelectOption {
  content: string;
  value: string | number;
  disabled?: boolean;
  selected?: boolean;
}

@Component({
  selector: 'dos-carbon-select',
  standalone: true,
  imports: [CommonModule, DropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-dropdown
      [label]="label"
      [helperText]="helperText"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [disabled]="disabled"
      (selected)="onSelected($event)"
    >
      <cds-dropdown-list [items]="options"></cds-dropdown-list>
    </cds-dropdown>
  `,
})
export class DosCarbonSelectComponent {
  @Input() label = '';
  @Input() helperText = '';
  @Input() invalid = false;
  @Input() invalidText = '';
  @Input() disabled = false;
  @Input() options: DosCarbonSelectOption[] = [];
  @Output() selectedChange = new EventEmitter<string | number | null>();

  onSelected(ev: { item?: DosCarbonSelectOption } | null): void {
    this.selectedChange.emit(ev?.item?.value ?? null);
  }
}
