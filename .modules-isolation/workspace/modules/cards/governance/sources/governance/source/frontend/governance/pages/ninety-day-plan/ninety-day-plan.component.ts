/**
 * 90-Day Plan Page — Timeline of compliance milestones grouped into 30-day intervals.
 *
 * Fetches milestone data from the roadmap API via ApiClientService and displays them
 * in a PrimeNG Timeline grouped into Day 1-30, Day 31-60, Day 61-90 intervals.
 * Completed milestones show completion date, overdue milestones show danger indicator,
 * and pending milestones show default styling.
 *
 * Integrates ScopeFilterBarComponent for entity/framework/period filtering.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 15.4
 */

import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TimelineModule } from 'primeng/timeline';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ScopeFilterBarComponent, ScopeFilter, OrgEntity } from '@app/shared/scope-filter-bar/scope-filter-bar.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

// ── Exported interfaces for testing ──────────────────────────────────

export interface Milestone {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  dayNumber: number;
  status: 'completed' | 'overdue' | 'pending';
  completedAt?: string;
  dueDate?: string;
  phase?: string;
  category?: string;
}

export interface MilestoneGroup {
  label: string;
  labelAr: string;
  range: [number, number];
  milestones: Milestone[];
}

/**
 * Groups milestones into 30-day intervals.
 * Exported for property-based testing.
 */
export function groupMilestonesIntoIntervals(milestones: Milestone[]): MilestoneGroup[] {
  const groups: MilestoneGroup[] = [
    { label: 'Day 1–30', labelAr: 'اليوم 1–30', range: [1, 30], milestones: [] },
    { label: 'Day 31–60', labelAr: 'اليوم 31–60', range: [31, 60], milestones: [] },
    { label: 'Day 61–90', labelAr: 'اليوم 61–90', range: [61, 90], milestones: [] },
  ];

  for (const m of milestones) {
    const day = m.dayNumber;
    if (day >= 1 && day <= 30) {
      groups[0].milestones.push(m);
    } else if (day >= 31 && day <= 60) {
      groups[1].milestones.push(m);
    } else if (day >= 61 && day <= 90) {
      groups[2].milestones.push(m);
    }
  }

  // Sort milestones within each group by dayNumber
  for (const g of groups) {
    g.milestones.sort((a, b) => a.dayNumber - b.dayNumber);
  }

  return groups;
}

/**
 * Returns the severity for a milestone status.
 * Exported for property-based testing.
 */
