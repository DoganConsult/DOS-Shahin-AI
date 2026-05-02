import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClientService } from "@app/core/services/api-client.service";

interface EvidenceItem {
  evidence_id: string; control_id: string; title: string;
  expiry_date: string; submitted_by: string; version: number; created_at: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-expiry',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule, TabViewModule],
    styles: [`
    .stat-row { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .stat-box { padding: 14px 20px; border-radius: var(--radius-md); background: var(--surface-card); border: 1px solid var(--surface-border); min-width: 140px; }
    .stat-box.warn { border-color: #fca5a5; }
    .stat-box.alert { border-color: #fde68a; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .stat-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .expired-date { color: var(--error); font-weight: 600; }
    .expiring-date { color: var(--warning); font-weight: 600; }
    .empty-state { text-align: center; padding: 48px 20px; color: var(--text-color-secondary); }
  `],
    template: `
    <app-page-shell icon="calendar"
      [title]="i18n.translate('evidenceExpiry.title')"
      [subtitle]="i18n.translate('evidenceExpiry.subtitle')"
      [breadcrumbs]="['Dashboard', 'Evidence', 'Expiry']"
      [loading]="loading">

      <div class="stat-row">
        <div class="stat-box alert"><div class="stat-value">{{ expiringSoon.length }}</div><div class="stat-label">{{ i18n.translate('evidenceExpiry.expiring30Days') }}</div></div>
        <div class="stat-box warn"><div class="stat-value">{{ expired.length }}</div><div class="stat-label">{{ i18n.translate('evidenceExpiry.expired') }}</div></div>
      </div>

      <p-tabView [activeIndex]="activeTab">
        <p-tabPanel [header]="i18n.translate('evidenceExpiry.expiringSoon')">
          @if (expiringSoon.length === 0) {
            <div class="empty-state">{{ i18n.translate('evidenceExpiry.noExpiringSoon') }}</div>
          } @else {
            <p-table aria-label="Expiring Soon table" [value]="expiringSoon" [paginator]="true" [rows]="15" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.translate('evidenceExpiry.colTitle') }}</th>
                  <th>{{ i18n.translate('evidenceExpiry.colControl') }}</th>
                  <th>{{ i18n.translate('evidenceExpiry.colExpiryDate') }}</th>
                  <th>{{ i18n.translate('evidenceExpiry.colVersion') }}</th>
                  <th>{{ i18n.translate('evidenceExpiry.colSubmittedBy') }}</th>
                  <th>{{ i18n.translate('common.actions') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-e>
                <tr>
                  <td>{{ e.title }}</td>
                  <td>{{ e.control_id }}</td>
                  <td class="expiring-date">{{ e.expiry_date | appDate:'medium' }}</td>
                  <td>v{{ e.version || 1 }}</td>
                  <td>{{ e.submitted_by }}</td>
                  <td>
                    <p-button icon="pi pi-refresh" [label]="i18n.translate('evidenceExpiry.renew')"
                      styleClass="p-button-sm p-button-outlined" (onClick)="requestRenewal(e)" />
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }
        </p-tabPanel>
        <p-tabPanel [header]="i18n.translate('evidenceExpiry.expired')">
          @if (expired.length === 0) {
            <div class="empty-state">{{ i18n.translate('evidenceExpiry.noExpired') }}</div>
          } @else {
            <p-table aria-label="Expired table" [value]="expired" [paginator]="true" [rows]="15" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.translate('evidenceExpiry.colTitle') }}</th>
                  <th>{{ i18n.translate('evidenceExpiry.colControl') }}</th>
                  <th>{{ i18n.translate('evidenceExpiry.colExpiryDate') }}</th>
                  <th>{{ i18n.translate('evidenceExpiry.colVersion') }}</th>
                  <th>{{ i18n.translate('evidenceExpiry.colSubmittedBy') }}</th>
                  <th>{{ i18n.translate('common.actions') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-e>
                <tr>
                  <td>{{ e.title }}</td>
                  <td>{{ e.control_id }}</td>
                  <td class="expired-date">{{ e.expiry_date | appDate:'medium' }}</td>
                  <td>v{{ e.version || 1 }}</td>
                  <td>{{ e.submitted_by }}</td>
                  <td>
                    <p-button icon="pi pi-refresh" [label]="i18n.translate('evidenceExpiry.requestRenewal')"
                      styleClass="p-button-sm p-button-warning" (onClick)="requestRenewal(e)" />
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>
  `
})
export class EvidenceExpiryComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  private readonly live = inject(GrcLiveService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private sub?: Subscription;

  loading = true;
  expiringSoon: EvidenceItem[] = [];
  expired: EvidenceItem[] = [];
  activeTab = 0;

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    if (params['expired'] === '1') this.activeTab = 1;
    this.loadData();
    this.sub = this.live.evidence$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadData());
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  loadData() {
    this.loading = true;
    forkJoin({
      expiring: this.apiclientSvc.get('/evidence/expiring').pipe(catchError(() => of([]))),
      expired: this.apiclientSvc.get('/evidence/expired').pipe(catchError(() => of([]))),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ expiring, expired }) => {
      this.expiringSoon = expiring;
      this.expired = expired;
      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  requestRenewal(e: EvidenceItem) {
    this.router.navigate(['/evidence/requests'], {
      queryParams: { prefillType: 'renewal', controlId: e.control_id, title: e.title },
    });
  }
}
