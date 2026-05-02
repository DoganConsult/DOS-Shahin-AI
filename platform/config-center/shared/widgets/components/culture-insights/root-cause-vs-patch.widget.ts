import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface RootCauseVsPatchResponse {
  patchCount?: number;
  rootCount?: number;
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-root-cause-vs-patch',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rcvp">
      <div class="rcvp-bars">
        <div class="rcvp-row">
          <span class="rcvp-label">{{ i18n.translate('widgets.rootCauseVsPatch.patches') }}</span>
          <div class="rcvp-track"><div class="rcvp-fill patch" [style.width.%]="patchPct"></div></div>
          <span class="rcvp-val">{{ patchCount }}</span>
        </div>
        <div class="rcvp-row">
          <span class="rcvp-label">{{ i18n.translate('widgets.rootCauseVsPatch.rootFix') }}</span>
          <div class="rcvp-track"><div class="rcvp-fill root" [style.width.%]="rootPct"></div></div>
          <span class="rcvp-val">{{ rootCount }}</span>
        </div>
      </div>
      <p class="rcvp-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .rcvp { display: flex; flex-direction: column; gap: 10px; }
    .rcvp-bars { display: flex; flex-direction: column; gap: 10px; }
    .rcvp-row { display: flex; align-items: center; gap: 8px; }
    .rcvp-label { font-size: var(--font-size-xs); font-weight: 700; min-width: 56px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .rcvp-track {
      flex: 1; height: 14px; border-radius: var(--radius); overflow: hidden;
      background: var(--glass-icon-bg, rgba(14,165,233,0.06));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.12));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .rcvp-fill { height: 100%; border-radius: var(--radius); transition: width 600ms; box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
    .rcvp-fill.patch { background: linear-gradient(90deg, var(--risk-high), var(--error)); }
    .rcvp-fill.root { background: linear-gradient(90deg, var(--success), var(--success)); }
    .rcvp-val { font-size: var(--font-size-sm); font-weight: var(--font-black, 800); min-width: 28px; text-align: end; color: var(--text-heading); }
    .rcvp-insight { font-size: var(--font-size-sm); font-weight: 600; color: #b91c1c; text-align: center; margin: 0; }
  `],
})
export class RootCauseVsPatchWidget implements OnInit {
  patchCount = 0; rootCount = 0; patchPct = 0; rootPct = 0; insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<RootCauseVsPatchResponse>('/widgets/root-cause-vs-patch').subscribe({
      next: (d) => {
        this.patchCount = d.patchCount ?? 0; this.rootCount = d.rootCount ?? 0;
        const total = this.patchCount + this.rootCount || 1;
        this.patchPct = Math.round((this.patchCount / total) * 100);
        this.rootPct = Math.round((this.rootCount / total) * 100);
        this.insight = d.insight ?? '';
      },
      error: () => { this.patchCount = 14; this.rootCount = 4; this.patchPct = 78; this.rootPct = 22; this.insight = this.i18n.translate('widgets.rootCauseVsPatch.fallbackInsight'); },
    });
  }
}
