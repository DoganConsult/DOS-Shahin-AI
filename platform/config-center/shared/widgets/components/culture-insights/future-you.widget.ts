import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface FutureYouResponse {
  narrative?: string;
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-future-you',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="future">
      <div class="future-bubble">
        <span class="future-icon">🔮</span>
        <p class="future-text">{{ narrative }}</p>
        <span class="future-label">{{ i18n.translate('widgets.futureYou.in12Months') }}</span>
      </div>
    </div>
  `,
  styles: [`
    .future { display: flex; justify-content: center; }
    .future-bubble {
      text-align: center; padding: 18px; border-radius: var(--radius-lg, 16px);
      background: linear-gradient(135deg, rgba(237,233,254,0.7), rgba(250,245,255,0.7));
      border: 1px solid rgba(221,214,254,0.5); max-width: 280px;
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.30), 0 4px 16px rgba(124,58,237,0.08);
    }
    .future-icon { font-size: var(--font-size-2xl); display: block; margin-bottom: 8px; }
    .future-text { font-size: var(--font-size-sm); font-weight: 700; line-height: 1.6; color: #4c1d95; margin: 0 0 8px; }
    .future-label {
      font-size: var(--font-size-xs); font-weight: 700; color: #7c3aed;
      background: rgba(237,233,254,0.7); padding: 3px 12px; border-radius: var(--radius-pill, 99px);
      border: 1px solid rgba(221,214,254,0.5); backdrop-filter: blur(4px);
    }
  `],
})
export class FutureYouWidget implements OnInit {
  narrative = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<FutureYouResponse>('/widgets/future-you').subscribe({
      next: (d) => { this.narrative = d.narrative ?? d.insight ?? ''; },
      error: () => {
        this.narrative = this.i18n.translate('widgets.futureYou.fallbackNarrative');
      },
    });
  }
}
