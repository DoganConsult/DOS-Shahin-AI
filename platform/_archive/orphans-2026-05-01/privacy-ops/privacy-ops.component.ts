import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-privacy-ops',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent, CardModule, TabViewModule, TableModule, TagModule, ButtonModule, AiPanelComponent, RaciPanelComponent],
  template: `
    <app-page-shell icon="lock" [title]="i18n.translate('grcOs.privacy')"
      [subtitle]="'PDPL privacy operations — RoPA, DSR, consent, breach, retention'"
      [breadcrumbs]="['Dashboard', 'Privacy Operations']" [loading]="loading">
      <app-raci-panel entityType="policy" entityId="" [canEdit]="true" />
      <p-tabView>
        <p-tabPanel [header]="i18n.translate('grcOs.ropa')">
          <p-table aria-label="Ropa table" [value]="ropa" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>Activity</th><th>Purpose</th><th>Data Categories</th><th>Legal Basis</th><th>Retention</th></tr></ng-template>
            <ng-template pTemplate="body" let-r>
              <tr><td>{{ r.activity }}</td><td>{{ r.purpose }}</td><td>{{ r.data_categories }}</td><td>{{ r.legal_basis }}</td><td>{{ r.retention_period }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
        <p-tabPanel [header]="i18n.translate('grcOs.dsr')">
          <p-button label="New DSR" icon="pi pi-plus" class="mb-3" (onClick)="createDSR()" />
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Dsrs table" [value]="dsrs" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>Subject</th><th>Type</th><th>Status</th><th>SLA</th></tr></ng-template>
            <ng-template pTemplate="body" let-d>
              <tr><td>{{ d.subject }}</td><td>{{ d.request_type }}</td><td><app-status-badge [status]="d.status" /></td><td>{{ d.sla_days }} days</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
        <p-tabPanel [header]="i18n.translate('grcOs.consentTracker')">
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Consents table" [value]="consents" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>Subject</th><th>Purpose</th><th>Status</th><th>Date</th></tr></ng-template>
            <ng-template pTemplate="body" let-c>
              <tr><td>{{ c.subject_id }}</td><td>{{ c.purpose }}</td><td><p-tag [value]="c.status" [severity]="c.status === 'granted' ? 'success' : 'danger'" /></td><td>{{ c.created_at | appDate:'short' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
        <p-tabPanel [header]="i18n.translate('grcOs.breachHandler')">
          <p-button label="Report Breach" icon="pi pi-exclamation-triangle" severity="danger" class="mb-3" (onClick)="reportBreach()" />
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Breaches table" [value]="breaches" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>Description</th><th>Severity</th><th>Status</th><th>Reported</th><th>Notified</th></tr></ng-template>
            <ng-template pTemplate="body" let-b>
              <tr>
                <td>{{ b.description }}</td>
                <td><p-tag [value]="b.severity || 'medium'" [severity]="b.severity === 'high' ? 'danger' : b.severity === 'low' ? 'success' : 'warning'" /></td>
                <td><app-status-badge [status]="b.status" /></td>
                <td>{{ b.reported_at | appDate:'short' }}</td>
                <td><i class="pi" [ngClass]="b.authority_notified ? 'pi-check text-green-500' : 'pi-times text-red-500'"></i></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No breaches reported</td></tr></ng-template>
          </p-table>
        </p-tabPanel>
        <p-tabPanel [header]="i18n.translate('grcOs.retentionMonitor')">
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Retention table" [value]="retention" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>Data Category</th><th>Retention Period</th><th>Expiry Date</th><th>Status</th><th>Records</th></tr></ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td>{{ r.category }}</td>
                <td>{{ r.retention_period }}</td>
                <td>{{ r.expiry_date | appDate:'medium' }}</td>
                <td><p-tag [value]="r.status || 'active'" [severity]="r.status === 'expired' ? 'danger' : r.status === 'expiring' ? 'warning' : 'success'" /></td>
                <td>{{ r.record_count || 0 }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No retention policies configured</td></tr></ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>
    <app-ai-panel module="privacy" />
  `
})
export class PrivacyOpsComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  ropa: Record<string, unknown>[] = []; dsrs: Record<string, unknown>[] = []; consents: Record<string, unknown>[] = [];
  breaches: Record<string, unknown>[] = []; retention: Record<string, unknown>[] = [];
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/privacy-ops/ropa').subscribe({ next: (d: Record<string, unknown>) => { this.ropa = asArray(d, 'entries'); this.loading = false; this.cdr.markForCheck(); }, error: () => { this.loading = false; this.cdr.markForCheck(); } });
    this.apiclientSvc.get('/privacy-ops/dsr').subscribe({ next: (d: Record<string, unknown>) => { this.dsrs = asArray(d, 'requests'); } });
    this.apiclientSvc.get('/privacy-ops/consent').subscribe({ next: (d: Record<string, unknown>) => { this.consents = asArray(d, 'records'); } });
    this.apiclientSvc.get('/privacy-ops/breaches').subscribe({ next: (d: Record<string, unknown>) => { this.breaches = asArray(d, 'breaches'); } });
    this.apiclientSvc.get('/privacy-ops/retention').subscribe({ next: (d: Record<string, unknown>) => { this.retention = asArray(d, 'policies'); } });
  }
  createDSR() {
    this.apiclientSvc.post('/privacy-ops/dsr', { subject: 'New Request', request_type: 'access' }).subscribe({
      next: () => { this.apiclientSvc.get('/privacy-ops/dsr').subscribe({ next: (d: Record<string, unknown>) => { this.dsrs = asArray(d, 'requests'); } }); }
    });
  }
  reportBreach() {
    this.apiclientSvc.post('/privacy-ops/breaches', { description: 'New breach report', severity: 'medium' }).subscribe({
      next: () => { this.apiclientSvc.get('/privacy-ops/breaches').subscribe({ next: (d: Record<string, unknown>) => { this.breaches = asArray(d, 'breaches'); } }); }
    });
  }
}
