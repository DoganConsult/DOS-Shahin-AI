import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AuditApiService } from '../../services/audit-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audit-qa-reviews',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent,
    ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, InputTextarea,
    DropdownModule, CalendarModule, TagModule, TooltipModule],
  providers: [MessageService],
  template: `
    <app-page-shell icon="check-square"
      [title]="i18n.translate('audit.qaReviews')"
      [subtitle]="i18n.translate('audit.reviewAndApproveAuditFindings')"
      [loading]="loading()">
      <p-toast />

      <!-- Health Strip -->
      <div class="health-strip">
        <div class="health-card"><span class="health-value">{{ items().length }}</span><span class="health-label">{{ i18n.translate('audit.total') }}</span></div>
        <div class="health-card"><span class="health-value medium">{{ pendingCount }}</span><span class="health-label">{{ i18n.translate('audit.pending') }}</span></div>
        <div class="health-card"><span class="health-value low">{{ approvedCount }}</span><span class="health-label">{{ i18n.translate('audit.approved') }}</span></div>
        <div class="health-card"><span class="health-value high">{{ rejectedCount }}</span><span class="health-label">{{ i18n.translate('audit.rejected') }}</span></div>
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="auditOptions()" [(ngModel)]="selectedAuditId"
            [placeholder]="i18n.translate('audit.selectAuditEngagement')" optionLabel="label" optionValue="value"
            (onChange)="load()" styleClass="mr-2" />
          <p-dropdown [options]="statusOptions" [(ngModel)]="statusFilter" [placeholder]="i18n.translate('audit.status')"
            [showClear]="true" (onChange)="filter()" styleClass="mr-2" />
          <p-button [label]="i18n.translate('audit.pendingOnly')" icon="pi pi-filter" severity="warning" [text]="true" (onClick)="loadPending()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('audit.newReview')" icon="pi pi-plus" (onClick)="openDialog()" [disabled]="!selectedAuditId" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="filtered()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('audit.reviewType') }}</th>
            <th>{{ i18n.translate('audit.findingId') }}</th>
            <th>{{ i18n.translate('audit.reviewer') }}</th>
            <th>{{ i18n.translate('audit.status') }}</th>
            <th>{{ i18n.translate('audit.comments') }}</th>
            <th pSortableColumn="created_at">{{ i18n.translate('audit.created') }} <p-sortIcon field="created_at" /></th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td><app-status-badge [status]="e.review_type" /></td>
            <td class="font-semibold">{{ e.finding_id || '—' }}</td>
            <td>{{ e.reviewer_id || e.reviewer || '—' }}</td>
            <td><app-status-badge [status]="e.status" /></td>
            <td>{{ e.comments || '—' }}</td>
            <td>{{ e.created_at | appDate:'medium' }}</td>
            <td>
              <p-button icon="pi pi-check" [text]="true" severity="success" pTooltip="Approve"
                *ngIf="e.status === 'pending'" (onClick)="approveReview(e.id)" />
              <p-button icon="pi pi-times" [text]="true" severity="danger" pTooltip="Reject"
                *ngIf="e.status === 'pending'" (onClick)="openRejectDialog(e.id)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noQaReviewsYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- New Review Dialog -->
      <p-dialog [header]="i18n.translate('audit.newQaReview')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '480px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.reviewType') }} *</label>
            <p-dropdown [options]="reviewTypeOptions" [(ngModel)]="form.review_type" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.findingId') }}</label><input pInputText [(ngModel)]="form.finding_id" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.reviewerId') }} *</label><input pInputText [(ngModel)]="form.reviewer_id" class="w-full" /></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18n.translate('audit.create')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.review_type || !form.reviewer_id" />
        </ng-template>
      </p-dialog>

      <!-- Reject Dialog (with comments) -->
      <p-dialog [header]="i18n.translate('audit.rejectReview')"
        [(visible)]="rejectDialogVisible" [modal]="true" [style]="{ width: '440px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.rejectionComments') }} *</label>
            <textarea pInputTextarea [(ngModel)]="rejectComments" [rows]="3" class="w-full"></textarea></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="rejectDialogVisible = false" />
          <p-button [label]="i18n.translate('audit.reject')" icon="pi pi-times" severity="danger" (onClick)="confirmReject()" [disabled]="!rejectComments" />
        </ng-template>
      </p-dialog>

      <!-- Cross-Module Navigation -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="router.navigate(['/audit/engagements'])"><i class="pi pi-briefcase"></i> Engagements</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/findings'])"><i class="pi pi-search"></i> Findings</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/working-papers'])"><i class="pi pi-file"></i> Working Papers</button>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .health-strip { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 120px; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius); padding: 12px 16px; display: flex; flex-direction: column; align-items: center; }
    .health-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .health-value.high { color: var(--warning); } .health-value.medium { color: var(--warning); } .health-value.low { color: var(--success); }
    .health-label { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    .font-semibold { font-weight: 600; }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .w-full { width: 100%; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class AuditQaReviewsComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly router = inject(Router);

  loading = signal(true);
  items = signal<Record<string, unknown>[]>([]);
  filtered = signal<Record<string, unknown>[]>([]);
  auditOptions = signal<Record<string, unknown>[]>([]);
  selectedAuditId = '';
  statusFilter = '';
  dialogVisible = false;
  rejectDialogVisible = false;
  rejectId = '';
  rejectComments = '';
  form: Record<string, unknown> = { review_type: '', finding_id: '', reviewer_id: '' };
  statusOptions = [
    { label: 'Pending', value: 'pending' }, { label: 'Approved', value: 'approved' }, { label: 'Rejected', value: 'rejected' }
  ];
  reviewTypeOptions = [
    { label: 'Peer Review', value: 'peer_review' }, { label: 'Supervisor Approval', value: 'supervisor_approval' },
    { label: 'QA Review', value: 'qa_review' }
  ];
  get pendingCount() { return this.items().filter((i: Record<string, unknown>) => i.status === 'pending').length; }
  get approvedCount() { return this.items().filter((i: Record<string, unknown>) => i.status === 'approved').length; }
  get rejectedCount() { return this.items().filter((i: Record<string, unknown>) => i.status === 'rejected').length; }

  ngOnInit() { this.loadAudits(); }

  loadAudits() {
    this.api.getEngagements().subscribe({
      next: r => {
        const engagements = r.engagements || r.data || [];
        this.auditOptions.set(engagements.map((e: Record<string, unknown>) => ({ label: e.title, value: e.audit_id })));
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  load() {
    if (!this.selectedAuditId) { this.items.set([]); this.filtered.set([]); return; }
    this.loading.set(true);
    this.api.getQaReviews(this.selectedAuditId).subscribe({
      next: r => { this.items.set(r.reviews || r.data || []); this.filter(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadQAReviews') }); }
    });
  }

  loadPending() {
    this.loading.set(true);
    this.api.getPendingQaReviews().subscribe({
      next: r => { this.items.set(r.reviews || r.data || []); this.filter(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadPendingReviews') }); }
    });
  }

  filter() {
    let list = this.items();
    if (this.statusFilter) list = list.filter(i => i.status === this.statusFilter);
    this.filtered.set(list);
  }

  openDialog() {
    this.form = { review_type: '', finding_id: '', reviewer_id: '' };
    this.dialogVisible = true;
  }

  save() {
    const payload = { ...this.form, audit_id: this.selectedAuditId };
    this.api.createQaReview(payload).subscribe({
      next: () => { this.dialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('audit.reviewCreated') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToCreateReview') })
    });
  }

  approveReview(id: string) {
    this.api.approveQaReview(id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('audit.approved') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToApprove') })
    });
  }

  openRejectDialog(id: string) {
    this.rejectId = id;
    this.rejectComments = '';
    this.rejectDialogVisible = true;
  }

  confirmReject() {
    this.api.rejectQaReview(this.rejectId, this.rejectComments).subscribe({
      next: () => { this.rejectDialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.rejected') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToReject') })
    });
  }
}
