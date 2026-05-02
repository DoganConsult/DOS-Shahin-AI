import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface WorkerStatus {
  workerType: string;
  workerName: string;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastDurationMs: number | null;
  totalRuns: number;
  failCount: number;
  successRate: number;
}

interface ActiveExecution {
  id: string;
  worker_type: string;
  worker_name: string;
  started_at: string;
  status: string;
}

interface ExecutionStat {
  worker_type: string;
  total: number;
  completed: number;
  failed: number;
  avg_duration_ms: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-worker-monitor',
  standalone: true,
  imports: [CommonModule, TagModule, TableModule, SkeletonModule],
  template: `
    <div class="wm-page" [attr.dir]="isAr ? 'rtl' : 'ltr'">
      <h2>{{ isAr ? 'مراقبة العمال' : 'Worker Monitor' }}</h2>

      @if (loading()) {
        <p-skeleton width="100%" height="200px" />
      } @else {
        <!-- Active executions banner -->
        @if (active().length) {
          <div class="wm-active-banner">
            <i class="pi pi-spin pi-spinner"></i>
            <span>{{ active().length }} {{ isAr ? 'عمليات نشطة' : 'active executions' }}</span>
          </div>
        }

        <!-- Stats by type (24h) -->
        <div class="wm-stats-grid">
          @for (stat of stats(); track stat.worker_type) {
            <div class="wm-stat-card">
              <div class="wm-stat-type">{{ stat.worker_type }}</div>
              <div class="wm-stat-row">
                <span class="wm-stat-total">{{ stat.total }}</span>
                <span class="wm-stat-label">{{ isAr ? 'إجمالي' : 'total' }}</span>
              </div>
              <div class="wm-stat-row">
                <span class="wm-stat-ok">{{ stat.completed }}</span>
                <span class="wm-stat-fail">{{ stat.failed }} {{ isAr ? 'فشل' : 'failed' }}</span>
              </div>
              <div class="wm-stat-avg">{{ stat.avg_duration_ms | number:'1.0-0' }}ms {{ isAr ? 'متوسط' : 'avg' }}</div>
            </div>
          }
        </div>

        <!-- Worker status table -->
        <h3>{{ isAr ? 'حالة العمال' : 'Worker Status' }}</h3>
        <p-table [value]="statuses()" [rows]="25" [paginator]="statuses().length > 25" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ isAr ? 'النوع' : 'Type' }}</th>
              <th>{{ isAr ? 'الاسم' : 'Name' }}</th>
              <th>{{ isAr ? 'آخر تشغيل' : 'Last Run' }}</th>
              <th>{{ isAr ? 'الحالة' : 'Status' }}</th>
              <th>{{ isAr ? 'المدة' : 'Duration' }}</th>
              <th>{{ isAr ? 'الإجمالي' : 'Total' }}</th>
              <th>{{ isAr ? 'نسبة النجاح' : 'Success %' }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-w>
            <tr>
              <td><p-tag [value]="w.workerType" severity="info" /></td>
              <td>{{ w.workerName }}</td>
              <td>{{ w.lastRunAt ? (w.lastRunAt | date:'short') : '—' }}</td>
              <td>
                <p-tag [value]="w.lastStatus || 'unknown'"
                       [severity]="w.lastStatus === 'completed' ? 'success' : w.lastStatus === 'failed' ? 'danger' : 'info'" />
              </td>
              <td>{{ w.lastDurationMs ? (w.lastDurationMs + 'ms') : '—' }}</td>
              <td>{{ w.totalRuns }}</td>
              <td>
                <span [style.color]="w.successRate >= 95 ? 'var(--success)' : w.successRate >= 80 ? 'var(--warning)' : 'var(--error)'">
                  {{ w.successRate }}%
                </span>
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
  styles: [`
    .wm-page { padding: 1.5rem; }
    h2, h3 { color: var(--text-body); }
    .wm-active-banner {
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      border: 1px solid var(--primary);
      border-radius: var(--radius); padding: 0.75rem 1rem;
      display: flex; align-items: center; gap: 0.75rem;
      margin-bottom: 1.5rem; font-weight: 600;
    }
    .wm-stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .wm-stat-card {
      background: var(--bg-0); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem;
    }
    .wm-stat-type { font-weight: 700; font-size: var(--font-size-body-sm); color: var(--text-body); margin-bottom: 0.5rem; text-transform: capitalize; }
    .wm-stat-row { display: flex; justify-content: space-between; align-items: baseline; }
    .wm-stat-total { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-body); }
    .wm-stat-label { color: var(--text-muted); font-size: var(--font-size-caption); }
    .wm-stat-ok { color: var(--success); font-weight: 600; }
    .wm-stat-fail { color: var(--error); font-size: var(--font-size-caption); }
    .wm-stat-avg { color: var(--text-muted); font-size: var(--font-size-caption); margin-top: 0.25rem; }
  `],
})
export class WorkerMonitorComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);
  private refreshTimer: any;

  loading = signal(true);
  statuses = signal<WorkerStatus[]>([]);
  active = signal<ActiveExecution[]>([]);
  stats = signal<ExecutionStat[]>([]);

  get isAr() { return this.i18n.currentLang() === 'ar'; }

  ngOnInit() {
    this.loadAll();
    this.refreshTimer = setInterval(() => this.loadAll(), 30_000); // refresh every 30s
  }

  ngOnDestroy() {
    clearInterval(this.refreshTimer);
  }

  async loadAll() {
    this.loading.set(true);
    try {
      const [statusRes, activeRes, statsRes] = await Promise.all([
        this.http.get<any>('/api/admin/workers/status').toPromise(),
        this.http.get<any>('/api/admin/workers/executions/active').toPromise(),
        this.http.get<any>('/api/admin/workers/executions/stats?hours=24').toPromise(),
      ]);
      this.statuses.set(statusRes?.statuses ?? []);
      this.active.set(activeRes?.active ?? []);
      this.stats.set(statsRes?.stats ?? []);
    } catch { /* empty */ }
    this.loading.set(false);
  }
}
