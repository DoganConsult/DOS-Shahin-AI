import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-manager',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent, RaciPanelComponent, CardModule, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, InputTextarea, DropdownModule, ToolbarModule],
  template: `
    <app-page-shell icon="shield" [title]="i18n.translate('grcOs.exceptions')"
      [subtitle]="'Request, approve, and track compliance exceptions'"
      [breadcrumbs]="['Dashboard', 'Exception Manager']" [loading]="loading">
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button [label]="i18n.translate('grcOs.exceptionRequest')" icon="pi pi-plus" (onClick)="showDialog = true" />
        </ng-template>
      </p-toolbar>
      <div class="grid mb-3">
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ exceptions.length }}</div><div class="stat-label">Total</div></div></div>
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ pendingCount }}</div><div class="stat-label">Pending</div></div></div>
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ approvedCount }}</div><div class="stat-label">Approved</div></div></div>
        <div class="col-3"><div class="stat-box warn"><div class="stat-value">{{ expiringCount }}</div><div class="stat-label">Expiring</div></div></div>
      </div>
      <app-raci-panel entityType="control" entityId="" [canEdit]="true" />
      <p-card>
        <p-table aria-label="Exceptions table" [value]="exceptions" [paginator]="true" [rows]="15" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr><th>Control</th><th>Reason</th><th>Risk Level</th><th>Status</th><th>Expiry</th><th>Actions</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-e>
            <tr>
              <td>{{ e.control_id }}</td>
              <td>{{ e.reason }}</td>
              <td><p-tag [value]="e.risk_level" [severity]="e.risk_level === 'high' ? 'danger' : e.risk_level === 'medium' ? 'warning' : 'info'" /></td>
              <td><app-status-badge [status]="e.status" /></td>
              <td>{{ e.expiry_date | appDate:'medium' }}</td>
              <td>
                @if (e.status === 'pending') {
                  <p-button icon="pi pi-check" size="small" severity="success" class="me-1" (onClick)="approve(e.exception_id)" />
                  <p-button icon="pi pi-times" size="small" severity="danger" (onClick)="reject(e.exception_id)" />
                }
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
      <p-dialog header="New Exception Request" [(visible)]="showDialog" [modal]="true" [style]="{width: '500px'}">
        <div class="flex flex-column gap-3">
          <input pInputText [(ngModel)]="newException.control_id" placeholder="Control ID" aria-label="Control ID" class="w-full" />
          <textarea pInputTextarea [(ngModel)]="newException.reason" placeholder="Reason" aria-label="Reason" rows="3" class="w-full"></textarea>
          <p-dropdown [options]="riskLevels" [(ngModel)]="newException.risk_level" placeholder="Risk Level" styleClass="w-full" />
          <input pInputText [(ngModel)]="newException.expiry_date" placeholder="Expiry Date (YYYY-MM-DD)" aria-label="Expiry Date (YYYY-MM-DD)" class="w-full" />
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" severity="secondary" (onClick)="showDialog = false" />
          <p-button label="Submit" (onClick)="submitException()" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`.stat-box { text-align: center; padding: 1rem; background: var(--surface-card); border-radius: var(--radius); }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--primary-color); }
    .stat-box.warn .stat-value { color: var(--orange-500); }
    .stat-label { font-size: var(--font-size-tag); color: var(--text-color-secondary); }`]
})
export class ExceptionManagerComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false; showDialog = false;
  exceptions: Record<string, any>[] = [];
  pendingCount = 0; approvedCount = 0; expiringCount = 0;
  riskLevels = [{label:'Low',value:'low'},{label:'Medium',value:'medium'},{label:'High',value:'high'}];
  newException = { control_id: '', reason: '', risk_level: 'medium', expiry_date: '' };
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/exception-governance').subscribe({
      next: (data: any) => {
        this.exceptions = data.exceptions || data || [];
        this.pendingCount = this.exceptions.filter((e: any) => e.status === 'pending').length;
        this.approvedCount = this.exceptions.filter((e: any) => e.status === 'approved').length;
        this.expiringCount = this.exceptions.filter((e: any) => e.expiring).length;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
  submitException() {
    this.apiclientSvc.post('/exception-governance', this.newException).subscribe({ next: () => { this.showDialog = false; this.ngOnInit(); } });
  }
  approve(id: string) { this.apiclientSvc.post(`/exception-governance/${id}/approve`, {}).subscribe({ next: () => this.ngOnInit() }); }
  reject(id: string) { this.apiclientSvc.post(`/exception-governance/${id}/reject`, {}).subscribe({ next: () => this.ngOnInit() }); }
}
