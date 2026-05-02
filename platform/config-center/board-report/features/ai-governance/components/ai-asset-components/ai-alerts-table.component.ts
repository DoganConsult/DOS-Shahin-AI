import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcRecord } from '@app/core/models/shared.types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AlertRule {
  id: string;
  rule_name: string;
  description?: string;
  enabled: boolean;
  trigger_condition?: Record<string, unknown>;
  channels?: unknown;
  escalation_chain?: unknown;
  created_at?: string;
  updated_at?: string;
}

export interface AlertHistoryEntry {
  id: string;
  rule_id?: string;
  rule_name?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'fired' | 'acknowledged' | 'resolved';
  message?: string;
  fired_at: string;
  acknowledged_at?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-ai-alerts-table',
    imports: [
        CommonModule,
        FormsModule,
        DatePipe,
        TableModule,
        TagModule,
        ButtonModule,
        InputSwitchModule,
        ToolbarModule,
        TooltipModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- Alert Rules Section -->
    <div class="section-title">{{ i18n.translate('aiGov.alerts.rulesTitle') || 'Alert Rules' }}</div>

    <p-toolbar styleClass="mb-3">
      <ng-template #start>
        <button pButton icon="pi pi-plus"
          [label]="i18n.translate('aiGov.alerts.newRule') || 'New Alert Rule'"
          class="p-button-sm"
          (click)="newRule.emit()">
        </button>
      </ng-template>
      <ng-template #end>
        <button pButton icon="pi pi-refresh"
          class="p-button-sm p-button-text"
          [pTooltip]="i18n.translate('common.refresh') || 'Refresh'"
          (click)="refresh.emit()">
        </button>
      </ng-template>
    </p-toolbar>

    <p-table
      [value]="rules"
      [paginator]="rules.length > 10"
      [rows]="10"
      [rowHover]="true"
      styleClass="p-datatable-sm p-datatable-gridlines">
      <ng-template pTemplate="header">
        <tr>
          <th>{{ i18n.translate('aiGov.alerts.col.name') || 'Rule Name' }}</th>
          <th>{{ i18n.translate('aiGov.alerts.col.description') || 'Description' }}</th>
          <th class="col-w-100">{{ i18n.translate('aiGov.alerts.col.enabled') || 'Enabled' }}</th>
          <th>{{ i18n.translate('aiGov.alerts.col.trigger') || 'Trigger' }}</th>
          <th>{{ i18n.translate('aiGov.alerts.col.channels') || 'Channels' }}</th>
          <th class="col-w-120">{{ i18n.translate('common.actions') || 'Actions' }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-rule>
        <tr>
          <td class="fw-semibold">{{ rule.rule_name }}</td>
          <td>{{ rule.description || '-' }}</td>
          <td>
            <p-inputSwitch
              [ngModel]="rule.enabled"
              (ngModelChange)="toggleRule.emit({ rule: rule, enabled: $event })">
            </p-inputSwitch>
          </td>
          <td>{{ formatTrigger(rule.trigger_condition) }}</td>
          <td>{{ formatChannels(rule.channels) }}</td>
          <td>
            <button pButton icon="pi pi-pencil"
              class="p-button-sm p-button-text p-button-secondary me-2"
              [pTooltip]="i18n.translate('common.edit') || 'Edit'"
              (click)="editRule.emit(rule)">
            </button>
            <button pButton icon="pi pi-trash"
              class="p-button-sm p-button-text p-button-danger"
              [pTooltip]="i18n.translate('common.delete') || 'Delete'"
              (click)="deleteRule.emit(rule)">
            </button>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6" class="empty-cell">
            {{ i18n.translate('aiGov.alerts.noRules') || 'No alert rules configured.' }}
          </td>
        </tr>
      </ng-template>
    </p-table>

    <!-- Alert History Section -->
    <div class="section-title mt-section">
      {{ i18n.translate('aiGov.alerts.historyTitle') || 'Alert History' }}
    </div>

    <p-table
      [value]="history"
      [paginator]="history.length > 10"
      [rows]="10"
      [rowHover]="true"
      styleClass="p-datatable-sm p-datatable-gridlines">
      <ng-template pTemplate="header">
        <tr>
          <th>{{ i18n.translate('aiGov.alerts.col.timestamp') || 'Timestamp' }}</th>
          <th>{{ i18n.translate('aiGov.alerts.col.ruleName') || 'Rule' }}</th>
          <th>{{ i18n.translate('aiGov.alerts.col.severity') || 'Severity' }}</th>
          <th>{{ i18n.translate('aiGov.alerts.col.status') || 'Status' }}</th>
          <th>{{ i18n.translate('aiGov.alerts.col.message') || 'Message' }}</th>
          <th class="col-w-120">{{ i18n.translate('common.actions') || 'Actions' }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-alert>
        <tr>
          <td>{{ alert.fired_at | date:'short' }}</td>
          <td>{{ alert.rule_name || '-' }}</td>
          <td><p-tag [value]="alert.severity" [severity]="severityColor(alert.severity)" /></td>
          <td><p-tag [value]="alert.status" [severity]="alertStatusColor(alert.status)" /></td>
          <td>{{ alert.message || '-' }}</td>
          <td>
            @if (alert.status === 'fired') {
              <button pButton icon="pi pi-check"
                [label]="i18n.translate('aiGov.alerts.acknowledge') || 'Ack'"
                class="p-button-sm p-button-outlined p-button-success"
                [loading]="ackingId === alert.id"
                (click)="acknowledge.emit(alert)">
              </button>
            }
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6" class="empty-cell">
            {{ i18n.translate('aiGov.alerts.noHistory') || 'No alert history yet.' }}
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
    styles: [`
    .section-title { font-size:var(--font-size-lg); font-weight:700; color:var(--text-heading); margin:16px 0 8px; }
    .mb-3 { margin-bottom:16px; }
    .me-2 { margin-inline-end:8px; }
    .col-w-100 { width:100px; }
    .col-w-120 { width:120px; }
    .fw-semibold { font-weight:600; }
    .empty-cell { text-align:center; padding:24px; color:var(--text-muted); }
    .mt-section { margin-top:24px; }
  `]
})
export class AiAlertsTableComponent {
  readonly i18n = inject(I18nService);

  /** Alert rules to display. */
  @Input() rules: AlertRule[] = [];

  /** Alert history entries to display. */
  @Input() history: AlertHistoryEntry[] = [];

  /** ID of the alert currently being acknowledged (for loading state). */
  @Input() ackingId: string | null = null;

  /** Emitted when "New Alert Rule" is clicked. */
  @Output() newRule = new EventEmitter<void>();

  /** Emitted when refresh is clicked. */
  @Output() refresh = new EventEmitter<void>();

  /** Emitted when a rule's edit button is clicked. */
  @Output() editRule = new EventEmitter<AlertRule>();

  /** Emitted when a rule's delete button is clicked. */
  @Output() deleteRule = new EventEmitter<AlertRule>();

  /** Emitted when a rule's enabled toggle changes. */
  @Output() toggleRule = new EventEmitter<{ rule: AlertRule; enabled: boolean }>();

  /** Emitted when an alert's acknowledge button is clicked. */
  @Output() acknowledge = new EventEmitter<AlertHistoryEntry>();

  /** Format trigger condition for display. */
  formatTrigger(cond: GrcRecord): string {
    if (!cond) return '-';
    if (typeof cond === 'string') return cond;
    const str = JSON.stringify(cond);
    return str.substring(0, 60) + (str.length > 60 ? '...' : '');
  }

  /** Format channels for display. */
  formatChannels(channels: GrcRecord): string {
    if (!channels) return '-';
    if (Array.isArray(channels)) return channels.join(', ');
    if (typeof channels === 'string') return channels;
    return JSON.stringify(channels).substring(0, 40);
  }

  /** Map severity to PrimeNG tag severity. */
  severityColor(severity: string): 'danger' | 'warning' | 'info' | 'success' | 'secondary' {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'secondary';
    }
  }

  /** Map alert status to PrimeNG tag severity. */
  alertStatusColor(status: string): 'danger' | 'warning' | 'success' | 'secondary' {
    switch (status) {
      case 'fired': return 'danger';
      case 'acknowledged': return 'warning';
      case 'resolved': return 'success';
      default: return 'secondary';
    }
  }
}
