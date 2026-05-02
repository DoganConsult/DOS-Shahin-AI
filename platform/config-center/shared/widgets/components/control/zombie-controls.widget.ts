import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface ZombieControlItem {
  name: string;
  reason: string;
}

interface ZombieControlsResponse {
  controls?: ZombieControlItem[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-zombie-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="zombie">
      <div *ngFor="let c of controls" class="z-row">
        <span class="z-icon">🧟</span>
        <span class="z-name">{{ c.name }}</span>
        <span class="z-reason">{{ c.reason }}</span>
      </div>
      <p class="z-insight" *ngIf="insight">{{ insight }}</p>
      <p *ngIf="controls.length === 0" class="z-empty">{{ i18n.translate('widgets.zombieControls.empty') }}</p>
    </div>
  `,
  styles: [`
    .zombie { display: flex; flex-direction: column; gap: 6px; }
    .z-row {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm, 8px);
      background: rgba(250,245,255,0.6); border: 1px solid rgba(233,213,255,0.5);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .z-icon { font-size: var(--font-size-md); }
    .z-name { font-size: var(--font-size-sm); font-weight: 700; flex: 1; color: var(--text-body); }
    .z-reason { font-size: var(--font-size-xs); color: #7c3aed; font-weight: 700; }
    .z-insight { font-size: var(--font-size-sm); font-weight: 600; color: #6d28d9; text-align: center; margin: 4px 0 0; }
    .z-empty { font-size: var(--font-size-sm); color: var(--text-muted); text-align: center; margin: 0; }
  `],
})
export class ZombieControlsWidget implements OnInit {
  controls: { name: string; reason: string }[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<ZombieControlsResponse>('/widgets/zombie-controls').subscribe({
      next: (d) => {
        this.controls = (d.controls ?? []).slice(0, 5);
        this.insight = d.insight ?? '';
      },
      error: () => { this.insight = this.i18n.translate('widgets.zombieControls.fallbackInsight'); },
    });
  }

}
