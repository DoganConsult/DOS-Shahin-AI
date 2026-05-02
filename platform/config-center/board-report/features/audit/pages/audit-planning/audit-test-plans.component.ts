import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuditApiService } from '../../services/audit-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
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
import { devError } from '../../../core/utils/dev-logger';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audit-test-plans',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent,
    ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, InputTextarea,
    DropdownModule, CalendarModule, TagModule, TooltipModule],
  providers: [MessageService],
  template: `
    <app-page-shell icon="clipboard-check"
      [title]="i18n.translate('audit.auditTestPlans')"
      [subtitle]="i18n.translate('audit.manageControlTestPlansPerAuditEngagement')"
      [loading]="loading()">
      <p-toast />

      <!-- Health Strip -->
      <div class="health-strip">
        <div class="health-item"><span class="health-value">{{ items().length }}</span><span class="health-label">{{ i18n.translate('audit.totalPlans') }}</span></div>
        <div class="health-item"><span class="health-value">{{ countByStatus('planned') }}</span><span class="health-label">{{ i18n.translate('audit.planned') }}</span></div>
        <div class="health-item health-success"><span class="health-value">{{ countByStatus('passed') }}</span><span class="health-label">{{ i18n.translate('audit.passed') }}</span></div>
        <div class="health-item health-danger"><span class="health-value">{{ countByStatus('failed') }}</span><span class="health-label">{{ i18n.translate('audit.failed') }}</span></div>
        <div class="health-item health-info"><span class="health-value">{{ coveragePct() }}%</span><span class="health-label">{{ i18n.translate('audit.coverage') }}</span></div>
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <div style="display:flex;align-items:center;gap:12px">
            <label style="font-weight:600">{{ i18n.translate('audit.auditId') }}</label>
            <input pInputText [(ngModel)]="selectedAuditId" [placeholder]="i18n.translate('audit.enterAuditId')" [attr.aria-label]="i18n.translate('audit.enterAuditId')" style="width:240px" />
            <p-button [label]="i18n.translate('audit.load')" icon="pi pi-search" (onClick)="loadPlans()" />
          </div>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('audit.newTestPlan')" icon="pi pi-plus" (onClick)="openCreateDialog()" [disabled]="!selectedAuditId" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="items()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="control_id">{{ i18n.translate('audit.controlId') }} <p-sortIcon field="control_id" /></th>
            <th>{{ i18n.translate('audit.testType') }}</th>
            <th>{{ i18n.translate('audit.procedure') }}</th>
            <th>{{ i18n.translate('audit.sampleSize') }}</th>
            <th>{{ i18n.translate('audit.status') }}</th>
            <th>{{ i18n.translate('audit.testedBy') }}</th>
            <th>{{ i18n.translate('audit.testedAt') }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-p>
          <tr>
            <td class="font-semibold">{{ p.control_id }}</td>
            <td><app-status-badge [status]="p.test_type" /></td>
            <td>{{ p.procedure_description || '—' }}</td>
            <td>{{ p.sample_size || '—' }}</td>
            <td>
              <p-tag [value]="p.status"
                [severity]="p.status === 'passed' ? 'success' : p.status === 'failed' ? 'danger' : p.status === 'inconclusive' ? 'warning' : 'info'" />
            </td>
            <td>{{ p.tested_by || '—' }}</td>
            <td>{{ p.tested_at | appDate:'medium' }}</td>
            <td>
              <p-button icon="pi pi-check-square" [text]="true" severity="info" pTooltip="Record Result" (onClick)="openResultDialog(p)" *ngIf="p.status === 'planned' || p.status === 'in_progress'" />
              <p-button icon="pi pi-pencil" [text]="true" severity="secondary" (onClick)="openCreateDialog(p)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noTestPlansYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editing ? i18n.translate('audit.editTestPlan') : i18n.translate('audit.newTestPlan')"
        [(visible)]="createDialogVisible" [modal]="true" [style]="{ width: '520px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.controlId') }} *</label><input pInputText [(ngModel)]="form.control_id" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.testType') }} *</label>
            <p-dropdown [options]="testTypeOptions" [(ngModel)]="form.test_type" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.procedureDescription') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.procedure_description" [rows]="3" class="w-full"></textarea></div>
          <div class="field"><label>{{ i18n.translate('audit.sampleSize') }}</label>
            <input pInputText [(ngModel)]="form.sample_size" type="number" class="w-full" /></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="createDialogVisible = false" />
          <p-button [label]="i18n.translate('audit.save')" icon="pi pi-check" (onClick)="saveCreate()" [disabled]="!form.control_id || !form.test_type" />
        </ng-template>
      </p-dialog>

      <!-- Result Update Dialog -->
      <p-dialog [header]="i18n.translate('audit.recordResult')"
        [(visible)]="resultDialogVisible" [modal]="true" [style]="{ width: '480px' }">
        <div class="form-grid">
          <div class="field"><label>{{ i18n.translate('audit.status') }} *</label>
            <p-dropdown [options]="resultStatusOptions" [(ngModel)]="resultForm.status" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('audit.resultNotes') }}</label>
            <textarea pInputTextarea [(ngModel)]="resultForm.result_notes" [rows]="3" class="w-full"></textarea></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('audit.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="resultDialogVisible = false" />
          <p-button [label]="i18n.translate('audit.save')" icon="pi pi-check" (onClick)="saveResult()" [disabled]="!resultForm.status" />
        </ng-template>
      </p-dialog>

      <!-- Cross-Module Links -->
      <div class="cross-links" style="margin-top:24px">
        <button class="cross-link-btn" (click)="router.navigate(['/audit/engagements'])"><i class="pi pi-briefcase"></i> {{ i18n.translate('audit.engagements') || 'Engagements' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/compliance/controls'])"><i class="pi pi-check-square"></i> {{ i18n.translate('audit.complianceControls') || 'Compliance Controls' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/ratings'])"><i class="pi pi-star"></i> {{ i18n.translate('audit.ratings') || 'Ratings' }}</button>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .font-semibold { font-weight: 600; }
    .health-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 16px; }
    .health-item { background: var(--surface-card); border-radius: var(--radius-lg); padding: 16px; text-align: center; display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--surface-border); }
    .health-value { font-size: 1.5rem; font-weight: 700; }
    .health-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    .health-success .health-value { color: var(--success); }
    .health-danger .health-value { color: var(--error); }
    .health-info .health-value { color: var(--primary); }
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
export class AuditTestPlansComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);

  loading = signal(true);
  items = signal<Record<string, any>[]>([]);
  coveragePct = signal(0);
  selectedAuditId = '';
  createDialogVisible = false;
  resultDialogVisible = false;
  editing = false;
  editId = '';
  resultEditId = '';
  form: Record<string, any> = { control_id: '', test_type: '', procedure_description: '', sample_size: null };
  resultForm: Record<string, any> = { status: '', result_notes: '' };
  testTypeOptions = [
    { label: 'Design Effectiveness', value: 'design_effectiveness' },
    { label: 'Operating Effectiveness', value: 'operating_effectiveness' },
    { label: 'Substantive', value: 'substantive' }
  ];
  resultStatusOptions = [
    { label: 'Planned', value: 'planned' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Passed', value: 'passed' },
    { label: 'Failed', value: 'failed' },
    { label: 'Inconclusive', value: 'inconclusive' }
  ];

  ngOnInit() { this.loading.set(false); }

  loadPlans() {
    if (!this.selectedAuditId) return;
    this.loading.set(true);
    this.api.getTestPlans(this.selectedAuditId).subscribe({
      next: r => { this.items.set(r.plans || r || []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadTestPlans') }); }
    });
    this.api.getTestCoverage(this.selectedAuditId).subscribe({
      next: r => this.coveragePct.set(r.coverage_pct || r.coverage || 0),
      error: (e: unknown) => devError("[API]", e)
    });
  }

  countByStatus(status: string): number {
    return this.items().filter(i => i.status === status).length;
  }

  openCreateDialog(item?: Record<string, any>) {
    if (item) {
      this.editing = true; this.editId = item.id;
      this.form = { control_id: item.control_id, test_type: item.test_type,
        procedure_description: item.procedure_description || '', sample_size: item.sample_size || null };
    } else {
      this.editing = false; this.editId = '';
      this.form = { control_id: '', test_type: '', procedure_description: '', sample_size: null };
    }
    this.createDialogVisible = true;
  }

  openResultDialog(item: Record<string, any>) {
    this.resultEditId = item.id;
    this.resultForm = { status: item.status || '', result_notes: '' };
    this.resultDialogVisible = true;
  }

  saveCreate() {
    const payload = { ...this.form, audit_id: this.selectedAuditId };
    const obs = this.editing
      ? this.api.updateTestResult(this.editId, payload)
      : this.api.createTestPlan(payload);
    obs.subscribe({
      next: () => { this.createDialogVisible = false; this.loadPlans(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('audit.testPlanSaved') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToSaveTestPlan') })
    });
  }

  saveResult() {
    this.api.updateTestResult(this.resultEditId, this.resultForm).subscribe({
      next: () => { this.resultDialogVisible = false; this.loadPlans(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('audit.resultRecorded') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToSaveResult') })
    });
  }
}
