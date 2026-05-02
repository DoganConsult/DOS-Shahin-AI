// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { ButtonModule, DialogModule, DropdownModule, InputModule, NotificationModule, PlaceholderModule, TableModule, TagModule, TooltipModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

interface ExceptionRecord {
  id: string;
  controlId?: string;
  controlTitle?: string;
  status: string;
  justification?: string;
  compensatingControls?: string;
  riskImpact?: string;
  requestedDuration?: number;
  approverDesignation?: string;
  expiryDate?: string;
  createdAt?: string;
  requestedBy?: string;
}

@Component({
    selector: 'app-compliance-exceptions-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [],
    imports: [
        CommonModule, FormsModule, RouterModule, TagModule, ButtonModule,
        TableModule, PlaceholderModule, DropdownModule, DialogModule,
        InputModule, InputModule, NotificationModule, TooltipModule,
        EmptyStateComponent, PageHeaderComponent,
    ],
    template: `
    <app-page-header titleEn="Exception Register" titleAr="سجل الاستثناءات" icon="pi-shield"
                     subtitleEn="Manage compliance waivers and exceptions" subtitleAr="إدارة الإعفاءات والاستثناءات">
      <button cdsButton label="Request Exception" icon="" class="" (click)="showRequestDialog = true"></button>
    </app-page-header>

    <!-- Summary Cards -->
    <section class="exc-summary">
      <div class="exc-card" [class.active]="statusFilter === ''" (click)="statusFilter = ''; load()">
        <span class="exc-val">{{ allExceptions().length }}</span>
        <span class="exc-lbl">Total</span>
      </div>
      <div class="exc-card pending" [class.active]="statusFilter === 'pending'" (click)="statusFilter = 'pending'; load()">
        <span class="exc-val">{{ countByStatus('pending') }}</span>
        <span class="exc-lbl">Pending Approval</span>
      </div>
      <div class="exc-card approved" [class.active]="statusFilter === 'approved'" (click)="statusFilter = 'approved'; load()">
        <span class="exc-val">{{ countByStatus('approved') }}</span>
        <span class="exc-lbl">Active</span>
      </div>
      <div class="exc-card expiring" (click)="loadExpiring()">
        <span class="exc-val">{{ expiringCount() }}</span>
        <span class="exc-lbl">Expiring Soon</span>
      </div>
      <div class="exc-card rejected" [class.active]="statusFilter === 'rejected'" (click)="statusFilter = 'rejected'; load()">
        <span class="exc-val">{{ countByStatus('rejected') }}</span>
        <span class="exc-lbl">Rejected</span>
      </div>
    </section>

    @if (loading()) {
      <cds-placeholder></cds-placeholder>
    } @else if (allExceptions().length) {
      <table cdsTable [value]="filtered()" [paginator]="filtered().length > 25" [rows]="25"
               [rowsPerPageOptions]="[10, 25, 50]" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th>Control</th>
            <th>Status</th>
            <th>Risk Impact</th>
            <th>Approver</th>
            <th>Duration</th>
            <th>Expiry</th>
            <th>Compensating Controls</th>
            <th>Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-exc>
          <tr>
            <td>{{ exc.controlTitle || exc.controlId || '—' }}</td>
            <td>
              <cds-tag [value]="exc.status"
                     [severity]="exc.status === 'approved' ? 'success' : exc.status === 'rejected' ? 'danger' : exc.status === 'expired' ? 'warning' : 'info'" />
            </td>
            <td><cds-tag [value]="exc.riskImpact || 'medium'" [severity]="exc.riskImpact === 'critical' ? 'danger' : exc.riskImpact === 'high' ? 'warning' : 'info'" /></td>
            <td>{{ exc.approverDesignation || '—' }}</td>
            <td>{{ exc.requestedDuration ? exc.requestedDuration + 'd' : '—' }}</td>
            <td [class.overdue]="isExpired(exc.expiryDate)">{{ exc.expiryDate ? (exc.expiryDate | date:'mediumDate') : '—' }}</td>
            <td class="truncate">{{ exc.compensatingControls || '—' }}</td>
            <td>
              @if (exc.status === 'pending') {
                <button cdsButton icon="" class="  " [cdsTooltip]="Approve" (click)="approve(exc.id)"></button>
                <button cdsButton icon="" class="  " [cdsTooltip]="Reject" (click)="reject(exc.id)"></button>
              }
            </td>
          </tr>
        </ng-template>
      </table>
    } @else {
      <app-empty-state variant="info" titleEn="No exceptions found" titleAr="لا توجد استثناءات" />
    }

    <!-- Request Exception Dialog -->
    <cds-modal header="Request Exception" [(visible)]="showRequestDialog" [modal]="true" [style]="{width: '500px'}">
      <div class="form-grid">
        <div class="form-field">
          <label>Control ID</label>
          <input pInputText [(ngModel)]="newException.controlId" placeholder="Enter control ID" />
        </div>
        <div class="form-field">
          <label>Justification</label>
          <textarea pInputTextarea [(ngModel)]="newException.justification" rows="3" placeholder="Why is this exception needed?"></textarea>
        </div>
        <div class="form-field">
          <label>Compensating Controls</label>
          <textarea pInputTextarea [(ngModel)]="newException.compensatingControls" rows="2" placeholder="What compensating controls are in place?"></textarea>
        </div>
        <div class="form-field">
          <label>Risk Impact</label>
          <cds-dropdown [options]="riskOptions" [(ngModel)]="newException.riskImpact" placeholder="Select risk level" />
        </div>
        <div class="form-field">
          <label>Requested Duration (days)</label>
          <input pInputText type="number" [(ngModel)]="newException.requestedDuration" placeholder="90" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button cdsButton label="Cancel" class="" (click)="showRequestDialog = false"></button>
        <button cdsButton label="Submit Request" icon="" (click)="submitRequest()"></button>
      </ng-template>
    </cds-modal>

    <cds-notification></cds-notification>
  `,
    styles: [`
    :host { display: block; padding: 0 16px 24px; }

    .exc-summary { display: flex; gap: 10px; flex-wrap: wrap; margin: 16px 0; }
    .exc-card {
      flex: 1; min-width: 120px; padding: 12px; text-align: center; border-radius: var(--radius);
      border: 1px solid var(--border, #e2e8f0); background: var(--bg-0, #fff);
      cursor: pointer; transition: all 0.15s;
    }
    .exc-card:hover, .exc-card.active { border-color: var(--primary, #3b82f6); box-shadow: 0 0 0 1px var(--primary, #3b82f6); }
    .exc-card.pending { border-left: 3px solid var(--info, #0ea5e9); }
    .exc-card.approved { border-left: 3px solid var(--success, #16a34a); }
    .exc-card.expiring { border-left: 3px solid var(--warning, #f59e0b); }
    .exc-card.rejected { border-left: 3px solid var(--error, #dc2626); }
    .exc-val { display: block; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-body, #1e293b); }
    .exc-lbl { font-size: var(--font-size-xs); color: var(--text-muted, #64748b); }

    .overdue { color: var(--error, #dc2626); font-weight: 600; }
    .truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .form-grid { display: flex; flex-direction: column; gap: 12px; }
    .form-field { display: flex; flex-direction: column; gap: 4px; }
    .form-field label { font-size: var(--font-size-tag); font-weight: 600; color: var(--text-muted, #64748b); }
    .form-field input, .form-field textarea { width: 100%; }
  `]
})
export class ComplianceExceptionsPageComponent implements OnInit {
  private msg = inject(MessageService);

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly msg = inject(MessageService);

