import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { devError } from '../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-email-commands',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, DropdownModule, InputSwitchModule, ToolbarModule, ConfirmDialogModule, TooltipModule],
  providers: [ConfirmationService],
  template: `
    <section class="page-shell">
      <header class="page-header">
        <h2>{{ i18n.translate('Email Commands') }}</h2>
        <p class="text-muted">{{ i18n.translate('Configure email-based command rules for automated GRC actions') }}</p>
      </header>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">{{ commands().length }}</div>
          <div class="kpi-label">Total Rules</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-green">{{ activeCount() }}</div>
          <div class="kpi-label">Active</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-orange">{{ disabledCount() }}</div>
          <div class="kpi-label">Disabled</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-blue">{{ totalExecutions() }}</div>
          <div class="kpi-label">Executions (30d)</div>
        </div>
      </div>

      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button label="New Rule" icon="pi pi-plus" (onClick)="openDialog()" />
          <p-button label="Test Email" icon="pi pi-send" [outlined]="true" severity="secondary" class="ml-2" (onClick)="showTestDialog = true" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-dropdown [options]="moduleOptions" [(ngModel)]="filterModule" placeholder="All Modules" [showClear]="true" (onChange)="applyFilter()" />
        </ng-template>
      </p-toolbar>

      <!-- Rules Table -->
      <p-table aria-label="Data table" [value]="filteredCommands()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm p-datatable-striped"
        [rowHover]="true" [showCurrentPageReport]="true" currentPageReportTemplate="Showing {first} to {last} of {totalRecords} rules">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">Rule Name <p-sortIcon field="name" /></th>
            <th>Trigger Pattern</th>
            <th pSortableColumn="module">Module <p-sortIcon field="module" /></th>
            <th>Action</th>
            <th pSortableColumn="enabled">Status <p-sortIcon field="enabled" /></th>
            <th>Executions</th>
            <th>Last Triggered</th>
            <th style="width:120px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td class="font-semibold">{{ c.name }}</td>
            <td><code class="pattern-code">{{ c.pattern || c.trigger_pattern }}</code></td>
            <td><p-tag [value]="c.module || 'global'" severity="info" /></td>
            <td><p-tag [value]="c.action_type || 'notify'" [severity]="actionSeverity(c.action_type)" /></td>
            <td>
              <p-tag [value]="c.enabled ? 'Active' : 'Disabled'" [severity]="c.enabled ? 'success' : 'warning'" />
            </td>
            <td class="text-center">{{ c.execution_count || 0 }}</td>
            <td>{{ c.last_triggered | appDate:'short' }}</td>
            <td>
              <div class="action-btns">
                <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="info" (onClick)="editCommand(c)" pTooltip="Edit" />
                <p-button icon="pi pi-play" [text]="true" [rounded]="true" severity="success" (onClick)="testCommand(c)" pTooltip="Test" />
                <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" (onClick)="deleteCommand(c)" pTooltip="Delete" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center p-4">
            <i class="pi pi-envelope" style="font-size: var(--font-size-4xl);color:var(--text-muted)"></i>
            <p class="mt-2">No email command rules configured</p>
            <p-button label="Create First Rule" icon="pi pi-plus" size="small" class="mt-2" (onClick)="openDialog()" />
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Execution Log -->
      @if (executionLog().length > 0) {
        <h3 class="section-title mt-4">Recent Execution Log</h3>
        <p-table aria-label="Data table" [value]="executionLog()" [rows]="5" [paginator]="true" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr><th>Time</th><th>Rule</th><th>Sender</th><th>Subject</th><th>Result</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-log>
            <tr>
              <td>{{ log.executed_at | appDate:'short' }}</td>
              <td>{{ log.rule_name }}</td>
              <td>{{ log.sender_email }}</td>
              <td class="truncate-cell">{{ log.subject }}</td>
              <td><p-tag [value]="log.result || 'success'" [severity]="log.result === 'failed' ? 'danger' : 'success'" /></td>
            </tr>
          </ng-template>
        </p-table>
      }

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editingCommand ? 'Edit Rule' : 'New Email Command Rule'" [(visible)]="showDialog" [modal]="true" [style]="{ width: '540px' }">
        <div class="form-grid">
          <div class="form-field">
            <label>Rule Name</label>
            <input pInputText [(ngModel)]="form.name" placeholder="e.g. Approve Policy" aria-label="e.g. Approve Policy" class="w-full" />
          </div>
          <div class="form-field">
            <label>Trigger Pattern (email subject match)</label>
            <input pInputText [(ngModel)]="form.pattern" placeholder="e.g. APPROVE:*" aria-label="e.g. APPROVE:*" class="w-full" />
          </div>
          <div class="form-row">
            <div class="form-field flex-1">
              <label>Module</label>
              <p-dropdown [options]="moduleOptions" [(ngModel)]="form.module" placeholder="Select Module" appendTo="body" class="w-full" />
            </div>
            <div class="form-field flex-1">
              <label>Action Type</label>
              <p-dropdown [options]="actionOptions" [(ngModel)]="form.action_type" placeholder="Select Action" appendTo="body" class="w-full" />
            </div>
          </div>
          <div class="form-field">
            <label>Description</label>
            <input pInputText [(ngModel)]="form.description" placeholder="What this rule does" aria-label="What this rule does" class="w-full" />
          </div>
          <div class="form-field">
            <label class="flex items-center gap-2">
              <p-inputSwitch [(ngModel)]="form.enabled" /> Enabled
            </label>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="editingCommand ? 'Update' : 'Create'" icon="pi pi-check" (onClick)="saveCommand()" [disabled]="!form.name || !form.pattern" />
        </ng-template>
      </p-dialog>

      <!-- Test Dialog -->
      <p-dialog header="Test Email Command" [(visible)]="showTestDialog" [modal]="true" [style]="{ width: '480px' }">
        <div class="form-grid">
          <div class="form-field">
            <label>From Email</label>
            <input pInputText [(ngModel)]="testForm.sender" placeholder="user@example.com" aria-label="user@example.com" class="w-full" />
          </div>
          <div class="form-field">
            <label>Subject Line</label>
            <input pInputText [(ngModel)]="testForm.subject" placeholder="APPROVE: Policy-123" aria-label="APPROVE: Policy-123" class="w-full" />
          </div>
        </div>
        @if (testResult) {
          <div class="test-result" [class.success]="testResult.matched" [class.fail]="!testResult.matched">
            <i class="pi" [ngClass]="testResult.matched ? 'pi-check-circle' : 'pi-times-circle'"></i>
            {{ testResult.matched ? 'Matched rule: ' + testResult.rule_name : 'No matching rule found' }}
          </div>
        }
        <ng-template pTemplate="footer">
          <p-button label="Send Test" icon="pi pi-send" (onClick)="sendTest()" [disabled]="!testForm.subject" />
        </ng-template>
      </p-dialog>
    </section>
    <p-confirmDialog />
  `,
  styles: [`
    .page-shell { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h2 { font-size: var(--font-size-3xl); font-weight: 300; color: var(--text-heading, var(--text-0)); }
    .text-muted { color: var(--text-muted, var(--text-2)); margin-top: 4px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .kpi-card { padding: 20px; border-radius: var(--radius-lg); background: var(--bg-1, var(--surface-ice)); border: 1px solid var(--border, var(--border-subtle)); text-align: center; }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--text-0); }
    .kpi-label { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-2)); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .text-green { color: var(--success); } .text-orange { color: var(--warning); } .text-blue { color: var(--primary); }
    .mb-3 { margin-bottom: 16px; } .ml-2 { margin-inline-start: 8px; } .mt-2 { margin-top: 8px; } .mt-4 { margin-top: 24px; }
    .pattern-code { background: var(--bg-1, var(--surface-ice)); padding: 2px 8px; border-radius: var(--radius-xs); font-size: var(--font-size-sm); font-family: monospace; }
    .action-btns { display: flex; gap: 2px; }
    .section-title { font-size: var(--font-size-md); font-weight: 600; color: var(--text-0); margin-bottom: 12px; }
    .truncate-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-1); }
    .form-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; } .w-full { width: 100%; }
    .flex { display: flex; } .items-center { align-items: center; } .gap-2 { gap: 8px; }
    .test-result { padding: 12px 16px; border-radius: var(--radius); margin-top: 16px; display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .test-result.success { background: var(--status-success-bg, #defbe6); color: var(--success); border: 1px solid #bbf7d0; }
    .test-result.fail { background: var(--status-danger-bg, #fff1f1); color: var(--error); border: 1px solid var(--status-danger-bg, #fff1f1); }
    .text-center { text-align: center; } .p-4 { padding: 16px; }
    .font-semibold { font-weight: 600; }
  `]
})
export class EmailCommandsComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  private confirmSvc = inject(ConfirmationService);
  loading = signal(true);
  commands = signal<GrcRecord[]>([]);
  executionLog = signal<GrcRecord[]>([]);
  totalExecutions = signal(0);

  showDialog = false;
  showTestDialog = false;
  editingCommand: Record<string, unknown> | null = null;
  filterModule = '';
  testResult: Record<string, unknown> | null = null;

  form: Record<string, unknown> = { name: '', pattern: '', module: '', action_type: 'notify', description: '', enabled: true };
  testForm = { sender: '', subject: '' };

  moduleOptions = [
    { label: 'Policies', value: 'policies' }, { label: 'Risks', value: 'risks' },
    { label: 'Controls', value: 'controls' }, { label: 'Evidence', value: 'evidence' },
    { label: 'Audit', value: 'audit' }, { label: 'Incidents', value: 'incidents' },
  ];
  actionOptions = [
    { label: 'Notify', value: 'notify' }, { label: 'Approve', value: 'approve' },
    { label: 'Create Task', value: 'create_task' }, { label: 'Escalate', value: 'escalate' },
    { label: 'Update Status', value: 'update_status' }, { label: 'Request Evidence', value: 'request_evidence' },
  ];

  ngOnInit(): void {
    this.loading.set(true);
    this.apiclientSvc.get('/email-inbox/commands').subscribe({
      next: (d: Record<string, unknown>) => {
        const cmds = Array.isArray(d) ? d : d.commands || d.rules || [];
        this.commands.set(cmds);
        this.totalExecutions.set(cmds.reduce((s: number, c: Record<string, unknown>) => s + (c.execution_count || 0), 0));
        this.loading.set(false);
      },
      error: () => { this.commands.set([]); this.loading.set(false); }
    });
    this.apiclientSvc.get('/email-inbox/commands/log').subscribe({
      next: (d: Record<string, unknown>) => this.executionLog.set(Array.isArray(d) ? d : d.log || []),
      error: (e: unknown) => devError("[API]", e)
    });
  }

  filteredCommands(): Record<string, unknown>[] {
    if (!this.filterModule) return this.commands();
    return this.commands().filter(c => c.module === this.filterModule);
  }

  activeCount(): number { return this.commands().filter(c => c.enabled).length; }
  disabledCount(): number { return this.commands().filter(c => !c.enabled).length; }

  applyFilter() { /* filtering is reactive via filteredCommands() */ }

  openDialog() {
    this.editingCommand = null;
    this.form = { name: '', pattern: '', module: '', action_type: 'notify', description: '', enabled: true };
    this.showDialog = true;
  }

  editCommand(c: Record<string, unknown>) {
    this.editingCommand = c;
    this.form = { ...c };
    this.showDialog = true;
  }

  saveCommand() {
    const obs = this.editingCommand
      ? this.apiclientSvc.put(`/email-inbox/commands/${this.editingCommand.command_id || this.editingCommand.id}`, this.form)
      : this.apiclientSvc.post('/email-inbox/commands', this.form);
    obs.subscribe({ next: () => { this.showDialog = false; this.ngOnInit(); } });
  }

  deleteCommand(c: Record<string, unknown>) {
    this.confirmSvc.confirm({
      message: 'Delete this email command rule?',
      header: "Confirm",
      icon: "pi pi-exclamation-triangle",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
      this.apiclientSvc.del(`/email-inbox/commands/${c.command_id || c.id}`).subscribe({ next: () => this.ngOnInit() });
      },
    });
  }

  testCommand(c: Record<string, unknown>) {
    this.testForm = { sender: 'test@example.com', subject: c.pattern?.replace('*', 'test-entity') || '' };
    this.testResult = null;
    this.showTestDialog = true;
  }

  sendTest() {
    this.apiclientSvc.post('/email-inbox/commands/test', this.testForm).subscribe({
      next: (r: Record<string, unknown>) => this.testResult = r,
      error: () => this.testResult = { matched: false }
    });
  }

  actionSeverity(type: string): 'success' | 'warning' | 'danger' | 'info' {
    const m: Record<string, unknown> = { approve: 'success', notify: 'info', escalate: 'warning', create_task: 'info', update_status: 'success', request_evidence: 'warning' };
    return m[type] || 'info';
  }
}
