import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface BreakingTheCycleResponse {
  isBroken?: boolean;
  failures?: string[];
  shift?: string;
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-breaking-the-cycle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="btc">
      <div class="btc-visual">
        <div class="btc-circle" [class.broken]="isBroken">
          <span class="btc-icon">{{ isBroken ? '💥' : '🔄' }}</span>
        </div>
      </div>
      <div class="btc-failures" *ngIf="failures.length > 0">
        <div *ngFor="let f of failures" class="btc-fail">
          <span class="btc-fail-icon">↻</span>
          <span class="btc-fail-text">{{ f }}</span>
        </div>
      </div>
      <p class="btc-shift" *ngIf="shift">{{ shift }}</p>
      <p class="btc-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .btc { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .btc-visual { display: flex; justify-content: center; }
    .btc-circle {
      width: 64px; height: 64px; border-radius: var(--radius-pill); display: flex; align-items: center; justify-content: center;
      border: 3px solid var(--border-subtle, var(--border-subtle)); transition: all 600ms;
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      box-shadow: var(--glass-icon-shadow);
    }
    .btc-circle.broken { border-color: var(--success, var(--success)); border-style: dashed; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    .btc-icon { font-size: var(--font-size-3xl); }
    .btc-failures { display: flex; flex-direction: column; gap: 4px; width: 100%; }
    .btc-fail {
      display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--radius-sm, 8px);
      background: rgba(254,242,242,0.6); font-size: var(--font-size-xs); color: #991b1b;
      border: 1px solid rgba(254,202,202,0.4);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }
    .btc-fail-icon { font-weight: 900; }
    .btc-fail-text { flex: 1; }
    .btc-shift {
      font-size: var(--font-size-sm); font-weight: var(--font-black, 800); color: #166534; text-align: center; margin: 0; padding: 10px;
      background: rgba(220,252,231,0.6); border-radius: var(--radius-sm, 8px); width: 100%;
      border: 1px solid rgba(34,197,94,0.18);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }
    .btc-insight { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading); text-align: center; margin: 0; }
  `],
})
export class BreakingTheCycleWidget implements OnInit {
  isBroken = false;
  failures: string[] = [];
  shift = '';
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<BreakingTheCycleResponse>('/widgets/breaking-the-cycle').subscribe({
      next: (d) => { this.isBroken = d.isBroken ?? false; this.failures = d.failures ?? []; this.shift = d.shift ?? ''; this.insight = d.insight ?? ''; },
      error: () => {
        this.failures = [
          this.i18n.translate('widgets.breakingTheCycle.failure1'),
          this.i18n.translate('widgets.breakingTheCycle.failure2'),
          this.i18n.translate('widgets.breakingTheCycle.failure3'),
        ];
        this.shift = this.i18n.translate('widgets.breakingTheCycle.shift');
        this.insight = this.i18n.translate('widgets.breakingTheCycle.fallbackInsight');
      },
    });
  }

}
