/**
 * Control Monitoring Signals Tab — AGRC-OS Controls Module
 * Shows active rules, recent signals, and alert history for this control.
 */
import { Component, Input, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ControlsApiService } from '../../../services/controls-api.service';
import type { ControlDetailDto, MonitoringRuleDto, MonitoringAlertDto } from '../../../services/controls-api.types';

@Component({
    selector: 'app-control-monitoring-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TableModule, EmptyStateComponent, SkeletonLoaderComponent, StatusBadgeComponent],
    template: `
    @if (!control) {
      <app-empty-state
        [title]="i18n.isAr() ? 'لا توجد بيانات' : 'No data available'"
        [variant]="'default'" />
    } @else {
      <div class="monitoring-content" [dir]="i18n.direction()">

        <!-- Monitoring Status -->
        <div class="monitoring-header">
          <span class="monitoring-status-label">{{ i18n.isAr() ? 'حالة المراقبة:' : 'Monitoring Status:' }}</span>
          <app-status-badge [status]="control.monitoringStatus || 'inactive'" />
        </div>

        <!-- Active Rules -->
        <h4 class="section-heading">{{ i18n.isAr() ? 'القواعد النشطة' : 'Active Rules' }}</h4>
        @if (loadingRules()) {
          <app-skeleton-loader [variant]="'list'" [count]="2" />
        } @else if (rules().length === 0) {
          <app-empty-state
            [title]="i18n.isAr() ? 'لا توجد قواعد مراقبة' : 'No monitoring rules'"
            [description]="i18n.isAr() ? 'لم يتم تعريف قواعد مراقبة لهذا الضابط.' : 'No monitoring rules have been defined for this control.'"
            [variant]="'default'" />
        } @else {
          <p-table [value]="rules()" styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isAr() ? 'اسم القاعدة' : 'Rule Name' }}</th>
                <th>{{ i18n.isAr() ? 'المصدر' : 'Source' }}</th>
                <th>{{ i18n.isAr() ? 'المقياس' : 'Metric' }}</th>
                <th>{{ i18n.isAr() ? 'العامل' : 'Operator' }}</th>
                <th>{{ i18n.isAr() ? 'الحد' : 'Threshold' }}</th>
                <th>{{ i18n.isAr() ? 'الخطورة' : 'Severity' }}</th>
                <th>{{ i18n.isAr() ? 'حالة' : 'Active' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-rule>
              <tr>
                <td>{{ rule.ruleName }}</td>
                <td>{{ rule.signalSource || '--' }}</td>
                <td>{{ rule.metric || '--' }}</td>
                <td>{{ rule.operator || '--' }}</td>
                <td>{{ rule.threshold ?? '--' }}</td>
                <td>
                  <span class="severity-tag" [attr.data-severity]="rule.severity">{{ rule.severity }}</span>
                </td>
                <td>
                  <i class="pi" [class.pi-check-circle]="rule.active" [class.pi-times-circle]="!rule.active"
                     [style.color]="rule.active ? 'var(--success)' : 'var(--text-muted)'"></i>
                </td>
              </tr>
            </ng-template>
          </p-table>
        }

        <!-- Alert History -->
        <h4 class="section-heading" style="margin-top: 28px;">{{ i18n.isAr() ? 'سجل التنبيهات' : 'Alert History' }}</h4>
        @if (loadingAlerts()) {
          <app-skeleton-loader [variant]="'list'" [count]="3" />
        } @else if (alerts().length === 0) {
          <app-empty-state
            [title]="i18n.isAr() ? 'لا توجد تنبيهات' : 'No alerts'"
            [description]="i18n.isAr() ? 'لم يتم تسجيل تنبيهات لهذا الضابط.' : 'No alerts have been recorded for this control.'"
            [variant]="'default'" />
        } @else {
          <p-table [value]="alerts()" [rows]="10" [paginator]="alerts().length > 10"
                   styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isAr() ? 'الخطورة' : 'Severity' }}</th>
                <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
                <th>{{ i18n.isAr() ? 'تاريخ الاكتشاف' : 'Detected' }}</th>
                <th>{{ i18n.isAr() ? 'تم الاعتراف بواسطة' : 'Acknowledged By' }}</th>
                <th>{{ i18n.isAr() ? 'تاريخ الحل' : 'Resolved' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-alert>
              <tr>
                <td>
                  <span class="severity-tag" [attr.data-severity]="alert.severity">{{ alert.severity }}</span>
                </td>
                <td><app-status-badge [status]="alert.status" /></td>
                <td>{{ alert.detectedAt | date:'medium' }}</td>
                <td>{{ alert.acknowledgedBy || '--' }}</td>
                <td>{{ alert.resolvedAt ? (alert.resolvedAt | date:'medium') : '--' }}</td>
              </tr>
            </ng-template>
          </p-table>
        }

      </div>
    }
  `,
    styles: [`
    .monitoring-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .monitoring-status-label {
      font-size: var(--font-size-sm, 13px);
      font-weight: 600;
      color: var(--text-body);
    }

    .section-heading {
      margin: 0 0 12px;
      font-size: var(--font-size-base, 14px);
      font-weight: 700;
      color: var(--text-body);
    }

    .severity-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--radius-xl, 16px);
      font-size: var(--font-size-xs, 11px);
      font-weight: 700;
      text-transform: capitalize;
    }

    .severity-tag[data-severity="critical"] {
      background: color-mix(in srgb, var(--severity-critical) 12%, transparent);
      color: var(--severity-critical);
    }
    .severity-tag[data-severity="high"] {
      background: color-mix(in srgb, var(--severity-high) 12%, transparent);
      color: var(--severity-high);
    }
    .severity-tag[data-severity="medium"] {
      background: color-mix(in srgb, var(--severity-medium) 12%, transparent);
      color: var(--severity-medium);
    }
    .severity-tag[data-severity="low"] {
      background: color-mix(in srgb, var(--severity-low) 12%, transparent);
      color: var(--severity-low);
    }
  `]
})
export class ControlMonitoringTabComponent implements OnInit {
  @Input() control: ControlDetailDto | null = null;

  i18n = inject(I18nService);
  private api = inject(ControlsApiService);

  loadingRules = signal(false);
  loadingAlerts = signal(false);
  rules = signal<MonitoringRuleDto[]>([]);
  alerts = signal<MonitoringAlertDto[]>([]);

  ngOnInit(): void {
    if (this.control?.id) {
      this.loadRules();
      this.loadAlerts();
    }
  }

  private loadRules(): void {
    this.loadingRules.set(true);
    this.api.getMonitoringRules().subscribe({
      next: (data) => {
        const filtered = data.filter(r => r.controlId === this.control!.id);
        this.rules.set(filtered);
        this.loadingRules.set(false);
      },
      error: () => { this.loadingRules.set(false); },
    });
  }

  private loadAlerts(): void {
    this.loadingAlerts.set(true);
    this.api.getMonitoringAlerts().subscribe({
      next: (data) => {
        const filtered = data.filter(a => a.controlId === this.control!.id);
        this.alerts.set(filtered);
        this.loadingAlerts.set(false);
      },
      error: () => { this.loadingAlerts.set(false); },
    });
  }
}
