// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { QiyasStrategyApiService } from '../services/qiyas-strategy-api.service';
import { PageHeaderComponent } from '../../../../../shared/components/page-chrome/page-header.component';

@Component({
    selector: 'app-strategy-home',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, TagModule, SkeletonModule, ProgressBarModule, PageHeaderComponent],
    template: `
    <app-page-header titleEn="Strategy & Direction" titleAr="الاستراتيجية والتوجيه" icon="pi-compass"
                     subtitleEn="Strategic objectives, maturity, KPIs/KRIs, and improvement roadmap"
                     subtitleAr="الأهداف الاستراتيجية والنضج ومؤشرات الأداء وخارطة التحسين" />

    @if (loading()) {
      <div class="sk-grid"><p-skeleton height="100px" /><p-skeleton height="100px" /><p-skeleton height="100px" /><p-skeleton height="100px" /></div>
    } @else {
      <!-- KPI Strip -->
      <section class="strat-kpi">
        <div class="strat-card" routerLink="/qiyas/strategy/objectives">
          <span class="strat-val">{{ data().objectives?.active || 0 }}</span>
          <span class="strat-lbl">Active Objectives</span>
          <p-progressBar [value]="data().objectives?.avgProgress || 0" [showValue]="false" styleClass="mt-1" />
        </div>
        <div class="strat-card" routerLink="/qiyas/strategy/themes">
          <span class="strat-val">{{ data().themes?.total || 0 }}</span>
          <span class="strat-lbl">Strategic Themes</span>
        </div>
        <div class="strat-card" routerLink="/qiyas/strategy/priorities">
          <span class="strat-val">{{ data().priorities?.total || 0 }}</span>
          <span class="strat-lbl">Enterprise Priorities</span>
        </div>
        <div class="strat-card" routerLink="/qiyas/strategy/risk-appetite">
          <span class="strat-val">{{ data().riskAppetite?.approved || 0 }}/{{ data().riskAppetite?.total || 0 }}</span>
          <span class="strat-lbl">Risk Appetite (Approved)</span>
        </div>
        <div class="strat-card" routerLink="/qiyas/strategy/roadmap">
          <span class="strat-val">{{ data().roadmap?.completed || 0 }}/{{ data().roadmap?.total || 0 }}</span>
          <span class="strat-lbl">Roadmap Items</span>
        </div>
        <div class="strat-card" routerLink="/qiyas/strategy/scorecards">
          <span class="strat-val">{{ data().latestMaturity?.level || '—' }}</span>
          <span class="strat-lbl">Maturity Level</span>
          @if (data().latestMaturity?.score) {
            <span class="strat-score">{{ data().latestMaturity.score }}%</span>
          }
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="strat-actions">
        <button pButton label="New Objective" icon="pi pi-plus" class="p-button-sm" routerLink="/qiyas/strategy/objectives" [queryParams]="{action:'create'}"></button>
        <button pButton label="Capture Metric" icon="pi pi-chart-line" class="p-button-sm p-button-outlined" routerLink="/qiyas/strategy/kpi-kri"></button>
        <button pButton label="Add Roadmap Item" icon="pi pi-map" class="p-button-sm p-button-outlined" routerLink="/qiyas/strategy/roadmap" [queryParams]="{action:'create'}"></button>
        <button pButton label="Executive Pack" icon="pi pi-file" class="p-button-sm p-button-outlined" routerLink="/qiyas/strategy/executive-packs"></button>
      </section>

      <!-- At-Risk Objectives -->
      @if (data().objectives?.atRisk > 0) {
        <section class="strat-alert">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ data().objectives.atRisk }} objectives at risk</span>
          <a routerLink="/qiyas/strategy/objectives" [queryParams]="{status:'at_risk'}">View details</a>
        </section>
      }

      @if (data().roadmap?.blocked > 0) {
        <section class="strat-alert strat-alert-warn">
          <i class="pi pi-ban"></i>
          <span>{{ data().roadmap.blocked }} roadmap items blocked</span>
          <a routerLink="/qiyas/strategy/roadmap" [queryParams]="{status:'blocked'}">View details</a>
        </section>
      }
    }
  `,
    styles: [`
    :host { display: block; padding: 0 16px 24px; }
    .sk-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .strat-kpi { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin: 16px 0; }
    .strat-card {
      padding: 16px; border-radius: var(--radius); border: 1px solid var(--border, #e2e8f0);
      background: var(--bg-0, #fff); cursor: pointer; text-align: center; transition: border-color 0.15s;
    }
    .strat-card:hover { border-color: var(--primary, #3b82f6); }
    .strat-val { display: block; font-size: 1.8rem; font-weight: 700; color: var(--text-body, #1e293b); }
    .strat-lbl { display: block; font-size: var(--font-size-sm); color: var(--text-muted, #64748b); margin: 4px 0; }
    .strat-score { font-size: var(--font-size-tag); font-weight: 600; color: var(--primary, #3b82f6); }
    .strat-actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0; }
    .strat-alert {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: var(--radius);
      background: var(--error-bg, #fee2e2); color: var(--error, #dc2626); font-size: var(--font-size-body-sm); margin: 8px 0;
    }
    .strat-alert a { color: var(--error, #dc2626); font-weight: 600; text-decoration: underline; }
    .strat-alert-warn { background: var(--warning-bg, #fef9c3); color: var(--warning, #92400e); }
    .strat-alert-warn a { color: var(--warning, #92400e); }
  `]
})
export class StrategyHomeComponent implements OnInit {
  private readonly api = inject(QiyasStrategyApiService);
  loading = signal(true);
  data = signal<any>({});

  ngOnInit(): void {
    this.api.getOverview().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
