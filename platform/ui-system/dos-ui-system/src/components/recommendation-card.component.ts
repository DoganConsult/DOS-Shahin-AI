import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosTrustLayerComponent } from './trust-layer.component';

/**
 * DosRecommendationCard — §26.6 Recommendation Card.
 *
 * Renders an AI/agent finding with the §19.1 Trust Layer baked in.
 * Severity drives the left-rail tone (low=green, medium=amber,
 * high=orange/red, critical=red+strong).
 *
 * Inputs map 1:1 to ResolvedAiTip + AiTrustLayer from @dos/ui-contracts.
 *
 * Outputs:
 *   primary    — emitted when the user clicks the primary CTA
 *   approve    — emitted on Approve (default action when approvable)
 *   dismiss    — emitted when user dismisses
 *   createTask — emitted when user wants to convert to a task
 *
 * Renders confidence + risk + source as inline chips; expanding the
 * trust drawer shows the full §19.1 block.
 */
@Component({
  selector: 'dos-recommendation-card',
  standalone: true,
  imports: [CommonModule, DosTrustLayerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="dos-rec" [attr.data-risk]="riskLevel">
      <span class="dos-rec__rail" aria-hidden="true"></span>
      <header class="dos-rec__head">
        <span class="dos-rec__icon" aria-hidden="true">{{ icon || '✦' }}</span>
        <div class="dos-rec__title-block">
          <strong class="dos-rec__title">{{ title }}</strong>
          @if (whyVisible) {
            <span class="dos-rec__why" [title]="whyVisible">
              <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
                <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <path d="M8 11.5v.01M6.5 6.5a1.5 1.5 0 1 1 2.4 1.2c-.5.4-.9.7-.9 1.3v.5" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              </svg>
              {{ whyLabel }}
            </span>
          }
        </div>
      </header>

      <p class="dos-rec__body">{{ body }}</p>

      <footer class="dos-rec__cta">
        @if (ctaLabel && ctaRoute) {
          <button
            type="button"
            class="dos-rec__btn dos-rec__btn--primary"
            (click)="primary.emit()"
          >{{ ctaLabel }} →</button>
        }
        @if (showApprove) {
          <button
            type="button"
            class="dos-rec__btn dos-rec__btn--ghost"
            (click)="approve.emit()"
          >{{ approveLabel }}</button>
        }
        @if (showDismiss) {
          <button
            type="button"
            class="dos-rec__btn dos-rec__btn--ghost"
            (click)="dismiss.emit()"
          >{{ dismissLabel }}</button>
        }
      </footer>

      <dos-trust-layer
        *ngIf="trustSource || trustConfidence != null || trustReasoning"
        [source]="trustSource"
        [confidence]="trustConfidence"
        [reasoningSummary]="trustReasoning"
        [dataUsed]="trustDataUsed"
        [lastUpdated]="trustLastUpdated"
        [permissionScope]="trustPermissionScope"
        [riskLevel]="riskLevel"
        [humanApprovalRequired]="trustHumanApprovalRequired"
        [sourceLabel]="trustLabels.source"
        [confidenceLabel]="trustLabels.confidence"
        [riskLabel]="trustLabels.risk"
        [scopeLabel]="trustLabels.scope"
        [updatedLabel]="trustLabels.updated"
        [approvalLabel]="trustLabels.approval"
      ></dos-trust-layer>
    </article>
  `,
  styles: [`
    .dos-rec {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-2);
      padding: var(--dos-space-3) var(--dos-space-4) 0;
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border-subtle);
      border-radius: var(--dos-radius-card);
      box-shadow: var(--dos-shadow-xs);
      overflow: hidden;
      transition:
        transform var(--dos-duration-fast) var(--dos-ease-out),
        box-shadow var(--dos-duration-normal) var(--dos-ease-emphasized);
    }
    .dos-rec:hover { transform: translateY(-1px); box-shadow: var(--dos-shadow-sm); }
    .dos-rec__rail {
      position: absolute;
      inset: 0 auto 0 0;
      width: 3px;
      background: var(--dos-color-success);
    }
    [dir='rtl'] .dos-rec__rail { inset: 0 0 0 auto; }
    .dos-rec[data-risk='low']      .dos-rec__rail { background: var(--dos-color-success); }
    .dos-rec[data-risk='medium']   .dos-rec__rail { background: var(--dos-color-warning); }
    .dos-rec[data-risk='high']     .dos-rec__rail { background: var(--dos-color-danger); }
    .dos-rec[data-risk='critical'] .dos-rec__rail { background: var(--dos-color-danger-strong); }

    .dos-rec__head {
      display: flex;
      align-items: flex-start;
      gap: var(--dos-space-2);
    }
    .dos-rec__icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--dos-gradient-signature);
      color: var(--dos-color-text-inverse);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font: 700 var(--dos-font-size-sm)/1 inherit;
      flex-shrink: 0;
    }
    .dos-rec__title-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1 1 auto;
      min-width: 0;
    }
    .dos-rec__title {
      font-size: var(--dos-font-size-md);
      font-weight: 500;
      color: var(--dos-color-text-strong);
    }
    .dos-rec__why {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: var(--dos-caption-size);
      color: var(--dos-color-text-subtle);
      cursor: help;
    }

    .dos-rec__body {
      margin: 0;
      font-size: var(--dos-caption-size);
      line-height: var(--dos-caption-line);
      color: var(--dos-color-text-muted);
    }

    .dos-rec__cta {
      display: flex;
      gap: var(--dos-space-2);
      align-items: center;
      flex-wrap: wrap;
      padding-bottom: var(--dos-space-2);
    }
    .dos-rec__btn {
      appearance: none;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: var(--dos-radius-pill);
      font: 600 var(--dos-caption-size)/1 inherit;
      transition: background var(--dos-duration-fast) var(--dos-ease-out);
    }
    .dos-rec__btn--primary {
      background: var(--dos-color-primary);
      color: var(--dos-color-text-inverse);
      border: 1px solid var(--dos-color-primary);
    }
    .dos-rec__btn--primary:hover { background: var(--dos-color-primary-hover); }
    .dos-rec__btn--ghost {
      background: transparent;
      color: var(--dos-color-text-muted);
      border: 1px solid var(--dos-color-border-subtle);
    }
    .dos-rec__btn--ghost:hover {
      background: var(--dos-color-surface-muted);
      color: var(--dos-color-text);
    }
  `],
})
export class DosRecommendationCardComponent {
  @Input() title = '';
  @Input() body = '';
  @Input() icon?: string;
  @Input() ctaLabel?: string;
  @Input() ctaRoute?: string;
  @Input() riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  @Input() showApprove = false;
  @Input() showDismiss = false;
  @Input() approveLabel = 'Approve';
  @Input() dismissLabel = 'Dismiss';

  // §15.1 — "why am I seeing this"
  @Input() whyVisible?: string;
  @Input() whyLabel = 'why?';

  // §19.1 trust layer fields
  @Input() trustSource?: string;
  @Input() trustConfidence?: number;
  @Input() trustReasoning?: string;
  @Input() trustDataUsed: string[] = [];
  @Input() trustLastUpdated?: string;
  @Input() trustPermissionScope?: string;
  @Input() trustHumanApprovalRequired = false;
  @Input() trustLabels: {
    source: string; confidence: string; risk: string; scope: string;
    updated: string; approval: string;
  } = { source: 'source', confidence: 'confidence', risk: 'risk', scope: 'scope', updated: 'updated', approval: 'approval required' };

  @Output() primary    = new EventEmitter<void>();
  @Output() approve    = new EventEmitter<void>();
  @Output() dismiss    = new EventEmitter<void>();
  @Output() createTask = new EventEmitter<void>();
}
