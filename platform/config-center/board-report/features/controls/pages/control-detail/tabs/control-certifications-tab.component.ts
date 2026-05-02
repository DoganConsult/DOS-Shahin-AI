/**
 * Control Certifications Tab — AGRC-OS Controls Module
 * Shows certification requests for this control: status, attested/pending.
 */
import { Component, Input, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ControlsApiService } from '../../../services/controls-api.service';
import type { ControlDetailDto, CertificationCampaignDto } from '../../../services/controls-api.types';

@Component({
    selector: 'app-control-certifications-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TableModule, EmptyStateComponent, SkeletonLoaderComponent, StatusBadgeComponent],
    template: `
    @if (!control) {
      <app-empty-state
        [title]="i18n.isAr() ? 'لا توجد بيانات' : 'No data available'"
        [variant]="'default'" />
    } @else {
      <div class="certs-content" [dir]="i18n.direction()">

        @if (loadingCerts()) {
          <app-skeleton-loader [variant]="'list'" [count]="3" />
        } @else if (campaigns().length === 0) {
          <app-empty-state
            [title]="i18n.isAr() ? 'لا توجد شهادات' : 'No certifications'"
            [description]="i18n.isAr() ? 'لم يتم تسجيل طلبات شهادات لهذا الضابط بعد.' : 'No certification requests have been recorded for this control yet.'"
            [variant]="'default'" />
        } @else {
          <p-table [value]="campaigns()" [rows]="10" [paginator]="campaigns().length > 10"
                   styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isAr() ? 'الحملة' : 'Campaign' }}</th>
                <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
                <th>{{ i18n.isAr() ? 'تاريخ البدء' : 'Start Date' }}</th>
                <th>{{ i18n.isAr() ? 'تاريخ الانتهاء' : 'End Date' }}</th>
                <th>{{ i18n.isAr() ? 'الإنجاز' : 'Completion' }}</th>
                <th>{{ i18n.isAr() ? 'الإجمالي' : 'Total' }}</th>
                <th>{{ i18n.isAr() ? 'تمت الاستجابة' : 'Responded' }}</th>
                <th>{{ i18n.isAr() ? 'متأخرة' : 'Overdue' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-c>
              <tr>
                <td>{{ c.name }}</td>
                <td><app-status-badge [status]="c.status" /></td>
                <td>{{ c.startDate | date:'mediumDate' }}</td>
                <td>{{ c.endDate | date:'mediumDate' }}</td>
                <td>{{ c.completionPct }}%</td>
                <td>{{ c.totalRequests }}</td>
                <td>{{ c.respondedRequests }}</td>
                <td [style.color]="c.overdueRequests > 0 ? 'var(--error)' : 'var(--text-body)'">
                  {{ c.overdueRequests }}
                </td>
              </tr>
            </ng-template>
          </p-table>
        }

      </div>
    }
  `,
    styles: [`
    .certs-content {
      /* no extra styles needed beyond table defaults */
    }
  `]
})
export class ControlCertificationsTabComponent implements OnInit {
  @Input() control: ControlDetailDto | null = null;

  i18n = inject(I18nService);
  private api = inject(ControlsApiService);

  loadingCerts = signal(false);
  campaigns = signal<CertificationCampaignDto[]>([]);

  ngOnInit(): void {
    if (this.control?.id) {
      this.loadingCerts.set(true);
      this.api.getCertificationCampaigns().subscribe({
        next: (data) => {
          this.campaigns.set(data);
          this.loadingCerts.set(false);
        },
        error: () => {
          this.loadingCerts.set(false);
        },
      });
    }
  }
}
