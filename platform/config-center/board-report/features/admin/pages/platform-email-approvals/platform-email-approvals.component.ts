import { Component, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-platform-email-approvals',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, TableModule, TagModule, ButtonModule, InputTextarea, DropdownModule, DialogModule, TooltipModule],
    template: `
    <app-page-shell icon="envelope" [title]="i18n.translate('platformEmailApprovals.title')"
      [subtitle]="i18n.translate('platformEmailApprovals.subtitle')"
      [breadcrumbs]="['Admin', 'Email Approvals']" [loading]="loading()">

      <div class="flex gap-2 mb-3">
        <p-button [label]="i18n.translate('platformEmailApprovals.all')" [severity]="!statusFilter ? 'primary' : 'secondary'" (onClick)="filterByStatus(undefined)" size="small" />
        <p-button [label]="i18n.translate('platformEmailApprovals.pending')" [severity]="statusFilter === 'pending' ? 'warning' : 'secondary'" (onClick)="filterByStatus('pending')" size="small" />
        <p-button [label]="i18n.translate('platformEmailApprovals.approved')" [severity]="statusFilter === 'approved' ? 'success' : 'secondary'" (onClick)="filterByStatus('approved')" size="small" />
        <p-button [label]="i18n.translate('platformEmailApprovals.denied')" [severity]="statusFilter === 'denied' ? 'danger' : 'secondary'" (onClick)="filterByStatus('denied')" size="small" />
      </div>

      <p-table aria-label="Data table" [value]="approvals()" styleClass="p-datatable-sm p-datatable-striped" [paginator]="approvals().length > 10" [rows]="10">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('platformEmailApprovals.tenant') }}</th>
            <th>{{ i18n.translate('platformEmailApprovals.organization') }}</th>
            <th>{{ i18n.translate('platformEmailApprovals.status') }}</th>
            <th>{{ i18n.translate('platformEmailApprovals.requestedBy') }}</th>
            <th>{{ i18n.translate('platformEmailApprovals.requested') }}</th>
            <th>{{ i18n.translate('platformEmailApprovals.reviewNote') }}</th>
            <th>{{ i18n.translate('platformEmailApprovals.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td><code>{{ row.tenantId }}</code></td>
            <td>{{ row.orgName || '—' }}</td>
            <td>
              <p-tag
                [value]="row.status"
                [severity]="row.status === 'approved' ? 'success' : row.status === 'pending' ? 'warning' : 'danger'" />
            </td>
            <td>{{ row.requestedBy || '—' }}</td>
            <td>{{ row.requestedAt | appDate:'short' }}</td>
            <td>{{ row.reviewNote || '—' }}</td>
            <td>
              <div class="flex gap-1">
                <p-button *ngIf="row.status === 'pending'" icon="pi pi-check" severity="success" size="small" pTooltip="Approve" (onClick)="openReview(row, 'approved')" />
                <p-button *ngIf="row.status === 'pending'" icon="pi pi-times" severity="danger" size="small" pTooltip="Deny" (onClick)="openReview(row, 'denied')" />
                <p-button *ngIf="row.status === 'approved'" icon="pi pi-ban" severity="warning" size="small" pTooltip="Revoke" (onClick)="openReview(row, 'revoked')" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center p-4">{{ i18n.translate('platformEmailApprovals.noRequests') }}</td></tr>
        </ng-template>
      </p-table>

      <p-dialog [header]="i18n.translate('platformEmailApprovals.reviewRequest')" [(visible)]="reviewDialogVisible" [modal]="true" [style]="{width:'400px'}">
        <div class="flex flex-column gap-3">
          <div>
            <span class="font-semibold">{{ i18n.translate('platformEmailApprovals.tenantLabel') }}</span> {{ reviewTarget?.tenantId }} ({{ reviewTarget?.orgName || '—' }})
          </div>
          <div>
            <span class="font-semibold">{{ i18n.translate('platformEmailApprovals.decisionLabel') }}</span>
            <p-tag [value]="reviewDecision" [severity]="reviewDecision === 'approved' ? 'success' : reviewDecision === 'denied' ? 'danger' : 'warning'" class="ml-2" />
          </div>
          <div class="flex flex-column gap-2">
            <label>{{ i18n.translate('platformEmailApprovals.noteOptional') }}</label>
            <textarea pInputTextarea [(ngModel)]="reviewNote" rows="3" class="w-full"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('platformEmailApprovals.cancel')" severity="secondary" (onClick)="reviewDialogVisible = false" />
          <p-button [label]="i18n.translate('platformEmailApprovals.confirm')" icon="pi pi-check" (onClick)="submitReview()" [loading]="reviewing()" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `
})
export class PlatformEmailApprovalsComponent implements OnInit {
  loading = signal(false);
  approvals = signal<GrcRecord[]>([]);
  statusFilter: string | undefined;
  reviewing = signal(false);
  reviewDialogVisible = false;
  reviewTarget: Record<string, any> | null = null;
  reviewDecision = '';
  reviewNote = '';

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loadApprovals();
  }

  loadApprovals() {
    this.loading.set(true);
    const url = this.statusFilter
      ? `/tenant-email-config/platform-approval/list?status=${this.statusFilter}`
      : '/tenant-email-config/platform-approval/list';
    this.apiclientSvc.get(url).subscribe({
      next: (d: Record<string, any>) => {
        this.approvals.set(d.approvals || []);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  filterByStatus(status: string | undefined) {
    this.statusFilter = status;
    this.loadApprovals();
  }

  openReview(row: Record<string, any>, decision: string) {
    this.reviewTarget = row;
    this.reviewDecision = decision;
    this.reviewNote = '';
    this.reviewDialogVisible = true;
  }

  submitReview() {
    if (!this.reviewTarget) return;
    this.reviewing.set(true);
    this.apiclientSvc.post('/tenant-email-config/platform-approval/review', {
      tenantId: this.reviewTarget.tenantId,
      decision: this.reviewDecision,
      note: this.reviewNote || undefined,
    }).subscribe({
      next: () => {
        this.reviewing.set(false);
        this.reviewDialogVisible = false;
        this.loadApprovals();
      },
      error: () => { this.reviewing.set(false); }
    });
  }
}
