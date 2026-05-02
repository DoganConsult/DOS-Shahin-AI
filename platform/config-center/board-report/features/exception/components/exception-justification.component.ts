import { Component, ChangeDetectionStrategy, inject, input, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@app/infrastructure';
import { ExceptionApiService, JustificationData } from '../services/exception-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-justification',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule],
  styles: [`
    .jst-section { padding: 16px 0; }
    .jst-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .jst-header h4 { margin: 0; font-size: var(--font-size-base); font-weight: 700; }
    .jst-view { display: flex; flex-direction: column; gap: 12px; }
    .jst-field { display: flex; flex-direction: column; gap: 4px; }
    .jst-label { font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: var(--text-color-secondary); }
    .jst-value { font-size: var(--font-size-xs-plus); white-space: pre-wrap; }
    .jst-form { display: flex; flex-direction: column; gap: 12px; }
    .jst-textarea { padding: 8px 10px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); font-size: var(--font-size-xs-plus); resize: vertical; font-family: inherit; }
    .jst-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .jst-meta { font-size: var(--font-size-2xs); color: var(--text-color-secondary); }
    .empty-text { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); padding: 24px; text-align: center; }
    .history-section { margin-top: 16px; border-top: 1px solid var(--surface-border); padding-top: 12px; }
    .history-item { padding: 8px 0; border-bottom: 1px solid var(--surface-50); font-size: var(--font-size-xs-plus); }
    .history-meta { font-size: var(--font-size-2xs); color: var(--text-color-secondary); }
  `],
  template: `
    <div class="jst-section">
      <div class="jst-header">
        <h4>{{ isAr ? 'المبرر والتأثير' : 'Justification & Impact' }}</h4>
        @if (!editing()) {
          <p-button icon="pi pi-pencil" [label]="isAr ? 'تعديل' : 'Edit'" size="small" [outlined]="true" (onClick)="startEdit()" />
        }
      </div>

      @if (loading()) {
        <p class="empty-text">{{ isAr ? 'جارٍ التحميل...' : 'Loading...' }}</p>
      } @else if (editing()) {
        <div class="jst-form">
          <div class="jst-field">
            <label class="jst-label">{{ isAr ? 'المبرر التجاري' : 'Business Justification' }}</label>
            <textarea class="jst-textarea" rows="4" [(ngModel)]="editForm.businessJustification" [maxlength]="10000"></textarea>
          </div>
          <div class="jst-field">
            <label class="jst-label">{{ isAr ? 'بيان قبول المخاطر' : 'Risk Acceptance Statement' }}</label>
            <textarea class="jst-textarea" rows="3" [(ngModel)]="editForm.riskAcceptanceStatement"></textarea>
          </div>
          <div class="jst-field">
            <label class="jst-label">{{ isAr ? 'تحليل الأثر' : 'Impact Analysis' }}</label>
            <textarea class="jst-textarea" rows="3" [(ngModel)]="editForm.impactAnalysis" [maxlength]="10000"></textarea>
          </div>
          <div class="jst-field">
            <label class="jst-label">{{ isAr ? 'البدائل المدروسة' : 'Alternatives Considered' }}</label>
            <textarea class="jst-textarea" rows="2" [(ngModel)]="alternativesText" [placeholder]="isAr ? 'سطر واحد لكل بديل' : 'One per line'"></textarea>
          </div>
          <div class="jst-actions">
            <p-button [label]="isAr ? 'إلغاء' : 'Cancel'" severity="secondary" [outlined]="true" size="small" (onClick)="cancelEdit()" />
            <p-button [label]="isAr ? 'حفظ' : 'Save'" icon="pi pi-check" size="small" [loading]="saving()" (onClick)="save()" [disabled]="!editForm.businessJustification" />
          </div>
        </div>
      } @else if (!justification()) {
        <p class="empty-text">{{ isAr ? 'لم يتم تقديم مبرر بعد' : 'No justification provided yet' }}</p>
      } @else {
        <div class="jst-view">
          <div class="jst-field"><span class="jst-label">{{ isAr ? 'المبرر التجاري' : 'Business Justification' }}</span><span class="jst-value">{{ justification()!.businessJustification }}</span></div>
          @if (justification()!.riskAcceptanceStatement) {
            <div class="jst-field"><span class="jst-label">{{ isAr ? 'بيان قبول المخاطر' : 'Risk Acceptance Statement' }}</span><span class="jst-value">{{ justification()!.riskAcceptanceStatement }}</span></div>
          }
          @if (justification()!.impactAnalysis) {
            <div class="jst-field"><span class="jst-label">{{ isAr ? 'تحليل الأثر' : 'Impact Analysis' }}</span><span class="jst-value">{{ justification()!.impactAnalysis }}</span></div>
          }
          @if (justification()!.alternativesConsidered?.length) {
            <div class="jst-field">
              <span class="jst-label">{{ isAr ? 'البدائل المدروسة' : 'Alternatives Considered' }}</span>
              <ul style="margin:0;padding-inline-start:16px;">
                @for (alt of justification()!.alternativesConsidered!; track alt) { <li style="font-size:0.8125rem">{{ alt }}</li> }
              </ul>
            </div>
          }
          <div class="jst-meta">{{ isAr ? 'بواسطة' : 'By' }}: {{ justification()!.justifiedBy }} · {{ justification()!.justifiedAt | date:'medium' }}</div>
        </div>
      }

      @if (historyItems().length > 0) {
        <div class="history-section">
          <h4 style="font-size:0.8125rem;font-weight:700;margin:0 0 8px">{{ isAr ? 'سجل التعديلات' : 'Change History' }}</h4>
          @for (h of historyItems(); track $index) {
            <div class="history-item">
              <div>{{ h.businessJustification }}</div>
              <div class="history-meta">{{ h.justifiedBy }} · {{ h.justifiedAt | date:'medium' }}</div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ExceptionJustificationComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(ExceptionApiService);
  private i18n = inject(I18nService);

  exceptionId = input.required<string>();

  loading = signal(true);
  saving = signal(false);
  editing = signal(false);
  justification = signal<JustificationData | null>(null);
  historyItems = signal<any[]>([]);
  editForm = { businessJustification: '', riskAcceptanceStatement: '', impactAnalysis: '' };
  alternativesText = '';

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getJustification(this.exceptionId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => { this.justification.set(res?.data?.justification || null); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.getJustificationHistory(this.exceptionId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => this.historyItems.set(res?.data?.history || []),
      error: () => {},
    });
  }

  startEdit(): void {
    const j = this.justification();
    this.editForm = { businessJustification: j?.businessJustification || '', riskAcceptanceStatement: j?.riskAcceptanceStatement || '', impactAnalysis: j?.impactAnalysis || '' };
    this.alternativesText = (j?.alternativesConsidered || []).join('\n');
    this.editing.set(true);
  }

  cancelEdit(): void { this.editing.set(false); }

  save(): void {
    this.saving.set(true);
    const alts = this.alternativesText.split('\n').map(s => s.trim()).filter(Boolean);
    this.api.updateJustification(this.exceptionId(), { ...this.editForm, alternativesConsidered: alts })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.saving.set(false); this.editing.set(false); this.load(); },
        error: () => this.saving.set(false),
      });
  }
}
