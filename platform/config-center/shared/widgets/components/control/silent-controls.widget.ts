import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface SilentControlItem {
  name: string;
  days: number;
}

interface SilentControlsResponse {
  controls?: SilentControlItem[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-silent-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="silent">
      <div *ngFor="let c of controls" class="silent-row">
        <span class="silent-name">{{ c.name }}</span>
        <span class="silent-days" [class.danger]="c.days > 365" [class.warn]="c.days > 180 && c.days <= 365">
          ⏳ {{ c.days }} {{ i18n.translate('widgets.silentControls.days') }}
        </span>
      </div>
      <p class="silent-insight" *ngIf="insight">{{ insight }}</p>
      <p *ngIf="controls.length === 0" class="silent-empty">{{ i18n.translate('widgets.silentControls.empty') }}</p>
    </div>
  `,
  styles: [`
    .silent { display: flex; flex-direction: column; gap: 6px; }
    .silent-row {
      display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.08));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      transition: all 200ms;
    }
    .silent-row:hover { border-color: var(--glass-icon-border, rgba(14,165,233,0.18)); }
    .silent-name { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-body); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .silent-days { font-size: var(--font-size-xs); font-weight: var(--font-black, 800); min-width: 70px; text-align: end; }
    .silent-days.warn { color: var(--warning); }
    .silent-days.danger { color: var(--error, var(--error)); }
    .silent-insight { font-size: var(--font-size-sm); font-weight: 600; color: var(--error, var(--error)); margin: 6px 0 0; text-align: center; }
    .silent-empty { font-size: var(--font-size-sm); color: var(--text-muted); text-align: center; margin: 0; }
  `],
})
export class SilentControlsWidget implements OnInit {
  controls: { name: string; days: number }[] = [];
  insight = '';

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit(): void {
    this.apiclientSvc.get<SilentControlsResponse>('/widgets/silent-controls').subscribe({
      next: (d) => {
        this.controls = (d.controls ?? []).slice(0, 5);
        this.insight = d.insight ?? '';
      },
      error: () => {
        this.insight = this.i18n.translate('widgets.silentControls.fallbackInsight');
      },
    });
  }

}
