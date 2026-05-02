import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface ControlAgingItem {
  name: string;
  daysSinceRedesign: number;
  agePct: number;
}

interface ControlAgingResponse {
  controls?: ControlAgingItem[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-control-aging',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="aging">
      <div *ngFor="let c of controls" class="aging-row">
        <span class="aging-name">{{ c.name }}</span>
        <div class="aging-bar-track"><div class="aging-bar" [style.width.%]="c.agePct" [class.fresh]="c.agePct < 50" [class.stale]="c.agePct >= 50 && c.agePct < 80" [class.expired]="c.agePct >= 80"></div></div>
        <span class="aging-days">{{ c.daysSinceRedesign }}d</span>
      </div>
      <p class="aging-insight" *ngIf="insight">{{ insight }}</p>
      <p *ngIf="controls.length === 0" class="aging-empty">{{ i18n.translate('widgets.controlAging.empty') }}</p>
    </div>
  `,
  styles: [`
    .aging { display: flex; flex-direction: column; gap: 8px; }
    .aging-row { display: flex; align-items: center; gap: 8px; }
    .aging-name { font-size: var(--font-size-xs); font-weight: 600; min-width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-body); }
    .aging-bar-track {
      flex: 1; height: 10px; border-radius: var(--radius-sm); overflow: hidden;
      background: var(--glass-icon-bg, rgba(14,165,233,0.06));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.12));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .aging-bar { height: 100%; border-radius: var(--radius-sm); transition: width 500ms; box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
    .aging-bar.fresh { background: var(--success, var(--success)); }
    .aging-bar.stale { background: var(--warning, var(--warning)); }
    .aging-bar.expired { background: var(--error, var(--error)); }
    .aging-days { font-size: var(--font-size-xs); font-weight: var(--font-black, 800); min-width: 36px; text-align: end; color: var(--text-muted); }
    .aging-insight { font-size: var(--font-size-sm); font-weight: 600; color: var(--warning); text-align: center; margin: 4px 0 0; }
    .aging-empty { font-size: var(--font-size-sm); color: var(--text-muted); text-align: center; margin: 0; }
  `],
})
export class ControlAgingWidget implements OnInit {
  controls: { name: string; daysSinceRedesign: number; agePct: number }[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<ControlAgingResponse>('/widgets/control-aging').subscribe({
      next: (d) => {
        this.controls = (d.controls ?? []).slice(0, 5);
        this.insight = d.insight ?? '';
      },
      error: () => { this.insight = this.i18n.translate('widgets.controlAging.fallbackInsight'); },
    });
  }

}
