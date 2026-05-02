import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface EvidenceRotGauge {
  label: string;
  value: number;
}

interface EvidenceRotResponse {
  gauges?: EvidenceRotGauge[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-evidence-rot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="erot">
      <div class="erot-gauges">
        <div *ngFor="let g of gauges" class="erot-g">
          <div class="erot-ring" [style.--pct]="g.value">
            <svg viewBox="0 0 36 36" class="erot-svg">
              <path class="erot-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="erot-fg" [attr.stroke-dasharray]="g.value + ', 100'" [class.good]="g.value >= 70" [class.warn]="g.value >= 40 && g.value < 70" [class.bad]="g.value < 40"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="erot-num">{{ g.value }}%</span>
          </div>
          <span class="erot-label">{{ g.label }}</span>
        </div>
      </div>
      <p class="erot-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .erot { text-align: center; }
    .erot-gauges { display: flex; justify-content: center; gap: 16px; margin-bottom: 10px; }
    .erot-g { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .erot-ring { position: relative; width: 52px; height: 52px; }
    .erot-svg { width: 100%; height: 100%; transform: rotate(-90deg); filter: drop-shadow(0 2px 6px rgba(14,165,233,0.12)); }
    .erot-bg { fill: none; stroke: var(--glass-icon-border, rgba(14,165,233,0.15)); stroke-width: 3; }
    .erot-fg { fill: none; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 600ms; }
    .erot-fg.good { stroke: var(--success, var(--success)); }
    .erot-fg.warn { stroke: var(--warning, var(--warning)); }
    .erot-fg.bad { stroke: var(--error, var(--error)); }
    .erot-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xs); font-weight: var(--font-black, 800); color: var(--text-heading); }
    .erot-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .erot-insight { font-size: var(--font-size-sm); font-weight: 600; color: var(--warning); margin: 0; }
  `],
})
export class EvidenceRotWidget implements OnInit {
  gauges: EvidenceRotGauge[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<EvidenceRotResponse>('/widgets/evidence-rot').subscribe({
      next: (d) => { this.gauges = d.gauges ?? []; this.insight = d.insight ?? ''; },
      error: () => {
        this.gauges = [
          { label: this.i18n.translate('widgets.evidenceRot.complete'), value: 68 },
          { label: this.i18n.translate('widgets.evidenceRot.fresh'), value: 42 },
          { label: this.i18n.translate('widgets.evidenceRot.traceable'), value: 55 },
        ];
        this.insight = this.i18n.translate('widgets.evidenceRot.fallbackInsight');
      },
    });
  }

}
