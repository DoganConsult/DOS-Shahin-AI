import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { ApiClientService } from "@app/core/services/api-client.service";

interface DriftedControlItem {
  title: string;
  baselineStatus: string;
  currentStatus: string;
  daysSinceDrift: number;
}

interface ControlDriftResponse {
  driftedControls?: DriftedControlItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-control-drift',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="drift-widget">
      <div *ngIf="controls.length === 0" class="empty">{{ i18n.translate('widgets.controlDrift.empty') }}</div>
      <div *ngFor="let c of controls" class="drift-item">
        <div class="title">{{ c.title }}</div>
        <div class="status-change">
          <span class="baseline">{{ c.baselineStatus }}</span>
          <span class="arrow">→</span>
          <span class="current">{{ c.currentStatus }}</span>
        </div>
        <div class="days">{{ c.daysSinceDrift }}d</div>
      </div>
    </div>
  `,
  styles: [`
    .drift-item {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin-bottom: 4px;
      border-radius: var(--radius-sm, 8px); font-size: var(--font-size-sm);
      background: var(--glass-icon-bg, rgba(14,165,233,0.03));
      border: 1px solid var(--border-subtle, var(--border-subtle));
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      transition: all 200ms;
    }
    .drift-item:hover { border-color: var(--glass-icon-border, rgba(14,165,233,0.18)); }
    .title { flex: 1; font-weight: 600; color: var(--text-body); }
    .status-change { display: flex; gap: 4px; align-items: center; }
    .baseline { color: var(--text-muted, var(--text-muted)); text-decoration: line-through; }
    .current { color: var(--error, var(--error)); font-weight: 700; }
    .arrow { color: var(--text-muted, var(--text-muted)); }
    .days { font-size: var(--font-size-xs); color: var(--warning, var(--warning)); font-weight: var(--font-black, 800); }
    .empty {
      text-align: center; color: var(--text-muted, var(--text-muted)); padding: 20px;
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      border-radius: var(--radius, 12px);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
  `]
})
export class ControlDriftWidget implements OnInit {
  controls: DriftedControlItem[] = [];
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.apiclientSvc.get<ControlDriftResponse>('/dashboard/control-drift').subscribe({
      next: (d) => { this.controls = d.driftedControls ?? []; },
      error: (e: unknown) => devError("[API]", e)
    });
  }

}
