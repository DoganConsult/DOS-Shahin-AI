import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TimelineModule } from 'primeng/timeline';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-explainability',
  standalone: true,
  imports: [CommonModule, PageShellComponent, ToastModule, CardModule, TableModule, TagModule, TabViewModule, ButtonModule, ProgressBarModule, TimelineModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="eye" [title]="i18n.isArabic() ? 'الشفافية والتفسير' : 'AI Explainability & Provenance'" [subtitle]="i18n.isArabic() ? 'سلسلة تفسير التوصيات ومصدر القرارات' : 'Explanation chains, provenance & source attribution'" [breadcrumbs]="['Dashboard','AI','Explainability']" [loading]="loading()">
      <div class="grid mb-3" [dir]="i18n.direction()">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis()">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" [style.color]="kpi.color">{{ kpi.value }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? kpi.labelAr : kpi.label }}</div>
            </div>
          </p-card>
        </div>
      </div>

      <div class="grid" [dir]="i18n.direction()">
        <div class="col-12 lg:col-5">
          <p-card [header]="i18n.isArabic() ? 'التوصيات الأخيرة' : 'Recent Explanations'">
            <p-table [value]="recent()" [rows]="8" styleClass="p-datatable-sm" responsiveLayout="scroll" selectionMode="single" [(selection)]="selectedExplanation" (onRowSelect)="onSelect($event)">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}</th>
                  <th>{{ i18n.isArabic() ? 'النوع' : 'Type' }}</th>
                  <th>{{ i18n.isArabic() ? 'الثقة' : 'Conf.' }}</th>
                  <th>{{ i18n.isArabic() ? 'الوقت' : 'Time' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-row>
                <tr [pSelectableRow]="row" style="cursor:pointer">
                  <td>{{ row.agent_id }}</td>
                  <td><p-tag [value]="row.recommendation_type || row.type || '—'" /></td>
                  <td>
                    <div class="flex align-items-center gap-1">
                      <p-progressBar [value]="+(row.confidence_score * 100).toFixed(0)" [style]="{'height':'6px','width':'50px'}" [showValue]="false" />
                      <span class="text-xs">{{ (row.confidence_score * 100).toFixed(0) }}%</span>
                    </div>
                  </td>
                  <td class="text-xs">{{ row.timestamp }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد تفسيرات' : 'No explanations' }}</td></tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>

        <div class="col-12 lg:col-7">
          <p-card [header]="i18n.isArabic() ? 'سلسلة التفسير' : 'Explanation Chain'" *ngIf="selectedExplanation">
            <div class="mb-3">
              <div class="flex gap-3 flex-wrap mb-2">
                <div><span class="font-semibold">{{ i18n.isArabic() ? 'الوكيل:' : 'Agent:' }}</span> {{ selectedExplanation.agent_id }}</div>
                <div><span class="font-semibold">{{ i18n.isArabic() ? 'النموذج:' : 'Model:' }}</span> {{ selectedExplanation.model_id || selectedExplanation.model }}</div>
                <div><span class="font-semibold">{{ i18n.isArabic() ? 'الثقة:' : 'Confidence:' }}</span> {{ (selectedExplanation.confidence_score * 100).toFixed(1) }}%</div>
              </div>
            </div>
            <p-timeline [value]="provenanceSteps()" layout="vertical">
              <ng-template pTemplate="marker" let-step>
                <span class="flex align-items-center justify-content-center border-circle" style="width:2rem;height:2rem;background:var(--primary-color);color:#fff;font-size:0.75rem">
                  {{ step.step }}
                </span>
              </ng-template>
              <ng-template pTemplate="content" let-step>
                <p-card [style]="{'margin-bottom':'0.5rem'}">
                  <div class="font-semibold text-sm">{{ step.phase }}</div>
                  <div class="text-sm mt-1" style="color: var(--text-muted)">{{ step.description }}</div>
                  <div class="flex gap-3 mt-2 text-xs flex-wrap">
                    <span *ngIf="step.source"><strong>{{ i18n.isArabic() ? 'المصدر:' : 'Source:' }}</strong> {{ step.source }}</span>
                    <span *ngIf="step.confidence"><strong>{{ i18n.isArabic() ? 'الثقة:' : 'Conf:' }}</strong> {{ (step.confidence * 100).toFixed(0) }}%</span>
                    <span *ngIf="step.tokens"><strong>Tokens:</strong> {{ step.tokens }}</span>
                  </div>
                </p-card>
              </ng-template>
            </p-timeline>

            <div class="mt-3" *ngIf="selectedExplanation.source_attributions?.length">
              <h4 class="mb-2">{{ i18n.isArabic() ? 'مصادر البيانات' : 'Source Attribution' }}</h4>
              <div class="flex flex-column gap-1">
                <div *ngFor="let src of selectedExplanation.source_attributions" class="flex justify-content-between align-items-center p-2 surface-100 border-round">
                  <span class="text-sm">{{ src.name || src.source }}</span>
                  <div class="flex align-items-center gap-2">
                    <p-progressBar [value]="+(src.weight * 100).toFixed(0)" [style]="{'height':'6px','width':'80px'}" [showValue]="false" />
                    <span class="text-xs">{{ (src.weight * 100).toFixed(0) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </p-card>
          <p-card *ngIf="!selectedExplanation" [header]="i18n.isArabic() ? 'اختر تفسيراً' : 'Select an explanation'">
            <p style="color: var(--text-muted)">{{ i18n.isArabic() ? 'انقر على صف في القائمة لعرض سلسلة التفسير' : 'Click a row in the list to view the full explanation chain and provenance trail.' }}</p>
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `,
})
export class AiExplainabilityComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly kpis = signal<{ label: string; labelAr: string; value: number | string; color: string }[]>([]);
  readonly recent = signal<any[]>([]);
  readonly provenanceSteps = signal<any[]>([]);
  selectedExplanation: any = null;

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/explainability/recent`).subscribe({
      next: (res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        this.recent.set(list);
        this.kpis.set([
          { label: 'Total Explanations', labelAr: 'إجمالي التفسيرات', value: list.length, color: 'var(--info)' },
          { label: 'Avg Confidence', labelAr: 'متوسط الثقة', value: list.length ? `${(list.reduce((s: number, r: any) => s + (r.confidence_score || 0), 0) / list.length * 100).toFixed(1)}%` : '—', color: 'var(--success)' },
          { label: 'Unique Agents', labelAr: 'وكلاء فريدون', value: new Set(list.map((r: any) => r.agent_id)).size, color: 'var(--blue-500)' },
          { label: 'With Override', labelAr: 'مع تجاوز', value: list.filter((r: any) => r.human_override).length, color: 'var(--warning)' },
        ]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load explainability data' });
      },
    });
  }

  onSelect(event: { data: any }): void {
    this.selectedExplanation = event.data;
    const id = event.data.explanation_id || event.data.id;
    if (id) {
      this.http.get<any>(`${environment.apiUrl}/ai/explainability/${id}`).subscribe({
        next: (res) => {
          const detail = res?.data || res || {};
          this.selectedExplanation = { ...event.data, ...detail };
          const steps = detail.provenance_steps || detail.reasoning_steps || detail.chain || [];
          this.provenanceSteps.set(steps.map((s: any, i: number) => ({ step: i + 1, ...s })));
        },
        error: () => {
          const steps = event.data.reasoning_steps || [];
          this.provenanceSteps.set(steps.map((s: any, i: number) => ({ step: i + 1, ...s })));
        },
      });
    } else {
      const steps = event.data.reasoning_steps || event.data.chain || [];
      this.provenanceSteps.set(steps.map((s: any, i: number) => ({ step: i + 1, ...s })));
    }
  }
}
