import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of, forkJoin } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { FormsModule } from '@angular/forms';
import { GrcRecord } from '@app/core/models/shared.types';
import { ButtonModule, TagModule } from 'carbon-components-angular';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-calendar-page',
    imports: [CommonModule, DatePipe, RouterLink, ButtonModule, TagModule, FormsModule],
    template: `
    <div class="cal-page" [dir]="i18n.direction()">
      <div class="cal-header">
        <h2>{{ isAr() ? 'تقويم الامتثال' : 'Compliance Calendar' }}</h2>
        <div class="cal-nav">
          <button cdsButton icon="" class=" " (click)="prevMonth()"></button>
          <span class="cal-month-label">{{ monthLabel() }}</span>
          <button cdsButton icon="" class=" " (click)="nextMonth()"></button>
          <button cdsButton [label]="isAr() ? 'اليوم' : 'Today'" class=" " (click)="goToday()"></button>
        </div>
      </div>

      <div class="cal-filters">
        <select class="filter-select" [(ngModel)]="typeFilter" (ngModelChange)="applyFilter()">
          <option value="">{{ isAr() ? 'كل الأنواع' : 'All Types' }}</option>
          <option value="control_test">Control Test</option>
          <option value="gap_due">Gap Due</option>
          <option value="assessment">Assessment</option>
          <option value="obligation">Obligation</option>
        </select>
        <select class="filter-select" [(ngModel)]="ownerFilter" (ngModelChange)="applyFilter()">
          <option value="">{{ isAr() ? 'كل المالكين' : 'All Owners' }}</option>
          @for (u of foundationUsers(); track u.user_id) { <option [value]="u.user_id">{{ u.display_name || u.email }}</option> }
        </select>
      </div>

      @if (loadError()) {
        <div class="load-error-banner" role="alert">
          <i class=""></i>
          <span>{{ loadError() }}</span>
          <button type="button" class="retry-btn" (click)="loadError.set(null); loadEvents()">{{ i18n.translate('common.retry') }}</button>
        </div>
      }

      @if (loading()) {
        <div class="cal-loading"><i class=" pi-spinner"></i> {{ isAr() ? 'جارٍ التحميل...' : 'Loading...' }}</div>
      }

      @if (!loading() && !loadError()) {
        <div class="cal-grid">
          @for (dayName of dayNames(); track dayName) {
            <div class="cal-day-header">{{ dayName }}</div>
          }
          @for (day of calendarDays(); track day.key) {
            <div class="cal-cell" [class.cal-today]="day.isToday" [class.cal-other-month]="!day.isCurrentMonth" (click)="selectDay(day)">
              <span class="cal-date-num">{{ day.day }}</span>
              @if (day.events.length > 0) {
                <div class="cal-event-dots">
                  @for (ev of day.events.slice(0, 3); track ev.entityId) {
                    <span class="cal-dot" [attr.data-type]="ev.type" [title]="ev.title"></span>
                  }
                  @if (day.events.length > 3) {
                    <span class="cal-dot-more">+{{ day.events.length - 3 }}</span>
                  }
                </div>
              }
            </div>
          }
        </div>

        @if (selectedDayEvents().length > 0) {
          <div class="cal-detail-panel">
            <h3>{{ selectedDateLabel() }}</h3>
            <div class="cal-events-list">
              @for (ev of selectedDayEvents(); track ev.entityId) {
                <a class="cal-event-card" [routerLink]="ev.route" [class.cal-overdue]="isOverdue(ev.date)">
                  <span class="cal-ev-type" [attr.data-type]="ev.type">{{ eventTypeLabel(ev.type) }}</span>
                  <span class="cal-ev-title">{{ ev.title }}</span>
                  <span class="cal-ev-date">{{ ev.date | date:'mediumDate' }}</span>
                  <cds-tag [severity]="severityTag(ev.severity)" [value]="ev.severity" />
                </a>
              }
            </div>
          </div>
        }

        <div class="cal-legend">
          <span class="cal-legend-item"><span class="cal-dot" data-type="control_test"></span> {{ isAr() ? 'اختبار ضابط' : 'Control Test' }}</span>
          <span class="cal-legend-item"><span class="cal-dot" data-type="gap_due"></span> {{ isAr() ? 'استحقاق فجوة' : 'Gap Due' }}</span>
          <span class="cal-legend-item"><span class="cal-dot" data-type="assessment"></span> {{ isAr() ? 'تقييم' : 'Assessment' }}</span>
          <span class="cal-legend-item"><span class="cal-dot" data-type="obligation"></span> {{ isAr() ? 'التزام' : 'Obligation' }}</span>
        </div>
      }
    </div>
  `,
    styles: [`
    .cal-page { padding: 20px 28px; }
    .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .cal-header h2 { margin: 0; font-size: var(--font-size-lg); font-weight: 600; }
    .cal-nav { display: flex; align-items: center; gap: 8px; }
    .cal-month-label { font-size: var(--font-size-md); font-weight: 700; min-width: 160px; text-align: center; }
    .cal-filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .filter-select { padding: 6px 10px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--surface-card); }
    .cal-loading { text-align: center; padding: 48px; color: var(--text-color-secondary); }
    .load-error-banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius); font-size: var(--font-size-sm); color: #b91c1c; }
    .load-error-banner i { flex-shrink: 0; }
    .retry-btn { margin-inline-start: auto; padding: 6px 12px; background: #b91c1c; color: #fff; border: none; border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; }
    .retry-btn:hover { background: #991b1b; }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); border: 1px solid var(--surface-border, #e5e7eb); border-radius: var(--radius-md); overflow: hidden; background: var(--surface-card); }
    .cal-day-header { padding: 10px; text-align: center; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; background: var(--surface-100); border-bottom: 1px solid var(--surface-border); color: var(--text-color-secondary); }
    .cal-cell { min-height: 80px; padding: 6px; border-bottom: 1px solid var(--surface-50); border-right: 1px solid var(--surface-50); cursor: pointer; transition: background .1s; }
    .cal-cell:hover { background: var(--surface-50); }
    .cal-cell.cal-today { background: #eff6ff; }
    .cal-cell.cal-other-month { opacity: .4; }
    .cal-date-num { font-size: var(--font-size-sm); font-weight: 600; }
    .cal-today .cal-date-num { color: var(--primary); font-weight: 800; }
    .cal-event-dots { display: flex; gap: 3px; margin-top: 4px; flex-wrap: wrap; }
    .cal-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .cal-dot[data-type="control_test"] { background: #3b82f6; }
    .cal-dot[data-type="gap_due"] { background: #ef4444; }
    .cal-dot[data-type="assessment"] { background: #22c55e; }
    .cal-dot[data-type="obligation"] { background: #f59e0b; }
    .cal-dot-more { font-size: var(--font-size-nano); color: var(--text-color-secondary); font-weight: 700; }
    .cal-detail-panel { margin-top: 16px; padding: 16px; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); }
    .cal-detail-panel h3 { margin: 0 0 12px; font-size: var(--font-size-md); }
    .cal-events-list { display: flex; flex-direction: column; gap: 8px; }
    .cal-event-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--radius); border: 1px solid var(--surface-border); text-decoration: none; color: inherit; transition: background .1s; }
    .cal-event-card:hover { background: var(--surface-50); }
    .cal-event-card.cal-overdue { border-color: #fca5a5; background: #fff5f5; }
    .cal-ev-type { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: var(--radius-xs); background: var(--surface-100); }
    .cal-ev-type[data-type="control_test"] { color: #1d4ed8; background: #dbeafe; }
    .cal-ev-type[data-type="gap_due"] { color: #b91c1c; background: #fee2e2; }
    .cal-ev-type[data-type="assessment"] { color: #15803d; background: #dcfce7; }
    .cal-ev-type[data-type="obligation"] { color: #92400e; background: #fef3c7; }
    .cal-ev-title { flex: 1; font-size: var(--font-size-sm); font-weight: 500; }
    .cal-ev-date { font-size: var(--font-size-xs); color: var(--text-color-secondary); white-space: nowrap; }
    .cal-legend { display: flex; gap: 16px; margin-top: 16px; flex-wrap: wrap; }
    .cal-legend-item { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--text-color-secondary); }
  `]
})
export class ComplianceCalendarPageComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private api = inject(ComplianceFeatureApiService);

  loading = signal(true);
  /** Set when load fails so we show "Failed to load" + retry */
  loadError = signal<string | null>(null);
  currentMonth = signal(new Date());
  allEvents = signal<GrcRecord[]>([]);
  filteredEvents = signal<GrcRecord[]>([]);
  selectedDate = signal<string | null>(null);
  foundationUsers = signal<GrcRecord[]>([]);
  typeFilter = '';
  ownerFilter = '';

  isAr = computed(() => this.i18n.currentLang() === 'ar');

  dayNames = computed(() => {
    const en = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const ar = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت'];
    return this.isAr() ? ar : en;
  });

  monthLabel = computed(() => {
    const d = this.currentMonth();
    return d.toLocaleDateString(this.isAr() ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' });
  });

  calendarDays = computed(() => {
    const d = this.currentMonth();
    const year = d.getFullYear(), month = d.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const today = new Date().toISOString().slice(0, 10);
    const events = this.filteredEvents();
    const days: GrcRecord[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const dd = daysInPrev - i;
      const dt = new Date(year, month - 1, dd).toISOString().slice(0, 10);
      days.push({ key: 'p' + dd, day: dd, isCurrentMonth: false, isToday: dt === today, date: dt, events: events.filter(e => e.date?.slice(0, 10) === dt) });
    }
    for (let dd = 1; dd <= daysInMonth; dd++) {
      const dt = new Date(year, month, dd).toISOString().slice(0, 10);
      days.push({ key: 'c' + dd, day: dd, isCurrentMonth: true, isToday: dt === today, date: dt, events: events.filter(e => e.date?.slice(0, 10) === dt) });
    }
    const remaining = 42 - days.length;
    for (let dd = 1; dd <= remaining; dd++) {
      const dt = new Date(year, month + 1, dd).toISOString().slice(0, 10);
      days.push({ key: 'n' + dd, day: dd, isCurrentMonth: false, isToday: dt === today, date: dt, events: events.filter(e => e.date?.slice(0, 10) === dt) });
    }
    return days;
  });

  selectedDayEvents = computed(() => {
    const sel = this.selectedDate();
    if (!sel) return [];
    return this.filteredEvents().filter(e => e.date?.slice(0, 10) === sel);
  });

  selectedDateLabel = computed(() => {
    const sel = this.selectedDate();
    if (!sel) return '';
    return new Date(sel).toLocaleDateString(this.isAr() ? 'ar-SA' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  });

  ngOnInit(): void {
    this.api.getFoundationUsers().pipe(catchError(() => of([]))).subscribe(u => this.foundationUsers.set(u));
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const d = this.currentMonth();
    const from = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
    const to = new Date(d.getFullYear(), d.getMonth() + 2, 0).toISOString().slice(0, 10);
    const failMsg = this.i18n.translate('common.failedToLoad') || 'Failed to load';
    this.api.getCalendar(from, to).pipe(catchError(() => {
      this.loadError.set(failMsg);
      return of([]);
    })).subscribe(events => {
      this.allEvents.set(Array.isArray(events) ? events : []);
      this.applyFilter();
      this.loading.set(false);
    });
  }

  prevMonth(): void {
    const d = this.currentMonth();
    this.currentMonth.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.loadEvents();
  }

  nextMonth(): void {
    const d = this.currentMonth();
    this.currentMonth.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.loadEvents();
  }

  goToday(): void {
    this.currentMonth.set(new Date());
    this.selectedDate.set(new Date().toISOString().slice(0, 10));
    this.loadEvents();
  }

  applyFilter(): void {
    let events = this.allEvents();
    if (this.typeFilter) events = events.filter(e => e.type === this.typeFilter);
    if (this.ownerFilter) events = events.filter(e => e.owner === this.ownerFilter || e.ownerId === this.ownerFilter);
    this.filteredEvents.set(events);
  }

  selectDay(day: GrcRecord): void { this.selectedDate.set(day.date); }
  isOverdue(date: string): boolean { return new Date(date) < new Date(); }
  severityTag(sev: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    if (sev === 'critical') return 'danger';
    if (sev === 'high') return 'warning';
    if (sev === 'medium') return 'info';
    return 'success';
  }
  eventTypeLabel(type: string): string {
    const labels: Record<string, string> = { control_test: 'Test', gap_due: 'Gap', assessment: 'Assessment', obligation: 'Obligation' };
    return labels[type] || type;
  }
}
