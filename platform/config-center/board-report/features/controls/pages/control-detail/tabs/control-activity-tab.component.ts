/**
 * Control Activity Log Tab — AGRC-OS Controls Module
 * Shows timeline of state transitions and changes for this control.
 */
import { Component, Input, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ControlsApiService } from '../../../services/controls-api.service';
import type { ControlDetailDto, TransitionHistoryDto } from '../../../services/controls-api.types';

@Component({
    selector: 'app-control-activity-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, EmptyStateComponent, SkeletonLoaderComponent, StatusBadgeComponent],
    template: `
    @if (!control) {
      <app-empty-state
        [title]="i18n.isAr() ? 'لا توجد بيانات' : 'No data available'"
        [variant]="'default'" />
    } @else {
      <div class="activity-content" [dir]="i18n.direction()">

        @if (loadingHistory()) {
          <app-skeleton-loader [variant]="'list'" [count]="5" />
        } @else if (history().length === 0) {
          <app-empty-state
            [title]="i18n.isAr() ? 'لا يوجد سجل نشاط' : 'No activity history'"
            [description]="i18n.isAr() ? 'لم يتم تسجيل تغييرات حالة لهذا الضابط بعد.' : 'No state transitions have been recorded for this control yet.'"
            [variant]="'default'" />
        } @else {
          <div class="timeline">
            @for (entry of history(); track entry.changedAt) {
              <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-line"></div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <div class="transition-badges">
                      <app-status-badge [status]="entry.fromState" />
                      <i class="pi pi-arrow-right transition-arrow"></i>
                      <app-status-badge [status]="entry.toState" />
                    </div>
                    <span class="timeline-date">{{ entry.changedAt | date:'medium' }}</span>
                  </div>
                  @if (entry.changedBy) {
                    <div class="timeline-actor">
                      <i class="pi pi-user"></i>
                      {{ entry.changedBy }}
                    </div>
                  }
                  @if (entry.note) {
                    <p class="timeline-note">{{ entry.note }}</p>
                  }
                </div>
              </div>
            }
          </div>
        }

      </div>
    }
  `,
    styles: [`
    .timeline {
      position: relative;
      padding-inline-start: 24px;
    }

    .timeline-item {
      position: relative;
      padding-bottom: 24px;
      padding-inline-start: 24px;
    }

    .timeline-dot {
      position: absolute;
      inset-inline-start: -6px;
      top: 6px;
      width: 12px;
      height: 12px;
      border-radius: var(--radius-pill, 50%);
      background: var(--primary);
      border: 2px solid var(--bg-0);
      z-index: 1;
    }

    .timeline-line {
      position: absolute;
      inset-inline-start: -1px;
      top: 18px;
      bottom: 0;
      width: 2px;
      background: var(--border);
    }

    .timeline-item:last-child .timeline-line {
      display: none;
    }

    .timeline-content {
      background: var(--bg-1, var(--surface-100));
      border: 1px solid var(--border);
      border-radius: var(--radius, 6px);
      padding: 12px 16px;
    }

    .timeline-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 6px;
    }

    .transition-badges {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .transition-arrow {
      font-size: var(--font-size-xs, 11px);
      color: var(--text-muted);
    }

    .timeline-date {
      font-size: var(--font-size-xs, 11px);
      color: var(--text-muted);
    }

    .timeline-actor {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-size-sm, 13px);
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .timeline-actor i {
      font-size: var(--font-size-xs, 11px);
    }

    .timeline-note {
      margin: 4px 0 0;
      font-size: var(--font-size-sm, 13px);
      color: var(--text-body);
      line-height: 1.6;
    }
  `]
})
export class ControlActivityTabComponent implements OnInit {
  @Input() control: ControlDetailDto | null = null;

  i18n = inject(I18nService);
  private api = inject(ControlsApiService);

  loadingHistory = signal(false);
  history = signal<TransitionHistoryDto[]>([]);

  ngOnInit(): void {
    if (this.control?.id) {
      this.loadingHistory.set(true);
      this.api.getControlTransitionHistory(this.control.id).subscribe({
        next: (data) => {
          this.history.set(data);
          this.loadingHistory.set(false);
        },
        error: () => {
          this.loadingHistory.set(false);
        },
      });
    }
  }
}