export function getMilestoneSeverity(status: string): 'success' | 'danger' | 'info' | undefined {
  switch (status) {
    case 'completed': return 'success';
    case 'overdue': return 'danger';
    case 'pending': return 'info';
    default: return undefined;
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ninety-day-plan',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    TimelineModule, TagModule, CardModule, ButtonModule, SkeletonModule,
    ScopeFilterBarComponent, AppDatePipe,],
  template: `
    <app-page-shell icon="calendar" [title]="i18n.translate('ninetyDayPlan.title')"
      [subtitle]="i18n.translate('ninetyDayPlan.subtitle')"
      [breadcrumbs]="['Dashboard', '90-Day Plan']" [loading]="loading">

      <!-- Scope Filter Bar -->
      <app-scope-filter-bar
        [entities]="entities"
        [frameworks]="frameworks"
        (filterChange)="onFilterChange($event)"
      />

      <!-- Loading skeleton -->
      <div *ngIf="loading" class="skeleton-container">
        <p-skeleton width="100%" height="3rem" styleClass="mb-3" />
        <p-skeleton width="100%" height="6rem" styleClass="mb-2" />
        <p-skeleton width="100%" height="6rem" styleClass="mb-2" />
        <p-skeleton width="100%" height="6rem" />
      </div>

      <!-- Error state -->
      <div *ngIf="!loading && errorMessage" class="error-state">
        <i class="pi pi-exclamation-triangle"></i>
        <p>{{ errorMessage }}</p>
        <p-button icon="pi pi-refresh" [label]="i18n.translate('common.retry')" (onClick)="loadMilestones()" />
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading && !errorMessage && milestones.length === 0" class="empty-state">
        <i class="pi pi-calendar"></i>
        <p>{{ i18n.translate('ninetyDayPlan.noMilestones') }}</p>
      </div>

      <!-- Stats summary -->
      <div *ngIf="!loading && !errorMessage && milestones.length > 0" class="stats-row mb-3">
        <div class="stat-card">
          <span class="stat-value completed">{{ completedCount }}</span>
          <span class="stat-label">{{ i18n.translate('ninetyDayPlan.completed') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value overdue">{{ overdueCount }}</span>
          <span class="stat-label">{{ i18n.translate('ninetyDayPlan.overdue') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value pending">{{ pendingCount }}</span>
          <span class="stat-label">{{ i18n.translate('ninetyDayPlan.pending') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value total">{{ milestones.length }}</span>
          <span class="stat-label">{{ i18n.translate('ninetyDayPlan.total') }}</span>
        </div>
      </div>

      <!-- Grouped timeline -->
      <div *ngIf="!loading && !errorMessage && milestones.length > 0">
        <div *ngFor="let group of groups" class="interval-section mb-4">
          <h3 class="interval-header">
            {{ i18n.localize(group.label, group.labelAr) }}
            <span class="interval-count">({{ group.milestones.length }})</span>
          </h3>

          <div *ngIf="group.milestones.length === 0" class="no-milestones">
            {{ i18n.translate('ninetyDayPlan.noMilestonesInInterval') }}
          </div>

          <p-timeline *ngIf="group.milestones.length > 0" [value]="group.milestones" layout="vertical" align="left">
            <ng-template pTemplate="marker" let-m>
              <span class="milestone-marker" [ngClass]="'marker-' + m.status">
                <i class="pi" [ngClass]="m.status === 'completed' ? 'pi pi-check' : m.status === 'overdue' ? 'pi-exclamation-triangle' : 'pi-clock'" ></i>
              </span>
            </ng-template>
            <ng-template pTemplate="content" let-m>
              <p-card styleClass="milestone-card">
                <div class="milestone-header">
                  <span class="milestone-title">{{ i18n.currentLang() === 'ar' && m.titleAr ? m.titleAr : m.title }}</span>
                  <p-tag [value]="getStatusLabel(m.status)" [severity]="getSeverity(m.status)" />
                </div>
                <p *ngIf="m.description || m.descriptionAr" class="milestone-desc">
                  {{ i18n.currentLang() === 'ar' && m.descriptionAr ? m.descriptionAr : m.description }}
                </p>
                <div class="milestone-meta">
                  <span class="day-badge">{{ i18n.translate('ninetyDayPlan.day') }} {{ m.dayNumber }}</span>
                  <span *ngIf="m.status === 'completed' && m.completedAt" class="completed-date">
                    <i class="pi pi-check-circle"></i>
                    {{ m.completedAt | appDate:'medium' }}
                  </span>
                  <span *ngIf="m.status === 'overdue'" class="overdue-indicator">
                    <i class="pi pi-exclamation-triangle"></i>
                    {{ i18n.translate('ninetyDayPlan.overdue') }}
                  </span>
                  <span *ngIf="m.phase" class="phase-badge">{{ m.phase }}</span>
                </div>
                <div class="milestone-actions">
                  <button *ngIf="m.status !== 'completed'" class="action-btn complete-btn"
                          (click)="completeMilestone(m)" [disabled]="m._loading">
                    <i class="pi" [ngClass]="m._loading ? 'pi-spin pi-spinner' : 'pi-check'"></i>
                    {{ i18n.translate('ninetyDayPlan.complete') }}
                  </button>
                  <button *ngIf="m.status === 'completed'" class="action-btn reopen-btn"
                          (click)="reopenMilestone(m)" [disabled]="m._loading">
                    <i class="pi" [ngClass]="m._loading ? 'pi-spin pi-spinner' : 'pi-replay'"></i>
                    {{ i18n.translate('ninetyDayPlan.reopen') }}
                  </button>
                </div>
              </p-card>
            </ng-template>
          </p-timeline>
        </div>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .skeleton-container { padding: 1rem 0; }
    .error-state, .empty-state {
      text-align: center; padding: 3rem 1rem;
      color: var(--text-color-secondary);
    }
    .error-state i, .empty-state i { font-size: 2.5rem; margin-bottom: 1rem; display: block; }
    .error-state i { color: var(--red-500); }
    .empty-state i { color: var(--surface-400); }

    .stats-row {
      display: flex; gap: 12px; flex-wrap: wrap;
    }
    .stat-card {
      flex: 1; min-width: 120px; text-align: center;
      padding: 12px; background: var(--surface-card);
      border-radius: var(--radius); border: 1px solid var(--surface-border);
    }
    .stat-value { display: block; font-size: 1.5rem; font-weight: 700; }
    .stat-value.completed { color: var(--green-500); }
    .stat-value.overdue { color: var(--red-500); }
    .stat-value.pending { color: var(--blue-500); }
    .stat-value.total { color: var(--primary-color); }
    .stat-label { font-size: 0.8rem; color: var(--text-color-secondary); }

    .interval-header {
      font-size: 1.1rem; font-weight: 600;
      color: var(--text-color); margin-bottom: 12px;
      padding-bottom: 8px; border-bottom: 2px solid var(--primary-color);
    }
    .interval-count { font-weight: 400; color: var(--text-color-secondary); font-size: 0.9rem; }
    .no-milestones {
      padding: 1rem; text-align: center;
      color: var(--text-color-secondary); font-style: italic;
    }

    .milestone-marker {
      width: 32px; height: 32px; border-radius: var(--radius-pill);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem;
    }
    .marker-completed { background: var(--green-100); color: var(--success); }
    .marker-overdue { background: var(--red-100); color: var(--error); }
    .marker-pending { background: var(--blue-100); color: var(--blue-600); }

    .milestone-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .milestone-title { font-weight: 600; font-size: 0.95rem; }
    .milestone-desc { color: var(--text-color-secondary); font-size: 0.85rem; margin: 6px 0 0; }
    .milestone-meta { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 0.8rem; flex-wrap: wrap; }
    .day-badge {
      background: var(--surface-ice); padding: 2px 8px;
      border-radius: var(--radius-xs); font-weight: 600; color: var(--text-color);
    }
    .completed-date { color: var(--success); display: flex; align-items: center; gap: 4px; }
    .overdue-indicator { color: var(--error); display: flex; align-items: center; gap: 4px; font-weight: 600; }
    .phase-badge {
      background: var(--primary-100, #e0f2fe); color: var(--primary-700, #0369a1);
      padding: 2px 8px; border-radius: var(--radius-xs); font-size: 0.75rem; text-transform: capitalize;
    }
    .milestone-actions { display:flex; gap:6px; margin-top:10px; }
    .action-btn {
      display:inline-flex; align-items:center; gap:5px;
      padding:5px 14px; border-radius:var(--radius-sm); border:1px solid var(--surface-border,var(--border-subtle));
      font-size:0.8rem; font-weight:600; cursor:pointer; transition:all .15s;
      background:var(--surface-card,#fff); color:var(--text-color,#334155);
    }
    .action-btn:disabled { opacity:.5; cursor:not-allowed; }
    .complete-btn { border-color:var(--green-300,#86efac); color:var(--green-700,#15803d); }
    .complete-btn:hover:not(:disabled) { background:var(--green-50,var(--status-success-bg, #defbe6)); }
    .reopen-btn { border-color:var(--blue-300,#93c5fd); color:var(--blue-700,#1d4ed8); }
    .reopen-btn:hover:not(:disabled) { background:var(--blue-50,#eff6ff); }
  `]
})
export class NinetyDayPlanComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  private subs: Subscription[] = [];
  private live = inject(GrcLiveService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  errorMessage = '';

  milestones: Milestone[] = [];
  groups: MilestoneGroup[] = [];

  completedCount = 0;
  overdueCount = 0;
  pendingCount = 0;

  // Scope filter data
  entities: OrgEntity[] = [];
  frameworks: string[] = [];
  activeFilter: ScopeFilter | null = null;

  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  ngOnInit(): void {
    this.subs.push(this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadMilestones()));
    this.loadScopeData();
    this.loadMilestones();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  /** Load org entities and frameworks for the scope filter bar. */
  private loadScopeData(): void {
    this.subs.push(
      this.operationsSvc.getTenantConfig().subscribe({
        next: (cfg: Record<string, unknown>) => {
          this.entities = cfg?.orgStructure || [];
          this.frameworks = (cfg?.sectors || []) as string[];
        },
        error: () => { /* degrade gracefully — filter bar shows empty */ }
      })
    );
  }

  /** Fetch milestones from the roadmap API and group into 30-day intervals. */
  loadMilestones(): void {
    this.loading = true;
    this.errorMessage = '';

    const params: string[] = [];
    if (this.activeFilter?.entityId) params.push(`entityId=${encodeURIComponent(this.activeFilter.entityId)}`);
    if (this.activeFilter?.framework) params.push(`frameworkId=${encodeURIComponent(this.activeFilter.framework)}`);
    if (this.activeFilter?.period) params.push(`period=${encodeURIComponent(this.activeFilter.period)}`);
    const qs = params.length ? `?${params.join('&')}` : '';

    this.subs.push(
      this.apiclientSvc.get(`/workspace-lifecycle/ninety-day-plan${qs}`).subscribe({
        next: (data: any) => {
          this.milestones = this.extractMilestones(data);
          this.groups = groupMilestonesIntoIntervals(this.milestones);
          this.updateCounts();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.errorMessage = this.i18n.translate('ninetyDayPlan.loadError');
          this.loading = false;
          this.cdr.markForCheck();
        }
      })
    );
  }

  /** Handle scope filter changes — re-fetch with filter params. */
  onFilterChange(filter: ScopeFilter): void {
    this.activeFilter = filter;
    this.loadMilestones();
  }

  /** Map raw roadmap API response to Milestone array. */
  private extractMilestones(data: any): Milestone[] {
    // The roadmap API may return milestones in various shapes
    const raw: Record<string, unknown>[] = data?.milestones || data?.tasks || data?.items || [];
    const startDate = data?.startDate ? new Date(data.startDate) : new Date();

    return raw.map((item: Record<string, unknown>, idx: number) => {
      const dayNumber = item.dayNumber
        || item.day
        || this.computeDayNumber(item, startDate)
        || (idx + 1);

      const status = this.resolveStatus(item);

      return {
        id: item.id || item.task_id || item.milestone_id || `m-${idx}`,
        title: item.title || item.title_en || item.name || `Milestone ${idx + 1}`,
        titleAr: item.title_ar || item.titleAr || '',
        description: item.description || item.description_en || '',
        descriptionAr: item.description_ar || item.descriptionAr || '',
        dayNumber: Math.max(1, Math.min(90, dayNumber)),
        status,
        completedAt: item.completed_at || item.completedAt || undefined,
        dueDate: item.due_date || item.dueDate || item.target_date || undefined,
        phase: item.phase_type || item.phase || undefined,
        category: item.category || item.target_module || undefined,
      };
    }).filter((m: Milestone) => m.dayNumber >= 1 && m.dayNumber <= 90);
  }

  /** Compute day number from dates if not directly provided. */
  private computeDayNumber(item: Record<string, unknown>, startDate: Date): number {
    const target = item.due_date || item.dueDate || item.target_date || item.created_at;
    if (!target) return 0;
    const diff = Math.ceil((new Date(target).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }

  /** Resolve milestone status from raw data. */
  private resolveStatus(item: Record<string, unknown>): 'completed' | 'overdue' | 'pending' {
    const s = (item.status || '').toLowerCase();
    if (s === 'completed' || s === 'done' || s === 'complete') return 'completed';
    if (s === 'overdue' || s === 'late') return 'overdue';

    // Check if overdue based on due date
    const dueDate = item.due_date || item.dueDate || item.target_date;
    if (dueDate && s !== 'completed' && s !== 'done') {
      const due = new Date(dueDate);
      if (due < new Date() && s !== 'completed') return 'overdue';
    }

    return 'pending';
  }

  private updateCounts(): void {
    this.completedCount = this.milestones.filter(m => m.status === 'completed').length;
    this.overdueCount = this.milestones.filter(m => m.status === 'overdue').length;
    this.pendingCount = this.milestones.filter(m => m.status === 'pending').length;
  }

  getSeverity(status: string): 'success' | 'danger' | 'info' | undefined {
    return getMilestoneSeverity(status);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return this.i18n.translate('ninetyDayPlan.statusCompleted');
      case 'overdue': return this.i18n.translate('ninetyDayPlan.statusOverdue');
      case 'pending': return this.i18n.translate('ninetyDayPlan.statusPending');
      default: return status;
    }
  }

  completeMilestone(m: Record<string, unknown>): void {
    m._loading = true;
    this.apiclientSvc.patch(`/workspace-lifecycle/ninety-day-plan/${m.id}/complete`, {}).subscribe({
      next: (res: Record<string, unknown>) => {
        m.status = 'completed';
        m.completedAt = res.completed_at || new Date().toISOString();
        m._loading = false;
        this.updateCounts();
      },
      error: () => { m._loading = false; }
    });
  }

  reopenMilestone(m: Record<string, unknown>): void {
    m._loading = true;
    this.apiclientSvc.patch(`/workspace-lifecycle/ninety-day-plan/${m.id}/reopen`, {}).subscribe({
      next: () => {
        m.status = m.dueDate && new Date(m.dueDate) < new Date() ? 'overdue' : 'pending';
        m.completedAt = undefined;
        m._loading = false;
        this.updateCounts();
      },
      error: () => { m._loading = false; }
    });
  }

}
