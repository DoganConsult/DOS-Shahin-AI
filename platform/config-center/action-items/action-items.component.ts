import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-action-items',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent, CardModule, ButtonModule, DropdownModule, TableModule],
  template: `
    <app-page-shell icon="check-square" [title]="i18n.translate('actionItems.title')" [subtitle]="i18n.translate('actionItems.subtitle')" [breadcrumbs]="[i18n.translate('nav.dashboard'), i18n.translate('actionItems.breadcrumb')]" [loading]="loading">
      <div class="flex gap-3 mb-4">
        <p-dropdown [options]="statusFilterOptions" [(ngModel)]="selectedStatus" (onChange)="loadItems()" [placeholder]="i18n.translate('common.allStatuses')" [style]="{'min-width':'180px'}"></p-dropdown>
        <p-dropdown [options]="sourceFilterOptions" [(ngModel)]="selectedSource" (onChange)="loadItems()" [placeholder]="i18n.translate('common.allSources')" [style]="{'min-width':'180px'}"></p-dropdown>
      </div>
      <p-table [attr.aria-label]="i18n.translate('actionItems.ariaItemsTable')" [value]="items" [paginator]="true" [rows]="20" styleClass="p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('actionItems.colTitle') }}</th>
            <th>{{ i18n.translate('common.status') }}</th>
            <th>{{ i18n.translate('actionItems.colSource') }}</th>
            <th>{{i18n.translate('actionItems.assignedTo')}}</th>
            <th>{{i18n.translate('actionItems.deadline')}}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td>{{item.title}}</td>
            <td><app-status-badge [status]="item.status"></app-status-badge></td>
            <td>{{item.sourceType}}</td>
            <td>{{item.assignedTo}}</td>
            <td>{{item.deadline | appDate:'medium'}}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">{{ i18n.translate('actionItems.empty') }}</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class ActionItemsComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  items: Record<string, unknown>[] = [];
  loading = true;
  selectedStatus = '';
  selectedSource = '';
  /** Computed status filter options that react to language changes */
  get statusFilterOptions() {
    return [
      { label: this.i18n.translate('common.allStatuses'), value: '' },
      { label: this.i18n.translate('common.pending'), value: 'pending' },
      { label: this.i18n.translate('common.inProgress'), value: 'in_progress' },
      { label: this.i18n.translate('common.completed'), value: 'completed' },
      { label: this.i18n.translate('common.overdue'), value: 'overdue' },
    ];
  }
  /** Computed source filter options that react to language changes */
  get sourceFilterOptions() {
    return [
      { label: this.i18n.translate('common.allSources'), value: '' },
      { label: this.i18n.translate('actionItems.sourceWorkflow'), value: 'workflow' },
      { label: this.i18n.translate('actionItems.sourceAuditFinding'), value: 'audit_finding' },
      { label: this.i18n.translate('actionItems.sourceRiskTreatment'), value: 'risk_treatment' },
      { label: this.i18n.translate('actionItems.sourceRemediation'), value: 'remediation' },
    ];
  }

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() { this.loadItems(); }

  loadItems() {
    this.loading = true;
    const qs = new URLSearchParams();
    if (this.selectedStatus) qs.set('status', this.selectedStatus);
    if (this.selectedSource) qs.set('sourceType', this.selectedSource);
    const path = qs.toString() ? `/action-items?${qs}` : '/action-items';
    this.apiclientSvc.get(path).subscribe({
      next: (data: any) => { this.items = Array.isArray(data) ? data : data?.items || data?.data || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.items = []; this.loading = false; this.cdr.markForCheck(); }
    });
  }
}
