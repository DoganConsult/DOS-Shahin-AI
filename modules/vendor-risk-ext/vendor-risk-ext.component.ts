import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vendor-risk-ext',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent, RaciPanelComponent, TableModule, TagModule, ButtonModule, TabViewModule, DialogModule, InputTextModule, InputNumberModule, ToastModule],
  providers: [MessageService],
  template: `
    <app-page-shell icon="shield" [title]="i18n.translate('vendorRiskExt.title')"
      [subtitle]="i18n.translate('vendorRiskExt.subtitle')"
      [breadcrumbs]="[i18n.translate('vendorRiskExt.breadcrumbAdmin'), i18n.translate('vendorRiskExt.breadcrumbVendorRiskExt')]" [loading]="loading">
      <app-raci-panel entityType="vendor" [entityId]="riskRegister[0]?.id || riskRegister[0]?.vendor_id || ''" [canEdit]="true" />
      <p-tabView *ngIf="!error">
        <p-tabPanel [header]="i18n.translate('vendorRiskExt.riskRegister')">
          <p-table [attr.aria-label]="i18n.translate('vendorRiskExt.ariaRiskRegisterTable')" [value]="riskRegister" [paginator]="true" [rows]="15" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>{{ i18n.translate('vendorRisk.vendor') }}</th><th>{{ i18n.translate('vendorRisk.tier') }}</th><th>{{ i18n.translate('vendorRisk.score') }}</th><th>{{ i18n.translate('vendorsPage.status') }}</th><th>{{ i18n.translate('vendorRisk.reviewDue') }}</th></tr></ng-template>
            <ng-template pTemplate="body" let-v>
              <tr>
                <td>{{ v.name }}</td>
                <td><p-tag [value]="v.tier" [severity]="v.tier === 'critical' ? 'danger' : v.tier === 'high' ? 'warning' : 'info'" /></td>
                <td>{{ v.risk_score || v.score || '—' }}</td>
                <td><app-status-badge [status]="v.status || 'active'" /></td>
                <td>{{ v.review_due | appDate:'medium' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">{{ i18n.translate('vendorRiskExt.noVendorsInRegister') }}</td></tr></ng-template>
          </p-table>
        </p-tabPanel>
        <p-tabPanel [header]="i18n.translate('vendorRiskExt.dueReviews')">
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('vendorRiskExt.ariaDueReviewsTable')" [value]="dueReviews" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>{{ i18n.translate('vendorRisk.vendor') }}</th><th>{{ i18n.translate('vendorRisk.tier') }}</th><th>{{ i18n.translate('vendorRiskExt.lastReview') }}</th><th>{{ i18n.translate('vendorRiskExt.dueDate') }}</th></tr></ng-template>
            <ng-template pTemplate="body" let-v>
              <tr>
                <td>{{ v.name }}</td>
                <td><p-tag [value]="v.tier" /></td>
                <td>{{ v.last_review | appDate:'medium' }}</td>
                <td>{{ v.review_due | appDate:'medium' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">{{ i18n.translate('vendorRiskExt.noReviewsDue') }}</td></tr></ng-template>
          </p-table>
        </p-tabPanel>
        <p-tabPanel [header]="i18n.translate('vendorRiskExt.onboardVendor')">
          <div class="form-grid">
            <div class="field"><label>{{ i18n.translate('vendorRiskExt.vendorName') }}</label><input pInputText [(ngModel)]="onboard.name" class="w-full" /></div>
            <div class="field"><label>{{ i18n.translate('vendorRiskExt.category') }}</label><input pInputText [(ngModel)]="onboard.category" class="w-full" /></div>
            <div class="field"><label>{{ i18n.translate('vendorRiskExt.dataAccess') }}</label><p-inputNumber [(ngModel)]="onboard.dataAccess" [min]="1" [max]="5" /></div>
            <div class="field"><label>{{ i18n.translate('vendorRiskExt.criticality') }}</label><p-inputNumber [(ngModel)]="onboard.criticality" [min]="1" [max]="5" /></div>
            <div class="field"><label>{{ i18n.translate('vendorRiskExt.regulatoryExposure') }}</label><p-inputNumber [(ngModel)]="onboard.regulatoryExposure" [min]="1" [max]="5" /></div>
            <p-button [label]="i18n.translate('vendorRiskExt.onboard')" icon="pi pi-user-plus" (onClick)="onboardVendor()" />
          </div>
        </p-tabPanel>
      </p-tabView>

      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="load()">{{ i18n.translate('common.retry') }}</button>
      </div>
    </app-page-shell>
    <p-toast />
  `,
  styles: [`
    .form-grid { max-width: 500px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 4px; }
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `]
})
export class VendorRiskExtComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  error = '';
  riskRegister: GrcRecord[] = [];
  dueReviews: GrcRecord[] = [];
  onboard = { name: '', category: '', dataAccess: 3, criticality: 3, regulatoryExposure: 3 };

  constructor(public i18n: I18nService, private msg: MessageService, private apiclientSvc: ApiClientService) {}

  load(): void {
    this.error = '';
    this.loading = true;
    this.cdr.markForCheck();
    this.apiclientSvc.get('/vendor-risk/vendors/risk-register').subscribe({
      next: (d) => { this.riskRegister = asArray(d, 'vendors'); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = this.i18n.translate('common.failedToLoad'); this.loading = false; this.cdr.markForCheck(); }
    });
    this.apiclientSvc.get('/vendor-risk/vendors/reviews/due').subscribe({
      next: (d) => { this.dueReviews = asArray(d, 'vendors'); this.cdr.markForCheck(); }
    });
  }

  ngOnInit() {
    this.load();
  }

  onboardVendor() {
    if (!this.onboard.name) return;
    this.apiclientSvc.post('/vendor-risk/vendors/onboard', {
      name: this.onboard.name, category: this.onboard.category,
      factors: { dataAccess: this.onboard.dataAccess, criticality: this.onboard.criticality, regulatoryExposure: this.onboard.regulatoryExposure },
      completedSteps: ['nda_signed', 'security_review', 'contract_review'],
    }).subscribe({
      next: (d) => { this.msg.add({ severity: 'success', summary: this.i18n.translate('common.vendorOnboardedTier', { tier: String(d?.tier ?? '') }), detail: '' }); this.load(); },
      error: (e) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e.error?.error || e.error?.missingSteps?.join(', ') }); }
    });
  }
}
