import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    selector: 'app-ai-policy-rules',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, DropdownModule, InputSwitchModule],
    template: `
    <app-page-shell icon="shield"
      [title]="i18n.translate('aiPolicies.title')"
      [subtitle]="i18n.translate('aiPolicies.subtitle')"
      [breadcrumbs]="['Dashboard', 'AI Policy Rules']" [loading]="loading()">
      <div headerActions>
        <p-button icon="pi pi-plus" [label]="i18n.translate('common.add')" (onClick)="showCreate = true" class="mr-2" />
        <p-button icon="pi pi-refresh" [label]="i18n.translate('common.refresh')" severity="secondary" (onClick)="loadData()" />
      </div>
      <p-card>
        <p-table [value]="rules()" [paginator]="true" [rows]="20" [rowHover]="true" responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Scope</th>
              <th>Action</th>
              <th>Severity</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-rule>
            <tr>
              <td>{{ rule.rule_name }}</td>
              <td><p-tag [value]="rule.rule_type" /></td>
              <td>{{ rule.target_scope }}{{ rule.target_id ? ':' + rule.target_id : '' }}</td>
              <td><p-tag [value]="rule.action_on_match" [severity]="getActionSeverity(rule.action_on_match)" /></td>
              <td><p-tag [value]="rule.severity" [severity]="getSeverityTag(rule.severity)" /></td>
              <td><p-inputSwitch [(ngModel)]="rule.enabled" (onChange)="toggleRule(rule)" /></td>
              <td><p-button icon="pi pi-trash" severity="danger" [text]="true" (onClick)="deleteRule(rule)" /></td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7" class="text-center p-4">No policy rules configured</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </app-page-shell>

    <p-dialog header="Add AI Policy Rule" [(visible)]="showCreate" [modal]="true" [style]="{ width: '500px' }">
      <div class="flex flex-column gap-3 mt-3">
        <div class="flex flex-column gap-1">
          <label>Rule Name</label>
          <input pInputText [(ngModel)]="newRule.ruleName" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Type</label>
          <p-dropdown [options]="ruleTypes" [(ngModel)]="newRule.ruleType" placeholder="Select type" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Action on Match</label>
          <p-dropdown [options]="actions" [(ngModel)]="newRule.actionOnMatch" placeholder="Select action" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Severity</label>
          <p-dropdown [options]="severities" [(ngModel)]="newRule.severity" placeholder="Select severity" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="showCreate = false" />
        <p-button label="Create" (onClick)="createRule()" />
      </ng-template>
    </p-dialog>
  `
})
export class AiPolicyRulesComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  loading = signal(true);
  rules = signal<GrcRecord[]>([]);
  showCreate = false;
  newRule = { ruleName: '', ruleType: 'guardrail', actionOnMatch: 'block', severity: 'medium' };
  ruleTypes = ['guardrail', 'budget', 'rate_limit', 'content_filter', 'approval_gate', 'scope_restriction'];
  actions = ['block', 'warn', 'log', 'require_approval', 'throttle'];
  severities = ['low', 'medium', 'high', 'critical'];

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading.set(true);
    this.apiclientSvc.get('/api/ai-os/policy-rules').subscribe({
      next: (res) => { this.rules.set(res?.items || []); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  createRule() {
    this.apiclientSvc.post('/api/ai-os/policy-rules', this.newRule).subscribe({
      next: () => { this.showCreate = false; this.loadData(); },
    });
  }

  toggleRule(rule: GrcRecord) {
    this.apiclientSvc.patch(`/api/ai-os/policy-rules/${rule.rule_id}/toggle`, { enabled: rule.enabled }).subscribe();
  }

  deleteRule(rule: GrcRecord) {
    this.apiclientSvc.del(`/api/ai-os/policy-rules/${rule.rule_id}`).subscribe({ next: () => this.loadData() });
  }

  getActionSeverity(action: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (action) {
      case 'block': return 'danger';
      case 'warn': return 'warning';
      case 'require_approval': return 'warning';
      default: return 'info';
    }
  }

  getSeverityTag(severity: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'danger';
      case 'medium': return 'warning';
      default: return 'info';
    }
  }
}
