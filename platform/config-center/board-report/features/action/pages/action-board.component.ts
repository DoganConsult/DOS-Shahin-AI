import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ActionApiService, ActionItemDto } from '../services/action-api.service';
import { EmptyStateComponent, GrcDataTableComponent } from '@app/shared/components';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';

type ViewType = 'board' | 'list';
const COLUMNS = ['open', 'in_progress', 'completed', 'overdue'] as const;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-action-board',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, ModuleOverviewKitComponent],
  styles: [`
    .action-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--teal-50, #f0fdfa); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--teal-500); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
    .search-input { padding: 8px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); font-size: var(--font-size-base); min-width: 200px; }
    .filter-select { padding: 8px 12px; border-radius: var(--radius); border: 1px solid var(--surface-border); font-size: var(--font-size-xs-plus); }
    .view-toggle { display: flex; gap: 0; border: 1px solid var(--surface-border); border-radius: var(--radius); overflow: hidden; margin-inline-start: auto; }
    .view-btn { padding: 6px 14px; border: none; background: var(--surface-card); cursor: pointer; font-size: var(--font-size-xs-plus); }
    .view-btn.active { background: var(--primary-500); color: #fff; }
    .btn { padding: 8px 18px; border-radius: var(--radius); border: none; font-size: var(--font-size-base); cursor: pointer; font-weight: 500; }
    .btn-primary { background: var(--primary-500); color: #fff; }
    .board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; min-height: 400px; }
    .column { background: var(--surface-50, #f9fafb); border-radius: var(--radius-md); padding: 14px; min-height: 300px; }
    .col-header { font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-color-secondary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .col-count { background: var(--surface-200); padding: 1px 8px; border-radius: var(--radius-md); font-size: var(--font-size-2xs); }
    .task-card { background: var(--surface-card); border-radius: var(--radius); border: 1px solid var(--surface-border); padding: 12px; margin-bottom: 8px; cursor: pointer; transition: box-shadow .15s; }
    .task-card:hover { box-shadow: 0 2px 8px rgba(var(--color-black-rgb), 0.06); }
    .task-card.breached { border-inline-start: 3px solid var(--red-500); }
    .task-title { font-size: var(--font-size-xs-plus); font-weight: 600; margin: 0 0 6px; }
    .task-meta { display: flex; gap: 8px; font-size: var(--font-size-2xs); color: var(--text-color-secondary); flex-wrap: wrap; align-items: center; }
    .priority-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .p-low { background: var(--green-400); }
    .p-medium { background: var(--yellow-400); }
    .p-high { background: var(--orange-400); }
    .p-critical { background: var(--red-400); }
    .sla-badge { padding: 1px 6px; border-radius: var(--radius-xs); font-size: 0.625rem; font-weight: 700; }
    .sla-ok { background: var(--green-50); color: var(--green-700); }
    .sla-breach { background: var(--red-50); color: var(--red-700); }
    .list-table { width: 100%; border-collapse: collapse; background: var(--surface-card); border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--surface-border); }
    .list-table th { padding: 12px 16px; text-align: start; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; background: var(--surface-50); border-bottom: 1px solid var(--surface-border); }
    .list-table td { padding: 12px 16px; font-size: var(--font-size-xs-plus); border-bottom: 1px solid var(--surface-50); }
    .list-table tr:hover td { background: var(--surface-50); }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-color-secondary); }
  `],
  template: `
    <div class="action-page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="title-row">
          <div class="icon-wrap"><i class="pi pi-check-square"></i></div>
          <div>
            <h1>{{ i18n.translate('action.title') }}</h1>
            <p class="subtitle">{{ i18n.translate('action.subtitle') }}</p>
          </div>
        </div>
        <button class="btn btn-primary" (click)="createItem()"><i class="pi pi-plus"></i> {{ i18n.translate('action.create') }}</button>
      </header>

      <div class="toolbar">
        <input class="search-input" [placeholder]="i18n.translate('action.search')" [ngModel]="searchTerm()" (ngModelChange)="onSearch($event)">
        <select class="filter-select" [ngModel]="priorityFilter()" (ngModelChange)="priorityFilter.set($event); load()">
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select class="filter-select" [ngModel]="moduleFilter()" (ngModelChange)="moduleFilter.set($event); load()">
          <option value="">All Modules</option>
          <option value="compliance">Compliance</option>
          <option value="risk">Risk</option>
          <option value="audit">Audit</option>
          <option value="governance">Governance</option>
          <option value="vendor">Vendor</option>
        </select>
        <div class="view-toggle">
          <button class="view-btn" [class.active]="viewType()==='board'" (click)="viewType.set('board')"><i class="pi pi-th-large"></i></button>
          <button class="view-btn" [class.active]="viewType()==='list'" (click)="viewType.set('list')"><i class="pi pi-list"></i></button>
        </div>
      </div>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (items().length === 0) {
        <app-empty-state variant="default" [title]="i18n.translate('action.empty')" description="Create your first action item to track tasks." actionLabel="Create Action" (action)="createItem()" [dir]="i18n.direction()" />
      } @else if (viewType() === 'board') {
        <div class="board">
          @for (col of columns; track col) {
            <div class="column">
              <div class="col-header">{{ col | uppercase }} <span class="col-count">{{ columnItems(col).length }}</span></div>
              @for (item of columnItems(col); track item.id) {
                <div class="task-card" [class.breached]="item.slaBreached">
                  <p class="task-title">{{ item.title }}</p>
                  <div class="task-meta">
                    <span class="priority-dot" [ngClass]="'p-' + item.priority"></span>
                    <span>{{ item.priority }}</span>
                    <span>{{ item.module }}</span>
                    @if (item.assigneeName) { <span>→ {{ item.assigneeName }}</span> }
                    @if (item.dueDate) { <span>{{ item.dueDate | date:'shortDate' }}</span> }
                    @if (item.slaBreached) { <span class="sla-badge sla-breach">SLA Breached</span> }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <table class="list-table">
          <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Module</th><th>Assignee</th><th>Due</th><th>SLA</th></tr></thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr>
                <td><strong>{{ item.title }}</strong></td>
                <td>{{ item.status }}</td>
                <td><span class="priority-dot" [ngClass]="'p-' + item.priority" style="display:inline-block;vertical-align:middle;margin-inline-end:4px"></span>{{ item.priority }}</td>
                <td>{{ item.module }}</td>
                <td>{{ item.assigneeName || '—' }}</td>
                <td>{{ item.dueDate ? (item.dueDate | date:'shortDate') : '—' }}</td>
                <td>@if (item.slaBreached) { <span class="sla-badge sla-breach">Breached</span> } @else { <span class="sla-badge sla-ok">OK</span> }</td>
              </tr>
            }
          </tbody>
        </table>
      }
      <app-module-overview-kit [config]="moduleKitConfig()"></app-module-overview-kit>
    </div>
  `,
})
export class ActionBoardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(ActionApiService);
  i18n = inject(I18nService);

  readonly actionAgents: AgentInfo[] = [];

  readonly actionTransitions = [
    { from: 'open', to: 'in_progress' },
    { from: 'in_progress', to: 'completed' },
    { from: 'completed', to: 'verified', requiresApproval: true },
    { from: 'verified', to: 'closed' },
    { from: 'completed', to: 'reopened' },
    { from: 'reopened', to: 'in_progress' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'action',
    tier: 'full',
    automationLevel: 'full',
    slaHours: 168,
    transitions: this.actionTransitions,
    currentStatus: 'in_progress',
    agents: this.actionAgents,
    lang: this.i18n.currentLang() === 'ar' ? 'ar' : 'en',
  }));

  loading = signal(true);
  items = signal<ActionItemDto[]>([]);
  searchTerm = signal('');
  priorityFilter = signal('');
  moduleFilter = signal('');
  viewType = signal<ViewType>('board');
  columns = COLUMNS;

  columnItems(status: string): ActionItemDto[] {
    return this.items().filter(i => i.status === status);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.list({
      limit: 100,
      priority: this.priorityFilter() || undefined,
      module: this.moduleFilter() || undefined,
      search: this.searchTerm() || undefined,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => { this.items.set(res.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch(term: string): void { this.searchTerm.set(term); this.load(); }

  createItem(): void {
    const title = prompt('Action item title:');
    if (!title?.trim()) return;
    this.api.create({ title, priority: 'medium', module: 'compliance' })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }
}
