import { Component, OnInit, inject, computed, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { GOVERNANCE_TABS } from '@app/features/governance/governance.constants';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';

interface CalendarEvent { type: string; title: string; date: string; entityId?: string; route?: string; meta?: Record<string, unknown>; owner?: string; }

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cadence-calendar',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, CardModule, TableModule, TagModule, ButtonModule, DropdownModule, TooltipModule],
  template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Governance Calendar" titleAr="تقويم الحوكمة"
        subtitleEn="Unified view of meetings, policy reviews, assessment cycles and exception expiries"
        subtitleAr="عرض شامل للاجتماعات ومراجعات السياسات ودورات التقييم وانتهاء الاستثناءات"
        icon="calendar"
        [breadcrumbs]="[i18n.translate('cadenceCalendar.dashboard'), i18n.translate('cadenceCalendar.governance'), i18n.translate('cadenceCalendar.calendar')]"
        [actions]="headerActions" [isAr]="i18n.isAr()" [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />
      <div class="gov-body" [class.loading-body]="loading">

      <div class="page-toolbar">
        <div class="toolbar-primary">
          <p-dropdown [options]="typeOptions" [(ngModel)]="typeFilter" optionLabel="label" optionValue="value"
                      [placeholder]="i18n.translate('cadenceCalendar.eventType')" (onChange)="applyFilter()" [style]="{minWidth:'160px'}" />
          <p-dropdown [options]="periodOptions" [(ngModel)]="periodFilter" optionLabel="label" optionValue="value"
                      [placeholder]="i18n.translate('cadenceCalendar.period')" (onChange)="applyFilter()" [style]="{minWidth:'140px'}" />
          <p-dropdown [options]="ownerOptions" [(ngModel)]="ownerFilter" optionLabel="label" optionValue="value"
                      [placeholder]="i18n.translate('cadenceCalendar.ownerCommittee')" (onChange)="applyFilter()" [style]="{minWidth:'160px'}" />
        </div>
        <div class="toolbar-secondary">
          <span class="stat-pill meetings">{{ meetingCount }} {{ i18n.translate('cadenceCalendar.meetings') }}</span>
          <span class="stat-pill reviews">{{ reviewCount }} {{ i18n.translate('cadenceCalendar.reviews') }}</span>
          <span class="stat-pill expiries">{{ expiryCount }} {{ i18n.translate('cadenceCalendar.expiries') }}</span>
        </div>
      </div>

      <!-- Agenda View -->
      <div *ngIf="todayEvents.length > 0" class="agenda-section">
        <h3 class="agenda-title">{{ i18n.translate('cadenceCalendar.today') }}</h3>
        <div tabindex="0" role="button" (keyup.enter)="navigateTo(ev)" *ngFor="let ev of todayEvents" class="agenda-item" (click)="navigateTo(ev)">
          <div class="agenda-type-icon" [ngClass]="ev.type">
            <i class="pi" [ngClass]="ev.type === 'meeting' ? 'pi-calendar' : ev.type === 'policy_review' ? 'pi-file' : 'pi-exclamation-triangle'"></i>
          </div>
          <div class="agenda-body">
            <strong>{{ ev.title }}</strong>
            <span class="agenda-meta">{{ ev.date | date:'shortTime' }} · <p-tag [value]="ev.type | titlecase" [severity]="ev.type === 'meeting' ? 'info' : ev.type === 'policy_review' ? 'warning' : 'danger'" /></span>
          </div>
        </div>
      </div>

      <div *ngIf="weekEvents.length > 0" class="agenda-section">
        <h3 class="agenda-title">{{ i18n.translate('cadenceCalendar.thisWeek') }}</h3>
        <div tabindex="0" role="button" (keyup.enter)="navigateTo(ev)" *ngFor="let ev of weekEvents" class="agenda-item" (click)="navigateTo(ev)">
          <div class="agenda-type-icon" [ngClass]="ev.type">
            <i class="pi" [ngClass]="ev.type === 'meeting' ? 'pi-calendar' : ev.type === 'policy_review' ? 'pi-file' : 'pi-exclamation-triangle'"></i>
          </div>
          <div class="agenda-body">
            <strong>{{ ev.title }}</strong>
            <span class="agenda-meta">{{ ev.date | date:'EEE, MMM d' }} · <p-tag [value]="ev.type | titlecase" [severity]="ev.type === 'meeting' ? 'info' : ev.type === 'policy_review' ? 'warning' : 'danger'" /></span>
          </div>
        </div>
      </div>

      <div *ngIf="monthEvents.length > 0" class="agenda-section">
        <h3 class="agenda-title">{{ i18n.translate('cadenceCalendar.next30Days') }}</h3>
        <div tabindex="0" role="button" (keyup.enter)="navigateTo(ev)" *ngFor="let ev of monthEvents" class="agenda-item" (click)="navigateTo(ev)">
          <div class="agenda-type-icon" [ngClass]="ev.type">
            <i class="pi" [ngClass]="ev.type === 'meeting' ? 'pi-calendar' : ev.type === 'policy_review' ? 'pi-file' : 'pi-exclamation-triangle'"></i>
          </div>
          <div class="agenda-body">
            <strong>{{ ev.title }}</strong>
            <span class="agenda-meta">{{ ev.date | appDate:'medium' }} · <p-tag [value]="ev.type | titlecase" [severity]="ev.type === 'meeting' ? 'info' : ev.type === 'policy_review' ? 'warning' : 'danger'" /></span>
          </div>
        </div>
      </div>

      <div *ngIf="laterEvents.length > 0" class="agenda-section">
        <h3 class="agenda-title">{{ i18n.translate('cadenceCalendar.later') }}</h3>
        <div tabindex="0" role="button" (keyup.enter)="navigateTo(ev)" *ngFor="let ev of laterEvents" class="agenda-item" (click)="navigateTo(ev)">
          <div class="agenda-type-icon" [ngClass]="ev.type">
            <i class="pi" [ngClass]="ev.type === 'meeting' ? 'pi-calendar' : ev.type === 'policy_review' ? 'pi-file' : 'pi-exclamation-triangle'"></i>
          </div>
          <div class="agenda-body">
            <strong>{{ ev.title }}</strong>
            <span class="agenda-meta">{{ ev.date | appDate:'medium' }} · <p-tag [value]="ev.type | titlecase" [severity]="ev.type === 'meeting' ? 'info' : ev.type === 'policy_review' ? 'warning' : 'danger'" /></span>
          </div>
        </div>
      </div>

      <div *ngIf="!loading && allEvents.length === 0" class="empty-state">
        <i class="pi pi-calendar empty-icon"></i>
        <p>{{ i18n.translate('cadenceCalendar.noUpcomingEvents') }}</p>
      </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100%; }
    .gov-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ice, var(--surface-ice)); }
    .gov-body { flex: 1; padding: 16px 24px 32px; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
    @media (max-width: 768px) { .gov-body { padding: 12px; gap: 10px; } }
    .loading-body { opacity: .6; pointer-events: none; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); padding: 10px 14px; }
    .toolbar-primary { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .toolbar-secondary { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    @media (max-width: 768px) { .page-toolbar { flex-direction: column; align-items: stretch; } .toolbar-primary, .toolbar-secondary { width: 100%; } }
    .stat-pill { font-size: var(--font-size-sm); font-weight: 600; padding: 4px 10px; border-radius: var(--radius-lg); }
    .stat-pill.meetings { background: #dbeafe; color: #1d4ed8; }
    .stat-pill.reviews { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .stat-pill.expiries { background: #fee2e2; color: var(--error); }
    .agenda-section { margin-bottom: 20px; }
    .agenda-title { font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading, #111); margin: 0 0 10px; padding-bottom: 6px; border-bottom: 2px solid var(--surface-border, var(--border-subtle)); }
    .agenda-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: var(--radius); cursor: pointer; transition: background .15s; }
    .agenda-item:hover { background: var(--surface-100, var(--surface-ice)); }
    .agenda-type-icon { width: 36px; height: 36px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .agenda-type-icon.meeting { background: #dbeafe; color: #1d4ed8; }
    .agenda-type-icon.policy_review { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .agenda-type-icon.exception_expiry { background: #fee2e2; color: var(--error); }
    .agenda-type-icon .pi { font-size: var(--font-size-md); }
    .agenda-body { display: flex; flex-direction: column; gap: 2px; }
    .agenda-body strong { font-size: var(--font-size-sm); color: var(--text-heading, #111); }
    .agenda-meta { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); display: flex; align-items: center; gap: 6px; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted, var(--text-muted)); }
    .empty-icon { font-size: 48px; margin-bottom: 12px; color: var(--text-muted, #9ca3af); display: block; }
  `]
})
export class CadenceCalendarComponent implements OnInit {
    private governanceSvc = inject(GrcGovernanceService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [
    { id: 'export', labelEn: 'Export', labelAr: 'تصدير', icon: 'download' },
  ];
  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  onHeaderAction(_id: string): void { /* future: export calendar */ }

  loading = true;
  allEvents: CalendarEvent[] = [];
  filteredEvents: CalendarEvent[] = [];
  todayEvents: CalendarEvent[] = [];
  weekEvents: CalendarEvent[] = [];
  monthEvents: CalendarEvent[] = [];
  laterEvents: CalendarEvent[] = [];

  typeFilter = '';
  periodFilter = '';
  ownerFilter = '';
  meetingCount = 0;
  reviewCount = 0;
  expiryCount = 0;
  ownerOptions: { label: string; value: string }[] = [{ label: 'All', value: '' }];

  typeOptions = [
    { label: 'All Types', value: '' },
    { label: 'Meetings', value: 'meeting' },
    { label: 'Policy Reviews', value: 'policy_review' },
    { label: 'Exception Expiries', value: 'exception_expiry' },
  ];

  periodOptions = [
    { label: 'All', value: '' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'Next 30 Days', value: 'month' },
  ];

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['type']) this.typeFilter = params['type'];
      if (params['period']) this.periodFilter = params['period'];
      if (params['owner']) this.ownerFilter = params['owner'];
    });
    this.loading = true;
    this.governanceSvc.getGovernanceCalendar().subscribe({
      next: (data: any) => {
        this.allEvents = (data.events || data.items || data || []).map((e: unknown) => ({
          type: e.type || 'meeting',
          title: e.title || e.name || '—',
          date: e.date || e.scheduled_at || e.next_review_date || e.expiry_date,
          entityId: e.entityId || e.entity_id || e.meeting_id || e.policy_id || e.exception_id,
          route: e.type === 'meeting' ? '/governance/committees' : e.type === 'policy_review' ? '/governance/policies' : '/governance/exceptions',
          meta: e,
          owner: e.owner || e.committee_name || e.committee_id || '',
        }));
        this.meetingCount = this.allEvents.filter(e => e.type === 'meeting').length;
        this.reviewCount = this.allEvents.filter(e => e.type === 'policy_review').length;
        this.expiryCount = this.allEvents.filter(e => e.type === 'exception_expiry').length;
        const owners = new Set(this.allEvents.map(e => e.owner).filter(Boolean));
        this.ownerOptions = [{ label: 'All', value: '' }, ...Array.from(owners).map(o => ({ label: o as string, value: o as string }))];
        this.applyFilter();
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.allEvents = []; this.loading = false; this.cdr.markForCheck(); },
    });
  }

  applyFilter(): void {
    let list = [...this.allEvents];
    if (this.typeFilter) list = list.filter(e => e.type === this.typeFilter);
    if (this.ownerFilter) list = list.filter(e => e.owner === this.ownerFilter);

    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const weekEnd = new Date(now.getTime() + 7 * 86400000);
    const monthEnd = new Date(now.getTime() + 30 * 86400000);

    if (this.periodFilter === 'today') list = list.filter(e => new Date(e.date) <= todayEnd);
    else if (this.periodFilter === 'week') list = list.filter(e => new Date(e.date) <= weekEnd);
    else if (this.periodFilter === 'month') list = list.filter(e => new Date(e.date) <= monthEnd);

    this.filteredEvents = list;

    this.todayEvents = list.filter(e => { const d = new Date(e.date); return d >= now && d <= todayEnd; });
    this.weekEvents = list.filter(e => { const d = new Date(e.date); return d > todayEnd && d <= weekEnd; });
    this.monthEvents = list.filter(e => { const d = new Date(e.date); return d > weekEnd && d <= monthEnd; });
    this.laterEvents = list.filter(e => new Date(e.date) > monthEnd);
  }

  navigateTo(ev: CalendarEvent): void {
    if (ev.route) this.router.navigate([ev.route]);
  }

}
