import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DrillThroughService } from './drill-through.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcOperationsService } from '@app/api';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  selector: 'app-drill-through-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (drill.isOpen()) {
      <div class="drill-backdrop" (click)="drill.close()" role="button" [attr.aria-label]="i18n.translate('Close')"></div>
      <aside
        class="drill-panel"
        [class.drill-panel--rtl]="i18n.direction() === 'rtl'"
        role="dialog"
        aria-label="{{ i18n.translate('Drill-through details') }}"
        (click)="$event.stopPropagation()">
        <header class="drill-header">
          <nav class="drill-breadcrumb" aria-label="Breadcrumb">
            <a (click)="drill.close()" class="drill-crumb drill-crumb--root">{{ i18n.translate('Dashboard') }}</a>
            @for (item of drill.breadcrumbs(); track item.levelId; let i = $index; let last = $last) {
              <span class="drill-sep" aria-hidden="true">&#8250;</span>
              @if (last) {
                <span class="drill-crumb drill-crumb--current">{{ i18n.localize(item.title, item.titleAr) }}</span>
              } @else {
                <button type="button" class="drill-crumb drill-crumb--link" (click)="drill.goToLevel(i)">
                  {{ i18n.localize(item.title, item.titleAr) }}
                </button>
              }
            }
          </nav>
          <div class="drill-actions">
            @if (drill.stack().length > 1) {
              <button type="button" class="drill-btn drill-btn--back" (click)="drill.back()" [attr.aria-label]="i18n.translate('Back')">
                <i class="pi pi-arrow-left"></i>
                <span>{{ i18n.translate('Back') }}</span>
              </button>
            }
            <button type="button" class="drill-btn drill-btn--close" (click)="drill.close()" [attr.aria-label]="i18n.translate('Close')">
              <i class="pi pi-times"></i>
              <span>{{ i18n.translate('Close') }}</span>
            </button>
          </div>
        </header>
        <div class="drill-body">
          @let level = drill.currentLevel();
          @if (level) {
            @switch (level.viewType) {
              @case ('list') {
                <div class="drill-content drill-content--list">
                  <h2 class="drill-content-title">{{ i18n.localize(level.title, level.titleAr) }}</h2>
                  @if (level.payload?.['role']) {
                    <p class="drill-content-desc">{{ i18n.translate('Tasks assigned to this role') }}</p>
                    @if (taskList().length > 0) {
                      <ul class="drill-task-list" role="list">
                        @for (t of taskList(); track t.task_id) {
                          <li class="drill-task-item">
                            <span class="drill-task-title">{{ t.title }}</span>
                            <span class="drill-task-meta">{{ t.status }} · {{ t.priority }}</span>
                          </li>
                        }
                      </ul>
                    } @else if (tasksLoading()) {
                      <p class="drill-loading">{{ i18n.translate('Loading...') }}</p>
                    } @else {
                      <p class="drill-empty">{{ i18n.translate('No open tasks for this role') }}</p>
                    }
                    <a [routerLink]="['/process-tasks']" [queryParams]="level.payload?.['role'] ? { role: level.payload['role'] } : {}" class="drill-link-full">{{ i18n.translate('View full Process Tasks') }} &#8594;</a>
                  } @else {
                    <a [routerLink]="['/process-tasks']" [queryParams]="level.payload?.['role'] ? { role: level.payload['role'] } : {}" class="drill-link-full">{{ i18n.translate('View full Process Tasks') }} &#8594;</a>
                  }
                </div>
              }
              @case ('detail') {
                <div class="drill-content drill-content--detail">
                  <h2 class="drill-content-title">{{ i18n.localize(level.title, level.titleAr) }}</h2>
                  @if (level.route) {
                    <a [routerLink]="level.route" class="drill-link-full">{{ i18n.translate('View full page') }} &#8594;</a>
                  }
                </div>
              }
              @default {
                <div class="drill-content drill-content--summary">
                  <h2 class="drill-content-title">{{ i18n.localize(level.title, level.titleAr) }}</h2>
                  @if (level.route) {
                    <a [routerLink]="level.route" class="drill-link-full">{{ i18n.translate('View full page') }} &#8594;</a>
                  } @else {
                    <p class="drill-content-desc">{{ i18n.translate('Use the link below or close to return to the dashboard.') }}</p>
                  }
                </div>
              }
            }
          }
        </div>
      </aside>
    }
  `,
  styles: [`
    .drill-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(var(--color-black-rgb), 0.35);
      z-index: var(--z-toast);
      animation: drill-fade-in 0.2s ease-out;
    }
    .drill-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: min(480px, 100vw);
      max-width: 100%;
      height: 100vh;
      background: var(--surface, #fff);
      box-shadow: -4px 0 24px rgba(var(--color-black-rgb), 0.12);
      z-index: calc(var(--z-toast) + 1);
      display: flex;
      flex-direction: column;
      animation: drill-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .drill-panel--rtl {
      right: auto;
      left: 0;
      box-shadow: 4px 0 24px rgba(var(--color-black-rgb), 0.12);
      animation: drill-slide-in-rtl 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes drill-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes drill-slide-in {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes drill-slide-in-rtl {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
    .drill-header {
      flex-shrink: 0;
      padding: 16px 20px;
      border-bottom: 1px solid var(--surface-border, #e5e7eb);
      background: var(--surface-50, #f9fafb);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .drill-breadcrumb {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      font-size: var(--font-size-sm);
    }
    .drill-crumb {
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      color: var(--text-color-secondary, #6b7280);
      cursor: pointer;
      text-decoration: none;
    }
    .drill-crumb--root:hover,
    .drill-crumb--link:hover {
      color: var(--primary);
      text-decoration: underline;
    }
    .drill-crumb--current {
      color: var(--text-color, #111);
      font-weight: 600;
    }
    .drill-sep {
      color: var(--text-color-secondary, #9ca3af);
      user-select: none;
    }
    .drill-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .drill-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: var(--radius);
      border: 1px solid var(--surface-border, #e5e7eb);
      background: var(--surface);
      font-size: var(--font-size-sm);
      cursor: pointer;
      color: var(--text-color);
      transition: background 0.15s, border-color 0.15s;
    }
    .drill-btn:hover {
      background: var(--surface-100, #f3f4f6);
      border-color: var(--primary);
      color: var(--primary);
    }
    .drill-btn--close {
      padding: 8px 10px;
    }
    .drill-body {
      flex: 1;
      overflow: auto;
      padding: 20px;
    }
    .drill-content-title {
      font-size: var(--font-size-lg);
      font-weight: 700;
      margin: 0 0 12px 0;
      color: var(--text-color);
    }
    .drill-content-desc {
      font-size: var(--font-size-base);
      color: var(--text-color-secondary);
      margin: 0 0 16px 0;
    }
    .drill-link-full {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-size-base);
      font-weight: 600;
      color: var(--primary);
      text-decoration: none;
      margin-top: 12px;
    }
    .drill-link-full:hover {
      text-decoration: underline;
    }
    .drill-task-list {
      list-style: none;
      padding: 0;
      margin: 0 0 16px 0;
      border: 1px solid var(--surface-border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .drill-task-item {
      padding: 12px 14px;
      border-bottom: 1px solid var(--surface-100);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .drill-task-item:last-child {
      border-bottom: none;
    }
    .drill-task-title {
      font-weight: 600;
      font-size: var(--font-size-base);
    }
    .drill-task-meta {
      font-size: var(--font-size-sm);
      color: var(--text-color-secondary);
    }
    .drill-loading,
    .drill-empty {
      font-size: var(--font-size-base);
      color: var(--text-color-secondary);
      margin: 0 0 12px 0;
    }
  `],
})
export class DrillThroughPanelComponent {
    private operationsSvc = inject(GrcOperationsService);
  readonly drill = inject(DrillThroughService);
  readonly i18n = inject(I18nService);
  readonly tasksLoading = signal(false);
  readonly taskList = signal<Array<{ task_id: string; title: string; status: string; priority: string }>>([]);

  constructor() {
    effect(() => {
      this.drill.currentLevel();
      this.loadTasksIfNeeded();
    });
  }

  private loadTasksIfNeeded(): void {
    const level = this.drill.currentLevel();
    if (!level || level.viewType !== 'list') {
      this.taskList.set([]);
      return;
    }
    const byRole = level.payload?.['role'] != null;
    this.tasksLoading.set(true);
    if (byRole) {
      const role = String(level.payload?.['role'] ?? '');
      this.operationsSvc.getProcessTasks(role ? { role } : {}).subscribe({
        next: (res) => {
          const tasks = (res?.tasks ?? []).slice(0, 15).map((t) => ({
            task_id: t.id,
            title: t.title || t.id,
            status: t.status ?? '',
            priority: t.priority ?? '',
          }));
          this.taskList.set(tasks);
          this.tasksLoading.set(false);
        },
        error: () => {
          this.taskList.set([]);
          this.tasksLoading.set(false);
        },
      });
    } else {
      this.operationsSvc.getMyWorkItems({ limit: '15' } as any).subscribe({
        next: (data) => {
          const tasks = (data?.tasks ?? []).slice(0, 15).map((t) => ({
            task_id: t.taskId,
            title: t.title || t.taskId || '',
            status: t.status ?? '',
            priority: t.priority ?? 'medium',
          }));
          this.taskList.set(tasks);
          this.tasksLoading.set(false);
        },
        error: () => {
          this.taskList.set([]);
          this.tasksLoading.set(false);
        },
      });
    }
  }
}
