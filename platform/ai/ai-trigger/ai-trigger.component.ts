import { inject, Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ToastService } from '@app/dos/shell/toast.service';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-trigger',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, CardModule, TagModule, ButtonModule, InputSwitchModule, DialogModule, InputTextModule, DropdownModule, TableModule, ToolbarModule, TooltipModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  template: `
    <app-page-shell icon="bolt" [title]="i18n.translate('aiTrigger.title')"
      [subtitle]="i18n.translate('aiTrigger.subtitle')"
      [breadcrumbs]="[i18n.translate('aiTrigger.breadcrumbDashboard'), i18n.translate('aiTrigger.title')]" [loading]="loading">

      <!-- KPI Row -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-value">{{ triggers.length }}</div>
          <div class="kpi-label">{{ i18n.translate('aiTrigger.totalTriggers') }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-green">{{ enabledCount() }}</div>
          <div class="kpi-label">{{ i18n.translate('aiTrigger.active') }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-orange">{{ disabledCount() }}</div>
          <div class="kpi-label">{{ i18n.translate('aiTrigger.disabled') }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-blue">{{ totalFired() }}</div>
          <div class="kpi-label">{{ i18n.translate('aiTrigger.totalFired30d') }}</div>
        </div>
      </div>

      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button [label]="i18n.translate('aiTrigger.newTrigger')" icon="pi pi-plus" (onClick)="openCreate()" />
          <p-button [label]="i18n.translate('aiTrigger.testAll')" icon="pi pi-play" [outlined]="true" severity="secondary" class="ml-2" (onClick)="testAll()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-dropdown [options]="scopeOpts" [(ngModel)]="filterModule" [placeholder]="i18n.translate('aiTrigger.allModules')" [showClear]="true" (onChange)="applyFilter()" />
        </ng-template>
      </p-toolbar>

      <!-- Trigger Cards -->
      <div class="trigger-grid">
        @for (t of filteredTriggers(); track t.trigger_id || t.name) {
          <div class="trigger-card" [class.disabled-card]="!t.enabled">
            <div class="trigger-header">
              <h3>{{ t.name }}</h3>
              <p-inputSwitch [(ngModel)]="t.enabled" (onChange)="toggleTrigger(t)" />
            </div>
            <p class="trigger-desc">{{ t.description || 'AI-powered trigger' }}</p>
            <div class="trigger-tags">
              <p-tag [value]="t.module || 'global'" severity="info" />
              <p-tag [value]="t.trigger_type || 'event'" />
              <p-tag *ngIf="t.priority" [value]="t.priority" [severity]="prioritySeverity(t.priority)" />
            </div>
            <div class="trigger-stats">
              <span><i class="pi pi-bolt"></i> {{ t.fire_count || 0 }} fires</span>
              <span><i class="pi pi-clock"></i> {{ t.last_fired | appDate:'short' }}</span>
            </div>
            <div class="trigger-condition" *ngIf="t.condition">
              <code>{{ t.condition }}</code>
            </div>
            <div class="trigger-actions">
              <p-button icon="pi pi-pencil" [text]="true" size="small" (onClick)="editTrigger(t)" [pTooltip]="i18n.translate('common.edit')" />
              <p-button icon="pi pi-play" [text]="true" size="small" severity="success" (onClick)="testTrigger(t)" [pTooltip]="i18n.translate('aiTrigger.test')" />
              <p-button icon="pi pi-history" [text]="true" size="small" severity="info" (onClick)="showHistory(t)" [pTooltip]="i18n.translate('aiTrigger.history')" />
              <p-button icon="pi pi-trash" [text]="true" size="small" severity="danger" (onClick)="deleteTrigger(t)" [pTooltip]="i18n.translate('common.delete')" />
            </div>
          </div>
        }
      </div>

      @if (triggers.length === 0 && !loading) {
        <div class="empty-state">
          <i class="pi pi-bolt empty-icon"></i>
          <p>{{ i18n.translate('aiTrigger.noTriggers') }}</p>
          <p-button [label]="i18n.translate('aiTrigger.createFirstTrigger')" icon="pi pi-plus" (onClick)="openCreate()" class="mt-2" />
        </div>
      }

      <!-- Execution History -->
      @if (historyLog.length > 0) {
        <h3 class="section-title">{{ historyTitle }}</h3>
        <p-table [attr.aria-label]="i18n.translate('aiTrigger.ariaHistoryTable')" [value]="historyLog" [rows]="10" [paginator]="true" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr><th>{{ i18n.translate('aiTrigger.colTime') }}</th><th>{{ i18n.translate('aiTrigger.colTrigger') }}</th><th>{{ i18n.translate('aiTrigger.colModule') }}</th><th>{{ i18n.translate('aiTrigger.colEntity') }}</th><th>{{ i18n.translate('aiTrigger.colActionTaken') }}</th><th>{{ i18n.translate('aiTrigger.colResult') }}</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-h>
            <tr>
              <td>{{ h.fired_at | appDate:'short' }}</td>
              <td class="font-semibold">{{ h.trigger_name }}</td>
              <td><p-tag [value]="h.module || '—'" severity="info" /></td>
              <td>{{ h.entity_type }} {{ h.entity_id | slice:0:8 }}</td>
              <td>{{ h.action_taken }}</td>
              <td><p-tag [value]="h.result || 'success'" [severity]="h.result === 'failed' ? 'danger' : 'success'" /></td>
            </tr>
          </ng-template>
        </p-table>
      }

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editingTrigger ? i18n.translate('aiTrigger.editTrigger') : i18n.translate('aiTrigger.newAiTrigger')" [(visible)]="showDialog" [modal]="true" [style]="{ width: '560px' }">
        <div class="form-grid">
          <div class="form-field">
            <label>{{ i18n.translate('aiTrigger.triggerName') }}</label>
            <input pInputText [(ngModel)]="form.name" [placeholder]="i18n.translate('aiTrigger.placeholderTriggerName')" [attr.aria-label]="i18n.translate('aiTrigger.placeholderTriggerName')" class="w-full" />
          </div>
          <div class="form-row">
            <div class="form-field flex-1">
              <label>{{ i18n.translate('aiTrigger.module') }}</label>
              <p-dropdown [options]="scopeOpts" [(ngModel)]="form.module" [placeholder]="i18n.translate('aiTrigger.placeholderSelect')" appendTo="body" class="w-full" />
            </div>
            <div class="form-field flex-1">
              <label>{{ i18n.translate('aiTrigger.triggerType') }}</label>
              <p-dropdown [options]="triggerTypeOpts" [(ngModel)]="form.trigger_type" [placeholder]="i18n.translate('aiTrigger.placeholderSelect')" appendTo="body" class="w-full" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-field flex-1">
              <label>{{ i18n.translate('aiTrigger.action') }}</label>
              <p-dropdown [options]="actionTypeOpts" [(ngModel)]="form.action" [placeholder]="i18n.translate('aiTrigger.placeholderSelect')" appendTo="body" class="w-full" />
            </div>
            <div class="form-field flex-1">
              <label>{{ i18n.translate('aiTrigger.priority') }}</label>
              <p-dropdown [options]="priorityOpts" [(ngModel)]="form.priority" [placeholder]="i18n.translate('aiTrigger.placeholderSelect')" appendTo="body" class="w-full" />
            </div>
          </div>
          <div class="form-field">
            <label>{{ i18n.translate('aiTrigger.condition') }}</label>
            <input pInputText [(ngModel)]="form.condition" [placeholder]="i18n.translate('aiTrigger.placeholderCondition')" class="w-full font-mono" />
          </div>
          <div class="form-field">
            <label>{{ i18n.translate('aiTrigger.description') }}</label>
            <input pInputText [(ngModel)]="form.description" [placeholder]="i18n.translate('aiTrigger.placeholderDescription')" [attr.aria-label]="i18n.translate('aiTrigger.placeholderDescription')" class="w-full" />
          </div>
          <div class="form-field">
            <label class="flex items-center gap-2"><p-inputSwitch [(ngModel)]="form.enabled" /> {{ i18n.translate('aiTrigger.enabled') }}</label>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="editingTrigger ? i18n.translate('aiTrigger.update') : i18n.translate('aiTrigger.create')" icon="pi pi-check" (onClick)="saveTrigger()" [disabled]="!form.name" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
    <p-confirmDialog />
  `,
  styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card { padding: 18px; border-radius: var(--radius-lg); background: var(--bg-1, var(--surface-ice)); border: 1px solid var(--border, var(--border-subtle)); text-align: center; }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-0); }
    .kpi-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .text-green { color: var(--success); } .text-orange { color: var(--warning); } .text-blue { color: var(--primary); }
    .mb-3 { margin-bottom: 16px; } .ml-2 { margin-inline-start: 8px; } .mt-2 { margin-top: 8px; }
    .trigger-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .trigger-card { padding: 20px; border-radius: var(--radius-lg); background: var(--bg-0, #fff); border: 1px solid var(--border, var(--border-subtle)); transition: all 200ms; }
    .trigger-card:hover { border-color: var(--primary, #2563eb); box-shadow: var(--shadow-card); }
    .trigger-card.disabled-card { opacity: 0.6; }
    .trigger-header { display: flex; justify-content: space-between; align-items: center; }
    .trigger-header h3 { margin: 0; font-size: var(--font-size-base); font-weight: 700; }
    .trigger-desc { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); margin: 8px 0; }
    .trigger-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .trigger-stats { display: flex; gap: 16px; font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 10px; }
    .trigger-stats i { margin-inline-end: 4px; }
    .trigger-condition { margin-top: 8px; }
    .trigger-condition code { background: var(--bg-1, var(--surface-ice)); padding: 4px 10px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); display: inline-block; }
    .trigger-actions { display: flex; gap: 4px; margin-top: 10px; justify-content: flex-end; }
    .section-title { font-size: var(--font-size-md); font-weight: 600; margin: 24px 0 12px; color: var(--text-0); }
    .font-semibold { font-weight: 600; }
    .empty-state { text-align: center; padding: 48px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); display: block; margin-bottom: 12px; }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-1); }
    .form-row { display: flex; gap: 12px; } .flex-1 { flex: 1; } .w-full { width: 100%; }
    .flex { display: flex; } .items-center { align-items: center; } .gap-2 { gap: 8px; }
    .font-mono { font-family: monospace; }
  `]
})
export class AITriggerComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  private confirmSvc = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ToastService);
  loading = false; triggers: GrcRecord[] = []; historyLog: GrcRecord[] = [];
  showDialog = false; editingTrigger: GrcRecord | null = null; filterModule = '';
  historyTitle = 'Execution History';
  form: GrcRecord = { name: '', module: '', trigger_type: 'event', action: 'notify', priority: 'medium', condition: '', description: '', enabled: true };

  /** Scope/module options (static values, labels don't need i18n since they are GRC domain terms) */
  moduleOptions = [
    { label: 'Risks', value: 'risks' }, { label: 'Policies', value: 'policies' },
    { label: 'Controls', value: 'controls' }, { label: 'Evidence', value: 'evidence' },
    { label: 'Audit', value: 'audit' }, { label: 'Compliance', value: 'compliance' },
  ];
  /** Scope options with i18n-reactive labels */
  get scopeOpts() {
    return [
      { label: this.i18n.translate('aiTrigger.scopeRisks'), value: 'risks' },
      { label: this.i18n.translate('aiTrigger.scopePolicies'), value: 'policies' },
      { label: this.i18n.translate('aiTrigger.scopeControls'), value: 'controls' },
      { label: this.i18n.translate('aiTrigger.scopeEvidence'), value: 'evidence' },
      { label: this.i18n.translate('aiTrigger.scopeAudit'), value: 'audit' },
      { label: this.i18n.translate('aiTrigger.scopeCompliance'), value: 'compliance' },
    ];
  }
  /** Trigger type options with i18n-reactive labels */
  get triggerTypeOpts() {
    return [
      { label: this.i18n.translate('aiTrigger.typeEvent'), value: 'event' },
      { label: this.i18n.translate('aiTrigger.typeSchedule'), value: 'schedule' },
      { label: this.i18n.translate('aiTrigger.typeThreshold'), value: 'threshold' },
      { label: this.i18n.translate('aiTrigger.typePattern'), value: 'pattern' },
    ];
  }
  /** Action type options with i18n-reactive labels */
  get actionTypeOpts() {
    return [
      { label: this.i18n.translate('aiTrigger.actionNotify'), value: 'notify' },
      { label: this.i18n.translate('aiTrigger.actionEscalate'), value: 'escalate' },
      { label: this.i18n.translate('aiTrigger.actionCreateTask'), value: 'create_task' },
      { label: this.i18n.translate('aiTrigger.actionRunAgent'), value: 'run_agent' },
      { label: this.i18n.translate('aiTrigger.actionGenerateReport'), value: 'generate_report' },
      { label: this.i18n.translate('aiTrigger.actionRequestEvidence'), value: 'request_evidence' },
    ];
  }
  /** Priority options with i18n-reactive labels */
  get priorityOpts() {
    return [
      { label: this.i18n.translate('aiTrigger.priorityLow'), value: 'low' },
      { label: this.i18n.translate('aiTrigger.priorityMedium'), value: 'medium' },
      { label: this.i18n.translate('aiTrigger.priorityHigh'), value: 'high' },
      { label: this.i18n.translate('aiTrigger.priorityCritical'), value: 'critical' },
    ];
  }

  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  ngOnInit() {
    this.loading = true;
    this.operationsSvc.getAITriggerConfig().subscribe({
      next: (d) => { this.triggers = Array.isArray(d) ? d : d.triggers || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  filteredTriggers(): GrcRecord[] {
    if (!this.filterModule) return this.triggers;
    return this.triggers.filter(t => t.module === this.filterModule);
  }

  enabledCount(): number { return this.triggers.filter(t => t.enabled).length; }
  disabledCount(): number { return this.triggers.filter(t => !t.enabled).length; }
  applyFilter() {}
  totalFired(): number { return this.triggers.reduce((s, t) => s + (t.fire_count || 0), 0); }

  toggleTrigger(t: GrcRecord) {
    this.operationsSvc.updateAITriggerConfig({ triggerId: t.trigger_id, enabled: t.enabled } as any).subscribe();
  }

  openCreate() {
    this.editingTrigger = null;
    this.form = { name: '', module: '', trigger_type: 'event', action: 'notify', priority: 'medium', condition: '', description: '', enabled: true };
    this.showDialog = true;
  }

  editTrigger(t: GrcRecord) {
    this.editingTrigger = t;
    this.form = { ...t };
    this.showDialog = true;
  }

  saveTrigger() {
    const obs = this.editingTrigger
      ? this.apiclientSvc.put(`/ai-triggers/${this.editingTrigger.trigger_id || this.editingTrigger.id}`, this.form)
      : this.apiclientSvc.post('/ai-triggers', this.form);
    obs.subscribe({ next: () => { this.showDialog = false; this.ngOnInit(); } });
  }

  deleteTrigger(t: GrcRecord) {
    this.confirmSvc.confirm({
      message: this.i18n.translate('aiTrigger.deleteTriggerConfirm'),
      header: this.i18n.translate('common.confirm'),
      icon: "pi pi-exclamation-triangle",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
      this.apiclientSvc.del(`/ai-triggers/${t.trigger_id || t.id}`).subscribe({ next: () => this.ngOnInit() });
      },
    });
  }

  testTrigger(t: GrcRecord) {
    this.apiclientSvc.post(`/ai-triggers/${t.trigger_id || t.id}/test`, {}).subscribe({
      next: (r) => { this.toast.success(r.result || 'Test completed'); this.ngOnInit(); }
    });
  }

  testAll() {
    this.apiclientSvc.post('/ai-triggers/test-all', {}).subscribe({ next: () => this.ngOnInit() });
  }

  showHistory(t: GrcRecord) {
    this.historyTitle = `History: ${t.name}`;
    this.apiclientSvc.get(`/ai-triggers/${t.trigger_id || t.id}/history`).subscribe({
      next: (d) => this.historyLog = Array.isArray(d) ? d : d.history || []
    });
  }

  prioritySeverity(p: string): 'success' | 'warning' | 'danger' | 'info' {
    const m: Record<string, unknown> = { low: 'info', medium: 'success', high: 'warning', critical: 'danger' };
    return m[p] || 'info';
  }
}
