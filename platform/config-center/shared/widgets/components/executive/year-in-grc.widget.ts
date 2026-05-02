import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface YearInGrcStat {
  icon: string;
  value: string;
  label: string;
}

interface YearInGrcResponse {
  stats?: YearInGrcStat[];
  summary?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-year-in-grc',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="yig">
      <h4 class="yig-title">{{ i18n.translate('widgets.yearInGrc.title') }}</h4>
      <div class="yig-stats">
        <div *ngFor="let s of stats" class="yig-stat">
          <span class="yig-icon">{{ s.icon }}</span>
          <span class="yig-num">{{ s.value }}</span>
          <span class="yig-label">{{ s.label }}</span>
        </div>
      </div>
      <p class="yig-summary" *ngIf="summary">{{ summary }}</p>
    </div>
  `,
  styles: [`
    .yig { text-align: center; }
    .yig-title { font-size: var(--font-size-base); font-weight: var(--font-black, 800); margin: 0 0 12px; color: var(--text-heading); letter-spacing: -0.01em; }
    .yig-stats { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .yig-stat {
      display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 64px; padding: 8px 10px;
      border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .yig-icon { font-size: var(--font-size-xl); }
    .yig-num { font-size: var(--font-size-lg); font-weight: var(--font-black, 800); color: var(--text-heading); letter-spacing: -0.02em; }
    .yig-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .yig-summary {
      font-size: var(--font-size-sm); font-weight: 700; color: #4c1d95; margin: 0; line-height: 1.5; padding: 12px;
      background: rgba(250,245,255,0.6); border-radius: var(--radius, 12px);
      border: 1px solid rgba(221,214,254,0.4);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
  `],
})
export class YearInGrcWidget implements OnInit {
  stats: YearInGrcStat[] = [];
  summary = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<YearInGrcResponse>('/widgets/year-in-grc').subscribe({
      next: (d) => { this.stats = d.stats ?? []; this.summary = d.summary ?? ''; },
      error: () => {
        this.stats = [
          { icon: '📋', value: '142', label: this.i18n.translate('widgets.yearInGrc.controls') },
          { icon: '📎', value: '89', label: this.i18n.translate('widgets.yearInGrc.evidence') },
          { icon: '⚠️', value: '23', label: this.i18n.translate('widgets.yearInGrc.findings') },
          { icon: '🔄', value: '7', label: this.i18n.translate('widgets.yearInGrc.repeated') },
        ];
        this.summary = this.i18n.translate('widgets.yearInGrc.fallbackSummary');
      },
    });
  }

}
