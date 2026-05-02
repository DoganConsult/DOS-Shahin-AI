import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { switchMap, catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { SessionService } from '@app/dauth/session/session.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { HasPermissionDirective } from '@app/dauth/directives/has-permission.directive';
import { AiEntityContextPanelComponent } from '@app/shared/components/ai/ai-entity-context-panel.component';
import { SkeletonModule } from 'primeng/skeleton';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { GrcRecord } from '@app/core/models/shared.types';
import { devError } from '@app/runtime/utils/dev-logger';

/**
 * Risk Detail Page — full routed page per spec section 8.D.
 *
 * Sticky header with risk code, title, owner, scores, trend.
 * Summary strip: controls linked, active indicators, open issues, active treatment, linked scenarios, last assessment.
 * Tabs: Overview, Statement & Context, Causes/Events/Impacts, Assessments, Controls,
 *        Indicators, Treatment Plan, Issues & Escalations, Scenarios, Activity Log.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-detail-page',
    imports: [
        CommonModule, RouterModule, StatusBadgeComponent, AppDatePipe,
        SkeletonModule, TabViewModule, TableModule, TagModule, CardModule,
        ButtonModule, ToastModule, TooltipModule,
    ],
    providers: [MessageService],
    template: `
    <div class="rd-page" [attr.dir]="dir()">
      <!-- Sticky header -->
      <div class="rd-header" *ngIf="risk(); else headerSkeleton">
        <div class="rd-header-main">
          <div class="rd-header-left">
            <button class="rd-back" pButton icon="pi pi-arrow-left" [label]="isAr() ? 'السجل' : 'Register'" (click)="navigate('/risk/register')"></button>
            <div class="rd-title-block">
              <span class="rd-code">{{ risk()?.risk_id || risk()?.risk_code }}</span>
              <h2 class="rd-title">{{ risk()?.title }}</h2>
            </div>
          </div>
          <div class="rd-header-right">
            <app-status-badge [value]="risk()?.status" type="status" />
            <div class="rd-score-pair">
              <div class="rd-score" [class]="'rd-score--' + scoreClass(risk()?.inherent_score)">
                <span class="rd-score-label">{{ isAr() ? 'كامن' : 'Inherent' }}</span>
                <span class="rd-score-val">{{ risk()?.inherent_score || (risk()?.likelihood * risk()?.impact) || '—' }}</span>
              </div>
              <div class="rd-score" [class]="'rd-score--' + scoreClass(risk()?.residual_score)">
                <span class="rd-score-label">{{ isAr() ? 'متبقي' : 'Residual' }}</span>
                <span class="rd-score-val">{{ risk()?.residual_score || '—' }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="rd-meta-row">
          <span><strong>{{ isAr() ? 'المالك' : 'Owner' }}:</strong> {{ risk()?.owner || risk()?.owner_user_id || '—' }}</span>
          <span><strong>{{ isAr() ? 'التصنيف' : 'Category' }}:</strong> {{ risk()?.category }}</span>
          <span><strong>{{ isAr() ? 'الاتجاه' : 'Trend' }}:</strong> {{ risk()?.trend || '—' }}</span>
          <span><strong>{{ isAr() ? 'المراجعة القادمة' : 'Next Review' }}:</strong> {{ risk()?.next_review_date || '—' }}</span>
        </div>
      </div>

      <!-- Summary strip -->
      <div class="rd-summary-strip" *ngIf="risk()">
        <div class="rd-stat" *ngFor="let s of summaryStats()">
          <span class="rd-stat-val">{{ s.value }}</span>
          <span class="rd-stat-lbl">{{ isAr() ? s.labelAr : s.labelEn }}</span>
        </div>
      </div>

      <!-- Tabs -->
      <p-tabView *ngIf="risk()" styleClass="rd-tabs">
        <!-- Overview -->
        <p-tabPanel [header]="isAr() ? 'نظرة عامة' : 'Overview'">
          <div class="rd-overview">
            <p-card [header]="isAr() ? 'الوصف' : 'Description'">
              <p>{{ risk()?.description || risk()?.statement || '—' }}</p>
            </p-card>
            <app-ai-entity-context-panel entityType="risk" [entityId]="riskId()" />
          </div>
        </p-tabPanel>

        <!-- Statement & Context -->
        <p-tabPanel [header]="isAr() ? 'السياق' : 'Statement & Context'">
          <div class="rd-section">
            <p-card [header]="isAr() ? 'بيان المخاطرة' : 'Risk Statement'">
              <p>{{ risk()?.statement || risk()?.description || '—' }}</p>
            </p-card>
          </div>
        </p-tabPanel>

        <!-- Causes / Events / Impacts -->
        <p-tabPanel [header]="isAr() ? 'الأسباب والآثار' : 'Causes / Events / Impacts'">
          <div class="rd-section rd-causes-grid">
            <p-card [header]="isAr() ? 'الأسباب' : 'Causes'">
              <p>{{ risk()?.cause_text || '—' }}</p>
              <div *ngIf="detail()?.threats?.length">
                <h4>{{ isAr() ? 'التهديدات (Bow-Tie)' : 'Threats (Bow-Tie)' }}</h4>
                <ul><li *ngFor="let t of detail()?.threats">{{ t.name || t.title }}</li></ul>
              </div>
            </p-card>
            <p-card [header]="isAr() ? 'الحدث' : 'Event'">
              <p>{{ risk()?.event_text || '—' }}</p>
            </p-card>
            <p-card [header]="isAr() ? 'الآثار' : 'Impacts'">
              <p>{{ risk()?.impact_text || '—' }}</p>
              <div *ngIf="detail()?.consequences?.length">
                <h4>{{ isAr() ? 'العواقب (Bow-Tie)' : 'Consequences (Bow-Tie)' }}</h4>
                <ul><li *ngFor="let c of detail()?.consequences">{{ c.name || c.title }}</li></ul>
              </div>
            </p-card>
          </div>
        </p-tabPanel>

        <!-- Assessments -->
        <p-tabPanel [header]="isAr() ? 'التقييمات' : 'Assessments'">
          <p-table [value]="detail()?.assessments || []" styleClass="p-datatable-sm" [rowHover]="true"
                   emptyMessage="{{ isAr() ? 'لا توجد تقييمات' : 'No assessments' }}">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ isAr() ? 'التاريخ' : 'Date' }}</th>
                <th>{{ isAr() ? 'المنهجية' : 'Methodology' }}</th>
                <th>{{ isAr() ? 'كامن' : 'Inherent' }}</th>
                <th>{{ isAr() ? 'متبقي' : 'Residual' }}</th>
                <th>{{ isAr() ? 'المقيّم' : 'Assessor' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.assessed_at || row.assessment_date | appDate }}</td>
                <td>{{ row.methodology || 'Standard' }}</td>
                <td><app-status-badge [value]="row.inherent_score" type="score" /></td>
                <td><app-status-badge [value]="row.residual_score" type="score" /></td>
                <td>{{ row.assessor_id || row.assessed_by }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Controls -->
        <p-tabPanel [header]="isAr() ? 'الضوابط' : 'Controls'">
          <p-table [value]="detail()?.linked_controls || detail()?.controls || []" styleClass="p-datatable-sm" [rowHover]="true"
                   emptyMessage="{{ isAr() ? 'لا توجد ضوابط مرتبطة' : 'No linked controls' }}">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ isAr() ? 'الضابط' : 'Control' }}</th>
                <th>{{ isAr() ? 'الفعالية' : 'Effectiveness' }}</th>
                <th>{{ isAr() ? 'نوع التخفيف' : 'Mitigation' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.control_title || row.title || row.control_id }}</td>
                <td><app-status-badge [value]="row.effectiveness" type="status" /></td>
                <td>{{ row.mitigation_percentage ? row.mitigation_percentage + '%' : '—' }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Indicators -->
        <p-tabPanel [header]="isAr() ? 'المؤشرات' : 'Indicators'">
          <p-table [value]="detail()?.indicators || detail()?.kris || []" styleClass="p-datatable-sm" [rowHover]="true"
                   emptyMessage="{{ isAr() ? 'لا توجد مؤشرات' : 'No indicators' }}">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ isAr() ? 'المؤشر' : 'Indicator' }}</th>
                <th>{{ isAr() ? 'القيمة' : 'Current Value' }}</th>
                <th>{{ isAr() ? 'الحالة' : 'Status' }}</th>
                <th>{{ isAr() ? 'التردد' : 'Frequency' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.name }}</td>
                <td>{{ row.current_value ?? '—' }}</td>
                <td><app-status-badge [value]="row.status" type="status" /></td>
                <td>{{ row.collection_frequency }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Treatment Plan -->
        <p-tabPanel [header]="isAr() ? 'خطة المعالجة' : 'Treatment Plan'">
          <p-table [value]="detail()?.treatments || detail()?.treatment_plans || []" styleClass="p-datatable-sm" [rowHover]="true"
                   emptyMessage="{{ isAr() ? 'لا توجد خطة معالجة' : 'No treatment plan' }}">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ isAr() ? 'الاستراتيجية' : 'Strategy' }}</th>
                <th>{{ isAr() ? 'الحالة' : 'Status' }}</th>
                <th>{{ isAr() ? 'المالك' : 'Owner' }}</th>
                <th>{{ isAr() ? 'تاريخ الانتهاء' : 'End Date' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.treatment_strategy || row.strategy }}</td>
                <td><app-status-badge [value]="row.treatment_status || row.status" type="status" /></td>
                <td>{{ row.owner }}</td>
                <td>{{ row.end_date || row.target_date | appDate }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Issues & Escalations -->
        <p-tabPanel [header]="isAr() ? 'القضايا والتصعيدات' : 'Issues & Escalations'">
          <p-table [value]="detail()?.issues || detail()?.process_tasks || []" styleClass="p-datatable-sm" [rowHover]="true"
                   emptyMessage="{{ isAr() ? 'لا توجد قضايا' : 'No issues' }}">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ isAr() ? 'القضية' : 'Issue' }}</th>
                <th>{{ isAr() ? 'الأولوية' : 'Priority' }}</th>
                <th>{{ isAr() ? 'الحالة' : 'Status' }}</th>
                <th>{{ isAr() ? 'التاريخ' : 'Date' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.title || row.description }}</td>
                <td><app-status-badge [value]="row.priority" type="severity" /></td>
                <td><app-status-badge [value]="row.status" type="status" /></td>
                <td>{{ row.created_at | appDate }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Scenarios -->
        <p-tabPanel [header]="isAr() ? 'السيناريوهات' : 'Scenarios'">
          <p-table [value]="detail()?.scenarios || []" styleClass="p-datatable-sm" [rowHover]="true"
                   emptyMessage="{{ isAr() ? 'لا توجد سيناريوهات' : 'No scenarios' }}">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ isAr() ? 'السيناريو' : 'Scenario' }}</th>
                <th>{{ isAr() ? 'الدرجة' : 'Score' }}</th>
                <th>{{ isAr() ? 'الخسارة المتوسطة' : 'Mean Loss' }}</th>
                <th>{{ isAr() ? 'P95' : 'P95 Loss' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.scenario_name }}</td>
                <td><app-status-badge [value]="row.scenario_score" type="score" /></td>
                <td>{{ row.mc_mean_loss | number:'1.0-0' }}</td>
                <td>{{ row.mc_p95_loss | number:'1.0-0' }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Activity Log -->
        <p-tabPanel [header]="isAr() ? 'سجل النشاط' : 'Activity Log'">
          <p-table [value]="detail()?.activity_log || []" styleClass="p-datatable-sm" [rowHover]="true"
                   emptyMessage="{{ isAr() ? 'لا يوجد نشاط' : 'No activity' }}">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ isAr() ? 'التاريخ' : 'Date' }}</th>
                <th>{{ isAr() ? 'الإجراء' : 'Action' }}</th>
                <th>{{ isAr() ? 'المستخدم' : 'User' }}</th>
                <th>{{ isAr() ? 'التفاصيل' : 'Details' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.timestamp || row.created_at | appDate }}</td>
                <td>{{ row.action || row.event_type }}</td>
                <td>{{ row.actor_email || row.user_id }}</td>
                <td>{{ row.details || row.description || '—' }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>

      <ng-template #headerSkeleton>
        <div class="rd-header-skeleton">
          <p-skeleton width="200px" height="2rem" />
          <p-skeleton width="100%" height="1.5rem" styleClass="mt-2" />
          <p-skeleton width="60%" height="1rem" styleClass="mt-2" />
        </div>
      </ng-template>
    </div>
  `,
    styles: [`
    .rd-page { padding: 0; }
    .rd-header { position: sticky; top: 0; z-index: var(--z-elevated, 10); background: var(--surface-card); border-bottom: 1px solid var(--border); padding: 12px 20px; }
    .rd-header-main { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .rd-header-left { display: flex; align-items: center; gap: 12px; }
    .rd-back { font-size: var(--font-size-sm); }
    .rd-code { font-size: var(--font-size-xs); color: var(--text-muted); font-family: var(--font-mono, monospace); }
    .rd-title { margin: 0; font-size: var(--font-size-lg); font-weight: 600; }
    .rd-header-right { display: flex; align-items: center; gap: 12px; }
    .rd-score-pair { display: flex; gap: 8px; }
    .rd-score { text-align: center; padding: 4px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); }
    .rd-score-label { display: block; font-size: var(--font-size-xs); color: var(--text-muted); }
    .rd-score-val { font-size: var(--font-size-lg); font-weight: 700; }
    .rd-score--danger { border-color: var(--error); }
    .rd-score--danger .rd-score-val { color: var(--error); }
    .rd-score--warning { border-color: var(--warning); }
    .rd-score--warning .rd-score-val { color: var(--warning); }
    .rd-score--success .rd-score-val { color: var(--success); }
    .rd-meta-row { display: flex; gap: 16px; flex-wrap: wrap; font-size: var(--font-size-sm); color: var(--text-body); margin-top: 8px; }
    .rd-summary-strip { display: flex; gap: 12px; padding: 8px 20px; flex-wrap: wrap; border-bottom: 1px solid var(--border-subtle); }
    .rd-stat { display: flex; flex-direction: column; align-items: center; padding: 6px 14px; background: var(--surface-ground); border-radius: var(--radius-md); }
    .rd-stat-val { font-weight: 700; font-size: var(--font-size-md); }
    .rd-stat-lbl { font-size: var(--font-size-xs); color: var(--text-muted); }
    .rd-header-skeleton { padding: 12px 20px; }
    .rd-overview { display: grid; gap: 16px; padding: 8px 0; }
    .rd-section { padding: 8px 0; }
    .rd-causes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
    :host .rd-tabs .p-tabview-panels { padding: 12px 20px; }
  `]
})
export class RiskDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private auth = inject(SessionService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  readonly i18n = inject(I18nService);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  riskId = signal<string>('');
  risk = signal<GrcRecord | null>(null);
  detail = signal<GrcRecord | null>(null);
  linkage = signal<Record<string, unknown> | null>(null);

  summaryStats = computed(() => {
    const d = this.detail();
    const l = this.linkage();
    if (!d) return [];
    return [
      { value: l?.controls ?? d.linked_controls?.length ?? d.controls?.length ?? 0, labelEn: 'Controls', labelAr: 'ضوابط' },
      { value: l?.policies ?? 0, labelEn: 'Policies', labelAr: 'سياسات' },
      { value: d.indicators?.length ?? d.kris?.length ?? 0, labelEn: 'Indicators', labelAr: 'مؤشرات' },
      { value: l?.incidents ?? 0, labelEn: 'Incidents', labelAr: 'حوادث' },
      { value: d.issues?.length ?? d.process_tasks?.length ?? 0, labelEn: 'Open Issues', labelAr: 'قضايا مفتوحة' },
      { value: d.treatments?.length ?? d.treatment_plans?.length ?? 0, labelEn: 'Treatment Plans', labelAr: 'خطط معالجة' },
      { value: l?.evidence ?? 0, labelEn: 'Evidence', labelAr: 'أدلة' },
      { value: d.scenarios?.length ?? 0, labelEn: 'Scenarios', labelAr: 'سيناريوهات' },
    ];
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id') || '';
        this.riskId.set(id);
        return this.api.getRiskDetail(id).pipe(catchError(() => of(null)));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(data => {
      if (data) {
        this.risk.set(data);
        this.detail.set(data);
      }
    });

    // After risk loads, fetch linkage summary
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id') || '';
        return this.api.getLinkageSummary(id).pipe(catchError(() => of(null)));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(data => {
      if (data) this.linkage.set(data as any);
    });

    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.riskId()) {
        this.api.getRiskDetail(this.riskId()).pipe(catchError(() => of(null))).subscribe(d => {
          if (d) { this.risk.set(d); this.detail.set(d); }
        });
      }
    });
  }

  scoreClass(score: number | undefined): string {
    if (!score) return '';
    if (score >= 20) return 'danger';
    if (score >= 12) return 'warning';
    return 'success';
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }
}
