import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputModule } from 'carbon-components-angular';

let __dosCarbonTextSeq = 0;

@Component({
  selector: 'dos-carbon-text-input',
  standalone: true,
  imports: [CommonModule, InputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-text-label
      [helperText]="helperText"
      [invalid]="invalid"
      [invalidText]="invalidText"
    >
      {{ label }}
      <input
        cdsText
        [theme]="theme"
        [size]="size"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [readonly]="readonly"
        [attr.name]="name || null"
        [attr.id]="fieldId"
        [attr.autocomplete]="autocomplete"
        [attr.inputmode]="inputmode"
        [attr.type]="type"
        [value]="value"
        (input)="onInput($event)"
        (blur)="blurred.emit()"
      />
    </cds-text-label>
  `,
})
export class DosCarbonTextInputComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() placeholder = '';
  @Input() helperText = '';
  @Input() invalid = false;
  @Input() invalidText = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() name = '';
  @Input() id = '';
  @Input() autocomplete: string | null = null;
  @Input() inputmode: string | null = null;
  @Input() type: 'text' | 'email' | 'tel' | 'url' | 'search' = 'text';
  @Output() valueChange = new EventEmitter<string>();
  @Output() blurred = new EventEmitter<void>();
  private readonly _autoId = `dos-carbon-text-${++__dosCarbonTextSeq}`;
  get fieldId(): string {
    return this.id || this.name || this._autoId;
  }

  onInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.value = v;
    this.valueChange.emit(v);
  }
}
