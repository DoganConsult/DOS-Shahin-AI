import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface RegulatorLensRow {
  control: string;
  status: string;
  isGap: boolean;
}

interface RegulatorLensResponse {
  internalView?: RegulatorLensRow[];
  regulatorView?: RegulatorLensRow[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-regulator-lens',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rl">
      <div class="rl-toggle">
        <button class="rl-btn" [class.active]="view === 'internal'" (click)="view = 'internal'">{{ i18n.translate('widgets.regulatorLens.internal') }}</button>
        <button class="rl-btn" [class.active]="view === 'regulator'" (click)="view = 'regulator'">{{ i18n.translate('widgets.regulatorLens.regulator') }}</button>
      </div>
      <div class="rl-body">
        <div *ngFor="let item of view === 'internal' ? internalView : regulatorView" class="rl-row" [class.gap]="item.isGap">
          <span class="rl-control">{{ item.control }}</span>
          <span class="rl-status">{{ item.status }}</span>
        </div>
      </div>
      <p class="rl-insight" *ngIf="insight && view === 'regulator'">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .rl { display: flex; flex-direction: column; gap: 8px; }
    .rl-toggle {
      display: flex; border-radius: var(--radius-sm, 8px); overflow: hidden;
      border: 1px solid var(--border-subtle, var(--border-subtle));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .rl-btn {
      flex: 1; padding: 8px; font-size: var(--font-size-xs); font-weight: 700; border: none; cursor: pointer;
      background: var(--glass-icon-bg, rgba(14,165,233,0.04)); color: var(--text-muted); transition: all 200ms;
    }
    .rl-btn.active { background: var(--text-heading, var(--text-heading)); color: var(--text-on-primary, #fff); }
    .rl-body { display: flex; flex-direction: column; gap: 4px; }
    .rl-row {
      display: flex; justify-content: space-between; padding: 8px 10px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04)); font-size: var(--font-size-xs);
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.08));
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }
    .rl-row.gap { background: rgba(254,242,242,0.5); border-color: rgba(254,202,202,0.4); }
    .rl-control { font-weight: 600; flex: 1; color: var(--text-body); }
    .rl-status { font-weight: 700; min-width: 60px; text-align: end; }
    .rl-insight { font-size: var(--font-size-sm); font-weight: 600; color: var(--error, var(--error)); text-align: center; margin: 0; }
  `],
})
export class RegulatorLensWidget implements OnInit {
  view: 'internal' | 'regulator' = 'internal';
  internalView: { control: string; status: string; isGap: boolean }[] = [];
  regulatorView: { control: string; status: string; isGap: boolean }[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<RegulatorLensResponse>('/widgets/regulator-lens').subscribe({
      next: (d) => {
        this.internalView = d.internalView ?? [];
        this.regulatorView = d.regulatorView ?? [];
        this.insight = d.insight ?? '';
      },
      error: () => { this.insight = this.i18n.translate('widgets.regulatorLens.fallbackInsight'); },
    });
  }

}
