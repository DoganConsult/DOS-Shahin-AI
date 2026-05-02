import { Component, ChangeDetectionStrategy, inject, input, output, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@app/infrastructure';
import { ExceptionApiService } from '../services/exception-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-bulk-actions',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule],
  styles: [`
    .bulk-bar { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: var(--primary-50); border: 1px solid var(--primary-200); border-radius: var(--radius); margin-bottom: 12px; flex-wrap: wrap; }
    .bulk-count { font-size: var(--font-size-xs-plus); font-weight: 600; color: var(--primary-700); }
    .bulk-select { padding: 6px 10px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); font-size: var(--font-size-xs-plus); }
    .bulk-input { padding: 6px 10px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); font-size: var(--font-size-xs-plus); min-width: 200px; }
    .bulk-result { font-size: var(--font-size-sm); padding: 6px 10px; border-radius: var(--radius-sm); }
    .result-success { background: var(--green-50); color: var(--green-700); }
    .result-mixed { background: var(--yellow-50); color: var(--yellow-700); }
  `],
  template: `
    @if (selectedIds().length > 0) {
      <div class="bulk-bar">
        <span class="bulk-count">{{ selectedIds().length }} {{ isAr ? 'محددة' : 'selected' }}</span>
        <select class="bulk-select" [(ngModel)]="targetStatus">
          <option value="">{{ isAr ? 'اختر إجراء' : 'Select Action' }}</option>
          <option value="approved">{{ isAr ? 'موافقة' : 'Approve' }}</option>
          <option value="rejected">{{ isAr ? 'رفض' : 'Reject' }}</option>
        </select>
        @if (targetStatus === 'rejected') {
          <input class="bulk-input" [(ngModel)]="bulkReason" [placeholder]="isAr ? 'سبب الرفض' : 'Rejection reason'" />
        }
        <p-button [label]="isAr ? 'تنفيذ' : 'Apply'" icon="pi pi-check" size="small" [loading]="processing()" [disabled]="!targetStatus || (targetStatus === 'rejected' && !bulkReason)" (onClick)="execute()" />
        @if (resultMessage()) {
          <span class="bulk-result" [class.result-success]="!hasFailures()" [class.result-mixed]="hasFailures()">{{ resultMessage() }}</span>
        }
      </div>
    }
  `,
})
export class ExceptionBulkActionsComponent {
  private destroyRef = inject(DestroyRef);
  private api = inject(ExceptionApiService);
  private i18n = inject(I18nService);

  selectedIds = input.required<string[]>();
  completed = output<void>();

  processing = signal(false);
  resultMessage = signal('');
  hasFailures = signal(false);
  targetStatus = '';
  bulkReason = '';

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  execute(): void {
    if (!this.targetStatus) return;
    this.processing.set(true);
    this.resultMessage.set('');
    this.api.bulkTransition(this.selectedIds(), this.targetStatus, this.bulkReason || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => {
          this.processing.set(false);
          this.hasFailures.set(res.failed > 0);
          this.resultMessage.set(`${res.succeeded} succeeded, ${res.failed} failed`);
          this.targetStatus = '';
          this.bulkReason = '';
          this.completed.emit();
        },
        error: () => { this.processing.set(false); this.resultMessage.set('Bulk action failed'); },
      });
  }
}
