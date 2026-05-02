import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetsApiService } from '@app/core/platform/widgets/widgets-api.service';
import { WidgetShellComponent } from '@app/dashboard';
import { firstValueFrom } from 'rxjs';

interface CalendarData {
  upcoming: { id: string; title: string; regulator: string; dueDate: string; daysLeft: number; status: 'on_track' | 'at_risk' | 'overdue' }[];
  overdueCount: number;
  thisMonthCount: number;
  nextMonthCount: number;
}

@Component({
  selector: 'app-regulatory-calendar-widget',
  standalone: true,
  imports: [CommonModule, WidgetShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-widget-shell [title]="title()" [fetchedAt]="fetchedAt()">
      <div class="rc-kpis">
        <div class="rc-kpi rc-overdue">
          <span class="rc-val">{{ data()?.overdueCount ?? 0 }}</span>
          <span class="rc-lbl">Overdue</span>
        </div>
        <div class="rc-kpi">
          <span class="rc-val">{{ data()?.thisMonthCount ?? 0 }}</span>
          <span class="rc-lbl">This Month</span>
        </div>
        <div class="rc-kpi">
          <span class="rc-val">{{ data()?.nextMonthCount ?? 0 }}</span>
          <span class="rc-lbl">Next Month</span>
        </div>
      </div>

      <div class="rc-list" *ngIf="data()?.upcoming?.length">
        <div *ngFor="let item of data()!.upcoming.slice(0, 6)" class="rc-row" [attr.data-status]="item.status">
          <div class="rc-date-badge" [class.rc-overdue-badge]="item.status === 'overdue'">
            <span class="rc-days">{{ item.daysLeft >= 0 ? item.daysLeft : 'OD' }}</span>
            <span class="rc-days-label">{{ item.daysLeft >= 0 ? 'days' : '' }}</span>
          </div>
          <div class="rc-info">
            <div class="rc-title">{{ item.title }}</div>
            <div class="rc-meta">
              <span class="rc-reg">{{ item.regulator }}</span>
              <span class="rc-due">{{ item.dueDate | date:'mediumDate' }}</span>
            </div>
          </div>
          <span class="rc-status-dot" [attr.data-status]="item.status"></span>
        </div>
      </div>

      <div *ngIf="!data()?.upcoming?.length" class="rc-empty">
        No upcoming regulatory deadlines
      </div>
    </app-widget-shell>
  `,
  styles: [`
    .rc-kpis { display: flex; gap: 8px; margin-bottom: 12px; }
    .rc-kpi { flex: 1; text-align: center; padding: 8px 4px; border-radius: var(--radius); background: var(--surface-100, #f3f4f6); }
    .rc-val { display: block; font-size: var(--font-size-lg); font-weight: 700; color: var(--text-heading, #0f172a); }
    .rc-overdue .rc-val { color: #dc2626; }
    .rc-lbl { font-size: var(--font-size-nano); color: var(--text-muted, #6b7280); text-transform: uppercase; }
    .rc-list { display: flex; flex-direction: column; gap: 6px; }
    .rc-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: var(--radius); background: var(--surface-50, #f9fafb); }
    .rc-row[data-status="overdue"] { background: #fef2f2; }
    .rc-date-badge { width: 40px; height: 40px; border-radius: var(--radius); background: var(--primary-100, #dbeafe); display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .rc-overdue-badge { background: #fee2e2; }
    .rc-days { font-size: var(--font-size-base); font-weight: 700; color: var(--primary-700, #1d4ed8); line-height: 1; }
    .rc-overdue-badge .rc-days { color: #dc2626; }
    .rc-days-label { font-size: 8px; color: var(--text-muted, #6b7280); }
    .rc-info { flex: 1; min-width: 0; }
    .rc-title { font-size: var(--font-size-sm); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rc-meta { display: flex; gap: 8px; font-size: var(--font-size-nano); color: var(--text-muted, #6b7280); margin-top: 2px; }
    .rc-reg { font-weight: 600; }
    .rc-status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .rc-status-dot[data-status="on_track"] { background: #16a34a; }
    .rc-status-dot[data-status="at_risk"] { background: #d97706; }
    .rc-status-dot[data-status="overdue"] { background: #dc2626; }
    .rc-empty { text-align: center; padding: 16px; color: var(--text-muted, #6b7280); font-size: var(--font-size-sm); }
  `]
})
export class RegulatoryCalendarWidgetComponent implements OnInit {
  @Input() config: Record<string, unknown> = {};
  private api = inject(WidgetsApiService);

  readonly title = signal('Regulatory Calendar');
  readonly fetchedAt = signal<string | null>(null);
  readonly data = signal<CalendarData | null>(null);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getWidget('regulatory-calendar'));
      if (!res) return;
      this.title.set(res.title);
      this.fetchedAt.set(res.fetchedAt);
      this.data.set(res.payload);
    } catch { /* leave defaults */ }
  }
}
