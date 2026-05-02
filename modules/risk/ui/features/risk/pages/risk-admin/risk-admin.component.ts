import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { SessionService } from '@app/dauth/session/session.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { HasPermissionDirective } from '@app/dauth/directives/has-permission.directive';
import { SkeletonModule } from 'primeng/skeleton';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { RISK_PRIMARY_TABS, getRiskSubTabs } from '@app/features/risk/risk.constants';
import { GrcRecord } from '@app/core/models/shared.types';
import { devError } from '@app/runtime/utils/dev-logger';

/**
 * Risk Admin page — per spec section 8.K.
 *
 * Admin-only configuration for the risk module:
 *   - Risk taxonomy (categories, subcategories)
 *   - Rating scales (impact, likelihood, velocity)
 *   - Risk appetite bands and thresholds
 *   - Scoring model configuration
 *   - Indicator templates
 *   - Workflow rules
 *   - Notification rules
 *   - Connector settings
 *
 * Sub-pages (extras): Risk Appetite (detailed config) accessible via sub-tab.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-admin',
    imports: [
        CommonModule, FormsModule, RouterModule,
        PageHeaderComponent, ModuleTabsBarComponent, HasPermissionDirective,
        SkeletonModule, TabViewModule, TableModule, CardModule, ButtonModule,
        InputTextModule, InputNumberModule, DropdownModule, TagModule, ToastModule,
    ],
    providers: [MessageService],
    template: `
    <div class="ra-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Risk Admin"
        titleAr="إدارة المخاطر"
        subtitleEn="Module configuration — taxonomy, scales, appetite, scoring models, and workflow rules"
        subtitleAr="إعدادات الموديول — التصنيف، المقاييس، الشهية، نماذج التسجيل، وقواعد سير العمل"
        icon="settings"
      />
      <app-module-tabs-bar [tabs]="tabs" />

      <div class="ra-content" *ngIf="!loading(); else skeleton">
        <p-tabView>
          <!-- Risk Taxonomy -->
          <p-tabPanel [header]="isAr() ? 'التصنيف' : 'Taxonomy'">
            <div class="ra-section">
              <div class="ra-section-header">
                <h3>{{ isAr() ? 'تصنيفات المخاطر' : 'Risk Categories' }}</h3>
                <button *appHasPermission="'risk.record.write'" pButton [label]="isAr() ? 'إضافة' : 'Add Category'" icon="pi pi-plus" class="p-button-sm"></button>
              </div>
              <p-table [value]="categories()" styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true"
                       emptyMessage="{{ isAr() ? 'لا توجد تصنيفات' : 'No categories' }}">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ isAr() ? 'الكود' : 'Code' }}</th>
                    <th>{{ isAr() ? 'الاسم (EN)' : 'Name (EN)' }}</th>
                    <th>{{ isAr() ? 'الاسم (AR)' : 'Name (AR)' }}</th>
                    <th>{{ isAr() ? 'الفئة الأم' : 'Parent' }}</th>
                    <th>{{ isAr() ? 'الترتيب' : 'Order' }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-row>
                  <tr>
                    <td>{{ row.code }}</td>
                    <td>{{ row.name_en }}</td>
                    <td>{{ row.name_ar }}</td>
                    <td>{{ row.parent_category_id || '—' }}</td>
                    <td>{{ row.display_order }}</td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabPanel>

          <!-- Rating Scales -->
          <p-tabPanel [header]="isAr() ? 'المقاييس' : 'Scales'">
            <div class="ra-section">
              <h3>{{ isAr() ? 'مقاييس التأثير' : 'Impact Scales' }}</h3>
              <p-table [value]="impactScales()" styleClass="p-datatable-sm" [rowHover]="true">
                <ng-template pTemplate="header">
                  <tr><th>{{ isAr() ? 'المستوى' : 'Level' }}</th><th>{{ isAr() ? 'التسمية' : 'Label' }}</th><th>{{ isAr() ? 'النطاق المالي' : 'Monetary Range' }}</th></tr>
                </ng-template>
                <ng-template pTemplate="body" let-row>
                  <tr><td>{{ row.level }}</td><td>{{ isAr() ? row.label_ar : row.label_en }}</td><td>{{ row.monetary_range_min }} — {{ row.monetary_range_max }}</td></tr>
                </ng-template>
              </p-table>

              <h3 class="mt-3">{{ isAr() ? 'مقاييس الاحتمال' : 'Likelihood Scales' }}</h3>
              <p-table [value]="likelihoodScales()" styleClass="p-datatable-sm" [rowHover]="true">
                <ng-template pTemplate="header">
                  <tr><th>{{ isAr() ? 'المستوى' : 'Level' }}</th><th>{{ isAr() ? 'التسمية' : 'Label' }}</th><th>{{ isAr() ? 'وصف التردد' : 'Frequency' }}</th></tr>
                </ng-template>
                <ng-template pTemplate="body" let-row>
                  <tr><td>{{ row.level }}</td><td>{{ isAr() ? row.label_ar : row.label_en }}</td><td>{{ row.frequency_description }}</td></tr>
                </ng-template>
              </p-table>

              <h3 class="mt-3">{{ isAr() ? 'مقاييس السرعة' : 'Velocity Scales' }}</h3>
              <p-table [value]="velocityScales()" styleClass="p-datatable-sm" [rowHover]="true">
                <ng-template pTemplate="header">
                  <tr><th>{{ isAr() ? 'المستوى' : 'Level' }}</th><th>{{ isAr() ? 'التسمية' : 'Label' }}</th><th>{{ isAr() ? 'وقت التأثير' : 'Time to Impact' }}</th></tr>
                </ng-template>
                <ng-template pTemplate="body" let-row>
                  <tr><td>{{ row.level }}</td><td>{{ isAr() ? row.label_ar : row.label_en }}</td><td>{{ row.time_to_impact }}</td></tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabPanel>

          <!-- Appetite Bands -->
          <p-tabPanel [header]="isAr() ? 'شهية المخاطر' : 'Appetite Bands'">
            <div class="ra-section">
              <div class="ra-section-header">
                <h3>{{ isAr() ? 'نطاقات شهية المخاطر' : 'Risk Appetite Configuration' }}</h3>
                <button pButton [label]="isAr() ? 'تفاصيل' : 'Detailed Config'" icon="pi pi-external-link" class="p-button-sm p-button-text" (click)="navigate('/risk/appetite')"></button>
              </div>
              <p-table [value]="appetiteBands()" styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true"
                       emptyMessage="{{ isAr() ? 'لا توجد نطاقات' : 'No appetite bands' }}">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ isAr() ? 'المستوى' : 'Level' }}</th>
                    <th>{{ isAr() ? 'التصنيف' : 'Category' }}</th>
                    <th>{{ isAr() ? 'منخفض' : 'Low' }}</th>
                    <th>{{ isAr() ? 'متوسط' : 'Medium' }}</th>
                    <th>{{ isAr() ? 'عالي' : 'High' }}</th>
                    <th>{{ isAr() ? 'حرج' : 'Critical' }}</th>
                    <th>{{ isAr() ? 'تصعيد' : 'Escalation' }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-row>
                  <tr>
                    <td><p-tag [value]="row.appetite_level" [severity]="appetiteSeverity(row.appetite_level)" /></td>
                    <td>{{ row.risk_category || 'All' }}</td>
                    <td>{{ row.threshold_low }}</td>
                    <td>{{ row.threshold_medium }}</td>
                    <td>{{ row.threshold_high }}</td>
                    <td>{{ row.threshold_critical }}</td>
                    <td><i class="pi" [class.pi-check]="row.escalation_required" [class.pi-minus]="!row.escalation_required"></i></td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabPanel>

          <!-- Scoring Models -->
          <p-tabPanel [header]="isAr() ? 'نماذج التسجيل' : 'Scoring Models'">
            <div class="ra-section">
              <div class="ra-section-header">
                <h3>{{ isAr() ? 'نماذج التسجيل' : 'Scoring Models' }}</h3>
                <button pButton [label]="isAr() ? 'منهجية التسجيل' : 'Methodology'" icon="pi pi-external-link" class="p-button-sm p-button-text" (click)="navigate('/risk/scoring')"></button>
              </div>
              <p-table [value]="scoringModels()" styleClass="p-datatable-sm" [rowHover]="true"
                       emptyMessage="{{ isAr() ? 'لا توجد نماذج' : 'No scoring models' }}">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ isAr() ? 'المعرّف' : 'Model ID' }}</th>
                    <th>{{ isAr() ? 'الاسم' : 'Name' }}</th>
                    <th>{{ isAr() ? 'الصيغة' : 'Formula' }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-row>
                  <tr>
                    <td>{{ row.model_id }}</td>
                    <td>{{ isAr() ? row.name_ar : row.name_en }}</td>
                    <td><p-tag [value]="row.formula || 'weighted'" /></td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabPanel>

          <!-- Indicator Templates -->
          <p-tabPanel [header]="isAr() ? 'قوالب المؤشرات' : 'Indicator Templates'">
            <div class="ra-section">
              <p class="ra-placeholder">{{ isAr() ? 'قوالب المؤشرات الرئيسية للمخاطر' : 'KRI/KCI/KPI indicator templates for standardized monitoring' }}</p>
            </div>
          </p-tabPanel>

          <!-- Workflow Rules -->
          <p-tabPanel [header]="isAr() ? 'قواعد سير العمل' : 'Workflow Rules'">
            <div class="ra-section">
              <p class="ra-placeholder">{{ isAr() ? 'قواعد سير العمل والإشعارات' : 'Workflow automation rules, notification triggers, and escalation paths' }}</p>
            </div>
          </p-tabPanel>
        </p-tabView>
      </div>

      <ng-template #skeleton>
        <div class="ra-skeleton">
          <p-skeleton width="100%" height="3rem" styleClass="mb-2" />
          <p-skeleton width="100%" height="25rem" />
        </div>
      </ng-template>
    </div>
  `,
    styles: [`
    .ra-page { padding: 0; }
    .ra-content { padding: 0 20px 20px; }
    .ra-skeleton { padding: 20px; }
    .ra-section { padding: 8px 0; }
    .ra-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .ra-section-header h3 { margin: 0; font-size: var(--font-size-md); }
    .ra-placeholder { color: var(--text-muted); font-style: italic; padding: 24px 0; text-align: center; }
    .mt-3 { margin-top: 1rem; }
  `]
})
export class RiskAdminComponent implements OnInit {
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

  categories = signal<GrcRecord[]>([]);
  impactScales = signal<GrcRecord[]>([]);
  likelihoodScales = signal<GrcRecord[]>([]);
  velocityScales = signal<GrcRecord[]>([]);
  appetiteBands = signal<GrcRecord[]>([]);
  scoringModels = signal<GrcRecord[]>([]);

  ngOnInit(): void {
    this.load();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.api.getAdminSettings().pipe(catchError(() => of({}))).subscribe((data: GrcRecord) => {
      this.categories.set(data?.categories || []);
      this.impactScales.set(data?.impactScales || data?.impact_scales || []);
      this.likelihoodScales.set(data?.likelihoodScales || data?.likelihood_scales || []);
      this.velocityScales.set(data?.velocityScales || data?.velocity_scales || []);
      this.appetiteBands.set(data?.appetiteBands || data?.appetite_config || []);
      this.scoringModels.set(data?.scoringModels || data?.scoring_models || []);
      this.loading.set(false);
    });
  }

  appetiteSeverity(level: string): string {
    const map: Record<string, string> = { averse: 'danger', minimal: 'warning', cautious: 'info', open: 'success', hungry: 'success' };
    return map[level] || 'info';
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }
}
