import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/infrastructure';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
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
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcFormFieldComponent } from '@app/widgets';
import { GrcOperationsService } from '@app/api';

interface AutomationRule {
  rule_id: string;
  name: string;
  description: string;
  module: string;
  event: string;
  conditions: Record<string, any> | undefined;
  actions: Record<string, any>[];
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
  actions_executed: Record<string, any>[];
  status: string;
  error: string;
  triggered_by: string;
  created_at: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-automation',
    imports: [
        CommonModule, FormsModule, PageShellComponent, GrcDataTableComponent,
        GrcFormFieldComponent, TableModule, TagModule, ButtonModule, DialogModule,
        InputTextModule, DropdownModule, InputSwitchModule,
        TabViewModule, TooltipModule, CardModule, ChipModule, AppDatePipe
    ],
    templateUrl: './automation.component.html',
    styleUrls: ['./automation.component.scss']
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
  formData: Record<string, any> = {};

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
      next: (r: Record<string, any>) => { this.rules = r.rules || []; this.filterRules(); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  loadLog(): void {
    this.operationsSvc.getAutomationLog({ limit: 100 }).subscribe({
      next: (r: Record<string, any>) => { this.logEntries = r.entries || []; },
      error: (e: unknown) => devError("[API]", e)
    });
  }

  loadRoleOptions(): void {
    this.operationsSvc.getRoles().subscribe({
      next: (r: Record<string, any>) => {
        if (r.roles) {
          this.roleOptions = r.roles.map((role: Record<string, any>) => ({
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

    const actionConfig: Record<string, any> = {};
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
      : this.operationsSvc.createAutomationRule(data as any);

    obs.subscribe({ next: () => { this.showDialog = false; this.loadRules(); } });
  }

  deleteRule(rule: AutomationRule): void {
    this.operationsSvc.deleteAutomationRule(rule.rule_id).subscribe({ next: () => this.loadRules() });
  }

  getLogCountByStatus(status: string): number {
    return this.logEntries.filter((e: any) => e.status === status).length;
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

  hasConditions(conditions: Record<string, any>): boolean {
    return conditions && Object.keys(conditions).length > 0;
  }

  formatConditions(conditions: Record<string, any>): string {
    if (!conditions) return '';
    return Object.entries(conditions)
      .map(([key, val]: [string, any]) => {
        if (typeof val === 'object' && val.field) return `${val.field} ${val.operator} ${val.value}`;
        return `${key} = ${val}`;
      })
      .join(', ');
  }

}
