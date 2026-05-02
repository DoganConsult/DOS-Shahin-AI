import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RecordSummaryHeaderComponent } from '@app/shared/components/entity/record-summary-header.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, TabViewModule, RecordSummaryHeaderComponent,
    ExceptionCompensatingControlsComponent, ExceptionRiskLinksComponent, ExceptionTimelineComponent,
    ExceptionJustificationComponent, ExceptionApprovalHistoryComponent],
  template: `
    <div class="exception-detail">
      <app-record-summary-header
        [title]="record().title"
        [recordCode]="record().code"
        icon="pi-ban"
        [accentColor]="'var(--module-accent-amber)'"
        [accentBg]="'rgba(var(--warning-rgb), 0.08)'"
        [status]="record().status"
        [owner]="record().owner"
        [dueDate]="record().expiryDate"
        [isOverdue]="record().isOverdue"
        (aiAction)="onAiAction()" />

      <p-tabView>
        <p-tabPanel [header]="isAr ? 'نظرة عامة' : 'Overview'">
          <div class="detail-grid">
            <div class="detail-section">
              <h3>{{ isAr ? 'التفاصيل' : 'Details' }}</h3>
              <div class="detail-row"><span class="detail-label">{{ isAr ? 'السياسة' : 'Policy' }}</span><span>{{ record().policy }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ isAr ? 'مستوى المخاطر' : 'Risk Level' }}</span><p-tag [value]="record().riskLevel" /></div>
              <div class="detail-row"><span class="detail-label">{{ isAr ? 'النوع' : 'Type' }}</span><span>{{ record().exceptionType || '—' }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ isAr ? 'الضابط المربوط' : 'Control Ref' }}</span><span>{{ record().controlRef || '—' }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ isAr ? 'تاريخ السريان' : 'Effective From' }}</span><span>{{ record().effectiveFrom ? (record().effectiveFrom | date:'mediumDate') : '—' }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ isAr ? 'تاريخ الانتهاء' : 'Expires' }}</span><span>{{ record().expiryDate ? (record().expiryDate | date:'mediumDate') : '—' }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ isAr ? 'مقدم الطلب' : 'Requester' }}</span><span>{{ record().requesterName || '—' }}</span></div>
            </div>
          </div>
        </p-tabPanel>

        <p-tabPanel [header]="isAr ? 'المبرر' : 'Justification'">
          @if (exceptionId()) { <app-exception-justification [exceptionId]="exceptionId()" /> }
        </p-tabPanel>

        <p-tabPanel [header]="isAr ? 'الضوابط التعويضية' : 'Compensating Controls'">
          @if (exceptionId()) { <app-exception-compensating-controls [exceptionId]="exceptionId()" /> }
        </p-tabPanel>

        <p-tabPanel [header]="isAr ? 'ربط المخاطر' : 'Risk Links'">
          @if (exceptionId()) { <app-exception-risk-links [exceptionId]="exceptionId()" /> }
        </p-tabPanel>

        <p-tabPanel [header]="isAr ? 'سجل الموافقات' : 'Approvals'">
          @if (exceptionId()) { <app-exception-approval-history [exceptionId]="exceptionId()" /> }
        </p-tabPanel>

        <p-tabPanel [header]="isAr ? 'سجل التدقيق' : 'Audit Trail'">
          @if (exceptionId()) { <app-exception-timeline [exceptionId]="exceptionId()" /> }
        </p-tabPanel>
      </p-tabView>
    </div>
  `,
  styles: [`
    .exception-detail { min-height: 100vh; background: var(--surface-ground); }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px; }
    .detail-section h3 { margin: 0 0 12px; font-size: var(--font-size-base); font-weight: 700; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--surface-border); font-size: var(--font-size-base); }
    .detail-label { font-weight: 600; color: var(--text-muted); }
    @media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }
  `],
})
export class ExceptionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private api = inject(ExceptionApiService);
  private i18n = inject(I18nService);

  exceptionId = signal('');
  record = signal<any>({ code: '', title: '', status: 'draft', owner: '', expiryDate: '', isOverdue: false, policy: '', riskLevel: 'medium', justification: '', compensatingControls: '', exceptionType: '', controlRef: '', effectiveFrom: '', requesterName: '' });

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.exceptionId.set(id);
    this.api.get(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (dto: any) => {
        const data = dto?.data || dto;
        this.record.set({
          code: data.exceptionId || `EXC-${id}`,
          title: data.title || `Exception ${id}`,
          status: data.status || 'draft',
          owner: data.requestedBy || data.requesterName || '',
          expiryDate: data.expiryDate || data.effectiveTo || '',
          isOverdue: data.effectiveTo ? new Date(data.effectiveTo).getTime() < Date.now() : false,
          policy: data.linkedPolicyId || data.policyRef || '',
          riskLevel: data.riskLevel || 'medium',
          justification: data.justification || '',
          compensatingControls: data.compensatingControls || '',
          exceptionType: data.exceptionType || '',
          controlRef: data.linkedControlId || data.controlRef || '',
          effectiveFrom: data.effectiveDate || data.effectiveFrom || '',
          requesterName: data.requesterName || data.requestedBy || '',
        });
      },
      error: () => { this.record.set({ ...this.record(), code: `EXC-${id}`, title: `Exception ${id}` }); },
    });
  }

  onAiAction(): void {}
}
