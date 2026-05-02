import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComboBoxModule } from 'carbon-components-angular';

export interface DosCarbonComboBoxItem {
  content: string;
  selected?: boolean;
  disabled?: boolean;
}

/**
 * Carbon-backed combo-box. Single-select dropdown with type-ahead filtering.
 */
@Component({
  selector: 'dos-carbon-combo-box',
  standalone: true,
  imports: [CommonModule, ComboBoxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-combo-box
      [label]="label"
      [helperText]="helperText"
      [placeholder]="placeholder"
      [size]="size"
      [theme]="theme"
      [disabled]="disabled"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [warn]="warn"
      [warnText]="warnText"
      [items]="items"
      [type]="type"
      (selected)="onSelected($event)"
      (search)="searched.emit($event)"
    ></cds-combo-box>
  `,
})
export class DosCarbonComboBoxComponent {
  @Input() label = '';
  @Input() helperText = '';
  @Input() placeholder = 'Select or type…';
  @Input() items: DosCarbonComboBoxItem[] = [];
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() disabled = false;
  @Input() skeleton = false;
  @Input() invalid = false;
  @Input() invalidText = '';
  @Input() warn = false;
  @Input() warnText = '';
  @Input() type: 'single' | 'multi' = 'single';

  @Output() selected = new EventEmitter<DosCarbonComboBoxItem | null>();
  @Output() searched = new EventEmitter<string>();

  onSelected(ev: { item: DosCarbonComboBoxItem | null }): void {
    this.selected.emit(ev?.item ?? null);
  }
}
