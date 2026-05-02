import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface UntestedAssumptionItem {
  assumption: string;
  tested: boolean;
}

interface UntestedAssumptionsResponse {
  items?: UntestedAssumptionItem[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-untested-assumptions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="assumptions">
      <div *ngFor="let a of items" class="ua-row" [class.untested]="!a.tested">
        <span class="ua-icon">{{ a.tested ? '✅' : '❓' }}</span>
        <span class="ua-text">{{ a.assumption }}</span>
      </div>
      <p class="ua-insight" *ngIf="insight">{{ insight }}</p>
      <p *ngIf="items.length === 0" class="ua-empty">{{ i18n.translate('widgets.untestedAssumptions.empty') }}</p>
    </div>
  `,
  styles: [`
    .assumptions { display: flex; flex-direction: column; gap: 6px; }
    .ua-row {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04)); font-size: var(--font-size-sm);
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.08));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .ua-row.untested { background: rgba(255,247,237,0.6); border-color: rgba(254,215,170,0.5); }
    .ua-icon { font-size: var(--font-size-base); }
    .ua-text { flex: 1; color: var(--text-body); }
    .ua-insight { font-size: var(--font-size-sm); font-weight: 600; color: #c2410c; text-align: center; margin: 4px 0 0; }
    .ua-empty { font-size: var(--font-size-sm); color: var(--text-muted); text-align: center; margin: 0; }
  `],
})
export class UntestedAssumptionsWidget implements OnInit {
  items: UntestedAssumptionItem[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<UntestedAssumptionsResponse>('/widgets/untested-assumptions').subscribe({
      next: (d) => { this.items = (d.items ?? []).slice(0, 5); this.insight = d.insight ?? ''; },
      error: () => { this.insight = this.i18n.translate('widgets.untestedAssumptions.fallbackInsight'); },
    });
  }

}
