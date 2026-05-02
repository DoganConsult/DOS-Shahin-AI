import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetsApiService } from '@app/core/platform/widgets/widgets-api.service';
import { WidgetShellComponent } from '@app/dashboard';
import { firstValueFrom } from 'rxjs';

interface PostureData {
  overallScore: number;
  frameworks: { name: string; score: number; trend: 'up' | 'down' | 'flat' }[];
  totalControls: number;
  coveredControls: number;
}

@Component({
  selector: 'app-compliance-posture-widget',
  standalone: true,
  imports: [CommonModule, WidgetShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-widget-shell [title]="title()" [fetchedAt]="fetchedAt()">
      <div class="posture-summary">
        <div class="posture-score">
          <svg viewBox="0 0 120 120" class="score-ring">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" stroke-width="8" />
            <circle cx="60" cy="60" r="52" fill="none"
              [attr.stroke]="scoreColor()"
              stroke-width="8" stroke-linecap="round"
              [attr.stroke-dasharray]="dashArray()"
              transform="rotate(-90 60 60)" />
          </svg>
          <span class="score-value">{{ data()?.overallScore ?? 0 }}%</span>
        </div>
        <div class="posture-meta">
          <div class="meta-row">
            <span class="meta-label">Controls</span>
            <span class="meta-value">{{ data()?.coveredControls ?? 0 }}/{{ data()?.totalControls ?? 0 }}</span>
          </div>
        </div>
      </div>

      <div class="fw-list" *ngIf="data()?.frameworks?.length">
        <div *ngFor="let fw of data()!.frameworks" class="fw-row">
          <span class="fw-name">{{ fw.name }}</span>
          <div class="fw-bar-wrap">
            <div class="fw-bar" [style.width.%]="fw.score"></div>
          </div>
          <span class="fw-score">{{ fw.score }}%</span>
          <span class="fw-trend" [attr.data-trend]="fw.trend">
            {{ fw.trend === 'up' ? '↑' : fw.trend === 'down' ? '↓' : '→' }}
          </span>
        </div>
      </div>
    </app-widget-shell>
  `,
  styles: [`
    .posture-summary { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
    .posture-score { position: relative; width: 80px; height: 80px; }
    .score-ring { width: 80px; height: 80px; }
    .score-value { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-lg); font-weight: 700; color: var(--text-heading, #0f172a); }
    .posture-meta { flex: 1; }
    .meta-row { display: flex; justify-content: space-between; font-size: var(--font-size-sm); padding: 4px 0; }
    .meta-label { color: var(--text-muted, #6b7280); }
    .meta-value { font-weight: 600; color: var(--text-heading, #0f172a); }
    .fw-list { display: flex; flex-direction: column; gap: 6px; }
    .fw-row { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); }
    .fw-name { flex: 0 0 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-heading, #0f172a); }
    .fw-bar-wrap { flex: 1; height: 6px; border-radius: 3px; background: var(--surface-200, #e5e7eb); overflow: hidden; }
    .fw-bar { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #3b82f6, #22c55e); }
    .fw-score { min-width: 36px; text-align: end; font-weight: 600; }
    .fw-trend[data-trend="up"] { color: #16a34a; }
    .fw-trend[data-trend="down"] { color: #dc2626; }
    .fw-trend[data-trend="flat"] { color: #6b7280; }
  `]
})
export class CompliancePostureWidgetComponent implements OnInit {
  @Input() config: Record<string, unknown> = {};
  private api = inject(WidgetsApiService);

  readonly title = signal('Compliance Posture');
  readonly fetchedAt = signal<string | null>(null);
  readonly data = signal<PostureData | null>(null);

  scoreColor(): string {
    const s = this.data()?.overallScore ?? 0;
    if (s >= 80) return '#16a34a';
    if (s >= 60) return '#ca8a04';
    return '#dc2626';
  }

  dashArray(): string {
    const pct = (this.data()?.overallScore ?? 0) / 100;
    const circ = 2 * Math.PI * 52;
    return `${circ * pct} ${circ * (1 - pct)}`;
  }

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getWidget('compliance-posture'));
      if (!res) return;
      this.title.set(res.title);
      this.fetchedAt.set(res.fetchedAt);
      this.data.set(res.payload);
    } catch { /* leave defaults */ }
  }
}
