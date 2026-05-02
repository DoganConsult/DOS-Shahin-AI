import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcRiskService } from '@app/grc/services/grc-risk.service';

interface IncidentTrackerItem {
  status?: string;
  severity?: string;
  title?: string;
}

interface IncidentTrackerResponse {
  incidents?: IncidentTrackerItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-incident-tracker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tracker">
      <div class="stat-row">
        <div class="stat-box"><span class="num" style="color:var(--error)">{{ open }}</span><span class="lbl">Open</span></div>
        <div class="stat-box"><span class="num" style="color:#eab308">{{ investigating }}</span><span class="lbl">Investigating</span></div>
        <div class="stat-box"><span class="num" style="color:#22c55e">{{ resolved }}</span><span class="lbl">Resolved</span></div>
      </div>
      <div class="recent" *ngIf="recent.length">
        <div *ngFor="let inc of recent" class="recent-item">
          <span class="badge" [ngClass]="inc.severity==='critical'?'badge-red':inc.severity==='high'?'badge-yellow':'badge-blue'">{{ inc.severity }}</span>
          <span class="inc-title">{{ inc.title }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stat-row { display: flex; justify-content: space-around; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid var(--border-subtle, var(--border-subtle)); }
    .stat-box {
      text-align: center; padding: 10px 14px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .num { display: block; font-size: var(--font-size-2xl); font-weight: var(--font-black, 800); letter-spacing: -0.02em; }
    .lbl { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
    .recent-item {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin-bottom: 4px;
      border-radius: var(--radius-sm, 8px); font-size: var(--font-size-sm);
      background: var(--glass-icon-bg, rgba(14,165,233,0.03));
      border: 1px solid var(--border-subtle, var(--border-subtle));
      transition: all 200ms;
    }
    .recent-item:hover { border-color: var(--glass-icon-border, rgba(14,165,233,0.18)); }
    .inc-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-body); }
    .badge { padding: 2px 8px; border-radius: var(--radius-pill, 99px); font-size: var(--font-size-xs); font-weight: 700; backdrop-filter: blur(4px); }
    .badge-red { background: rgba(239,68,68,0.10); color: var(--error); border: 1px solid rgba(239,68,68,0.18); }
    .badge-yellow { background: rgba(234,179,8,0.10); color: var(--warning); border: 1px solid rgba(234,179,8,0.18); }
    .badge-blue { background: rgba(59,130,246,0.10); color: var(--primary); border: 1px solid rgba(59,130,246,0.18); }
  `],
})
export class IncidentTrackerWidget implements OnInit {
  open = 0; investigating = 0; resolved = 0; recent: IncidentTrackerItem[] = [];

  constructor(public i18n: I18nService, private riskSvc: GrcRiskService) {}

  ngOnInit(): void {
    this.riskSvc.getIncidents().subscribe({
      next: (r: IncidentTrackerResponse) => {
        const list = r.incidents ?? [];
        this.open = list.filter((i) => i.status === 'reported').length;
        this.investigating = list.filter((i) => i.status === 'investigating').length;
        this.resolved = list.filter((i) => i.status === 'resolved').length;
        this.recent = list.slice(0, 5);
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }

}
