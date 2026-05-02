import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchModule } from 'carbon-components-angular';

/**
 * Carbon-backed search input. Carbon's `cds-search` exposes:
 *   theme/size/disabled/toolbar/expandable/skeleton/active/tableSearch/
 *   name/id/required/value/autocomplete/label/placeholder/clearButtonTitle/
 *   searchTitle/ariaLabel/fluid
 */
@Component({
  selector: 'dos-carbon-search',
  standalone: true,
  imports: [CommonModule, SearchModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-search
      [size]="size"
      [theme]="theme"
      [placeholder]="placeholder"
      [label]="label"
      [disabled]="disabled"
      [skeleton]="skeleton"
      [autocomplete]="autocomplete"
      [name]="name"
      [value]="value"
      [toolbar]="toolbar"
      [expandable]="expandable"
      (valueChange)="onChange($event)"
      (clear)="cleared.emit()"
    ></cds-search>
  `,
})
export class DosCarbonSearchComponent {
  @Input() label = 'Search';
  @Input() placeholder = '';
  @Input() value = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() disabled = false;
  @Input() skeleton = false;
  @Input() autocomplete: 'on' | 'off' = 'off';
  @Input() name = '';
  @Input() toolbar = false;
  @Input() expandable = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() cleared = new EventEmitter<void>();

  onChange(value: string): void {
    this.value = value;
    this.valueChange.emit(value);
  }
}
