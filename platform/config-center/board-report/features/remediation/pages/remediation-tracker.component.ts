import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RemediationApiService, RemediationPlanDto } from '../services/remediation-api.service';
import { EmptyStateComponent } from '@app/shared/components';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-remediation-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, ModuleOverviewKitComponent],
  styles: [`
    .remediation-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--green-50, #f0fdf4); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--green-600); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .stats-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .stat-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 14px; text-align: center; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .stat-label { font-size: var(--font-size-2xs); color: var(--text-color-secondary); margin-top: 2px; }
    .toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .search-input { padding: 8px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); font-size: var(--font-size-base); min-width: 240px; }
    .filter-select { padding: 8px 12px; border-radius: var(--radius); border: 1px solid var(--surface-border); font-size: var(--font-size-xs-plus); }
    .btn { padding: 8px 18px; border-radius: var(--radius); border: none; font-size: var(--font-size-base); cursor: pointer; font-weight: 500; }
    .btn-primary { background: var(--primary-500); color: #fff; }
    .plan-list { display: flex; flex-direction: column; gap: 12px; }
    .plan-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 18px; }
    .plan-card.overdue { border-inline-start: 3px solid var(--red-500); }
    .plan-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
    .plan-title { font-size: 0.9375rem; font-weight: 600; margin: 0; }
    .status-badge { padding: 2px 10px; border-radius: var(--radius-md); font-size: var(--font-size-2xs); font-weight: 600; }
    .s-draft { background: var(--surface-100); color: var(--text-color-secondary); }
    .s-in_progress { background: var(--blue-50); color: var(--blue-700); }
    .s-completed { background: var(--green-50); color: var(--green-700); }
    .s-overdue { background: var(--red-50); color: var(--red-700); }
    .s-on_hold { background: var(--yellow-50); color: var(--yellow-700); }
    .plan-desc { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); margin: 0 0 10px; }
    .progress-bar { width: 100%; height: 6px; background: var(--surface-200); border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
    .progress-fill { height: 100%; background: var(--primary-500); border-radius: 3px; transition: width .3s; }
    .plan-meta { display: flex; gap: 12px; font-size: var(--font-size-2xs); color: var(--text-color-secondary); flex-wrap: wrap; }
    .task-list { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--surface-border); }
    .task-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: var(--font-size-xs-plus); }
    .task-check { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--surface-300); cursor: pointer; flex-shrink: 0; }
    .task-check.done { background: var(--green-500); border-color: var(--green-500); }
    .task-title { flex: 1; }
    .task-title.done { text-decoration: line-through; color: var(--text-color-secondary); }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-color-secondary); }
  `],
  template: `
    <div class="remediation-page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="title-row">
          <div class="icon-wrap"><i class="pi pi-wrench"></i></div>
          <div><h1>{{ i18n.translate('remediation.title') }}</h1><p class="subtitle">{{ i18n.translate('remediation.subtitle') }}</p></div>
        </div>
        <button class="btn btn-primary" (click)="createPlan()"><i class="pi pi-plus"></i> {{ i18n.translate('remediation.create') }}</button>
      </header>

      <div class="stats-strip">
        <div class="stat-card"><div class="stat-value">{{ total() }}</div><div class="stat-label">Total Plans</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--blue-500)">{{ inProgressCount() }}</div><div class="stat-label">In Progress</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--green-500)">{{ completedCount() }}</div><div class="stat-label">Completed</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--red-500)">{{ overdueCount() }}</div><div class="stat-label">Overdue</div></div>
      </div>

      <div class="toolbar">
        <input class="search-input" [placeholder]="i18n.translate('remediation.search')" [ngModel]="searchTerm()" (ngModelChange)="onSearch($event)">
        <select class="filter-select" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event); load()">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
          <option value="on_hold">On Hold</option>
        </select>
        <select class="filter-select" [ngModel]="priorityFilter()" (ngModelChange)="priorityFilter.set($event); load()">
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (plans().length === 0) {
        <app-empty-state variant="default" [title]="i18n.translate('remediation.empty')" description="Create a remediation plan to track gap resolution." actionLabel="Create Plan" (action)="createPlan()" [dir]="i18n.direction()" />
      } @else {
        <div class="plan-list">
          @for (p of plans(); track p.id) {
            <div class="plan-card" [class.overdue]="p.status === 'overdue'">
              <div class="plan-header">
                <p class="plan-title">{{ p.title }}</p>
                <span class="status-badge" [ngClass]="'s-' + p.status">{{ p.status }}</span>
              </div>
              <p class="plan-desc">{{ p.description }}</p>
              <div class="progress-bar"><div class="progress-fill" [style.width.%]="p.progress"></div></div>
              <div class="plan-meta">
                <span>{{ p.progress }}% complete</span>
                <span>{{ p.priority }} priority</span>
                @if (p.assigneeName) { <span>→ {{ p.assigneeName }}</span> }
                @if (p.gapTitle) { <span>Gap: {{ p.gapTitle }}</span> }
                @if (p.dueDate) { <span>Due: {{ p.dueDate | date:'mediumDate' }}</span> }
              </div>
              @if (p.tasks && p.tasks.length > 0) {
                <div class="task-list">
                  @for (t of p.tasks; track t.id) {
                    <div class="task-row">
                      <div class="task-check" [class.done]="t.status === 'completed'" (click)="completeTask(p, t)"></div>
                      <span class="task-title" [class.done]="t.status === 'completed'">{{ t.title }}</span>
                      @if (t.assigneeName) { <span style="font-size:0.6875rem;color:var(--text-color-secondary)">{{ t.assigneeName }}</span> }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
      <app-module-overview-kit [config]="moduleKitConfig()"></app-module-overview-kit>
    </div>
  `,
})
export class RemediationTrackerComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(RemediationApiService);
  i18n = inject(I18nService);

  readonly remediationAgents: AgentInfo[] = [];

  readonly remediationTransitions = [
    { from: 'open', to: 'in_progress' },
    { from: 'in_progress', to: 'pending_verification' },
    { from: 'pending_verification', to: 'verified', requiresApproval: true },
    { from: 'pending_verification', to: 'reopened' },
    { from: 'verified', to: 'closed' },
    { from: 'reopened', to: 'in_progress' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'remediation',
    tier: 'full',
    automationLevel: 'full',
    slaHours: 168,
    transitions: this.remediationTransitions,
    currentStatus: 'in_progress',
    agents: this.remediationAgents,
    lang: this.i18n.currentLang() === 'ar' ? 'ar' : 'en',
  }));

  loading = signal(true);
  plans = signal<RemediationPlanDto[]>([]);
  total = signal(0);
  searchTerm = signal('');
  statusFilter = signal('');
  priorityFilter = signal('');

  inProgressCount = computed(() => this.plans().filter(p => p.status === 'in_progress').length);
  completedCount = computed(() => this.plans().filter(p => p.status === 'completed').length);
  overdueCount = computed(() => this.plans().filter(p => p.status === 'overdue').length);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.list({ limit: 50, status: this.statusFilter() || undefined, priority: this.priorityFilter() || undefined, search: this.searchTerm() || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => { this.plans.set(res.data || []); this.total.set(res.total || 0); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  onSearch(term: string): void { this.searchTerm.set(term); this.load(); }

  completeTask(plan: RemediationPlanDto, task: { id: string; status: string }): void {
    if (task.status === 'completed') return;
    this.api.completeTask(plan.id, task.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  createPlan(): void {
    const title = prompt('Remediation plan title:');
    if (!title?.trim()) return;
    this.api.create({ title, description: '', priority: 'medium' })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }
}
