import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { EmptyStateComponent } from '@app/shared/components';
import { PageShellComponent } from '@app/shared/components/page-chrome/page-shell.component';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { RouterLink } from '@angular/router';
import { devError } from '@app/runtime/utils/dev-logger';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ksa-hub',
  standalone: true,
  imports: [CommonModule, PageShellComponent, CardModule, TagModule, ButtonModule, TabViewModule, RouterLink],
  template: `
    <app-page-shell icon="globe" [title]="'KSA Regulatory Hub'"
      [subtitle]="'Saudi Arabia regulatory intelligence and compliance module'"
      [breadcrumbs]="['Dashboard', 'KSA Hub']" [loading]="loading">
      <div class="ksa-hub-onboarding-cta">
        <h3 class="ksa-hub-cta-title">{{ i18n.translate('ksaHub.onboardingCtaTitle') }}</h3>
        <p class="ksa-hub-cta-desc">{{ i18n.translate('ksaHub.onboardingCtaDesc') }}</p>
        <a routerLink="/onboarding" class="ksa-hub-cta-btn" pButton [label]="i18n.translate('ksaHub.startOnboarding')"></a>
      </div>
      <p-tabView>
        <p-tabPanel header="Heatmap">
          <div class="heatmap-grid">
            <div *ngFor="let item of heatmap" class="heatmap-cell" [style.background]="cellColor(item.score)">
              <span class="cell-label">{{ item.regulator }}</span>
              <span class="cell-score">{{ item.score }}%</span>
            </div>
          </div>
          <div *ngIf="heatmap.length === 0 && !loading" class="empty-state">
            <p>No heatmap data available</p>
          </div>
        </p-tabPanel>
        <p-tabPanel header="Framework Mapping">
          <div class="mapping-list">
            <p-card *ngFor="let m of mappings" styleClass="mapping-card">
              <div class="mapping-row">
                <span class="mapping-source">{{ m.source_framework }}</span>
                <i class="pi pi-arrow-right"></i>
                <span class="mapping-target">{{ m.target_framework }}</span>
                <p-tag [value]="m.coverage + '%'" [severity]="m.coverage >= 80 ? 'success' : m.coverage >= 50 ? 'warning' : 'danger'" />
              </div>
            </p-card>
          </div>
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>
  `,
  styles: [`
    .ksa-hub-onboarding-cta { margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, var(--primary-bg, var(--text-heading)), var(--text-heading)); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); }
    .ksa-hub-cta-title { margin: 0 0 8px 0; font-size: var(--font-size-lg); color: var(--text-heading); }
    .ksa-hub-cta-desc { margin: 0 0 16px 0; font-size: var(--font-size-base); color: var(--text-muted); line-height: 1.5; }
    .ksa-hub-cta-btn { display: inline-block; }
    .heatmap-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
    .heatmap-cell{padding:16px;border-radius:var(--radius-md);text-align:center;color:#fff}
    .cell-label{display:block;font-size: var(--font-size-sm);font-weight:700}.cell-score{font-size: var(--font-size-xl);font-weight:800}
    .mapping-list{display:flex;flex-direction:column;gap:8px}
    .mapping-row{display:flex;align-items:center;gap:12px}
    .mapping-source,.mapping-target{font-weight:600;font-size: var(--font-size-base)}
    .empty-state{text-align:center;padding:48px;color:var(--text-muted)}
  `]
})
export class KSAHubComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false; heatmap: Record<string, any>[] = []; mappings: Record<string, any>[] = [];
  private compliance = inject(GrcComplianceService);
  constructor(public i18n: I18nService) {}
  ngOnInit() {
    this.loading = true;
    this.compliance.getKSAHeatmap().subscribe({
      next: (d: Record<string, any>) => { this.heatmap = Array.isArray(d) ? d : d.heatmap || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    this.compliance.getKSAFrameworkMapping().subscribe({
      next: (d: Record<string, any>) => { this.mappings = Array.isArray(d) ? d : d.mappings || []; },
      error: (e: any) => devError("[API]", e)
    });
  }
  cellColor(score: number): string {
    if (score >= 80) return '#16a34a'; if (score >= 60) return '#ca8a04'; if (score >= 40) return '#ea580c'; return 'var(--error)';
  }

}
