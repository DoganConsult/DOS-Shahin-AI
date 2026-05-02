import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { CalendarModule } from 'primeng/datepicker';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import type { ModuleFilterDefinition } from '../../contracts/module-shell-definition';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-canonical-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DropdownModule, MultiSelectModule, CalendarModule, InputSwitchModule, InputTextModule],
  template: `
    <div class="canonical-filter-bar" [class.cfb--collapsed]="collapsed">
      <div class="cfb-header">
        <span class="cfb-title">{{ isAr ? 'تصفية' : 'Filters' }}</span>
        <button pButton icon="pi pi-times" [rounded]="true" [text]="true" size="small"
                (click)="collapsed = !collapsed" [attr.aria-label]="'Toggle filters'"></button>
      </div>
      <div class="cfb-body" *ngIf="!collapsed">
        <div *ngFor="let f of filters" class="cfb-field">
          <label class="cfb-label">{{ isAr ? f.labelAr : f.labelEn }}</label>
          <ng-container [ngSwitch]="f.type">
            <p-multiSelect *ngSwitchCase="'multiselect'"
                           [options]="getOptions(f)" optionLabel="label" optionValue="value"
                           [ngModel]="values[f.id]" (ngModelChange)="onValueChange(f.id, $event)"
                           [placeholder]="isAr ? 'اختر...' : 'Select...'" styleClass="w-full" />
            <p-dropdown *ngSwitchCase="'select'"
                        [options]="getOptions(f)" optionLabel="label" optionValue="value"
                        [ngModel]="values[f.id]" (ngModelChange)="onValueChange(f.id, $event)"
                        [placeholder]="isAr ? 'اختر...' : 'Select...'" styleClass="w-full" />
            <p-calendar *ngSwitchCase="'date-range'" selectionMode="range"
                        [ngModel]="values[f.id]" (ngModelChange)="onValueChange(f.id, $event)"
                        styleClass="w-full" />
            <p-inputSwitch *ngSwitchCase="'toggle'"
                           [ngModel]="values[f.id]" (ngModelChange)="onValueChange(f.id, $event)" />
            <input *ngSwitchCase="'search'" pInputText type="text"
                   [ngModel]="values[f.id]" (ngModelChange)="onValueChange(f.id, $event)"
                   [placeholder]="isAr ? 'بحث...' : 'Search...'" class="w-full" />
          </ng-container>
        </div>
        <div class="cfb-actions">
          <button pButton [label]="isAr ? 'تطبيق' : 'Apply'" size="small" (click)="apply.emit(values)"></button>
          <button pButton [label]="isAr ? 'مسح' : 'Clear'" size="small" severity="secondary" [outlined]="true"
                  (click)="clearAll()"></button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .canonical-filter-bar { display: flex; flex-direction: column; width: var(--shell-filter-width, 280px); border-inline-end: 1px solid var(--surface-border, #e5e7eb); background: var(--surface-card, #fff); }
    .cfb-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--surface-border, #e5e7eb); }
    .cfb-title { font-weight: 700; font-size: var(--font-size-base); }
    .cfb-body { padding: 12px 16px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .cfb-field { display: flex; flex-direction: column; gap: 4px; }
    .cfb-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; }
    .cfb-actions { display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid var(--surface-border, #e5e7eb); }
    .cfb--collapsed { width: 40px; }
    .cfb--collapsed .cfb-header { padding: 12px 8px; justify-content: center; }
    .cfb--collapsed .cfb-title { display: none; }
  `],
})
export class CanonicalFilterBarComponent {
  private i18n = inject(I18nService);

  @Input() filters: ModuleFilterDefinition[] = [];
  @Input() values: Record<string, any> = {};
  @Output() apply = new EventEmitter<Record<string, any>>();
  @Output() clear = new EventEmitter<void>();

  collapsed = false;

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  getOptions(f: ModuleFilterDefinition): Array<{ label: string; value: string }> {
    return (f.options ?? []).map(o => ({
      label: this.isAr ? o.labelAr : o.labelEn,
      value: o.value,
    }));
  }

  onValueChange(id: string, value: any): void {
    this.values = { ...this.values, [id]: value };
  }

  clearAll(): void {
    this.values = {};
    this.clear.emit();
  }
}
