import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { NotificationApiService, NotificationDto } from '../services/notification-api.service';
import { NotificationPreferencesComponent } from './notification-preferences.component';
import { NotificationTemplatesComponent } from './notification-templates.component';
import { EmptyStateComponent } from '@app/shared/components';

type TabKey = 'inbox' | 'preferences' | 'templates';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationPreferencesComponent, NotificationTemplatesComponent, EmptyStateComponent],
  styles: [`
    .notification-center { min-height: 100vh; background: var(--surface-ground, #f4f4f4); padding: 24px 28px; }
    .nc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .nc-title-row { display: flex; align-items: center; gap: 14px; }
    .nc-icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--blue-50, #eff6ff); }
    .nc-icon { font-size: var(--font-size-2xl); color: var(--primary-500, #3b82f6); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .nc-subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary, #6b7280); }
    .tab-bar { display: flex; gap: 4px; border-bottom: 1px solid var(--surface-border, #e5e7eb); margin-bottom: 20px; }
    .tab-btn { padding: 10px 20px; border: none; background: transparent; cursor: pointer; font-size: var(--font-size-base); color: var(--text-color-secondary); border-bottom: 2px solid transparent; transition: all .15s; }
    .tab-btn:hover { background: var(--surface-100, #f3f4f6); }
    .tab-btn.active { color: var(--primary-700, #1d4ed8); border-bottom-color: var(--primary-500); font-weight: 600; }
    .actions-bar { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
    .filter-select { padding: 6px 12px; border-radius: var(--radius); border: 1px solid var(--surface-border); background: var(--surface-card); font-size: var(--font-size-xs-plus); }
    .btn-sm { padding: 6px 14px; border-radius: var(--radius); border: 1px solid var(--surface-border); background: var(--surface-card); font-size: var(--font-size-xs-plus); cursor: pointer; }
    .btn-sm:hover { background: var(--surface-100); }
    .btn-primary { background: var(--primary-500); color: #fff; border-color: var(--primary-500); }
    .btn-primary:hover { background: var(--primary-600); }
    .notification-list { display: flex; flex-direction: column; gap: 6px; }
    .notif-card { display: flex; align-items: flex-start; gap: 14px; padding: 14px 18px; background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); transition: background .15s; cursor: pointer; }
    .notif-card:hover { background: var(--surface-50, #f9fafb); }
    .notif-card.unread { border-inline-start: 3px solid var(--primary-500); background: var(--primary-50, #eff6ff); }
    .notif-severity { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
    .notif-severity.info { background: var(--blue-500); }
    .notif-severity.warning { background: var(--yellow-500); }
    .notif-severity.error { background: var(--red-500); }
    .notif-severity.success { background: var(--green-500); }
    .notif-body { flex: 1; min-width: 0; }
    .notif-title { font-size: var(--font-size-base); font-weight: 600; color: var(--text-color); margin: 0 0 4px; }
    .notif-text { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); margin: 0 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 600px; }
    .notif-meta { display: flex; gap: 12px; font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .notif-actions { display: flex; gap: 6px; flex-shrink: 0; align-items: center; }
    .icon-btn { width: 32px; height: 32px; border-radius: var(--radius); border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-color-secondary); }
    .icon-btn:hover { background: var(--surface-100); }
    .badge { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; border-radius: var(--radius-md); background: var(--primary-500); color: #fff; font-size: var(--font-size-2xs); font-weight: 700; padding: 0 6px; }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-color-secondary); }
    .empty-state i { font-size: var(--font-size-6xl); margin-bottom: 12px; opacity: 0.3; }
  `],
  template: `
    <div class="notification-center" [dir]="i18n.direction()">
      <header class="nc-header">
        <div class="nc-title-row">
          <div class="nc-icon-wrap"><i class="pi pi-bell nc-icon"></i></div>
          <div>
            <h1>{{ i18n.translate('notification.title') }}</h1>
            <p class="nc-subtitle">{{ i18n.translate('notification.subtitle') }}</p>
          </div>
        </div>
        @if (unreadCount() > 0) {
          <span class="badge">{{ unreadCount() }}</span>
        }
      </header>

      <div class="tab-bar" role="tablist">
        @for (tab of tabs; track tab.key) {
          <button class="tab-btn" [class.active]="activeTab() === tab.key" (click)="activeTab.set(tab.key)">
            <i class="pi" [ngClass]="tab.icon"></i> {{ i18n.translate(tab.i18nKey) }}
          </button>
        }
      </div>

      @if (activeTab() === 'inbox') {
        <div class="actions-bar">
          <select class="filter-select" [ngModel]="moduleFilter()" (ngModelChange)="moduleFilter.set($event)">
            <option value="">{{ i18n.translate('notification.allModules') }}</option>
            <option value="compliance">Compliance</option>
            <option value="risk">Risk</option>
            <option value="audit">Audit</option>
            <option value="governance">Governance</option>
            <option value="evidence">Evidence</option>
            <option value="vendor">Vendor</option>
            <option value="ai">AI</option>
          </select>
          <button class="btn-sm" (click)="toggleUnreadOnly()">
            {{ showUnreadOnly() ? i18n.translate('notification.showAll') : i18n.translate('notification.unreadOnly') }}
          </button>
          <button class="btn-sm btn-primary" (click)="markAllRead()">
            <i class="pi pi-check-circle"></i> {{ i18n.translate('notification.markAllRead') }}
          </button>
        </div>

        @if (filteredNotifications().length === 0) {
          <app-empty-state
            variant="default"
            [title]="i18n.translate('notification.empty')"
            [description]="'Adjust your filters or wait for new notifications.'"
            [dir]="i18n.direction()" />
        } @else {
          <div class="notification-list">
            @for (n of filteredNotifications(); track n.id) {
              <div class="notif-card" [class.unread]="!n.isRead" (click)="onNotificationClick(n)">
                <div class="notif-severity" [ngClass]="n.severity"></div>
                <div class="notif-body">
                  <p class="notif-title">{{ i18n.isRtl() && n.titleAr ? n.titleAr : n.title }}</p>
                  <p class="notif-text">{{ i18n.isRtl() && n.bodyAr ? n.bodyAr : n.body }}</p>
                  <div class="notif-meta">
                    @if (n.module) { <span>{{ n.module }}</span> }
                    <span>{{ n.createdAt | date:'medium' }}</span>
                  </div>
                </div>
                <div class="notif-actions">
                  @if (!n.isRead) {
                    <button class="icon-btn" (click)="markRead(n, $event)" title="Mark as read"><i class="pi pi-check"></i></button>
                  }
                  <button class="icon-btn" (click)="deleteNotification(n, $event)" title="Delete"><i class="pi pi-trash"></i></button>
                </div>
              </div>
            }
          </div>
        }
      }

      @if (activeTab() === 'preferences') {
        <app-notification-preferences />
      }

      @if (activeTab() === 'templates') {
        <app-notification-templates />
      }
    </div>
  `,
})
export class NotificationCenterComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(NotificationApiService);
  i18n = inject(I18nService);

  tabs: { key: TabKey; i18nKey: string; icon: string }[] = [
    { key: 'inbox', i18nKey: 'notification.inbox', icon: 'pi-inbox' },
    { key: 'preferences', i18nKey: 'notification.preferences', icon: 'pi-cog' },
    { key: 'templates', i18nKey: 'notification.templates', icon: 'pi-file-edit' },
  ];

  activeTab = signal<TabKey>('inbox');
  notifications = signal<NotificationDto[]>([]);
  moduleFilter = signal('');
  showUnreadOnly = signal(false);

  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);

  filteredNotifications = computed(() => {
    let items = this.notifications();
    const mod = this.moduleFilter();
    if (mod) items = items.filter(n => n.module === mod);
    if (this.showUnreadOnly()) items = items.filter(n => !n.isRead);
    return items;
  });

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.api.list({ limit: 100 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
      this.notifications.set(res.notifications || []);
    });
  }

  toggleUnreadOnly(): void {
    this.showUnreadOnly.update(v => !v);
  }

  markRead(n: NotificationDto, event: Event): void {
    event.stopPropagation();
    this.api.markAsRead(n.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, isRead: true } : x));
    });
  }

  markAllRead(): void {
    this.api.markAllAsRead().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.notifications.update(list => list.map(x => ({ ...x, isRead: true })));
    });
  }

  deleteNotification(n: NotificationDto, event: Event): void {
    event.stopPropagation();
    this.api.delete(n.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.notifications.update(list => list.filter(x => x.id !== n.id));
    });
  }

  onNotificationClick(n: NotificationDto): void {
    if (!n.isRead) {
      this.markRead(n, new Event('click'));
    }
    if (n.actionUrl) {
      window.location.href = n.actionUrl;
    }
  }
}
