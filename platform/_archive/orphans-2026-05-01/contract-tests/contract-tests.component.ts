import { inject, Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-contract-tests',
    imports: [CommonModule, AppDatePipe, AppNumberPipe, FormsModule, PageShellComponent, TableModule, TagModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, DropdownModule, ProgressBarModule, ConfirmDialogModule, TooltipModule],
    providers: [ConfirmationService],
    template: `
    <app-page-shell icon="check-square" [title]="'Contract Tests'"
      [subtitle]="'API contract validation and compliance testing'"
      [breadcrumbs]="['Dashboard', 'Contract Tests']" [loading]="loading">

      <!-- KPI Cards -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-value">{{ tests.length }}</div>
          <div class="kpi-label">Total Tests</div>
        </div>
        <div class="kpi-card kpi-green">
          <div class="kpi-value">{{ countByStatus('passed') }}</div>
          <div class="kpi-label">Passed</div>
        </div>
        <div class="kpi-card kpi-red">
          <div class="kpi-value">{{ countByStatus('failed') }}</div>
          <div class="kpi-label">Failed</div>
        </div>
        <div class="kpi-card kpi-orange">
          <div class="kpi-value">{{ countByStatus('pending') }}</div>
          <div class="kpi-label">Pending</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ passRate() | appNumber:'decimal':'1.0-0' }}%</div>
          <div class="kpi-label">Pass Rate</div>
          <p-progressBar [value]="passRate()" [showValue]="false" [style]="{ height: '6px', marginTop: '8px' }" />
        </div>
      </div>

      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button label="Run All" icon="pi pi-play" severity="success" (onClick)="runAll()" [loading]="runningAll" />
          <p-button label="New Test" icon="pi pi-plus" [outlined]="true" class="ml-2" (onClick)="openCreate()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-dropdown [options]="statusOptions" [(ngModel)]="filterStatus" placeholder="All Statuses" [showClear]="true" />
        </ng-template>
      </p-toolbar>

      <!-- Tests Table -->
      <p-table aria-label="Data table" [value]="filteredTests()" [paginator]="true" [rows]="15" styleClass="p-datatable-sm p-datatable-striped"
        [rowHover]="true" [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} tests">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">Test Name <p-sortIcon field="name" /></th>
            <th>Endpoint</th>
            <th>Method</th>
            <th pSortableColumn="status">Status <p-sortIcon field="status" /></th>
            <th>Response Time</th>
            <th pSortableColumn="last_run">Last Run <p-sortIcon field="last_run" /></th>
            <th style="width:140px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-t>
          <tr>
            <td class="font-semibold">{{ t.name }}</td>
            <td><code class="endpoint-code">{{ t.endpoint }}</code></td>
            <td><p-tag [value]="t.method || 'GET'" [severity]="methodSeverity(t.method)" /></td>
            <td>
              <p-tag [value]="t.status || 'pending'" [severity]="t.status === 'passed' ? 'success' : t.status === 'failed' ? 'danger' : 'warning'" />
            </td>
            <td>
              <span *ngIf="t.response_time_ms" class="response-time" [class.slow]="t.response_time_ms > 1000">
                {{ t.response_time_ms }}ms
              </span>
              <span *ngIf="!t.response_time_ms">—</span>
            </td>
            <td>{{ t.last_run | appDate:'short' }}</td>
            <td>
              <div class="action-btns">
                <p-button icon="pi pi-play" [text]="true" [rounded]="true" severity="success" (onClick)="runTest(t)" pTooltip="Run" />
                <p-button icon="pi pi-eye" [text]="true" [rounded]="true" severity="info" (onClick)="viewResult(t)" pTooltip="Details" />
                <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" (onClick)="editTest(t)" pTooltip="Edit" />
                <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" (onClick)="deleteTest(t)" pTooltip="Delete" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center p-4">
            <i class="pi pi-check-square" style="font-size: var(--font-size-4xl);color:var(--text-muted)"></i>
            <p style="margin-top:8px">No contract tests defined</p>
            <p-button label="Create First Test" icon="pi pi-plus" size="small" class="mt-2" (onClick)="openCreate()" />
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Result Detail Dialog -->
      <p-dialog header="Test Result" [(visible)]="showResultDialog" [modal]="true" [style]="{ width: '600px' }">
        @if (selectedResult) {
          <div class="result-detail">
            <div class="result-header">
              <h3>{{ selectedResult.name }}</h3>
              <p-tag [value]="selectedResult.status" [severity]="selectedResult.status === 'passed' ? 'success' : 'danger'" />
            </div>
            <div class="result-meta">
              <span><strong>Endpoint:</strong> <code>{{ selectedResult.endpoint }}</code></span>
              <span><strong>Method:</strong> {{ selectedResult.method || 'GET' }}</span>
              <span><strong>Response:</strong> {{ selectedResult.response_time_ms || '—' }}ms</span>
              <span><strong>Status Code:</strong> {{ selectedResult.response_status || '—' }}</span>
            </div>
            @if (selectedResult.assertions) {
              <h4>Assertions</h4>
              <div class="assertion-list">
                @for (a of selectedResult.assertions; track a.field) {
                  <div class="assertion" [class.pass]="a.passed" [class.fail]="!a.passed">
                    <i class="pi" [ngClass]="a.passed ? 'pi-check' : 'pi-times'"></i>
                    <span>{{ a.description || a.field }}: expected {{ a.expected }}, got {{ a.actual }}</span>
                  </div>
                }
              </div>
            }
            @if (selectedResult.error_message) {
              <div class="error-box">{{ selectedResult.error_message }}</div>
            }
          </div>
        }
      </p-dialog>

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editingTest ? 'Edit Test' : 'New Contract Test'" [(visible)]="showDialog" [modal]="true" [style]="{ width: '520px' }">
        <div class="form-grid">
          <div class="form-field">
            <label>Test Name</label>
            <input pInputText [(ngModel)]="form.name" placeholder="e.g. GET /api/risks returns 200" aria-label="e.g. GET /api/risks returns 200" class="w-full" />
          </div>
          <div class="form-row">
            <div class="form-field" style="width:120px">
              <label>Method</label>
              <p-dropdown [options]="methodOptions" [(ngModel)]="form.method" appendTo="body" />
            </div>
            <div class="form-field flex-1">
              <label>Endpoint</label>
              <input pInputText [(ngModel)]="form.endpoint" placeholder="/api/risks" aria-label="/api/risks" class="w-full font-mono" />
            </div>
          </div>
          <div class="form-field">
            <label>Expected Status Code</label>
            <input pInputText type="number" [(ngModel)]="form.expected_status" placeholder="200" aria-label="200" class="w-full" />
          </div>
          <div class="form-field">
            <label>Description</label>
            <input pInputText [(ngModel)]="form.description" placeholder="What this test validates" aria-label="What this test validates" class="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="editingTest ? 'Update' : 'Create'" icon="pi pi-check" (onClick)="saveTest()" [disabled]="!form.name || !form.endpoint" />
        </ng-template>
      </p-dialog>

      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <p-button label="Retry" icon="pi pi-refresh" severity="danger" [outlined]="true" (onClick)="error=''; ngOnInit()" />
      </div>
    </app-page-shell>
    <p-confirmDialog />
  `,
    styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card { padding: 18px; border-radius: var(--radius-lg); background: var(--bg-1, var(--surface-ice)); border: 1px solid var(--border, var(--border-subtle)); text-align: center; }
    .kpi-card.kpi-green { border-color: #bbf7d0; } .kpi-card.kpi-red { border-color: var(--status-danger-bg, #fff1f1); } .kpi-card.kpi-orange { border-color: #fed7aa; }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-0); }
    .kpi-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .mb-3 { margin-bottom: 16px; } .ml-2 { margin-inline-start: 8px; } .mt-2 { margin-top: 8px; }
    .endpoint-code { background: var(--bg-1, var(--surface-ice)); padding: 2px 8px; border-radius: var(--radius-xs); font-size: var(--font-size-sm); font-family: monospace; }
    .response-time { font-family: monospace; font-size: var(--font-size-sm); } .response-time.slow { color: var(--error); font-weight: 600; }
    .action-btns { display: flex; gap: 2px; }
    .font-semibold { font-weight: 600; }
    .text-center { text-align: center; } .p-4 { padding: 16px; }
    .result-detail { display: flex; flex-direction: column; gap: 16px; }
    .result-header { display: flex; justify-content: space-between; align-items: center; }
    .result-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 700; }
    .result-meta { display: flex; flex-direction: column; gap: 6px; font-size: var(--font-size-sm); }
    .result-meta code { background: var(--bg-1); padding: 2px 6px; border-radius: var(--radius-xs); font-size: var(--font-size-sm); }
    .assertion-list { display: flex; flex-direction: column; gap: 6px; }
    .assertion { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .assertion.pass { background: var(--status-success-bg, #defbe6); color: var(--success); } .assertion.fail { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .error-box { background: var(--status-danger-bg, #fff1f1); color: var(--error); padding: 12px; border-radius: var(--radius); font-family: monospace; font-size: var(--font-size-sm); }
    .error-state { text-align: center; padding: 32px; color: var(--error); }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-1); }
    .form-row { display: flex; gap: 12px; } .flex-1 { flex: 1; } .w-full { width: 100%; }
    .font-mono { font-family: monospace; }
  `]
})
export class ContractTestsComponent implements OnInit {
  private confirmSvc = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);
  loading = false; error = ''; tests: Record<string, unknown>[] = []; runningAll = false;
  showDialog = false; showResultDialog = false; editingTest: Record<string, unknown> | null = null;
  selectedResult: Record<string, unknown> | null = null; filterStatus = '';
  form: Record<string, unknown> = { name: '', endpoint: '', method: 'GET', expected_status: 200, description: '' };

  statusOptions = [
    { label: 'Passed', value: 'passed' }, { label: 'Failed', value: 'failed' }, { label: 'Pending', value: 'pending' },
  ];
  methodOptions = [
    { label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' },
    { label: 'PUT', value: 'PUT' }, { label: 'DELETE', value: 'DELETE' },
  ];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/contract-tests').subscribe({
      next: (d: Record<string, unknown>) => { this.tests = Array.isArray(d) ? d : d.tests || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  filteredTests(): Record<string, unknown>[] {
    if (!this.filterStatus) return this.tests;
    return this.tests.filter(t => (t.status || 'pending') === this.filterStatus);
  }

  countByStatus(s: string): number { return this.tests.filter(t => (t.status || 'pending') === s).length; }
  passRate(): number {
    const ran = this.tests.filter(t => t.status === 'passed' || t.status === 'failed');
    return ran.length ? (this.countByStatus('passed') / ran.length) * 100 : 0;
  }

  runTest(t: Record<string, unknown>) {
    this.apiclientSvc.post(`/contract-tests/${t.test_id || t.id}/run`, {}).subscribe({ next: () => this.ngOnInit() });
  }

  runAll() {
    this.runningAll = true;
    this.apiclientSvc.post('/contract-tests/run-all', {}).subscribe({
      next: () => { this.runningAll = false; this.ngOnInit(); },
      error: () => { this.runningAll = false; }
    });
  }

  viewResult(t: Record<string, unknown>) {
    this.selectedResult = t;
    this.showResultDialog = true;
  }

  openCreate() {
    this.editingTest = null;
    this.form = { name: '', endpoint: '', method: 'GET', expected_status: 200, description: '' };
    this.showDialog = true;
  }

  editTest(t: Record<string, unknown>) {
    this.editingTest = t;
    this.form = { ...t };
    this.showDialog = true;
  }

  saveTest() {
    const obs = this.editingTest
      ? this.apiclientSvc.put(`/contract-tests/${this.editingTest.test_id || this.editingTest.id}`, this.form)
      : this.apiclientSvc.post('/contract-tests', this.form);
    obs.subscribe({ next: () => { this.showDialog = false; this.ngOnInit(); } });
  }

  deleteTest(t: Record<string, unknown>) {
    this.confirmSvc.confirm({
      message: 'Delete this test?',
      header: "Confirm",
      icon: "pi pi-exclamation-triangle",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
      this.apiclientSvc.del(`/contract-tests/${t.test_id || t.id}`).subscribe({ next: () => this.ngOnInit() });
      },
    });
  }

  methodSeverity(m: string): 'success' | 'warning' | 'danger' | 'info' {
    const map: Record<string, unknown> = { GET: 'info', POST: 'success', PUT: 'warning', DELETE: 'danger' };
    return map[m] || 'info';
  }
}
