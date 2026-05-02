/**
 * Activity Hub Component
 * 
 * Displays activity feed with infinite scroll, filtering,
 * inline actions, and real-time WebSocket updates.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Subject, takeUntil } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';

interface Activity {
  id: string;
  type: string;
  module: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string;
  userName: string;
  isRead: boolean;
  isArchived: boolean;
  snoozedUntil?: string;
  createdAt: string;
}

interface ActivityFilter {
  module: string;
  type: string;
  user: string;
  dateFrom: string;
  dateTo: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-activity-hub',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule],
  template: `
    <div class="activity-hub">
      <div class="hub-header">
        <h3>{{ i18n.translate('activityHub.title') }}</h3>
        <div class="filter-bar">
          <select [(ngModel)]="filter.module" (change)="loadActivities()" [attr.aria-label]="i18n.translate('activityHub.filterByModule')">
            <option value="">{{ i18n.translate('activityHub.allModules') }}</option>
            <option value="risk">{{ i18n.translate('nav.risks') }}</option>
            <option value="control">{{ i18n.translate('nav.controls') }}</option>
            <option value="policy">{{ i18n.translate('nav.policies') }}</option>
            <option value="incident">{{ i18n.translate('nav.incidents') }}</option>
          </select>
          <select [(ngModel)]="filter.type" (change)="loadActivities()" [attr.aria-label]="i18n.translate('activityHub.filterByType')">
            <option value="">{{ i18n.translate('activityHub.allTypes') }}</option>
            <option value="created">{{ i18n.translate('activityHub.created') }}</option>
            <option value="updated">{{ i18n.translate('activityHub.updated') }}</option>
            <option value="deleted">{{ i18n.translate('activityHub.deleted') }}</option>
            <option value="comment">{{ i18n.translate('activityHub.comment') }}</option>
          </select>
          <button class="btn-mark-all" (click)="markAllRead()">
            {{ i18n.translate('activityHub.markAllRead') }}
          </button>
        </div>
      </div>

      <div class="activity-list" (scroll)="onScroll($event)">
        <div *ngFor="let activity of activities" class="activity-item" [class.unread]="!activity.isRead">
          <div class="activity-content">
            <div class="activity-header">
              <span class="activity-user">{{ activity.userName }}</span>
              <span class="activity-time">{{ activity.createdAt | appDate:'short' }}</span>
            </div>
            <div class="activity-title">{{ activity.title }}</div>
            <div class="activity-desc" *ngIf="activity.description">{{ activity.description }}</div>
          </div>
          <div class="activity-actions">
            <button *ngIf="!activity.isRead" (click)="markRead(activity)" [title]="i18n.translate('activityHub.markAsRead')" [attr.aria-label]="i18n.translate('activityHub.markAsRead')">
              <i class="pi pi-check"></i>
            </button>
            <button (click)="archiveActivity(activity)" [title]="i18n.translate('activityHub.archive')" [attr.aria-label]="i18n.translate('activityHub.archive')">
              <i class="pi pi-inbox"></i>
            </button>
            <button (click)="snoozeActivity(activity)" [title]="i18n.translate('activityHub.snooze')" [attr.aria-label]="i18n.translate('activityHub.snooze')">
              <i class="pi pi-clock"></i>
            </button>
          </div>
        </div>

        <div *ngIf="loading" class="loading">
          <i class="pi pi-spin pi-spinner"></i>
        </div>
        <div *ngIf="activities.length === 0 && !loading" class="empty-state">
          {{ i18n.translate('activityHub.noActivities') }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .activity-hub { display: flex; flex-direction: column; height: 100%; }
    .hub-header { padding: 16px; border-bottom: 1px solid var(--surface-border, #e0e0e0); }
    .hub-header h3 { margin: 0 0 12px 0; font-size: var(--font-size-body-md); }
    .filter-bar { display: flex; gap: 8px; flex-wrap: wrap; }
    .filter-bar select {
      padding: 6px 10px; border: 1px solid var(--surface-border, #ddd);
      border-radius: var(--radius-sm); font-size: var(--font-size-tag); background: var(--surface-card, #fff);
    }
    .btn-mark-all {
      padding: 6px 12px; border: none; border-radius: var(--radius-sm);
      background: var(--primary-color, #4f46e5); color: #fff;
      font-size: var(--font-size-tag); cursor: pointer;
    }
    .activity-list { flex: 1; overflow-y: auto; }
    .activity-item {
      display: flex; padding: 12px 16px; border-bottom: 1px solid var(--surface-border, #f0f0f0);
      transition: background 0.15s;
    }
    .activity-item:hover { background: var(--highlight-bg, #f8f9ff); }
    .activity-item.unread { border-inline-start: 3px solid var(--primary-color, #4f46e5); }
    .activity-content { flex: 1; }
    .activity-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .activity-user { font-weight: 600; font-size: var(--font-size-tag); }
    .activity-time { font-size: var(--font-size-sm); color: var(--text-color-secondary, #888); }
    .activity-title { font-size: var(--font-size-body-sm); margin-bottom: 2px; }
    .activity-desc { font-size: var(--font-size-caption); color: var(--text-color-secondary, #888); }
    .activity-actions { display: flex; gap: 4px; align-items: flex-start; }
    .activity-actions button {
      border: none; background: transparent; cursor: pointer; padding: 4px;
      color: var(--text-color-secondary, #888); border-radius: var(--radius-xs);
    }
    .activity-actions button:hover { background: var(--surface-ground, #f0f0f0); }
    .loading, .empty-state { padding: 20px; text-align: center; color: var(--text-color-secondary, #888); }
  `]
})
export class ActivityHubComponent implements OnInit, OnDestroy {
  activities: Activity[] = [];
  filter: ActivityFilter = { module: '', type: '', user: '', dateFrom: '', dateTo: '' };
  loading = false;
  cursor: string | null = null;
  private destroy$ = new Subject<void>();
  private apiBase = '/api';
  i18n = inject(I18nService);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadActivities();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadActivities(append = false): void {
    this.loading = true;
    const params: GrcRecord = {};
    if (this.filter.module) params.module = this.filter.module;
    if (this.filter.type) params.type = this.filter.type;
    if (this.cursor && append) params.cursor = this.cursor;

    this.http.get<unknown>(
      `${this.apiBase}/activity-feed`, { params }
    ).subscribe({
      next: res => {
        const items = res.activities || res.data || res.feed || [];
        this.activities = append ? [...this.activities, ...items] : items;
        this.cursor = res.nextCursor || null;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  markRead(activity: Activity): void {
    this.http.post(`${this.apiBase}/activity-feed/${activity.id}/read`, {}).subscribe(() => {
      activity.isRead = true;
    });
  }

  markAllRead(): void {
    this.http.post(`${this.apiBase}/activity-feed/read-all`, {}).subscribe(() => {
      this.activities.forEach(a => a.isRead = true);
    });
  }

  archiveActivity(activity: Activity): void {
    this.http.post(`${this.apiBase}/activity-feed/${activity.id}/archive`, {}).subscribe(() => {
      this.activities = this.activities.filter(a => a.id !== activity.id);
    });
  }

  snoozeActivity(activity: Activity): void {
    this.http.post(`${this.apiBase}/activity-feed/${activity.id}/snooze`, { duration: 3600000 }).subscribe(() => {
      this.activities = this.activities.filter(a => a.id !== activity.id);
    });
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50 && !this.loading && this.cursor) {
      this.loadActivities(true);
    }
  }

}
