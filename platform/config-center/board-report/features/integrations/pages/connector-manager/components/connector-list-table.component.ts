/**
 * ConnectorListTableComponent — Dumb presentational component
 * Renders the connectors table with actions (run, health, executions, delete)
 * and the executions tab panel.
 * Parent: ConnectorManagerComponent
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  selector: 'app-connector-list-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, AppDatePipe, StatusBadgeComponent,
    TableModule, TagModule, ButtonModule, TabViewModule, TooltipModule,
  ],
  template: `
    <p-tabView>
      <p-tabPanel [header]="i18n.translate('connectorManager.allConnectors')">
        <p-table [attr.aria-label]="i18n.translate('connectorManager.ariaConnectorsTable')" [value]="connectors" [paginator]="true" [rows]="15" styleClass="p-datatable-sm">
          <ng-template pTemplate="header"><tr><th>{{ i18n.translate('connectorManager.id') }}</th><th>{{ i18n.translate('connectorManager.type') }}</th><th>Platform</th><th>{{ i18n.translate('connectorManager.auth') }}</th><th>{{ i18n.translate('connectorManager.status') }}</th><th>{{ i18n.translate('connectorManager.lastRun') }}</th><th>{{ i18n.translate('connectorManager.actions') }}</th></tr></ng-template>
          <ng-template pTemplate="body" let-c>
            <tr>
              <td><a class="id-link" (click)="detailRequested.emit(c)"><code>{{ (c.connector_id || c.id) | slice:0:8 }}</code></a></td>
              <td><p-tag [value]="c.source_system_type || c.sourceSystemType || c.type" /></td>
              <td>{{ c.platform || '---' }}</td>
              <td>{{ c.auth_method || c.authMethod || c.auth }}</td>
              <td><app-status-badge [status]="c.status || 'active'" /></td>
              <td>{{ (c.last_success_at || c.last_run_at) | appDate:'short' }}</td>
              <td class="actions">
                <p-button icon="pi pi-play" class="p-button-sm p-button-text p-button-success" [pTooltip]="i18n.translate('connectorManager.tooltipRun')" (onClick)="runRequested.emit(c)" />
                <p-button icon="pi pi-heart" class="p-button-sm p-button-text p-button-info" [pTooltip]="i18n.translate('connectorManager.tooltipHealth')" (onClick)="healthRequested.emit(c)" />
                <p-button icon="pi pi-history" class="p-button-sm p-button-text" [pTooltip]="i18n.translate('connectorManager.tooltipExecutions')" (onClick)="executionsRequested.emit(c)" />
                <p-button icon="pi pi-trash" class="p-button-sm p-button-text p-button-danger" [pTooltip]="i18n.translate('connectorManager.tooltipDelete')" (onClick)="deleteRequested.emit(c)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage"><tr><td colspan="7" class="text-center p-4">{{ i18n.translate('connectorManager.noConnectors') }}</td></tr></ng-template>
        </p-table>
      </p-tabPanel>
      <p-tabPanel [header]="i18n.translate('connectorManager.executions')" *ngIf="executions.length > 0">
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('connectorManager.ariaExecutionsTable')" [value]="executions" styleClass="p-datatable-sm">
          <ng-template pTemplate="header"><tr><th>{{ i18n.translate('connectorManager.executionId') }}</th><th>{{ i18n.translate('connectorManager.status') }}</th><th>{{ i18n.translate('connectorManager.records') }}</th><th>{{ i18n.translate('connectorManager.started') }}</th><th>Error</th></tr></ng-template>
          <ng-template pTemplate="body" let-e>
            <tr>
              <td><code>{{ e.execution_id | slice:0:8 }}</code></td>
              <td><p-tag [value]="e.status" [severity]="e.status === 'success' ? 'success' : e.status === 'failed' ? 'danger' : 'info'" /></td>
              <td>{{ e.records_collected || 0 }}</td>
              <td>{{ e.started_at | appDate:'short' }}</td>
              <td class="truncate">{{ e.error_message || '---' }}</td>
            </tr>
          </ng-template>
        </p-table>
      </p-tabPanel>
    </p-tabView>
  `,
  styles: [`
    .actions { display: flex; gap: 4px; }
    .id-link { cursor: pointer; color: var(--primary, #2563eb); text-decoration: underline; }
    .truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .text-center { text-align: center; }
    .p-4 { padding: 16px; }
  `],
})
export class ConnectorListTableComponent {
  i18n = inject(I18nService);

  @Input() connectors: GrcRecord[] = [];
  @Input() executions: GrcRecord[] = [];

  @Output() detailRequested = new EventEmitter<GrcRecord>();
  @Output() runRequested = new EventEmitter<GrcRecord>();
  @Output() healthRequested = new EventEmitter<GrcRecord>();
  @Output() executionsRequested = new EventEmitter<GrcRecord>();
  @Output() deleteRequested = new EventEmitter<GrcRecord>();
}
