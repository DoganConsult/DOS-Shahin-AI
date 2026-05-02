import { Component, OnInit, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, interval, switchMap, startWith } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { Workflow3LevelApiService } from '../../services/workflow-3level-api.service';
import type { GuardrailStatusDto } from '../../services/workflow-3level-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-guardrail-status',
    imports: [CommonModule, PageHeaderComponent, SkeletonLoaderComponent,
        TagModule, ButtonModule, CardModule, ProgressBarModule, TooltipModule],
    template: `
    <app-page-header
      titleEn="Guardrail Status" titleAr="حالة حواجز الحماية"
      subtitleEn="Real-time AI safety guardrails: kill switch, boundaries, budgets, autonomy & review gates"
      subtitleAr="حواجز حماية سلامة الذكاء الاصطناعي في الوقت الفعلي"
      icon="shield" [breadcrumbs]="['Workflows', 'Guardrails']"
      [isAr]="i18n.currentLang()==='ar'" [dir]="i18n.direction()" />

    <div class="gr-body" [dir]="i18n.direction()">
      <app-skeleton-loader *ngIf="!status()" variant="card" [count]="5" />

      <ng-container *ngIf="status()">
        <div class="gr-overall" [ngClass]="'gr-' + status()!.overallHealth">
          <i class="pi" [ngClass]="status()!.overallHealth === 'healthy' ? 'pi-check-circle' : status()!.overallHealth === 'halted' ? 'pi-ban' : 'pi-exclamation-triangle'"></i>
          <div>
            <strong>{{ i18n.currentLang()==='ar' ? 'الحالة العامة' : 'Overall System Health' }}</strong>
            <p-tag [value]="status()!.overallHealth.toUpperCase()" [severity]="status()!.overallHealth === 'healthy' ? 'success' : status()!.overallHealth === 'halted' ? 'danger' : 'warning'" class="ml-2" />
          </div>
          <span class="gr-ts">{{ status()!.timestamp | date:'medium' }}</span>
        </div>

        <div class="gr-grid">
          <div class="gr-card" [ngClass]="status()!.killSwitch.active ? 'gr-card-danger' : 'gr-card-ok'">
            <div class="gr-card-icon"><i class="pi pi-power-off"></i></div>
            <div class="gr-card-content">
              <h4>{{ i18n.currentLang()==='ar' ? 'مفتاح الإيقاف' : 'Kill Switch' }}</h4>
              <p-tag [value]="status()!.killSwitch.active ? 'ACTIVE (' + status()!.killSwitch.count + ')' : 'OFF'" [severity]="status()!.killSwitch.active ? 'danger' : 'success'" />
              <div *ngIf="status()!.killSwitch.active" class="gr-detail mt-2">
                <div *ngFor="let sw of status()!.killSwitch.switches" class="gr-switch-row">
                  <span class="gr-scope"><p-tag [value]="sw.scope" severity="danger" /></span>
                  <span class="gr-reason">{{ sw.reason }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="gr-card">
            <div class="gr-card-icon"><i class="pi pi-ban"></i></div>
            <div class="gr-card-content">
              <h4>{{ i18n.currentLang()==='ar' ? 'الحدود المحظورة' : 'Forbidden Boundaries' }}</h4>
              <div class="gr-metrics">
                <div class="gr-metric"><span class="gr-metric-val">{{ status()!.boundaries.total }}</span><span class="gr-metric-label">Total</span></div>
                <div class="gr-metric"><span class="gr-metric-val text-red-500">{{ status()!.boundaries.blocking }}</span><span class="gr-metric-label">Blocking</span></div>
                <div class="gr-metric"><span class="gr-metric-val text-orange-500">{{ status()!.boundaries.warning }}</span><span class="gr-metric-label">Warning</span></div>
              </div>
            </div>
          </div>

          <div class="gr-card" [ngClass]="!status()!.budget.allowed ? 'gr-card-danger' : 'gr-card-ok'">
            <div class="gr-card-icon"><i class="pi pi-wallet"></i></div>
            <div class="gr-card-content">
              <h4>{{ i18n.currentLang()==='ar' ? 'ميزانية الذكاء الاصطناعي' : 'AI Budget' }}</h4>
              <div *ngIf="status()!.budget.configured">
                <p-progressBar [value]="status()!.budget.utilization" [showValue]="true" [style]="{height:'14px'}"
                  [ngClass]="status()!.budget.utilization > 80 ? 'gr-bar-red' : status()!.budget.utilization > 50 ? 'gr-bar-yellow' : 'gr-bar-green'" />
                <div class="gr-budget-meta mt-2">
                  <span>Remaining: <strong>{{ status()!.budget.remaining }}</strong> executions</span>
                  <p-tag [value]="status()!.budget.allowed ? 'WITHIN LIMIT' : 'EXCEEDED'" [severity]="status()!.budget.allowed ? 'success' : 'danger'" />
                </div>
              </div>
              <p-tag *ngIf="!status()!.budget.configured" value="NOT CONFIGURED" severity="warning" />
            </div>
          </div>

          <div class="gr-card">
            <div class="gr-card-icon"><i class="pi pi-eye"></i></div>
            <div class="gr-card-content">
              <h4>{{ i18n.currentLang()==='ar' ? 'نقاط المراجعة' : 'Review Points' }}</h4>
              <div class="gr-metrics">
                <div class="gr-metric"><span class="gr-metric-val">{{ status()!.reviewPoints.total }}</span><span class="gr-metric-label">Total</span></div>
                <div class="gr-metric"><span class="gr-metric-val text-green-500">{{ status()!.reviewPoints.active }}</span><span class="gr-metric-label">Active</span></div>
              </div>
            </div>
          </div>

          <div class="gr-card">
            <div class="gr-card-icon"><i class="pi pi-bolt"></i></div>
            <div class="gr-card-content">
              <h4>{{ i18n.currentLang()==='ar' ? 'نطاقات الاستقلالية' : 'Autonomy Scopes' }}</h4>
              <div class="gr-metrics">
                <div class="gr-metric"><span class="gr-metric-val">{{ status()!.autonomy.total }}</span><span class="gr-metric-label">Total</span></div>
                <div class="gr-metric"><span class="gr-metric-val text-blue-500">{{ status()!.autonomy.active }}</span><span class="gr-metric-label">Active</span></div>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
    styles: [`
    .gr-body { padding: 0 24px 40px; }
    .gr-overall { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-radius: var(--radius-lg); margin-bottom: 24px; }
    .gr-overall .pi { font-size: var(--font-size-2xl); }
    .gr-ts { margin-left: auto; font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .gr-healthy { background: var(--green-50); border: 1px solid var(--green-200); color: var(--green-700); }
    .gr-halted { background: var(--red-50); border: 1px solid var(--red-200); color: var(--red-700); }
    .gr-degraded { background: var(--orange-50); border: 1px solid var(--orange-200); color: var(--orange-700); }
    .gr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
    .gr-card { display: flex; gap: 16px; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-lg); padding: 20px; transition: border-color 0.2s; }
    .gr-card-danger { border-color: var(--red-300); background: var(--red-50); }
    .gr-card-ok { border-color: var(--green-200); }
    .gr-card-icon { width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; background: var(--surface-100); flex-shrink: 0; }
    .gr-card-icon .pi { font-size: var(--font-size-body-lg); }
    .gr-card-content { flex: 1; }
    .gr-card-content h4 { margin: 0 0 8px; font-size: var(--font-size-body-sm); font-weight: 600; }
    .gr-metrics { display: flex; gap: 20px; }
    .gr-metric { display: flex; flex-direction: column; align-items: center; }
    .gr-metric-val { font-size: var(--font-size-2xl); font-weight: 700; }
    .gr-metric-label { font-size: var(--font-size-xs); color: var(--text-color-secondary); text-transform: uppercase; }
    .gr-switch-row { display: flex; gap: 8px; align-items: center; padding: 4px 0; }
    .gr-reason { font-size: var(--font-size-caption); }
    .gr-budget-meta { display: flex; align-items: center; justify-content: space-between; font-size: var(--font-size-caption); }
    .gr-bar-green .p-progressbar-value { background: var(--green-500); }
    .gr-bar-yellow .p-progressbar-value { background: var(--yellow-500); }
    .gr-bar-red .p-progressbar-value { background: var(--red-500); }
  `]
})
export class WorkflowGuardrailStatusComponent implements OnInit {
  private api = inject(Workflow3LevelApiService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);

  status = signal<GuardrailStatusDto | null>(null);

  ngOnInit(): void {
    interval(30000).pipe(
      startWith(0),
      switchMap(() => this.api.getGuardrailStatus().pipe(catchError(() => of(null)))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(d => { if (d) this.status.set(d); });
  }
}
