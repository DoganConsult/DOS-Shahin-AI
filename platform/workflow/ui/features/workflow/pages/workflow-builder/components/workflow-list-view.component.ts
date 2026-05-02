import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { WorkflowDefinition } from '../workflow-builder.types';

/**
 * Presentational component: renders the workflow list table.
 * Delegates all row actions to the parent via @Output events.
 */
@Component({
  selector: 'app-workflow-list-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AppDatePipe, TableModule, ButtonModule, TagModule, TooltipModule],
  template: `
    <p-table aria-label="Workflows table" [value]="workflows"
      [paginator]="workflows.length > 10" [rows]="10"
      styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true"
      selectionMode="single" (onRowSelect)="edit.emit($event.data)">
      <ng-template pTemplate="header">
        <tr>
          <th>{{ i18n.translate('Name') }}</th>
          <th>{{ i18n.translate('Status') }}</th>
          <th>{{ i18n.translate('Last Modified') }}</th>
          <th style="width:160px">{{ i18n.translate('Actions') }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-wf>
        <tr [pSelectableRow]="wf" class="clickable-row">
          <td>{{ wf.name }}</td>
          <td><p-tag [value]="wf.status || 'draft'" [severity]="getStatusSeverity(wf.status)" /></td>
          <td>{{ (wf.updated_at || wf.created_at) | appDate:'medium' }}</td>
          <td>
            <p-button icon="pi pi-pencil" [text]="true" size="small" pTooltip="Edit"
              (onClick)="edit.emit(wf); $event.stopPropagation()" />
            <p-button icon="pi pi-sitemap" [text]="true" size="small" pTooltip="Visual Canvas"
              (onClick)="openCanvas.emit(wf); $event.stopPropagation()" />
            <p-button icon="pi pi-play" [text]="true" size="small" pTooltip="Simulate"
              (onClick)="simulate.emit(wf); $event.stopPropagation()" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="4" class="empty-msg">{{ i18n.translate('No workflows yet. Create your first workflow.') }}</td></tr>
      </ng-template>
    </p-table>
  `,
  styles: [`
    .empty-msg { text-align: center; padding: 24px; color: var(--text-muted); }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: var(--surface-hover, rgba(var(--color-black-rgb), 0.04)); }
  `],
})
export class WorkflowListViewComponent {
  @Input() workflows: WorkflowDefinition[] = [];
  @Output() edit = new EventEmitter<WorkflowDefinition>();
  @Output() openCanvas = new EventEmitter<WorkflowDefinition>();
  @Output() simulate = new EventEmitter<WorkflowDefinition>();

  constructor(public i18n: I18nService) {}

  getStatusSeverity(status?: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'error': return 'danger';
      default: return 'info';
    }
  }
}
