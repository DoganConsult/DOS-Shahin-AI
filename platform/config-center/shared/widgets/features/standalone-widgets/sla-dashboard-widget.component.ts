import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { interval, Subscription } from 'rxjs';

interface SlaStats {
  openTasks: number;
  breachedTasks: number;
  warningTasks: number;
  avgResolutionHours: number;
}

@Component({
  selector: 'app-sla-dashboard-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sla-widget">
      <div class="sla-header">
        <span class="sla-icon">&#x23F1;</span>
        <span class="sla-title">{{ i18n.localize('SLA Dashboard', 'لوحة اتفاقيات الخدمة') }}</span>
      </div>
      <div class="sla-grid" *ngIf="stats; else loadingTpl">
        <div class="sla-card" [class.sla-ok]="stats.breachedTasks === 0">
          <div class="sla-value">{{ stats.openTasks }}</div>
          <div class="sla-label">{{ i18n.localize('Open Tasks', 'المهام المفتوحة') }}</div>
        </div>
        <div class="sla-card sla-warning" *ngIf="stats.warningTasks > 0">
          <div class="sla-value">{{ stats.warningTasks }}</div>
          <div class="sla-label">{{ i18n.localize('SLA Warning', 'تحذير SLA') }}</div>
        </div>
        <div class="sla-card" [class.sla-breach]="stats.breachedTasks > 0">
          <div class="sla-value">{{ stats.breachedTasks }}</div>
          <div class="sla-label">{{ i18n.localize('Breached', 'متجاوزة') }}</div>
        </div>
        <div class="sla-card">
          <div class="sla-value">{{ stats.avgResolutionHours | number:'1.0-1' }}h</div>
          <div class="sla-label">{{ i18n.localize('Avg Resolution', 'متوسط الحل') }}</div>
        </div>
      </div>
      <ng-template #loadingTpl>
        <div class="sla-loading">{{ i18n.localize('Loading...', 'جارٍ التحميل...') }}</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .sla-widget { padding: 16px; }
    .sla-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .sla-icon { font-size: var(--font-size-xl); }
    .sla-title { font-weight: 600; font-size: var(--font-size-base); }
    .sla-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .sla-card { padding: 12px; border-radius: var(--radius); background: var(--surface-card, #f8f9fa); text-align: center; }
    .sla-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--primary-color, #0ea5e9); }
    .sla-label { font-size: var(--font-size-xs); color: var(--text-color-secondary, #6b7280); margin-top: 4px; }
    .sla-breach { background: #fef2f2; }
    .sla-breach .sla-value { color: #ef4444; }
    .sla-warning { background: #fffbeb; }
    .sla-warning .sla-value { color: #f59e0b; }
    .sla-ok .sla-value { color: #10b981; }
    .sla-loading { text-align: center; padding: 24px; color: var(--text-color-secondary); }
  `],
})
export class SlaDashboardWidgetComponent implements OnInit, OnDestroy {
  stats: SlaStats | null = null;
  private refreshSub?: Subscription;

  constructor(private http: HttpClient, public i18n: I18nService) {}

  ngOnInit(): void {
    this.loadStats();
    this.refreshSub = interval(30000).subscribe(() => this.loadStats());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private loadStats(): void {
    this.http.get<unknown>('/api/work-items/stats').subscribe({
      next: (data) => {
        this.stats = {
          openTasks: data.open || data.openTasks || 0,
          breachedTasks: data.breached || data.breachedTasks || 0,
          warningTasks: data.warning || data.warningTasks || 0,
          avgResolutionHours: data.avgResolutionHours || 0,
        };
      },
      error: () => {
        this.stats = { openTasks: 0, breachedTasks: 0, warningTasks: 0, avgResolutionHours: 0 };
      },
    });
  }
}
