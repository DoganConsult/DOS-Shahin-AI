import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { WebSocketService, WSEvent } from '@app/websocket';
import { Subscription } from 'rxjs';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { getModuleTabs } from '@app/shared/contracts/module-tab-registry';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DropdownModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-notification-center',
    imports: [CommonModule, AppDatePipe, FormsModule, PageHeaderComponent, ModuleTabsBarComponent, TagModule, ButtonModule, ToolbarModule, DropdownModule, ToastModule, TooltipModule],
    providers: [MessageService],
    template: `
    <div class="fdn-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Notification Center" titleAr="مركز الإشعارات"
        subtitleEn="All alerts, reminders, task assignments and escalations in one place"
        subtitleAr="جميع التنبيهات والتذكيرات وتعيينات المهام والتصعيد في مكان واحد"
        icon="bell"
        [breadcrumbs]="[i18n.translate('notificationCenter.dashboard'), i18n.translate('notificationCenter.foundation'), i18n.translate('notificationCenter.notifications2')]"
        [actions]="headerActions" [isAr]="i18n.isAr()" [dir]="dir()"
        (actionClick)="onHdrAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />
      <div class="fdn-body">
      <p-toast />

      @if (!loading()) {
        <div class="nc-health-strip">
          <div class="fh-card" [class.fh-alert]="unreadCount() > 0" (click)="readFilter='unread'; applyFilter()">
            <span class="fh-val">{{ unreadCount() }}</span>
            <span class="fh-lbl">{{ i18n.translate('notificationCenter.unread') }}</span>
          </div>
          <div tabindex="0" role="button" (keyup.enter)="readFilter='all'; applyFilter()" class="fh-card" (click)="readFilter='all'; applyFilter()">
            <span class="fh-val">{{ notifications().length }}</span>
            <span class="fh-lbl">{{ i18n.translate('notificationCenter.total') }}</span>
          </div>
          <div tabindex="0" role="button" (keyup.enter)="typeFilter='alert'; applyFilter()" class="fh-card" (click)="typeFilter='alert'; applyFilter()">
            <span class="fh-val">{{ typeCount('alert') }}</span>
            <span class="fh-lbl">{{ i18n.translate('notificationCenter.alerts') }}</span>
          </div>
          <div tabindex="0" role="button" (keyup.enter)="typeFilter='task'; applyFilter()" class="fh-card" (click)="typeFilter='task'; applyFilter()">
            <span class="fh-val">{{ typeCount('task') }}</span>
            <span class="fh-lbl">{{ i18n.translate('notificationCenter.tasks') }}</span>
          </div>
        </div>

        <p-toolbar styleClass="mb-3">
          <ng-template pTemplate="start">
            <p-dropdown [options]="readFilterOptions" [(ngModel)]="readFilter" (onChange)="applyFilter()" styleClass="me-2" />
            <p-dropdown [options]="typeFilterOptions" [(ngModel)]="typeFilter" (onChange)="applyFilter()"
              [placeholder]="i18n.translate('notificationCenter.allTypes')" [showClear]="true" styleClass="me-2" />
          </ng-template>
          <ng-template pTemplate="end">
            <span class="nc-count-badge">{{ filtered().length }} {{ i18n.translate('notificationCenter.notifications') }}</span>
            <p-button [label]="i18n.translate('notificationCenter.markAllRead')" icon="pi pi-check-circle" severity="secondary" [outlined]="true" (onClick)="markAllRead()" [disabled]="unreadCount() === 0" styleClass="ms-2" />
          </ng-template>
        </p-toolbar>

        @if (error()) {
          <div class="nc-error">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ error() }}</span>
            <p-button [label]="i18n.translate('notificationCenter.retry')" icon="pi pi-refresh" size="small" (onClick)="load()" />
          </div>
        }

        <div class="nc-list">
          @for (n of filtered(); track n.notification_id || $index) {
            <div tabindex="0" role="button" (keyup.enter)="markRead(n)" class="nc-item" [class.nc-unread]="!n.read_at" (click)="markRead(n)">
              <div class="nc-icon-area">
                <i class="pi" [ngClass]="typeIcon(n.type)"></i>
              </div>
              <div class="nc-body">
                <div class="nc-title">{{ n.title }}</div>
                <div class="nc-message">{{ n.message }}</div>
                <div class="nc-meta">
                  <p-tag [value]="n.type || 'info'" [severity]="$any(typeSeverity(n.type))" />
                  <span class="nc-time">{{ n.created_at | appDate:'short' }}</span>
                  @if (n.module) {
                    <p-tag [value]="n.module" severity="secondary" />
                  }
                </div>
              </div>
              <div class="nc-actions">
                @if (!n.read_at) {
                  <p-button icon="pi pi-check" [rounded]="true" [text]="true" severity="success" (onClick)="markRead(n); $event.stopPropagation()" pTooltip="Mark read" />
                }
                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="deleteNotif(n.notification_id); $event.stopPropagation()" pTooltip="Delete" />
              </div>
            </div>
          } @empty {
            <div class="nc-empty">
              <i class="pi pi-bell-slash" style="font-size:48px;color:var(--text-muted)"></i>
              <h3>{{ i18n.translate('notificationCenter.noNotifications') }}</h3>
              <p>{{ i18n.translate('notificationCenter.notificationsWillAppearHereWhenNewEvents') }}</p>
            </div>
          }
        </div>
      }
      </div>
    </div>
  `,
    styles: [`
    .fdn-page { display:flex; flex-direction:column; min-height:100%; }
    .fdn-body  { flex:1; padding:20px 28px 40px; display:flex; flex-direction:column; gap:16px; }
    .nc-health-strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:16px}
    .fh-card{background:var(--surface-card);border:1px solid var(--surface-border);border-radius:var(--radius-md);padding:12px 16px;display:flex;flex-direction:column;gap:2px;cursor:pointer;transition:all .15s}
    .fh-card:hover{box-shadow: var(--shadow-sm);transform:translateY(-1px)}
    .fh-alert{border-color:var(--primary-300,#93c5fd);background:var(--primary-50,#eff6ff)}
    .fh-val{font-size: var(--font-size-2xl);font-weight:800;color:var(--text-heading)}
    .fh-lbl{font-size: var(--font-size-xs);font-weight:600;color:var(--text-muted)}

    .mb-3{margin-bottom:16px}
    .me-2{margin-inline-end:8px}
    .ms-2{margin-inline-start:8px}
    .nc-count-badge{background:var(--surface-ground,var(--surface-ice));padding:6px 14px;border-radius:var(--radius-pill);font-size: var(--font-size-sm);font-weight:600;color:var(--text-muted)}

    .nc-error{display:flex;align-items:center;gap:10px;padding:14px 18px;background:var(--status-danger-bg, #fff1f1);border:1px solid var(--status-danger-bg, #fff1f1);border-radius:var(--radius-md);margin-bottom:16px;color:var(--error);font-size: var(--font-size-sm)}

    .nc-list{display:flex;flex-direction:column;gap:8px}
    .nc-item{display:flex;align-items:flex-start;gap:14px;padding:16px;border-radius:var(--radius-lg);border:1px solid var(--surface-border);background:var(--surface-card);cursor:pointer;transition:all .15s}
    .nc-item:hover{border-color:var(--primary-300);box-shadow: var(--shadow-sm)}
    .nc-unread{background:var(--primary-50,#f0f7ff);border-color:var(--primary-200,#bfdbfe)}
    .nc-unread .nc-title{font-weight:700}
    .nc-icon-area{width:40px;height:40px;border-radius:var(--radius-md);background:var(--surface-ground,var(--surface-ice));display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .nc-icon-area i{font-size: var(--font-size-lg);color:var(--primary-600,#2563eb)}
    .nc-body{flex:1;min-width:0}
    .nc-title{font-size: var(--font-size-base);font-weight:600;margin-bottom:4px;color:var(--text-heading)}
    .nc-message{font-size: var(--font-size-sm);color:var(--text-muted);margin-bottom:8px}
    .nc-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .nc-time{font-size: var(--font-size-sm);color:var(--text-muted)}
    .nc-actions{flex-shrink:0;display:flex;gap:2px}

    .nc-empty{text-align:center;padding:48px;color:var(--text-muted)}
    .nc-empty h3{margin:12px 0 6px;font-size: var(--font-size-md);color:var(--text-heading)}
    .nc-empty p{margin:0;font-size: var(--font-size-sm)}
    @media(max-width:768px){.nc-health-strip{grid-template-columns:repeat(2,1fr)}}
  `]
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
    private operationsSvc = inject(GrcOperationsService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private msg = inject(MessageService);
  private wsService = inject(WebSocketService);
  private router = inject(Router);
  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  readonly tabs = getModuleTabs('foundation');
  readonly headerActions: PageHeaderAction[] = [
    { id: 'mark-all', labelEn: 'Mark All Read', labelAr: 'قراءة الكل', icon: 'check-circle' },
  ];
  onHdrAction(id: string): void { if (id === 'mark-all') this.markAllRead(); }

  loading = signal(false);
  error = signal<string | null>(null);
  notifications = signal<GrcRecord[]>([]);
  unreadCount = computed(() => this.notifications().filter(n => !n.read_at).length);
  private wsSub?: Subscription;

  readFilter = 'all';
  typeFilter: string | null = null;

  breadcrumbs: string[];

  readFilterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Unread', value: 'unread' },
    { label: 'Read', value: 'read' },
  ];
  typeFilterOptions = [
    { label: 'Alert', value: 'alert' },
    { label: 'Warning', value: 'warning' },
    { label: 'Info', value: 'info' },
    { label: 'Success', value: 'success' },
    { label: 'Task', value: 'task' },
    { label: 'Workflow', value: 'workflow' },
  ];

  filtered = computed(() => {
    let list = this.notifications();
    if (this.readFilter === 'unread') list = list.filter(n => !n.read_at);
    else if (this.readFilter === 'read') list = list.filter(n => !!n.read_at);
    if (this.typeFilter) list = list.filter(n => n.type === this.typeFilter);
    return list;
  });

  constructor() {
    this.breadcrumbs = this.router.url.startsWith('/foundation')
      ? ['Foundation', 'Notifications']
      : ['Dashboard', 'Notifications'];
  }

  ngOnInit(): void {
    this.load();
    this.wsService.clearUnreadCount();
    this.wsSub = this.wsService.notifications$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event: WSEvent) => {
      const notif = { ...event.data, created_at: event.timestamp, read_at: null };
      this.notifications.update(n => [notif, ...n]);
    });
  }

  ngOnDestroy(): void { this.wsSub?.unsubscribe(); }

  load(): void {
    this.error.set(null);
    this.loading.set(true);
    this.operationsSvc.getNotifications().subscribe({
      next: (d: Record<string, unknown>) => {
        this.notifications.set(Array.isArray(d) ? d : d.notifications || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.i18n.translate('notificationCenter.failedToLoadNotifications'));
      }
    });
  }

  applyFilter(): void { this.notifications.update(n => [...n]); }

  typeCount(type: string): number { return this.notifications().filter(n => n.type === type).length; }

  markRead(n: Record<string, unknown>): void {
    if (n.read_at) return;
    this.operationsSvc.markNotificationRead(n.notification_id).subscribe({
      next: () => {
        n.read_at = new Date().toISOString();
        this.notifications.update(list => [...list]);
      }
    });
  }

  markAllRead(): void {
    this.operationsSvc.markAllNotificationsRead().subscribe({
      next: () => {
        this.notifications().forEach(n => n.read_at = n.read_at || new Date().toISOString());
        this.notifications.update(list => [...list]);
        this.msg.add({ severity: 'success', summary: this.i18n.translate('notificationCenter.allMarkedRead'), life: 2000 });
      }
    });
  }

  deleteNotif(id: string): void {
    this.operationsSvc.deleteNotification(id).subscribe({ next: () => this.load() });
  }

  typeIcon(type: string): string {
    const map: Record<string, string> = { alert: 'pi-exclamation-triangle', info: 'pi-info-circle', success: 'pi-check-circle', warning: 'pi-exclamation-circle', task: 'pi-list-check', workflow: 'pi-sitemap' };
    return map[type] || 'pi-bell';
  }

  typeSeverity(type: string): string {
    if (type === 'alert') return 'danger';
    if (type === 'warning') return 'warning';
    if (type === 'success') return 'success';
    return 'info';
  }
}
