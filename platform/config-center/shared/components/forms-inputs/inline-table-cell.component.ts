import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewChecked, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';

export interface InlineCellSavedEvent {
  field: string;
  value: string | number | boolean | null;
  previousValue: string | number | boolean | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-inline-table-cell',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, DropdownModule],
  template: `
    <div class="inline-cell" (dblclick)="startEdit()">
      <span *ngIf="!editing" class="cell-display">{{ displayValue }}</span>
      <span *ngIf="editing && type === 'text'" class="cell-edit">
        <input #inputRef pInputText [(ngModel)]="editValue"
               (keydown.enter)="save($event)"
               (keydown.escape)="cancel()" />
      </span>
      <span *ngIf="editing && type === 'select'" class="cell-edit">
        <p-dropdown #dropdownRef [(ngModel)]="editValue" [options]="options"
                    optionLabel="label" optionValue="value" [style]="{ minWidth: '140px' }"
                    (onChange)="saveFromSelect()"
                    (keydown.escape)="cancel()" />
      </span>
    </div>
  `,
  styles: [`
    .inline-cell { min-height: 1.5rem; cursor: text; }
    .cell-display { display: block; padding: 2px 4px; }
    .cell-edit { display: block; }
    .cell-edit input { width: 100%; }
  `],
})
export class InlineTableCellComponent implements AfterViewChecked {
  @Input() value: string | number | boolean | null = '';
  @Input() field = '';
  @Input() type: 'text' | 'select' = 'text';
  @Input() options: { label: string; value: string | number }[] = [];
  @Output() saved = new EventEmitter<InlineCellSavedEvent>();

  @ViewChild('inputRef') inputRef?: ElementRef<HTMLInputElement>;

  editing = false;
  editValue: string | number | boolean | null = '';
  private previousValue: string | number | boolean | null = '';
  private focusRequested = false;

  get displayValue(): string {
    if (this.type === 'select' && this.options?.length) {
      const opt = this.options.find(o => o.value === this.value || o.value === String(this.value));
      return opt?.label ?? String(this.value ?? '');
    }
    return this.value != null ? String(this.value) : '';
  }

  ngAfterViewChecked(): void {
    if (this.focusRequested && this.inputRef?.nativeElement) {
      this.focusRequested = false;
      this.inputRef.nativeElement.focus();
    }
  }

  startEdit(): void {
    if (this.editing) return;
    this.previousValue = this.value;
    this.editValue = this.type === 'select' ? this.value : (this.value ?? '');
    this.editing = true;
    this.focusRequested = true;
  }

  save(event?: Event): void {
    event?.preventDefault();
    if (!this.editing) return;
    const val = this.type === 'text' ? String(this.editValue ?? '').trim() : this.editValue;
    this.editing = false;
    this.saved.emit({ field: this.field, value: val, previousValue: this.previousValue });
  }

  saveFromSelect(): void {
    if (!this.editing) return;
    this.editing = false;
    this.saved.emit({ field: this.field, value: this.editValue, previousValue: this.previousValue });
  }

  cancel(): void {
    if (!this.editing) return;
    this.editValue = this.previousValue;
    this.editing = false;
  }
}
