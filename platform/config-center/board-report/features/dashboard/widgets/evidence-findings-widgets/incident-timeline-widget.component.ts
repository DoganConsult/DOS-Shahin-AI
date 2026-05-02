import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetsApiService } from '@app/core/platform/widgets/widgets-api.service';
import { WidgetShellComponent } from '@app/dashboard';
import { firstValueFrom } from 'rxjs';

interface IncidentData {
  totalOpen: number;
  totalClosed: number;
  avgResolutionHours: number;
  timeline: { date: string; opened: number; closed: number }[];
  recent: { id: string; title: string; severity: string; status: string; createdAt: string }[];
}

@Component({
  selector: 'app-incident-timeline-widget',
  standalone: true,
  imports: [CommonModule, WidgetShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-widget-shell [title]="title()" [fetchedAt]="fetchedAt()">
      <div class="inc-kpis">
        <div class="inc-kpi">
          <span class="inc-val inc-open">{{ data()?.totalOpen ?? 0 }}</span>
          <span class="inc-lbl">Open</span>
        </div>
        <div class="inc-kpi">
          <span class="inc-val inc-closed">{{ data()?.totalClosed ?? 0 }}</span>
          <span class="inc-lbl">Closed</span>
        </div>
        <div class="inc-kpi">
          <span class="inc-val">{{ data()?.avgResolutionHours ?? 0 }}h</span>
          <span class="inc-lbl">Avg Resolution</span>
        </div>
      </div>

      <!-- Mini bar chart -->
      <div class="inc-chart" *ngIf="data()?.timeline?.length">
        <div *ngFor="let day of data()!.timeline" class="inc-bar-group">
          <div class="inc-bar inc-bar-open" [style.height.px]="barHeight(day.opened)"></div>
          <div class="inc-bar inc-bar-closed" [style.height.px]="barHeight(day.closed)"></div>
          <span class="inc-bar-label">{{ day.date | date:'d' }}</span>
        </div>
      </div>

      <!-- Recent incidents -->
      <div class="inc-recent" *ngIf="data()?.recent?.length">
        <div *ngFor="let inc of data()!.recent.slice(0, 5)" class="inc-row">
          <span class="inc-severity" [attr.data-sev]="inc.severity">{{ inc.severity }}</span>
          <span class="inc-title">{{ inc.title }}</span>
          <span class="inc-status">{{ inc.status }}</span>
        </div>
      </div>
    </app-widget-shell>
  `,
  styles: [`
    .inc-kpis { display: flex; gap: 12px; margin-bottom: 12px; }
    .inc-kpi { text-align: center; flex: 1; }
    .inc-val { display: block; font-size: var(--font-size-xl); font-weight: 700; color: var(--text-heading, #0f172a); }
    .inc-open { color: #dc2626; }
    .inc-closed { color: #16a34a; }
    .inc-lbl { font-size: var(--font-size-nano); color: var(--text-muted, #6b7280); text-transform: uppercase; }
    .inc-chart { display: flex; align-items: flex-end; gap: 4px; height: 60px; margin-bottom: 12px; padding: 0 4px; }
    .inc-bar-group { display: flex; flex-direction: column; align-items: center; gap: 1px; flex: 1; }
    .inc-bar { width: 100%; border-radius: 2px; min-height: 2px; }
    .inc-bar-open { background: #fca5a5; }
    .inc-bar-closed { background: #86efac; }
    .inc-bar-label { font-size: var(--font-size-nano); color: var(--text-muted, #6b7280); margin-top: 2px; }
    .inc-recent { display: flex; flex-direction: column; gap: 4px; }
    .inc-row { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); padding: 3px 0; }
    .inc-severity { padding: 1px 6px; border-radius: var(--radius); font-size: var(--font-size-nano); font-weight: 700; text-transform: uppercase; }
    .inc-severity[data-sev="critical"] { background: #fee2e2; color: #991b1b; }
    .inc-severity[data-sev="high"] { background: #ffedd5; color: #9a3412; }
    .inc-severity[data-sev="medium"] { background: #fef9c3; color: #854d0e; }
    .inc-severity[data-sev="low"] { background: #dcfce7; color: #166534; }
    .inc-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .inc-status { font-size: var(--font-size-xs); color: var(--text-muted, #6b7280); }
  `]
})
export class IncidentTimelineWidgetComponent implements OnInit {
  @Input() config: Record<string, unknown> = {};
  private api = inject(WidgetsApiService);

  readonly title = signal('Incident Timeline');
  readonly fetchedAt = signal<string | null>(null);
  readonly data = signal<IncidentData | null>(null);

  barHeight(count: number): number {
    const max = Math.max(
      ...(this.data()?.timeline || []).map(d => Math.max(d.opened, d.closed)),
      1
    );
    return Math.max(2, (count / max) * 40);
  }

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getWidget('incident-timeline'));
      if (!res) return;
      this.title.set(res.title);
      this.fetchedAt.set(res.fetchedAt);
      this.data.set(res.payload);
    } catch { /* leave defaults */ }
  }
}