  loading = signal(true);
  allExceptions = signal<ExceptionRecord[]>([]);
  expiringCount = signal(0);
  statusFilter = '';
  showRequestDialog = false;

  riskOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
  ];

  newException = {
    controlId: '',
    justification: '',
    compensatingControls: '',
    riskImpact: 'medium',
    requestedDuration: 90,
  };

  filtered = computed(() => {
    if (!this.statusFilter) return this.allExceptions();
    return this.allExceptions().filter(e => e.status === this.statusFilter);
  });

  ngOnInit(): void {
    this.load();
    this.loadExpiringCount();
  }

  load(): void {
    this.loading.set(true);
    const params = this.statusFilter ? `?status=${this.statusFilter}` : '';
    this.http.get<any>(`/api/exceptions${params}`).subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : (data?.exceptions || data?.items || []);
        this.allExceptions.set(items.map((e: Record<string, unknown>) => ({
          id: e.exception_id || e.id,
          controlId: e.control_id || e.controlId,
          controlTitle: e.control_title,
          status: e.status,
          justification: e.justification,
          compensatingControls: e.compensating_controls || e.compensatingControls,
          riskImpact: e.risk_impact || e.riskImpact,
          requestedDuration: e.requested_duration || e.requestedDuration,
          approverDesignation: e.approver_designation || e.approverDesignation,
          expiryDate: e.expiry_date || e.expiryDate,
          createdAt: e.created_at || e.createdAt,
          requestedBy: e.requested_by || e.requestedBy,
        })));
        this.loading.set(false);
      },
      error: () => { this.allExceptions.set([]); this.loading.set(false); }
    });
  }

  loadExpiringCount(): void {
    this.http.get<any>('/api/exceptions/expiring?days=30').subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : (data?.exceptions || []);
        this.expiringCount.set(items.length);
      },
      error: () => this.expiringCount.set(0)
    });
  }

  loadExpiring(): void {
    this.statusFilter = '';
    this.loading.set(true);
    this.http.get<any>('/api/exceptions/expiring?days=30').subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : (data?.exceptions || []);
        this.allExceptions.set(items.map((e: Record<string, unknown>) => ({
          id: e.exception_id || e.id, controlId: e.control_id, status: e.status,
          expiryDate: e.expiry_date, riskImpact: e.risk_impact,
          approverDesignation: e.approver_designation,
          compensatingControls: e.compensating_controls,
          requestedDuration: e.requested_duration,
        })));
        this.loading.set(false);
      },
      error: () => { this.allExceptions.set([]); this.loading.set(false); }
    });
  }

  countByStatus(status: string): number {
    return this.allExceptions().filter(e => e.status === status).length;
  }

  isExpired(date?: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  approve(exceptionId: string): void {
    this.http.post(`/api/exceptions/${exceptionId}/approve`, { approverId: 'current-user' }).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Exception approved' }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to approve' })
    });
  }

  reject(exceptionId: string): void {
    this.http.post(`/api/exceptions/${exceptionId}/reject`, { approverId: 'current-user', reason: 'Rejected via UI' }).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Exception rejected' }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to reject' })
    });
  }

  submitRequest(): void {
    if (!this.newException.controlId || !this.newException.justification) {
      this.msg.add({ severity: 'warn', summary: 'Control ID and justification are required' });
      return;
    }
    this.http.post('/api/exceptions', this.newException).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Exception request submitted' });
        this.showRequestDialog = false;
        this.newException = { controlId: '', justification: '', compensatingControls: '', riskImpact: 'medium', requestedDuration: 90 };
        this.load();
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to submit request' })
    });
  }
}
