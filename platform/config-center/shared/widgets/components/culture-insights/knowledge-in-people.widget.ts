import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface KnowledgeInPeoplePerson {
  name: string;
  controlsPct: number;
}

interface KnowledgeInPeopleResponse {
  concentration?: number;
  people?: KnowledgeInPeoplePerson[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-knowledge-in-people',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kip">
      <div class="kip-meter">
        <div class="kip-fill" [style.width.%]="concentration"></div>
      </div>
      <p class="kip-val">{{ concentration }}% {{ i18n.translate('widgets.knowledgeInPeople.knowledgeConcentration') }}</p>
      <div *ngFor="let p of people" class="kip-row">
        <span class="kip-name">{{ p.name }}</span>
        <span class="kip-pct">{{ p.controlsPct }}%</span>
      </div>
      <p class="kip-insight" *ngIf="insight">{{ insight }}</p>
    </div>
  `,
  styles: [`
    .kip { display: flex; flex-direction: column; gap: 8px; }
    .kip-meter {
      height: 12px; border-radius: var(--radius-sm); overflow: hidden;
      background: var(--glass-icon-bg, rgba(14,165,233,0.06));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.12));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .kip-fill { height: 100%; background: linear-gradient(90deg, var(--warning), var(--error)); border-radius: var(--radius-sm); transition: width 600ms; box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
    .kip-val { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-muted); text-align: center; margin: 0; }
    .kip-row {
      display: flex; justify-content: space-between; padding: 6px 10px; border-radius: var(--radius-sm, 8px);
      background: rgba(255,251,235,0.6); font-size: var(--font-size-sm);
      border: 1px solid rgba(254,240,138,0.4);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }
    .kip-name { font-weight: 600; color: var(--text-body); }
    .kip-pct { font-weight: var(--font-black, 800); color: var(--warning); }
    .kip-insight { font-size: var(--font-size-sm); font-weight: 600; color: #92400e; text-align: center; margin: 4px 0 0; }
  `],
})
export class KnowledgeInPeopleWidget implements OnInit {
  concentration = 0;
  people: KnowledgeInPeoplePerson[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<KnowledgeInPeopleResponse>('/widgets/knowledge-in-people').subscribe({
      next: (d) => { this.concentration = d.concentration ?? 0; this.people = (d.people ?? []).slice(0, 3); this.insight = d.insight ?? ''; },
      error: () => { this.concentration = 40; this.insight = this.i18n.translate('widgets.knowledgeInPeople.fallbackInsight'); },
    });
  }

}
