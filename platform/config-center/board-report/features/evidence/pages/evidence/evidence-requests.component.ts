import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Subscription } from 'rxjs';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { CalendarModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClientService } from "@app/core/services/api-client.service";

interface EvidenceRequest {
  request_id: string; control_id: string; framework_code: string;
  evidence_type: string; requesting_team_id: string; assigned_team_id: string;
  due_date: string; status: string; request_details: string;
  submitted_at: string; submitted_by: string; created_by: string;
  priority: string; created_at: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-requests',
    imports: [
        CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent,
        CardModule, TableModule, TagModule, ButtonModule,
        DropdownModule, DialogModule, InputTextModule, InputTextarea, CalendarModule, AppDatePipe, TooltipModule
    ],
    styles: [`
    .stat-row { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .stat-box { padding: 14px 20px; border-radius: var(--radius-md); background: var(--surface-card); border: 1px solid var(--surface-border); min-width: 140px; }
    .stat-box.warn { border-color: #fca5a5; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .stat-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .filter-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
    .overdue { color: var(--error); font-weight: 600; }
    .empty-state { text-align: center; padding: 48px 20px; color: var(--text-color-secondary); }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .detail-grid label { font-weight: 600; font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .detail-grid .val { font-size: var(--font-size-base); }
  `],
    template: `
    <app-page-shell icon="inbox"
      [title]="i18n.translate('evidenceRequests.title')"
      [subtitle]="i18n.translate('evidenceRequests.subtitle')"
      [breadcrumbs]="['Dashboard', 'Evidence', 'Requests']"
      [loading]="loading">

      <div class="stat-row">
        <div class="stat-box"><div class="stat-value">{{ requests.length }}</div><div class="stat-label">{{ i18n.translate('evidenceRequests.total') }}</div></div>
        <div class="stat-box"><div class="stat-value">{{ pendingCount }}</div><div class="stat-label">{{ i18n.translate('evidenceRequests.pending') }}</div></div>
        <div class="stat-box warn"><div class="stat-value">{{ overdueCount }}</div><div class="stat-label">{{ i18n.translate('evidenceRequests.overdue') }}</div></div>
        <div class="stat-box"><div class="stat-value">{{ approvedCount }}</div><div class="stat-label">{{ i18n.translate('evidenceRequests.approved') }}</div></div>
      </div>

      <div class="filter-row">
        <p-dropdown [options]="statusOptions" [(ngModel)]="filterStatus" optionLabel="label" optionValue="value"
          [placeholder]="i18n.translate('evidenceRequests.status')" [showClear]="true" (onChange)="applyFilter()" />
        <p-button [label]="i18n.translate('evidenceRequests.newRequest')" icon="pi pi-plus" (onClick)="showCreateDialog = true" />
      </div>

      @if (filtered.length === 0 && !loading) {
        <div class="empty-state">
          <i class="pi pi-inbox" style="font-size:40px;opacity:.3;display:block;margin-bottom:12px"></i>
          {{ i18n.translate('evidenceRequests.noRequests') }}
        </div>
      }

      @if (filtered.length > 0) {
        <p-card>
          <p-table aria-label="Filtered table" [value]="filtered" [paginator]="true" [rows]="15" styleClass="p-datatable-sm"
            [globalFilterFields]="['evidence_type','status','control_id']">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('evidenceRequests.type') }}</th>
                <th>{{ i18n.translate('evidenceRequests.control') }}</th>
                <th>{{ i18n.translate('evidenceRequests.status') }}</th>
                <th>{{ i18n.translate('evidenceRequests.priority') }}</th>
                <th>{{ i18n.translate('evidenceRequests.dueDate') }}</th>
                <th>{{ i18n.translate('common.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td>{{ r.evidence_type }}</td>
                <td>{{ r.control_id || '-' }}</td>
                <td><app-status-badge [status]="r.status" /></td>
                <td><p-tag [value]="r.priority || 'medium'" [severity]="r.priority === 'high' ? 'danger' : r.priority === 'low' ? 'info' : 'warning'" /></td>
                <td [class.overdue]="isOverdue(r)">{{ r.due_date | appDate:'medium' }}</td>
                <td>
                  <button pButton icon="pi pi-eye" class="p-button-text p-button-sm" (click)="viewDetail(r)" pTooltip="View"></button>
                  @if (r.status === 'pending') {
                    <button pButton icon="pi pi-check" class="p-button-text p-button-sm p-button-success" (click)="updateStatus(r, 'acknowledged')" pTooltip="Acknowledge"></button>
                  }
                  @if (r.status !== 'cancelled' && r.status !== 'approved') {
                    <button pButton icon="pi pi-times" class="p-button-text p-button-sm p-button-danger" (click)="updateStatus(r, 'cancelled')" pTooltip="Cancel"></button>
                  }
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      }

      <!-- Create dialog -->
      <p-dialog [header]="i18n.translate('evidenceRequests.newEvidenceRequest')" [(visible)]="showCreateDialog" [modal]="true" [style]="{width:'500px'}">
        <div class="flex flex-column gap-3">
          <div><label>{{ i18n.translate('evidenceRequests.evidenceType') }} *</label>
            <input pInputText [(ngModel)]="newReq.evidenceType" class="w-full" /></div>
          <div><label>{{ i18n.translate('evidenceRequests.controlId') }}</label>
            <input pInputText [(ngModel)]="newReq.controlId" class="w-full" /></div>
          <div><label>{{ i18n.translate('evidenceRequests.dueDate') }} *</label>
            <p-calendar [(ngModel)]="newReq.dueDate" dateFormat="yy-mm-dd" [showIcon]="true" styleClass="w-full" /></div>
          <div><label>{{ i18n.translate('evidenceRequests.priority') }}</label>
            <p-dropdown [options]="priorityOptions" [(ngModel)]="newReq.priority" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
          <div><label>{{ i18n.translate('evidenceRequests.details') }}</label>
            <textarea pInputTextarea [(ngModel)]="newReq.requestDetails" [rows]="3" class="w-full"></textarea></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times" styleClass="p-button-text" (onClick)="showCreateDialog = false" />
          <p-button [label]="i18n.translate('common.create')" icon="pi pi-check" (onClick)="createRequest()" [disabled]="!newReq.evidenceType || !newReq.dueDate" />
        </ng-template>
      </p-dialog>

      <!-- Detail dialog -->
      <p-dialog [header]="i18n.translate('evidenceRequests.requestDetail')" [(visible)]="showDetailDialog" [modal]="true" [style]="{width:'550px'}">
        @if (selectedReq) {
          <div class="detail-grid">
            <div><label>Type</label><div class="val">{{ selectedReq.evidence_type }}</div></div>
            <div><label>Control</label><div class="val">{{ selectedReq.control_id || '-' }}</div></div>
            <div><label>Status</label><div class="val"><app-status-badge [status]="selectedReq.status" /></div></div>
            <div><label>Priority</label><div class="val">{{ selectedReq.priority || 'medium' }}</div></div>
            <div><label>Due Date</label><div class="val" [class.overdue]="isOverdue(selectedReq)">{{ selectedReq.due_date | appDate:'medium' }}</div></div>
            <div><label>Created</label><div class="val">{{ selectedReq.created_at | appDate:'medium' }}</div></div>
            <div style="grid-column:1/-1"><label>Details</label><div class="val">{{ selectedReq.request_details || '-' }}</div></div>
          </div>
        }
      </p-dialog>
    </app-page-shell>
  `
})
export class EvidenceRequestsComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  private readonly live = inject(GrcLiveService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private sub?: Subscription;

  loading = true;
  requests: EvidenceRequest[] = [];
  filtered: EvidenceRequest[] = [];
  filterStatus = '';
  showCreateDialog = false;
  showDetailDialog = false;
  selectedReq: EvidenceRequest | null = null;
  newReq = { evidenceType: '', controlId: '', dueDate: null as Date | null, priority: 'medium', requestDetails: '' };

  statusOptions = [
    { label: 'Pending', value: 'pending' }, { label: 'Acknowledged', value: 'acknowledged' },
    { label: 'Submitted', value: 'submitted' }, { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' }, { label: 'Cancelled', value: 'cancelled' },
  ];
  priorityOptions = [
    { label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' },
  ];

  get pendingCount() { return this.requests.filter(r => r.status === 'pending').length; }
  get overdueCount() { return this.requests.filter(r => this.isOverdue(r)).length; }
  get approvedCount() { return this.requests.filter(r => r.status === 'approved').length; }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      this.filterStatus = p['status'] || '';
      this.loadData();
    });
    this.sub = this.live.evidence$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadData());
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  loadData() {
    this.loading = true;
    const params: Record<string, string> = {};
    if (this.filterStatus) params.status = this.filterStatus;
    if (this.route.snapshot.queryParams['overdue'] === '1') params.overdue = '1';
    let qs = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
    this.apiclientSvc.get(`/evidence/requests${qs ? '?' + qs : ''}`).subscribe({
      next: (data: Record<string, unknown>) => { this.requests = (data.requests || []) as any; this.applyFilter(); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  applyFilter() {
    this.filtered = this.filterStatus
      ? this.requests.filter(r => r.status === this.filterStatus)
      : [...this.requests];
  }

  isOverdue(r: EvidenceRequest): boolean {
    return !!r.due_date && new Date(r.due_date) < new Date() && !['approved', 'cancelled', 'rejected'].includes(r.status);
  }

  viewDetail(r: EvidenceRequest) { this.selectedReq = r; this.showDetailDialog = true; }

  updateStatus(r: EvidenceRequest, status: string) {
    this.apiclientSvc.patch(`/evidence/requests/${r.request_id}`, { status }).subscribe({
      next: () => this.loadData(),
    });
  }

  createRequest() {
    if (!this.newReq.evidenceType || !this.newReq.dueDate) return;
    const body = {
      evidenceType: this.newReq.evidenceType,
      controlId: this.newReq.controlId || undefined,
      dueDate: this.newReq.dueDate.toISOString(),
      priority: this.newReq.priority,
      requestDetails: this.newReq.requestDetails || undefined,
    };
    this.apiclientSvc.post('/evidence/requests', body).subscribe({
      next: () => {
        this.showCreateDialog = false;
        this.newReq = { evidenceType: '', controlId: '', dueDate: null, priority: 'medium', requestDetails: '' };
        this.loadData();
      },
    });
  }
}
