import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * DosTrustLayer — the §19.1 AI Trust Layer primitive.
 *
 * Every AI output (recommendation, summary, draft, copilot reply) MUST
 * be wrapped in this component or render its fields manually. Without
 * a Trust Layer the §21 #21 acceptance gate fails.
 *
 * Surface contract:
 *   • source            — agentId or pipeline name
 *   • confidence        — 0–1 (rendered as % + tone)
 *   • reasoningSummary  — one-sentence rationale (i18n-resolved)
 *   • dataUsed          — list of dataResource keys (chips)
 *   • lastUpdated       — ISO timestamp (relative-time formatted)
 *   • permissionScope   — e.g. 'tenant', 'self', 'org_scope'
 *   • riskLevel         — low/medium/high/critical (drives tone)
 *   • humanApprovalRequired — boolean (renders required badge)
 *
 * Rendered as a compact footer strip below the AI output. In Arabic the
 * confidence % uses tabular figures and the chips flow in RTL.
 */
@Component({
  selector: 'dos-trust-layer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer
      class="dos-trust"
      [attr.data-risk]="riskLevel"
      [attr.aria-label]="ariaLabel"
    >
      <div class="dos-trust__row">
        <span class="dos-trust__chip dos-trust__chip--source" *ngIf="source">
          <span class="dos-trust__chip-label">{{ sourceLabel }}</span>
          <strong>{{ source }}</strong>
        </span>
        <span class="dos-trust__chip dos-trust__chip--confidence dos-numeric" *ngIf="confidence != null">
          <span class="dos-trust__chip-label">{{ confidenceLabel }}</span>
          <strong>{{ (confidence * 100) | number:'1.0-0' }}%</strong>
        </span>
        <span class="dos-trust__chip dos-trust__chip--risk" [attr.data-risk]="riskLevel">
          <span class="dos-trust__chip-label">{{ riskLabel }}</span>
          <strong>{{ riskLevel }}</strong>
        </span>
        <span class="dos-trust__chip dos-trust__chip--scope" *ngIf="permissionScope">
          <span class="dos-trust__chip-label">{{ scopeLabel }}</span>
          <strong>{{ permissionScope }}</strong>
        </span>
        <span class="dos-trust__chip dos-trust__chip--updated" *ngIf="lastUpdated">
          <span class="dos-trust__chip-label">{{ updatedLabel }}</span>
          <strong>{{ relativeTime(lastUpdated) }}</strong>
        </span>
        <span class="dos-trust__badge" *ngIf="humanApprovalRequired" role="note">
          {{ approvalLabel }}
        </span>
      </div>
      <p class="dos-trust__reason" *ngIf="reasoningSummary">{{ reasoningSummary }}</p>
      <ul class="dos-trust__data" *ngIf="dataUsed && dataUsed.length > 0" role="list">
        <li *ngFor="let key of dataUsed" class="dos-trust__data-chip">
          <code>{{ key }}</code>
        </li>
      </ul>
    </footer>
  `,
  styles: [`
    .dos-trust {
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-2);
      padding: var(--dos-space-2) var(--dos-space-3);
      margin-top: var(--dos-space-2);
      background: var(--dos-color-surface-muted);
      border-top: 1px dashed var(--dos-color-border-subtle);
      border-radius: 0 0 var(--dos-radius-md) var(--dos-radius-md);
      font-size: var(--dos-caption-size);
      color: var(--dos-color-text-muted);
    }
    .dos-trust__row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--dos-space-2);
      align-items: center;
    }
    .dos-trust__chip {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
      padding: 2px 8px;
      border-radius: var(--dos-radius-pill);
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border-subtle);
      white-space: nowrap;
      font-size: var(--dos-caption-size);
    }
    .dos-trust__chip-label {
      color: var(--dos-color-text-subtle);
      letter-spacing: 0.04em;
      font-size: 0.625rem;
      text-transform: uppercase;
    }
    [dir='rtl'] .dos-trust__chip-label { letter-spacing: 0; text-transform: none; }
    .dos-trust__chip strong { color: var(--dos-color-text-strong); font-weight: 600; }

    /* Risk-aware tone (drives the risk chip color) */
    .dos-trust__chip--risk[data-risk='low']      { background: var(--dos-color-success-soft); color: var(--dos-color-success-text); border-color: transparent; }
    .dos-trust__chip--risk[data-risk='medium']   { background: var(--dos-color-warning-soft); color: var(--dos-color-warning-text); border-color: transparent; }
    .dos-trust__chip--risk[data-risk='high']     { background: var(--dos-color-danger-soft);  color: var(--dos-color-danger-text);  border-color: transparent; }
    .dos-trust__chip--risk[data-risk='critical'] { background: var(--dos-color-danger);       color: var(--dos-color-text-inverse); border-color: transparent; }

    .dos-trust__badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--dos-radius-pill);
      background: var(--dos-color-warning);
      color: var(--dos-color-text-inverse);
      font-weight: 600;
      font-size: var(--dos-caption-size);
    }

    .dos-trust__reason {
      margin: 0;
      color: var(--dos-color-text);
      font-size: var(--dos-caption-size);
      line-height: var(--dos-caption-line);
    }

    .dos-trust__data {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .dos-trust__data-chip code {
      font: 600 0.6875rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
      padding: 2px 6px;
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border-subtle);
      border-radius: var(--dos-radius-sm);
      color: var(--dos-color-text-muted);
    }
  `],
})
export class DosTrustLayerComponent {
  @Input() source?: string;
  @Input() confidence?: number;       // 0–1
  @Input() reasoningSummary?: string;
  @Input() dataUsed: string[] = [];
  @Input() lastUpdated?: string;       // ISO timestamp
  @Input() permissionScope?: string;
  @Input() riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  @Input() humanApprovalRequired = false;

  // Labels are passed in (not hardcoded) so consumers can resolve via i18n.
  @Input() sourceLabel    = 'source';
  @Input() confidenceLabel = 'confidence';
  @Input() riskLabel      = 'risk';
  @Input() scopeLabel     = 'scope';
  @Input() updatedLabel   = 'updated';
  @Input() approvalLabel  = 'approval required';
  @Input() ariaLabel      = 'AI Trust Layer';

  relativeTime(iso: string): string {
    const t = Date.parse(iso);
    if (!t) return iso;
    const sec = Math.round((Date.now() - t) / 1000);
    if (sec < 60) return 'now';
    if (sec < 3600) return `${Math.round(sec / 60)}m`;
    if (sec < 86400) return `${Math.round(sec / 3600)}h`;
    return `${Math.round(sec / 86400)}d`;
  }
}
