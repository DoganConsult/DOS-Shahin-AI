import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { TabViewModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { devError } from '../../core/utils/dev-logger';
import { GrcOperationsService } from '@app/api';

interface AutomationRule {
  rule_id: string;
  name: string;
  description: string;
  module: string;
  event: string;
  conditions: Record<string, unknown> | undefined;
  actions: Record<string, unknown>[];
  enabled: boolean;
  lifecycle_phase: string;
  priority: number;
  created_by: string;
  created_at: string;
}

interface AutomationLogEntry {
  log_id: string;
  rule_id: string;
  event: string;
  module: string;
  entity_type: string;
  entity_id: string;
  actions_executed: Record<string, unknown>[];
  status: string;
  error: string;
  triggered_by: string;
  created_at: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-automation',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    TableModule, TagModule, ButtonModule, DialogModule,
    InputTextModule, DropdownModule, InputSwitchModule,
    TabViewModule, TooltipModule, CardModule, ChipModule, AppDatePipe],
  template: `
    <app-page-shell
      icon="bolt"
      [title]="i18n.translate('automation.title')"
      [subtitle]="i18n.translate('automation.subtitle')"
      [breadcrumbs]="['Dashboard', 'Automation']"
      [loading]="loading">

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon sky"><i class="pi pi-bolt"></i></div>
          <div class="stat-value">{{ rules.length }}</div>
          <div class="stat-label">{{ i18n.translate('automation.activeRules') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="pi pi-check-circle"></i></div>
          <div class="stat-value">{{ getLogCountByStatus('success') }}</div>
          <div class="stat-label">{{ i18n.translate('automation.successful') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red"><i class="pi pi-times-circle"></i></div>
          <div class="stat-value">{{ getLogCountByStatus('failed') }}</div>
          <div class="stat-label">{{ i18n.translate('automation.failed') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple"><i class="pi pi-sitemap"></i></div>
          <div class="stat-value">{{ getUniqueModules().length }}</div>
          <div class="stat-label">{{ i18n.translate('automation.modulesCovered') }}</div>
        </div>
      </div>

      <p-tabView [(activeIndex)]="activeTab">
        <!-- Tab 1: Rules -->
        <p-tabPanel [header]="i18n.translate('automation.automationRules')">
          <div class="toolbar-row">
            <p-dropdown [(ngModel)]="moduleFilter" [options]="moduleOptions" optionLabel="label" optionValue="value"
                        [placeholder]="i18n.translate('automation.allModules')"
                        [showClear]="true" (onChange)="filterRules()" [style]="{'min-width':'180px'}" />
            <div class="toolbar-actions">
              <p-button [label]="i18n.translate('automation.seedDefaults')" icon="pi pi-download"
                        severity="secondary" [text]="true" (onClick)="seedDefaults()" *ngIf="rules.length === 0" />
              <p-button [label]="i18n.translate('automation.addRule')" icon="pi pi-plus"
                        (onClick)="openCreateDialog()" />
            </div>
          </div>

          <div class="rules-grid">
            <div class="rule-card" *ngFor="let rule of filteredRules" [class.disabled]="!rule.enabled">
              <div class="rule-header">
                <div class="rule-module-badge" [ngClass]="'mod-' + rule.module">{{ rule.module }}</div>
                <div class="rule-event-badge">{{ rule.event }}</div>
                <p-inputSwitch [(ngModel)]="rule.enabled" (onChange)="toggleRule(rule)" />
              </div>
              <h3 class="rule-name">{{ rule.name }}</h3>
              <p class="rule-desc" *ngIf="rule.description">{{ rule.description }}</p>
              <div class="rule-meta">
                <span *ngIf="rule.lifecycle_phase" class="phase-badge">{{ rule.lifecycle_phase }}</span>
                <span class="priority-badge">P{{ rule.priority }}</span>
              </div>
              <div class="rule-actions-list">
                <div *ngFor="let action of rule.actions" class="action-chip">
                  <i class="pi" [ngClass]="getActionIcon(action.type)"></i>
                  <span>{{ action.type.replace('_', ' ') }}</span>
                </div>
              </div>
              <div class="rule-conditions" *ngIf="rule.conditions && hasConditions(rule.conditions)">
                <span class="cond-label">{{ i18n.translate('automation.conditions') }}:</span>
                <span class="cond-text">{{ formatConditions(rule.conditions) }}</span>
              </div>
              <div class="rule-footer">
                <button aria-label="Edit" class="icon-btn" (click)="editRule(rule)" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
                <button aria-label="Delete" class="icon-btn danger" (click)="deleteRule(rule)" pTooltip="Delete"><i class="pi pi-trash"></i></button>
              </div>
            </div>
            <div *ngIf="filteredRules.length === 0" class="empty-state">
              <i class="pi pi-bolt" style="font-size:40px;color:#94a3b8"></i>
              <p>{{ i18n.translate('automation.noRulesYet') }}</p>
              <p-button [label]="i18n.translate('automation.seedDefaultRules')" icon="pi pi-download"
                        (onClick)="seedDefaults()" />
            </div>
          </div>
        </p-tabPanel>

        <!-- Tab 2: Execution Log -->
        <p-tabPanel [header]="i18n.translate('automation.executionLog')">
          <p-table aria-label="Log Entries table" [value]="logEntries" [paginator]="logEntries.length > 15" [rows]="15" styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('automation.time') }}</th>
                <th>{{ i18n.translate('automation.module') }}</th>
                <th>{{ i18n.translate('automation.event') }}</th>
                <th>{{ i18n.translate('automation.entity') }}</th>
                <th>{{ i18n.translate('automation.actions') }}</th>
                <th>{{ i18n.translate('automation.status') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-entry>
              <tr>
                <td>{{ entry.created_at | appDate:'short' }}</td>
                <td><span class="rule-module-badge small" [ngClass]="'mod-' + entry.module">{{ entry.module }}</span></td>
                <td><span class="rule-event-badge small">{{ entry.event }}</span></td>
                <td class="entity-cell">{{ entry.entity_type }} <span class="entity-id">#{{ entry.entity_id?.slice(0,8) }}</span></td>
                <td>
                  <span *ngFor="let a of entry.actions_executed || []" class="action-chip small">
                    <i class="pi" [ngClass]="getActionIcon(a.type)"></i> {{ a.type }}
                  </span>
                </td>
                <td>
                  <p-tag [value]="entry.status" [severity]="entry.status === 'success' ? 'success' : 'danger'" [rounded]="true" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="empty-msg">{{ i18n.translate('automation.noLogsYet') }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Tab 3: Coverage Map -->
        <p-tabPanel [header]="i18n.translate('automation.coverageMap')">
          <div class="coverage-grid">
            <div *ngFor="let mod of allModules" class="coverage-card" [class.covered]="getModuleRuleCount(mod.value) > 0">
              <div class="coverage-icon" [ngClass]="'mod-' + mod.value">
                <i class="pi" [ngClass]="mod.icon"></i>
              </div>
              <div class="coverage-info">
                <h4 class="coverage-module">{{ mod.label }}</h4>
                <span class="coverage-count">{{ getModuleRuleCount(mod.value) }} {{ i18n.translate('automation.rules') }}</span>
                <div class="coverage-events">
                  <span *ngFor="let ev of getModuleEvents(mod.value)" class="event-dot" [pTooltip]="ev">{{ ev }}</span>
                </div>
              </div>
            </div>
          </div>
        </p-tabPanel>
      </p-tabView>

      <!-- Create/Edit Rule Dialog -->
      <p-dialog [header]="editingRule ? i18n.translate('automation.editRule') : i18n.translate('automation.createRule')"
                [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('automation.name') }}</label>
            <input pInputText [(ngModel)]="formData.name" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('automation.description') }}</label>
            <input pInputText [(ngModel)]="formData.description" class="w-full" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('automation.module') }}</label>
              <p-dropdown [(ngModel)]="formData.module" [options]="moduleOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('automation.event') }}</label>
              <p-dropdown [(ngModel)]="formData.event" [options]="eventOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('automation.lifecyclePhase') }}</label>
              <p-dropdown [(ngModel)]="formData.lifecycle_phase" [options]="phaseOptions" optionLabel="label" optionValue="value" [showClear]="true" styleClass="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('automation.priority') }}</label>
              <input pInputText [(ngModel)]="formData.priority" type="number" class="w-full" />
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('automation.actionType') }}</label>
            <p-dropdown [(ngModel)]="formData.actionType" [options]="actionTypeOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div class="field" *ngIf="formData.actionType === 'notify_role' || formData.actionType === 'require_approval'">
            <label>{{ i18n.translate('automation.targetRole') }}</label>
            <p-dropdown [(ngModel)]="formData.actionRole" [options]="roleOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div class="field" *ngIf="formData.actionType === 'create_task'">
            <label>{{ i18n.translate('automation.taskTitle') }}</label>
            <input pInputText [(ngModel)]="formData.actionTitle" class="w-full" placeholder="Follow up: [entity type] [entity id]" aria-label="Follow up: [entity type] [entity id]" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="showDialog=false" />
          <p-button [label]="i18n.translate('common.save')" icon="pi pi-check" (onClick)="saveRule()" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
    .stat-card {
      display: flex; flex-direction: column; align-items: center; padding: 18px;
      background: #fff; border-radius: var(--radius-lg); border: 1px solid #e0f2fe;
      box-shadow: var(--shadow-sm); text-align: center;
    }
    .stat-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-lg); margin-bottom: 8px; }
    .stat-icon.sky { background: #e0f2fe; color: #0369a1; }
    .stat-icon.green { background: #ecfdf5; color: var(--success); }
    .stat-icon.red { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .stat-icon.purple { background: #f3e8ff; color: #7c3aed; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 800; color: var(--text-heading); }
    .stat-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }

    .toolbar-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; }
    .toolbar-actions { display: flex; gap: 8px; }

    .rules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
    .rule-card {
      background: #fff; border: 1px solid #e0f2fe; border-radius: var(--radius-lg); padding: 18px;
      box-shadow: var(--shadow-sm); transition: all 200ms;
    }
    .rule-card:hover { box-shadow: var(--shadow-md); }
    .rule-card.disabled { opacity: 0.5; }
    .rule-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .rule-module-badge {
      font-size: var(--font-size-xs); font-weight: 700; padding: 3px 8px; border-radius: var(--radius-sm);
      text-transform: uppercase; letter-spacing: 0.04em; color: #fff;
    }
    .rule-module-badge.small { font-size: var(--font-size-xs); padding: 2px 6px; }
    .mod-risks { background: var(--error); } .mod-controls { background: var(--primary); }
    .mod-policies { background: var(--secondary, #8b5cf6); } .mod-frameworks { background: var(--success); }
    .mod-evidence { background: var(--info); } .mod-incidents { background: var(--risk-high); }
    .mod-vendors { background: var(--error); } .mod-assessments { background: var(--primary); }
    .mod-exceptions { background: var(--warning); } .mod-findings { background: var(--success); }
    .mod-assets { background: var(--text-muted); }
    .rule-event-badge {
      font-size: var(--font-size-xs); font-weight: 600; padding: 3px 8px; border-radius: var(--radius-sm);
      background: var(--surface-ice); color: #475569; text-transform: uppercase;
    }
    .rule-event-badge.small { font-size: var(--font-size-xs); padding: 2px 6px; }
    .rule-name { font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading); margin: 0 0 6px; }
    .rule-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin: 0 0 8px; line-height: 1.4; }
    .rule-meta { display: flex; gap: 6px; margin-bottom: 8px; }
    .phase-badge { font-size: var(--font-size-xs); font-weight: 600; background: #eff6ff; color: var(--primary); padding: 2px 6px; border-radius: var(--radius-xs); }
    .priority-badge { font-size: var(--font-size-xs); font-weight: 600; background: var(--status-warning-bg, #fcf4d6); color: var(--warning); padding: 2px 6px; border-radius: var(--radius-xs); }
    .rule-actions-list { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .action-chip {
      display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); font-weight: 600;
      background: var(--status-info-bg, #edf5ff); color: #0369a1; padding: 3px 8px; border-radius: var(--radius-sm);
    }
    .action-chip.small { font-size: var(--font-size-xs); padding: 2px 6px; }
    .action-chip .pi { font-size: var(--font-size-xs); }
    .rule-conditions { font-size: var(--font-size-xs); color: var(--text-muted); margin-bottom: 8px; }
    .cond-label { font-weight: 600; }
    .cond-text { margin-inline-start: 4px; }
    .rule-footer { display: flex; gap: 6px; justify-content: flex-end; border-top: 1px solid var(--surface-ice); padding-top: 8px; }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: var(--radius-sm); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .empty-state { text-align: center; padding: 40px; color: var(--text-muted); grid-column: 1 / -1; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: 24px; }
    .entity-cell { font-size: var(--font-size-sm); }
    .entity-id { color: var(--text-muted); font-family: monospace; }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .w-full { width: 100%; }

    /* Coverage Map */
    .coverage-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
    .coverage-card {
      display: flex; align-items: center; gap: 12px; padding: 16px;
      background: #fff; border: 1px solid var(--surface-ice); border-radius: var(--radius-lg);
      transition: all 200ms;
    }
    .coverage-card.covered { border-color: #bae6fd; background: var(--status-info-bg, #edf5ff); }
    .coverage-icon {
      width: 40px; height: 40px; border-radius: var(--radius-md); display: flex;
      align-items: center; justify-content: center; font-size: var(--font-size-lg); color: #fff;
    }
    .coverage-module { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading); margin: 0; }
    .coverage-count { font-size: var(--font-size-xs); color: var(--text-muted); }
    .coverage-events { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
    .event-dot {
      font-size: var(--font-size-xs); font-weight: 600; background: #e0f2fe; color: #0369a1;
      padding: 1px 5px; border-radius: var(--radius-xs);
    }
    @media (max-width: 768px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .rules-grid { grid-template-columns: 1fr; }
      .coverage-grid { grid-template-columns: 1fr; }
      .field-row { grid-template-columns: 1fr; }
    }
  `]
})
export class AutomationComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  activeTab = 0;
  rules: AutomationRule[] = [];
  filteredRules: AutomationRule[] = [];
  logEntries: AutomationLogEntry[] = [];
  moduleFilter: string | null = null;

  showDialog = false;
  editingRule: AutomationRule | null = null;
  formData: Record<string, unknown> = {};

  moduleOptions = [
    { label: 'Risks', value: 'risks' },
    { label: 'Controls', value: 'controls' },
    { label: 'Policies', value: 'policies' },
    { label: 'Frameworks', value: 'frameworks' },
    { label: 'Evidence', value: 'evidence' },
    { label: 'Incidents', value: 'incidents' },
    { label: 'Vendors', value: 'vendors' },
    { label: 'Assessments', value: 'assessments' },
    { label: 'Exceptions', value: 'exceptions' },
    { label: 'Findings', value: 'findings' },
    { label: 'Assets', value: 'assets' },
  ];

  eventOptions = [
    { label: 'Created', value: 'created' },
    { label: 'Updated', value: 'updated' },
    { label: 'Deleted', value: 'deleted' },
    { label: 'Status Changed', value: 'status_changed' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Escalated', value: 'escalated' },
    { label: 'Assigned', value: 'assigned' },
    { label: 'Overdue', value: 'overdue' },
  ];

  phaseOptions = [
    { label: 'Plan', value: 'plan' },
    { label: 'Assess', value: 'assess' },
    { label: 'Design', value: 'design' },
    { label: 'Implement', value: 'implement' },
    { label: 'Operate', value: 'operate' },
    { label: 'Assure', value: 'assure' },
    { label: 'Improve', value: 'improve' },
  ];

  actionTypeOptions = [
    { label: 'Notify User', value: 'notify' },
    { label: 'Notify Role', value: 'notify_role' },
    { label: 'Create Task', value: 'create_task' },
    { label: 'Require Approval', value: 'require_approval' },
    { label: 'Trigger Workflow', value: 'trigger_workflow' },
    { label: 'Update Status', value: 'update_status' },
  ];

  roleOptions = [
    { label: 'Owner', value: 'owner' },
    { label: 'Admin', value: 'admin' },
    { label: 'Compliance Officer', value: 'compliance_officer' },
    { label: 'Risk Manager', value: 'risk_manager' },
    { label: 'Auditor', value: 'auditor' },
    { label: 'Viewer', value: 'viewer' },
  ];

  allModules = [
    { label: 'Risks', value: 'risks', icon: 'pi-exclamation-triangle' },
    { label: 'Controls', value: 'controls', icon: 'pi-lock' },
    { label: 'Policies', value: 'policies', icon: 'pi-file' },
    { label: 'Frameworks', value: 'frameworks', icon: 'pi-sitemap' },
    { label: 'Evidence', value: 'evidence', icon: 'pi-paperclip' },
    { label: 'Incidents', value: 'incidents', icon: 'pi-exclamation-circle' },
    { label: 'Vendors', value: 'vendors', icon: 'pi-truck' },
    { label: 'Assessments', value: 'assessments', icon: 'pi-chart-bar' },
    { label: 'Exceptions', value: 'exceptions', icon: 'pi-ban' },
    { label: 'Findings', value: 'findings', icon: 'pi-flag' },
    { label: 'Assets', value: 'assets', icon: 'pi-server' },
  ];

  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  ngOnInit(): void {
    this.loadRules();
    this.loadLog();
    this.loadRoleOptions();
  }

  loadRules(): void {
    this.operationsSvc.getAutomationRules().subscribe({
      next: (r: Record<string, unknown>) => { this.rules = r.rules || []; this.filterRules(); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  loadLog(): void {
    this.operationsSvc.getAutomationLog({ limit: 100 }).subscribe({
      next: (r: Record<string, unknown>) => { this.logEntries = r.entries || []; },
      error: (e: unknown) => devError("[API]", e)
    });
  }

  loadRoleOptions(): void {
    this.operationsSvc.getRoles().subscribe({
      next: (r: Record<string, unknown>) => {
        if (r.roles) {
          this.roleOptions = r.roles.map((role: Record<string, unknown>) => ({
            label: this.i18n.localize(role.name_en, role.name_ar),
            value: role.role_id,
          }));
        }
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }

  filterRules(): void {
    this.filteredRules = this.moduleFilter
      ? this.rules.filter(r => r.module === this.moduleFilter)
      : [...this.rules];
  }

  seedDefaults(): void {
    this.operationsSvc.seedAutomationRules().subscribe({
      next: () => this.loadRules(),
      error: (e: unknown) => devError("[API]", e)
    });
  }

  toggleRule(rule: AutomationRule): void {
    this.operationsSvc.updateAutomationRule(rule.rule_id, { enabled: rule.enabled }).subscribe();
  }

  openCreateDialog(): void {
    this.editingRule = null;
    this.formData = { name: '', description: '', module: 'risks', event: 'created', lifecycle_phase: '', priority: 5, actionType: 'notify_role', actionRole: 'admin', actionTitle: '' };
    this.showDialog = true;
  }

  editRule(rule: AutomationRule): void {
    this.editingRule = rule;
    const firstAction = rule.actions?.[0] || {};
    this.formData = {
      name: rule.name,
      description: rule.description,
      module: rule.module,
      event: rule.event,
      lifecycle_phase: rule.lifecycle_phase,
      priority: rule.priority,
      actionType: firstAction.type || 'notify_role',
      actionRole: firstAction.config?.role || firstAction.config?.approverRole || '',
      actionTitle: firstAction.config?.title || '',
    };
    this.showDialog = true;
  }

  saveRule(): void {
    if (!this.formData.name || !this.formData.module || !this.formData.event) return;

    const actionConfig: Record<string, unknown> = {};
    if (this.formData.actionType === 'notify_role') actionConfig.role = this.formData.actionRole;
    if (this.formData.actionType === 'require_approval') actionConfig.approverRole = this.formData.actionRole;
    if (this.formData.actionType === 'create_task') {
      actionConfig.title = this.formData.actionTitle || 'Follow up: {{entityType}} {{entityId}}';
      actionConfig.assigneeRole = this.formData.actionRole;
    }
    actionConfig.title = actionConfig.title || `[${this.formData.module}] ${this.formData.event}: {{entityId}}`;

    const data = {
      name: this.formData.name,
      description: this.formData.description,
      module: this.formData.module,
      event: this.formData.event,
      lifecycle_phase: this.formData.lifecycle_phase || null,
      priority: this.formData.priority || 5,
      actions: [{ type: this.formData.actionType, config: actionConfig }],
    };

    const obs = this.editingRule
      ? this.operationsSvc.updateAutomationRule(this.editingRule.rule_id, data)
      : this.operationsSvc.createAutomationRule(data);

    obs.subscribe({ next: () => { this.showDialog = false; this.loadRules(); } });
  }

  deleteRule(rule: AutomationRule): void {
    this.operationsSvc.deleteAutomationRule(rule.rule_id).subscribe({ next: () => this.loadRules() });
  }

  getLogCountByStatus(status: string): number {
    return this.logEntries.filter((e: unknown) => e.status === status).length;
  }

  getUniqueModules(): string[] {
    return [...new Set(this.rules.map(r => r.module))];
  }

  getModuleRuleCount(mod: string): number {
    return this.rules.filter(r => r.module === mod).length;
  }

  getModuleEvents(mod: string): string[] {
    return [...new Set(this.rules.filter(r => r.module === mod).map(r => r.event))];
  }

  getActionIcon(type: string): string {
    const map: Record<string, string> = {
      notify: 'pi-bell', notify_role: 'pi-users', create_task: 'pi-list-check',
      require_approval: 'pi-check-square', trigger_workflow: 'pi-bolt',
      update_status: 'pi-refresh', record_activity: 'pi-history', send_email: 'pi-envelope',
    };
    return map[type] || 'pi-circle';
  }

  hasConditions(conditions: Record<string, unknown>): boolean {
    return conditions && Object.keys(conditions).length > 0;
  }

  formatConditions(conditions: Record<string, unknown>): string {
    if (!conditions) return '';
    return Object.entries(conditions)
      .map(([key, val]: [string, any]) => {
        if (typeof val === 'object' && val.field) return `${val.field} ${val.operator} ${val.value}`;
        return `${key} = ${val}`;
      })
      .join(', ');
  }

}
