import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface OneSentenceTruthResponse {
  sentence?: string;
  insight?: string;
  severity?: 'info' | 'warning' | 'critical';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-one-sentence-truth',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="truth" [class.info]="severity === 'info'" [class.warning]="severity === 'warning'" [class.critical]="severity === 'critical'">
      <p class="truth-text">{{ sentence }}</p>
    </div>
  `,
  styles: [`
    .truth {
      padding: 18px; border-radius: var(--radius, 12px); text-align: center; transition: all 300ms;
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.20);
    }
    .truth.info { background: rgba(240,249,255,0.7); border: 1px solid rgba(186,230,253,0.5); }
    .truth.warning { background: rgba(255,251,235,0.7); border: 1px solid rgba(253,230,138,0.5); }
    .truth.critical { background: rgba(254,242,242,0.7); border: 1px solid rgba(254,202,202,0.5); }
    .truth-text { font-size: var(--font-size-base); font-weight: var(--font-black, 800); line-height: 1.6; margin: 0; color: var(--text-heading, var(--text-heading)); }
  `],
})
export class OneSentenceTruthWidget implements OnInit {
  sentence = '';
  severity: 'info' | 'warning' | 'critical' = 'info';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<OneSentenceTruthResponse>('/widgets/one-sentence-truth').subscribe({
      next: (d) => { this.sentence = d.sentence ?? d.insight ?? ''; this.severity = d.severity ?? 'warning'; },
      error: () => {
        this.severity = 'warning';
        this.sentence = this.i18n.translate('widgets.oneSentenceTruth.fallbackSentence');
      },
    });
  }
}
