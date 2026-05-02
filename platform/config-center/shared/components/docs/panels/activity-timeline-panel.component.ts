import {
  Component, Input, ChangeDetectionStrategy, inject, signal, OnInit, OnChanges, SimpleChanges, DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { TimelineModule } from 'primeng/timeline';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';

export interface ActivityTimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail?: string;
  entityType?: string;
  entityId?: string;
  icon?: string;
  severity?: 'info' | 'success' | 'warning' | 'danger';
  module?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-activity-timeline-panel',
    imports: [CommonModule, TimelineModule, TagModule, TooltipModule, ButtonModule],
    template: `
    <div class="atp-root" role="region" [attr.aria-label]="lang === 'ar' ? 'الجدول الزمني للنشاط' : 'Activity Timeline'">
      <div class="atp-header">
        <h3 class="atp-title">
          <i class="pi pi-clock" aria-hidden="true"></i>
          {{ lang === 'ar' ? 'سجل النشاط' : 'Activity Timeline' }}
        </h3>
        <button pButton [text]="true" icon="pi pi-refresh" [pTooltip]="lang === 'ar' ? 'تحديث' : 'Refresh'" (click)="loadTimeline()" [loading]="loading()"></button>
      </div>

      <div *ngIf="loading() && events().length === 0" class="atp-skeleton">
        <div class="atp-skeleton-item" *ngFor="let i of [1,2,3,4,5]"></div>
      </div>

      <div *ngIf="!loading() && events().length === 0" class="atp-empty">
        <i class="pi pi-inbox"></i>
        <span>{{ lang === 'ar' ? 'لا يوجد نشاط حتى الآن' : 'No activity yet' }}</span>
      </div>

      <p-timeline *ngIf="events().length > 0" [value]="events()" align="left" styleClass="atp-timeline">
        <ng-template pTemplate="marker" let-event>
          <span class="atp-marker" [class]="'atp-marker--' + (event.severity || 'info')">
            <i class="pi" [ngClass]="'pi-' + (event.icon || 'circle')" aria-hidden="true"></i>
          </span>
        </ng-template>
        <ng-template pTemplate="content" let-event>
          <div class="atp-event">
            <div class="atp-event-header">
              <span class="atp-actor">{{ event.actor }}</span>
              <span class="atp-time" [pTooltip]="event.timestamp">{{ formatRelative(event.timestamp) }}</span>
            </div>
            <span class="atp-action">{{ event.action }}</span>
            <span class="atp-detail" *ngIf="event.detail">{{ event.detail }}</span>
            <p-tag *ngIf="event.module" [value]="event.module" [rounded]="true" severity="info" styleClass="atp-module-tag"></p-tag>
          </div>
        </ng-template>
      </p-timeline>

      <div class="atp-footer" *ngIf="hasMore()">
        <button pButton [text]="true" [label]="lang === 'ar' ? 'تحميل المزيد' : 'Load More'" icon="pi pi-angle-down" (click)="loadMore()"></button>
      </div>
    </div>
  `,
    styles: [`
    .atp-root { background: var(--surface-card, #fff); border: 1px solid var(--border-subtle, #e5e7eb); border-radius: var(--radius-md, 8px); padding: 16px; }
    .atp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .atp-title { margin: 0; font-size: var(--font-size-base); font-weight: 600; display: flex; align-items: center; gap: 6px; color: var(--text-heading, #111827); }
    .atp-skeleton { display: flex; flex-direction: column; gap: 12px; }
    .atp-skeleton-item { height: 48px; background: var(--surface-hover, #f3f4f6); border-radius: var(--radius-sm); animation: atp-pulse 1.5s ease-in-out infinite; }
    @keyframes atp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .atp-empty { text-align: center; padding: 32px 16px; color: var(--text-color-secondary, #6b7280); display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .atp-empty i { font-size: var(--font-size-4xl); opacity: 0.4; }
    .atp-marker { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); }
    .atp-marker--info { background: var(--blue-50, #eff6ff); color: var(--blue-600, #2563eb); }
    .atp-marker--success { background: var(--green-50, #f0fdf4); color: var(--green-600, #16a34a); }
    .atp-marker--warning { background: var(--yellow-50, #fefce8); color: var(--yellow-600, #ca8a04); }
    .atp-marker--danger { background: var(--red-50, #fef2f2); color: var(--red-600, #dc2626); }
    .atp-event { display: flex; flex-direction: column; gap: 2px; padding-bottom: 8px; }
    .atp-event-header { display: flex; align-items: center; gap: 8px; }
    .atp-actor { font-weight: 600; font-size: var(--font-size-xs-plus); color: var(--text-heading, #111827); }
    .atp-time { font-size: var(--font-size-2xs); color: var(--text-color-secondary, #9ca3af); }
    .atp-action { font-size: var(--font-size-xs-plus); color: var(--text-primary, #374151); }
    .atp-detail { font-size: var(--font-size-sm); color: var(--text-color-secondary, #6b7280); }
    .atp-module-tag { font-size: 0.625rem; }
    .atp-footer { text-align: center; margin-top: 8px; }
    .atp-timeline .p-timeline-event-opposite { display: none; }
  `]
})
export class ActivityTimelinePanelComponent implements OnInit, OnChanges {
  @Input() moduleCode = '';
  @Input() entityId = '';
  @Input() entityType = '';
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() limit = 20;

  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  loading = signal(false);
  events = signal<ActivityTimelineEvent[]>([]);
  hasMore = signal(false);
  private offset = 0;

