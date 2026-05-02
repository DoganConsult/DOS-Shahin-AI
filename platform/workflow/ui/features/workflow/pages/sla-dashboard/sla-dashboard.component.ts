/**
 * SLADashboardComponent — SLA health dashboard across all modules.
 *
 * Displays 4 KPI cards (Total, On Track, At Risk, Breached), SLA by Role table,
 * breached tasks list, and at-risk tasks list. Data sourced from:
 *   GET /api/process-tasks/sla-stats
 *   GET /api/process-tasks/sla-by-role
 *   GET /api/process-tasks/sla-breaches
 *   GET /api/process-tasks/sla-warnings
 */

import {
  Component, OnInit, signal, inject, computed,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

interface SlaStats {
  breached_24h: number;
  breached_7d: number;
  warnings_active: number;
  open_tasks: number;
  avg_resolution_hours: number;
}

interface SlaRoleRow {
  role: string;
  total: number;
  at_risk: number;
  breached: number;
  on_track: number;
}

interface SlaTask {
  task_id: string;
  title: string;
  task_type: string;
  priority: string;
  assigned_user_name?: string;
  team_name?: string;
  sla_hours: number;
  breached_at?: string;
  sla_remaining_hours?: number;
  escalation_level?: number;
  created_at: string;
  due_date?: string;
}

@Component({
    selector: 'app-sla-dashboard',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, DatePipe],
    template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-xl font-bold text-[var(--text-0)]">
          {{ i18n.isAr ? 'لوحة مراقبة اتفاقيات مستوى الخدمة' : 'SLA Health Dashboard' }}
        </h1>
        <p class="text-sm text-[var(--text-1)] mt-1">
          {{ i18n.isAr ? 'صحة اتفاقيات مستوى الخدمة عبر جميع الوحدات' : 'SLA compliance health across all modules' }}
        </p>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Total Tasks -->
        <div class="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] p-4">
          <p class="text-xs font-medium text-[var(--text-1)] uppercase tracking-wide">
            {{ i18n.isAr ? 'المهام المفتوحة' : 'Open Tasks' }}
          </p>
          <p class="text-2xl font-bold text-[var(--text-0)] mt-1">{{ stats()?.open_tasks || 0 }}</p>
        </div>
        <!-- On Track -->
        <div class="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/5 p-4">
          <p class="text-xs font-medium text-[var(--success)] uppercase tracking-wide">
            {{ i18n.isAr ? 'على المسار' : 'On Track' }}
          </p>
          <p class="text-2xl font-bold text-[var(--success)] mt-1">{{ onTrackCount() }}</p>
        </div>
        <!-- At Risk -->
        <div class="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-4">
          <p class="text-xs font-medium text-[var(--warning)] uppercase tracking-wide">
            {{ i18n.isAr ? 'معرضة للخطر' : 'At Risk' }}
          </p>
          <p class="text-2xl font-bold text-[var(--warning)] mt-1">{{ stats()?.warnings_active || 0 }}</p>
        </div>
        <!-- Breached -->
        <div class="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4">
          <p class="text-xs font-medium text-[var(--danger)] uppercase tracking-wide">
            {{ i18n.isAr ? 'تم الاختراق' : 'Breached' }}
          </p>
          <p class="text-2xl font-bold text-[var(--danger)] mt-1">{{ stats()?.breached_24h || 0 }}</p>
          <p class="text-[10px] text-[var(--text-1)] mt-0.5">
            {{ stats()?.breached_7d || 0 }} {{ i18n.isAr ? 'آخر 7 أيام' : 'last 7 days' }}
          </p>
        </div>
      </div>

      <!-- SLA by Role -->
      <section class="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] overflow-hidden">
        <div class="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-0)]">
          <h2 class="text-sm font-semibold text-[var(--text-0)]">
            {{ i18n.isAr ? 'حسب الدور' : 'SLA by Role' }}
          </h2>
        </div>
        @if (roleRows().length === 0 && !loading()) {
          <div class="p-6 text-center text-sm text-[var(--text-1)] italic">
            {{ i18n.isAr ? 'لا توجد بيانات' : 'No data available' }}
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="SLA by role breakdown">
              <thead>
                <tr class="border-b border-[var(--border)] text-[var(--text-1)] bg-[var(--bg-0)]">
                  <th class="text-left px-4 py-2.5 font-medium">{{ i18n.isAr ? 'الدور' : 'Role' }}</th>
                  <th class="text-right px-4 py-2.5 font-medium">{{ i18n.isAr ? 'الإجمالي' : 'Total' }}</th>
                  <th class="text-right px-4 py-2.5 font-medium">{{ i18n.isAr ? 'على المسار' : 'On Track' }}</th>
                  <th class="text-right px-4 py-2.5 font-medium">{{ i18n.isAr ? 'معرض' : 'At Risk' }}</th>
                  <th class="text-right px-4 py-2.5 font-medium">{{ i18n.isAr ? 'مخترق' : 'Breached' }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of roleRows(); track row.role) {
                  <tr class="border-b border-[var(--border)]/50 hover:bg-[var(--bg-0)]/50">
                    <td class="px-4 py-2.5 font-medium text-[var(--text-0)] capitalize">{{ row.role }}</td>
                    <td class="px-4 py-2.5 text-right text-[var(--text-1)]">{{ row.total }}</td>
                    <td class="px-4 py-2.5 text-right text-[var(--success)]">{{ row.on_track }}</td>
                    <td class="px-4 py-2.5 text-right text-[var(--warning)]">{{ row.at_risk }}</td>
                    <td class="px-4 py-2.5 text-right text-[var(--danger)]">{{ row.breached }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <!-- Breached Tasks -->
      @if (breachedTasks().length > 0) {
        <section class="rounded-xl border border-[var(--danger)]/30 bg-[var(--bg-1)] overflow-hidden">
          <div class="px-5 py-3 border-b border-[var(--danger)]/30 bg-[var(--danger)]/5">
            <h2 class="text-sm font-semibold text-[var(--danger)]">
              {{ i18n.isAr ? 'مهام مخترقة' : 'Breached Tasks' }}
              <span class="ml-2 text-xs">({{ breachedTasks().length }})</span>
            </h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="SLA breached tasks">
              <thead>
                <tr class="border-b border-[var(--border)] text-[var(--text-1)]">
                  <th class="text-left px-4 py-2 font-medium">{{ i18n.isAr ? 'المهمة' : 'Task' }}</th>
                  <th class="text-left px-4 py-2 font-medium">{{ i18n.isAr ? 'الأولوية' : 'Priority' }}</th>
                  <th class="text-left px-4 py-2 font-medium">{{ i18n.isAr ? 'المعين' : 'Assigned To' }}</th>
                  <th class="text-left px-4 py-2 font-medium">SLA</th>
                  <th class="text-left px-4 py-2 font-medium">{{ i18n.isAr ? 'التصعيد' : 'Escalation' }}</th>
                  <th class="text-left px-4 py-2 font-medium">{{ i18n.isAr ? 'اختراق في' : 'Breached At' }}</th>
                </tr>
              </thead>
              <tbody>
                @for (task of breachedTasks(); track task.task_id) {
                  <tr class="border-b border-[var(--border)]/50">
                    <td class="px-4 py-2 text-[var(--text-0)]">{{ task.title || task.task_type }}</td>
                    <td class="px-4 py-2">
                      <span class="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                        [class]="priorityClass(task.priority)">{{ task.priority }}</span>
                    </td>
                    <td class="px-4 py-2 text-[var(--text-1)]">{{ task.assigned_user_name || '-' }}</td>
                    <td class="px-4 py-2 text-[var(--text-1)]">{{ task.sla_hours }}h</td>
                    <td class="px-4 py-2 text-[var(--warning)]">L{{ task.escalation_level || 0 }}</td>
                    <td class="px-4 py-2 text-[var(--text-1)]">{{ task.breached_at | date:'short' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- At-Risk Tasks -->
      @if (warningTasks().length > 0) {
        <section class="rounded-xl border border-[var(--warning)]/30 bg-[var(--bg-1)] overflow-hidden">
          <div class="px-5 py-3 border-b border-[var(--warning)]/30 bg-[var(--warning)]/5">
            <h2 class="text-sm font-semibold text-[var(--warning)]">
              {{ i18n.isAr ? 'مهام معرضة للخطر' : 'At-Risk Tasks' }}
              <span class="ml-2 text-xs">({{ warningTasks().length }})</span>
            </h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="SLA at-risk tasks">
              <thead>
                <tr class="border-b border-[var(--border)] text-[var(--text-1)]">
                  <th class="text-left px-4 py-2 font-medium">{{ i18n.isAr ? 'المهمة' : 'Task' }}</th>
                  <th class="text-left px-4 py-2 font-medium">{{ i18n.isAr ? 'الأولوية' : 'Priority' }}</th>
                  <th class="text-left px-4 py-2 font-medium">{{ i18n.isAr ? 'المعين' : 'Assigned To' }}</th>
                  <th class="text-left px-4 py-2 font-medium">SLA</th>
                  <th class="text-left px-4 py-2 font-medium">{{ i18n.isAr ? 'المتبقي' : 'Remaining' }}</th>
                </tr>
              </thead>
              <tbody>
                @for (task of warningTasks(); track task.task_id) {
                  <tr class="border-b border-[var(--border)]/50">
                    <td class="px-4 py-2 text-[var(--text-0)]">{{ task.title || task.task_type }}</td>
                    <td class="px-4 py-2">
                      <span class="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                        [class]="priorityClass(task.priority)">{{ task.priority }}</span>
                    </td>
                    <td class="px-4 py-2 text-[var(--text-1)]">{{ task.assigned_user_name || '-' }}</td>
                    <td class="px-4 py-2 text-[var(--text-1)]">{{ task.sla_hours }}h</td>
                    <td class="px-4 py-2 text-[var(--warning)] font-medium">{{ task.sla_remaining_hours }}h</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `
})
export class SLADashboardComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  stats = signal<SlaStats | null>(null);
  roleRows = signal<SlaRoleRow[]>([]);
  breachedTasks = signal<SlaTask[]>([]);
  warningTasks = signal<SlaTask[]>([]);
  loading = signal(false);

  /** Computed on-track count = open - warnings - breached_24h */
  onTrackCount = computed(() => {
    const s = this.stats();
    if (!s) return 0;
    return Math.max(0, s.open_tasks - s.warnings_active - s.breached_24h);
  });

  ngOnInit(): void {
    this.loadAll();
    interval(60_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadAll());
  }

  private loadAll(): void {
    this.loading.set(true);

    this.http.get<any>('/api/process-tasks/sla-stats').subscribe({
      next: (res) => {
        // Handle wrapped or raw response
        const data = res?.data || res;
        const raw = Array.isArray(data) ? (data[0] || {}) : (data || {});
        this.stats.set({ open_tasks: 0, breached_24h: 0, warnings_active: 0, breached_7d: 0, avg_resolution_hours: 0, ...raw });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.http.get<any>('/api/process-tasks/sla-by-role').subscribe({
      next: (res) => this.roleRows.set(res?.data || res || []),
    });

    this.http.get<any>('/api/process-tasks/sla-breaches').subscribe({
      next: (res) => this.breachedTasks.set(res?.data || res || []),
    });

    this.http.get<any>('/api/process-tasks/sla-warnings').subscribe({
      next: (res) => this.warningTasks.set(res?.data || res || []),
    });
  }

  priorityClass(priority: string): string {
    const p = (priority || '').toLowerCase();
    if (p === 'critical' || p === 'high') return 'bg-[var(--danger)]/20 text-[var(--danger)]';
    if (p === 'medium') return 'bg-[var(--warning)]/20 text-[var(--warning)]';
    return 'bg-[var(--bg-2)] text-[var(--text-1)]';
  }
}
