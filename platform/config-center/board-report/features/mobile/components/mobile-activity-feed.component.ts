import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/** Shape of a single activity feed item. */
export interface MobileActivityItem {
  id: string;
  type: 'policy' | 'risk' | 'control' | 'evidence' | 'ai' | 'audit';
  title: string;
  titleAr: string;
  time: string;
  user: string;
  icon: string;
}

/** Shape of an upcoming deadline entry. */
export interface MobileDeadline {
  id: string;
  title: string;
  titleAr: string;
  daysLeft: number;
  type: 'audit' | 'policy' | 'control' | 'report';
  urgent: boolean;
}

/**
 * Dumb component: renders the upcoming deadlines and the live activity
 * feed sections on the mobile dashboard.
 */
@Component({
    selector: 'app-mobile-activity-feed',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    template: `
    <!-- Upcoming Deadlines -->
    <div class="mob-section-header">
      <span>{{ isRtl() ? 'المواعيد القادمة' : 'Upcoming Deadlines' }}</span>
    </div>

    <div class="mob-deadlines" *ngIf="deadlines.length > 0">
      <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/' + d.type + 's')" class="mob-deadline-item" *ngFor="let d of deadlines; trackBy: trackById"
           [class.urgent]="d.urgent" (click)="navigate.emit('/' + d.type + 's')">
        <div class="mob-deadline-days" [class.urgent]="d.urgent">
          <span class="mob-deadline-num">{{ d.daysLeft }}</span>
          <span class="mob-deadline-unit">{{ isRtl() ? 'يوم' : 'd' }}</span>
        </div>
        <div class="mob-deadline-info">
          <div class="mob-deadline-title">{{ isRtl() ? d.titleAr : d.title }}</div>
          <div class="mob-deadline-type">{{ deadlineTypeLabel(d.type) }}</div>
        </div>
        <div class="mob-deadline-arrow">&#8250;</div>
      </div>
    </div>

    <!-- Live Activity Feed -->
    <div class="mob-section-header">
      <span>{{ isRtl() ? 'آخر النشاطات' : 'Live Activity' }}</span>
      <div class="mob-live-dot"></div>
    </div>

    <div class="mob-activity-feed">
      <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/activity-feed')" class="mob-activity-item" *ngFor="let item of activityFeed; trackBy: trackById"
           (click)="navigate.emit('/activity-feed')">
        <div class="mob-activity-icon" [class]="'act-' + item.type">{{ item.icon }}</div>
        <div class="mob-activity-info">
          <div class="mob-activity-title">{{ isRtl() ? item.titleAr : item.title }}</div>
          <div class="mob-activity-meta">
            <span>{{ item.user }}</span>
            <span class="mob-activity-dot">&#183;</span>
            <span>{{ item.time }}</span>
          </div>
        </div>
      </div>
      <div class="mob-empty-state" *ngIf="!loading && activityFeed.length === 0">
        <span>{{ isRtl() ? 'لا توجد نشاطات حديثة' : 'No recent activity' }}</span>
      </div>
    </div>
  `,
    styles: [`
    .mob-section-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 16px 4px; margin-top: 4px;
    }
    .mob-section-header > span { font-size: var(--font-size-sm); font-weight: 600; color: rgba(var(--color-white-rgb), 0.6); text-transform: uppercase; letter-spacing: 0.05em; }

    .mob-live-dot {
      width: 6px; height: 6px; border-radius: var(--radius-pill); background: var(--severity-low);
      animation: healthPulse 1.5s ease-in-out infinite;
    }

    /* Deadlines */
    .mob-deadlines { margin: 4px 16px; display: flex; flex-direction: column; gap: 8px; }
    .mob-deadline-item {
      display: flex; align-items: center; gap: 12px;
      background: rgba(var(--color-white-rgb), 0.04); border: 1px solid rgba(var(--color-white-rgb), 0.06);
      border-radius: var(--radius-lg); padding: 12px 14px; cursor: pointer;
      transition: background 0.15s;
    }
    .mob-deadline-item.urgent { border-color: color-mix(in srgb, var(--hub-risk) 30%, transparent); background: color-mix(in srgb, var(--hub-risk) 4%, transparent); }
    .mob-deadline-item:active { background: rgba(var(--color-white-rgb), 0.08); }
    .mob-deadline-days {
      width: 44px; height: 44px; border-radius: var(--radius-lg); flex-shrink: 0;
      background: rgba(var(--color-white-rgb), 0.06); border: 1px solid rgba(var(--color-white-rgb), 0.08);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .mob-deadline-days.urgent { background: color-mix(in srgb, var(--hub-risk) 15%, transparent); border-color: color-mix(in srgb, var(--hub-risk) 30%, transparent); }
    .mob-deadline-num { font-size: var(--font-size-md); font-weight: 800; line-height: 1; }
    .mob-deadline-unit { font-size: var(--font-size-xs); color: rgba(var(--color-white-rgb), 0.4); }
    .mob-deadline-info { flex: 1; min-width: 0; }
    .mob-deadline-title { font-size: var(--font-size-sm); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mob-deadline-type { font-size: var(--font-size-xs); color: rgba(var(--color-white-rgb), 0.4); margin-top: 2px; }
    .mob-deadline-arrow { color: rgba(var(--color-white-rgb), 0.3); font-size: var(--font-size-lg); }

    /* Activity feed */
    .mob-activity-feed { margin: 4px 16px; display: flex; flex-direction: column; gap: 2px; margin-bottom: 16px; }
    .mob-activity-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: var(--radius-lg); cursor: pointer;
      transition: background 0.15s;
    }
    .mob-activity-item:active { background: rgba(var(--color-white-rgb), 0.05); }
    .mob-activity-icon {
      width: 34px; height: 34px; border-radius: var(--radius-md); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-md);
    }
    .act-policy { background: color-mix(in srgb, var(--success) 12%, transparent); }
    .act-risk { background: color-mix(in srgb, var(--hub-risk) 12%, transparent); }
    .act-control { background: color-mix(in srgb, var(--hub-governance) 12%, transparent); }
    .act-evidence { background: color-mix(in srgb, var(--hub-compliance) 12%, transparent); }
    .act-ai { background: color-mix(in srgb, var(--hub-evidence) 12%, transparent); }
    .act-audit { background: color-mix(in srgb, var(--hub-assessment) 12%, transparent); }
    .mob-activity-info { flex: 1; min-width: 0; }
    .mob-activity-title { font-size: var(--font-size-sm); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mob-activity-meta { display: flex; gap: 4px; margin-top: 2px; font-size: var(--font-size-xs); color: rgba(var(--color-white-rgb), 0.35); }
    .mob-activity-dot { opacity: 0.4; }

    .mob-empty-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px; gap: 8px; color: rgba(var(--color-white-rgb), 0.3); font-size: var(--font-size-sm);
    }

    @keyframes healthPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  `]
})
export class MobileActivityFeedComponent {
  private readonly i18n = inject(I18nService);

  @Input() activityFeed: MobileActivityItem[] = [];
  @Input() deadlines: MobileDeadline[] = [];
  @Input() loading = false;

  @Output() navigate = new EventEmitter<string>();

  readonly isRtl = computed(() => this.i18n.direction() === 'rtl');

  trackById(_: number, item: { id: string }): string { return item.id; }

  deadlineTypeLabel(t: string): string {
    const map: Record<string, string> = { audit: 'Audit', policy: 'Policy', control: 'Control', report: 'Report' };
    return map[t] ?? t;
  }
}