  ngOnInit(): void { this.loadTimeline(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['moduleCode'] || changes['entityId']) {
      this.offset = 0;
      this.events.set([]);
      this.loadTimeline();
    }
  }

  loadTimeline(): void {
    this.loading.set(true);
    const params: Record<string, string> = { limit: String(this.limit), offset: String(this.offset) };
    if (this.moduleCode) params['module'] = this.moduleCode;
    if (this.entityId) params['entity_id'] = this.entityId;
    if (this.entityType) params['entity_type'] = this.entityType;

    this.http.get<any>(`${environment.apiUrl}/audit/timeline`, { params }).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of({ events: [], hasMore: false })),
    ).subscribe(res => {
      const newEvents: ActivityTimelineEvent[] = (res.events || res.data || res || []).map((e: any) => ({
        id: e.id || e.audit_id || crypto.randomUUID(),
        timestamp: e.timestamp || e.created_at || new Date().toISOString(),
        actor: e.actor || e.user_name || e.user_id || 'System',
        action: e.action || e.event_type || e.description || '',
        detail: e.detail || e.metadata?.detail || '',
        entityType: e.entity_type || this.entityType,
        entityId: e.entity_id || this.entityId,
        icon: this.resolveIcon(e.action || e.event_type || ''),
        severity: this.resolveSeverity(e.action || e.event_type || ''),
        module: e.module || this.moduleCode,
      }));

      if (this.offset > 0) {
        this.events.update(prev => [...prev, ...newEvents]);
      } else {
        this.events.set(newEvents);
      }
      this.hasMore.set(res.hasMore ?? newEvents.length >= this.limit);
      this.loading.set(false);
    });
  }

  loadMore(): void {
    this.offset += this.limit;
    this.loadTimeline();
  }

  formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return this.lang === 'ar' ? 'الآن' : 'Just now';
    if (mins < 60) return this.lang === 'ar' ? `منذ ${mins} د` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return this.lang === 'ar' ? `منذ ${hrs} س` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return this.lang === 'ar' ? `منذ ${days} ي` : `${days}d ago`;
  }

  private resolveIcon(action: string): string {
    if (/creat|add|new/i.test(action)) return 'plus-circle';
    if (/updat|edit|modif/i.test(action)) return 'pencil';
    if (/delet|remov/i.test(action)) return 'trash';
    if (/approv/i.test(action)) return 'check-circle';
    if (/reject|deny/i.test(action)) return 'times-circle';
    if (/assign/i.test(action)) return 'user-plus';
    if (/status|transition/i.test(action)) return 'sync';
    if (/comment|note/i.test(action)) return 'comment';
    return 'circle';
  }

  private resolveSeverity(action: string): 'info' | 'success' | 'warning' | 'danger' {
    if (/creat|approv|complet/i.test(action)) return 'success';
    if (/delet|reject|fail/i.test(action)) return 'danger';
    if (/overdue|breach|escalat/i.test(action)) return 'warning';
    return 'info';
  }
}
