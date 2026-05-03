import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { SessionService } from '@app/dauth/session/session.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { RISK_PRIMARY_TABS } from '@app/features/risk/risk.constants';
import { GrcRecord } from '@app/core/models/shared.types';
import { devError } from '@app/runtime/utils/dev-logger';

/**
 * Risk Work Queue — "My Work" page per spec section 8.B.
 *
 * Displays the current user's risk-related work items organized by type:
 *   - Risks pending review
 *   - Assessments due
 *   - Indicator breaches
 *   - Treatment tasks due
 *   - Escalations pending
 *   - My assigned issues
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-work-queue',
    imports: [
        CommonModule, RouterModule,
        PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent,
        SkeletonModule, TabsModule, TableModule, TagModule, BadgeModule, ButtonModule, ToastModule,
    ],
    providers: [MessageService],
    template: `
    <div class="rwq-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="My Risk Work"
        titleAr="مهام المخاطر"
        subtitleEn="Your pending risk tasks, reviews, and escalations"
        subtitleAr="مهامك المعلقة والمراجعات والتصعيدات"
        icon="inbox"
      />
      <app-module-tabs-bar [tabs]="tabs" />

      <div class="rwq-content" *ngIf="!loading(); else skeleton">

        <p-tabs>
          <!-- Tab: Risks Pending Review -->
          <p-tabPanel>
            <ng-template pTemplate="header">
              <span>{{ isAr() ? 'مخاطر تنتظر المراجعة' : 'Risks Pending Review' }}</span>
              <p-badge *ngIf="risksPendingReview().length" [value]="risksPendingReview().length.toString()" severity="warning" class="tab-badge" />
            </ng-template>
            <p-table [value]="risksPendingReview()" [rows]="10" [paginator]="risksPendingReview().length > 10"
                     styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true"
                     emptyMessage="{{ isAr() ? 'لا توجد مخاطر تنتظر المراجعة' : 'No risks pending review' }}">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ isAr() ? 'معرّف' : 'ID' }}</th>
                  <th>{{ isAr() ? 'العنوان' : 'Title' }}</th>
                  <th>{{ isAr() ? 'التصنيف' : 'Category' }}</th>
                  <th>{{ isAr() ? 'الدرجة' : 'Score' }}</th>
                  <th>{{ isAr() ? 'الحالة' : 'Status' }}</th>
                  <th>{{ isAr() ? 'تاريخ المراجعة' : 'Review Due' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-row>
                <tr class="cursor-pointer" (click)="navigateToRisk(row.risk_id || row.id)">
                  <td>{{ row.risk_id || row.id }}</td>
                  <td>{{ row.title }}</td>
                  <td>{{ row.category }}</td>
                  <td><app-status-badge [value]="row.risk_score || row.residual_score" type="score" /></td>
                  <td><app-status-badge [value]="row.status" type="status" /></td>
                  <td>{{ row.next_review_date || row.updated_at }}</td>
                </tr>
              </ng-template>
            </p-table>

          <!-- Tab: Assessments Due -->
          </p-tabPanel>
          <p-tabPanel>
            <ng-template pTemplate="header">
              <span>{{ isAr() ? 'تقييمات مستحقة' : 'Assessments Due' }}</span>
              <p-badge *ngIf="assessmentsDue().length" [value]="assessmentsDue().length.toString()" severity="info" class="tab-badge" />
            </ng-template>
            <p-table [value]="assessmentsDue()" [rows]="10" [paginator]="assessmentsDue().length > 10"
                     styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true"
                     emptyMessage="{{ isAr() ? 'لا توجد تقييمات مستحقة' : 'No assessments due' }}">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ isAr() ? 'المخاطرة' : 'Risk' }}</th>
                  <th>{{ isAr() ? 'المنهجية' : 'Methodology' }}</th>
                  <th>{{ isAr() ? 'تاريخ الاستحقاق' : 'Due Date' }}</th>
                  <th>{{ isAr() ? 'الحالة' : 'Status' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-row>
                <tr class="cursor-pointer" (click)="navigate('/risk/assessments')">
                  <td>{{ row.risk_title || row.title }}</td>
                  <td>{{ row.methodology || 'Standard' }}</td>
                  <td>{{ row.due_date || row.assessment_date }}</td>
                  <td><app-status-badge [value]="row.status" type="status" /></td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <!-- Tab: Indicator Breaches -->
          <p-tabPanel>
            <ng-template pTemplate="header">
              <span>{{ isAr() ? 'تجاوزات المؤشرات' : 'Indicator Breaches' }}</span>
              <p-badge *ngIf="indicatorBreaches().length" [value]="indicatorBreaches().length.toString()" severity="danger" class="tab-badge" />
            </ng-template>
            <p-table [value]="indicatorBreaches()" [rows]="10" [paginator]="indicatorBreaches().length > 10"
                     styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true"
                     emptyMessage="{{ isAr() ? 'لا توجد تجاوزات' : 'No breaches' }}">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ isAr() ? 'المؤشر' : 'Indicator' }}</th>
                  <th>{{ isAr() ? 'القيمة' : 'Value' }}</th>
                  <th>{{ isAr() ? 'الحد' : 'Threshold' }}</th>
                  <th>{{ isAr() ? 'المستوى' : 'Level' }}</th>
                  <th>{{ isAr() ? 'تاريخ التجاوز' : 'Breached At' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-row>
                <tr class="cursor-pointer" (click)="navigate('/risk/indicators')">
                  <td>{{ row.kri_name || row.name }}</td>
                  <td>{{ row.breach_value || row.value }}</td>
                  <td>{{ row.threshold_value }}</td>
                  <td><app-status-badge [value]="row.threshold_breached || row.status" type="severity" /></td>
                  <td>{{ row.breached_at || row.created_at }}</td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <!-- Tab: Treatment Tasks Due -->
          <p-tabPanel>
            <ng-template pTemplate="header">
              <span>{{ isAr() ? 'معالجات مستحقة' : 'Treatment Tasks Due' }}</span>
              <p-badge *ngIf="treatmentTasksDue().length" [value]="treatmentTasksDue().length.toString()" severity="warning" class="tab-badge" />
            </ng-template>
            <p-table [value]="treatmentTasksDue()" [rows]="10" [paginator]="treatmentTasksDue().length > 10"
                     styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true"
                     emptyMessage="{{ isAr() ? 'لا توجد معالجات مستحقة' : 'No treatment tasks due' }}">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ isAr() ? 'المعالجة' : 'Treatment' }}</th>
                  <th>{{ isAr() ? 'المخاطرة' : 'Risk' }}</th>
                  <th>{{ isAr() ? 'الاستراتيجية' : 'Strategy' }}</th>
                  <th>{{ isAr() ? 'الاستحقاق' : 'Due Date' }}</th>
                  <th>{{ isAr() ? 'الحالة' : 'Status' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-row>
                <tr class="cursor-pointer" (click)="navigate('/risk/treatment')">
                  <td>{{ row.title }}</td>
                  <td>{{ row.risk_title || row.risk_id }}</td>
                  <td>{{ row.treatment_strategy || row.strategy }}</td>
                  <td>{{ row.end_date || row.target_date }}</td>
                  <td><app-status-badge [value]="row.treatment_status || row.status" type="status" /></td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <!-- Tab: Escalations Pending -->
          <p-tabPanel>
            <ng-template pTemplate="header">
              <span>{{ isAr() ? 'تصعيدات معلقة' : 'Escalations Pending' }}</span>
              <p-badge *ngIf="escalationsPending().length" [value]="escalationsPending().length.toString()" severity="danger" class="tab-badge" />
            </ng-template>
            <p-table [value]="escalationsPending()" [rows]="10" [paginator]="escalationsPending().length > 10"
                     styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true"
                     emptyMessage="{{ isAr() ? 'لا توجد تصعيدات' : 'No pending escalations' }}">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ isAr() ? 'المخاطرة' : 'Risk' }}</th>
                  <th>{{ isAr() ? 'المستوى' : 'Level' }}</th>
                  <th>{{ isAr() ? 'السبب' : 'Reason' }}</th>
                  <th>{{ isAr() ? 'التاريخ' : 'Date' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-row>
                <tr class="cursor-pointer" (click)="navigateToRisk(row.risk_id)">
                  <td>{{ row.risk_title || row.risk_id }}</td>
                  <td><app-status-badge [value]="row.escalation_level || 'high'" type="severity" /></td>
                  <td>{{ row.reason || 'SLA breach' }}</td>
                  <td>{{ row.created_at }}</td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <!-- Tab: My Assigned Issues -->
          <p-tabPanel>
            <ng-template pTemplate="header">
              <span>{{ isAr() ? 'قضاياي' : 'My Issues' }}</span>
              <p-badge *ngIf="myIssues().length" [value]="myIssues().length.toString()" severity="info" class="tab-badge" />
            </ng-template>
            <p-table [value]="myIssues()" [rows]="10" [paginator]="myIssues().length > 10"
                     styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true"
                     emptyMessage="{{ isAr() ? 'لا توجد قضايا' : 'No assigned issues' }}">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ isAr() ? 'القضية' : 'Issue' }}</th>
                  <th>{{ isAr() ? 'الأولوية' : 'Priority' }}</th>
                  <th>{{ isAr() ? 'المخاطرة' : 'Linked Risk' }}</th>
                  <th>{{ isAr() ? 'الاستحقاق' : 'Due Date' }}</th>
                  <th>{{ isAr() ? 'الحالة' : 'Status' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-row>
                <tr class="cursor-pointer" (click)="navigate('/risk/issues')">
                  <td>{{ row.title }}</td>
                  <td><app-status-badge [value]="row.priority" type="severity" /></td>
                  <td>{{ row.risk_title || row.linked_risk_id }}</td>
                  <td>{{ row.due_date || row.sla_deadline }}</td>
                  <td><app-status-badge [value]="row.status" type="status" /></td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabPanel>
        </p-tabs>

      </div>

      <ng-template #skeleton>
        <div class="rwq-skeleton">
          <p-skeleton width="100%" height="3rem" styleClass="mb-2" />
          <p-skeleton width="100%" height="20rem" />
        </div>
      </ng-template>
    </div>
  `,
    styles: [`
    .rwq-page { padding: 0; }
    .rwq-content { padding: 0 20px 20px; }
    .rwq-skeleton { padding: 20px; }
    .cursor-pointer { cursor: pointer; }
    .tab-badge { margin-inline-start: 6px; }
    :host .p-tabview-nav-link { font-size: var(--font-size-sm); }
  `]
})
export class RiskWorkQueueComponent implements OnInit {
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private auth = inject(SessionService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  readonly i18n = inject(I18nService);

  readonly tabs = RISK_PRIMARY_TABS;
  loading = signal(true);
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  risksPendingReview = signal<GrcRecord[]>([]);
  assessmentsDue = signal<GrcRecord[]>([]);
  indicatorBreaches = signal<GrcRecord[]>([]);
  treatmentTasksDue = signal<GrcRecord[]>([]);
  escalationsPending = signal<GrcRecord[]>([]);
  myIssues = signal<GrcRecord[]>([]);

  ngOnInit(): void {
    this.load();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      workQueue: this.api.getWorkQueue().pipe(catchError(() => of(null))),
    }).subscribe({
      next: (res) => {
        const wq = res.workQueue || {} as GrcRecord;
        this.risksPendingReview.set(Array.isArray(wq.risksPendingReview) ? wq.risksPendingReview : []);
        this.assessmentsDue.set(Array.isArray(wq.assessmentsDue) ? wq.assessmentsDue : []);
        this.indicatorBreaches.set(Array.isArray(wq.indicatorBreaches) ? wq.indicatorBreaches : []);
        this.treatmentTasksDue.set(Array.isArray(wq.treatmentTasksDue) ? wq.treatmentTasksDue : []);
        this.escalationsPending.set(Array.isArray(wq.escalationsPending) ? wq.escalationsPending : []);
        this.myIssues.set(Array.isArray(wq.myIssues) ? wq.myIssues : []);
        this.loading.set(false);
      },
      error: () => {
        devError('[Risk] Work queue load failed');
        this.loading.set(false);
      },
    });
  }

  navigateToRisk(riskId: string): void {
    this.router.navigate(['/risk/register', riskId]);
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }
}
