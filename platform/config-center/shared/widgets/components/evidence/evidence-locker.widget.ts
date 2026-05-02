import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';

interface EvidenceLockerItem {
  content_hash?: string;
  title?: string;
}

interface EvidenceLockerResponse {
  evidence?: EvidenceLockerItem[];
}

interface EvidenceChainResponse {
  intact?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-evidence-locker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="locker">
      <div class="locker-stat">
        <span class="big-num">{{ count }}</span>
        <span class="lbl">{{ i18n.translate('audit.evidence') }}</span>
      </div>
      <div class="chain-status" [class.intact]="chainIntact" [class.broken]="chainIntact === false">
        {{ chainIntact === null ? '...' : chainIntact ? '🔗 Chain Intact' : '⚠️ Chain Broken' }}
      </div>
      <div class="recent-evidence">
        <div *ngFor="let e of recent" class="ev-item">
          <code>{{ e.content_hash?.slice(0, 12) }}...</code>
          <span>{{ e.title }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .locker { text-align: center; }
    .locker-stat { margin-bottom: 8px; }
    .big-num { font-size: var(--font-size-4xl); font-weight: var(--font-black, 800); display: block; color: var(--text-heading); letter-spacing: -0.02em; }
    .lbl { font-size: var(--font-size-sm); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
    .chain-status {
      padding: 8px 14px; border-radius: var(--radius-sm, 8px); font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 12px;
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .chain-status.intact { background: rgba(220,252,231,0.6); color: #166534; border-color: rgba(34,197,94,0.18); }
    .chain-status.broken { background: rgba(254,242,242,0.6); color: #991b1b; border-color: rgba(239,68,68,0.18); }
    .recent-evidence { text-align: start; }
    .ev-item {
      display: flex; gap: 8px; align-items: center; padding: 6px 8px; font-size: var(--font-size-sm); margin-bottom: 4px;
      border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.03));
      border: 1px solid var(--border-subtle, var(--border-subtle));
    }
    code {
      background: var(--glass-icon-bg, rgba(14,165,233,0.08)); padding: 2px 6px;
      border-radius: var(--radius-xs); font-size: var(--font-size-xs); border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.12));
    }
  `],
})
export class EvidenceLockerWidget implements OnInit {
  count = 0; chainIntact: boolean | null = null; recent: EvidenceLockerItem[] = [];

  constructor(public i18n: I18nService, private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void {
    this.complianceSvc.getEvidence().subscribe({
      next: (r: EvidenceLockerResponse) => {
        const list = r.evidence ?? [];
        this.count = list.length;
        this.recent = list.slice(0, 4);
      },
      error: (e: unknown) => devError("[API]", e)
    });
    this.complianceSvc.verifyHashChain().subscribe({
      next: (r: EvidenceChainResponse) => this.chainIntact = r.intact ?? true,
      error: () => this.chainIntact = null
    });
  }

}
