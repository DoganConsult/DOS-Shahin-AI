import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * EvidenceBinderComponent — compliance signature widget for `/compliance/evidence`.
 *
 * Spec ref: §16 Evidence Fabric, §32.3, §35.3. Renders the evidence binder
 * as a list with freshness indicators (valid / expiring / expired). Click →
 * opens `dos-side-drawer` with full evidence detail (host wires).
 */

export interface EvidenceItem {
  evidenceId: string;
  title: string;
  controlCode?: string;
  source?: string;
  collectedAt?: string;
  validUntil?: string | null;
  status: 'approved' | 'pending-review' | 'expired' | 'submitted' | 'rejected';
  freshness: 'fresh' | 'expiring-soon' | 'expired' | 'not-applicable';
}

@Component({
  selector: 'compliance-evidence-binder',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="eb" aria-label="Evidence Binder">
      <header class="eb__head">
        <h3 class="eb__title">{{ titleKey }}</h3>
        <span class="eb__count">{{ items.length }} items</span>
      </header>
      <ul class="eb__list">
        <li
          *ngFor="let e of items; trackBy: trackE"
          class="eb__item"
          [attr.data-status]="e.status"
          [attr.data-freshness]="e.freshness"
          (click)="evidenceClick.emit(e)"
        >
          <span class="eb__title-text">{{ e.title }}</span>
          <span *ngIf="e.controlCode" class="eb__control">{{ e.controlCode }}</span>
          <span *ngIf="e.collectedAt" class="eb__collected">Collected {{ e.collectedAt }}</span>
          <span *ngIf="e.validUntil" class="eb__valid">Valid until {{ e.validUntil }}</span>
          <span class="eb__freshness" [attr.data-freshness]="e.freshness">{{ e.freshness }}</span>
        </li>
      </ul>
      <p *ngIf="items.length === 0" class="eb__empty">{{ emptyKey || 'No evidence collected yet.' }}</p>
    </section>
  `,
  styles: [`
    .eb { background: var(--cds-layer-01, #f4f4f4); border-radius: 8px; padding: var(--cds-spacing-05, 0.75rem); }
    .eb__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .eb__title { margin: 0; font-size: 1rem; font-weight: 600; }
    .eb__count { font-size: 0.75rem; color: var(--cds-text-secondary, #525252); }
    .eb__list { list-style: none; padding: 0; margin: 0; }
    .eb__item { display: grid; grid-template-columns: 1fr auto auto auto auto; gap: 0.5rem; padding: 0.5rem 0.75rem; align-items: center; cursor: pointer; border-bottom: 1px solid var(--cds-border-subtle-01, #e0e0e0); }
    .eb__item:hover { background: var(--cds-layer-hover-01, #e8e8e8); }
    .eb__item[data-status="approved"] { border-left: 3px solid var(--cds-support-success, #24a148); }
    .eb__item[data-status="expired"]  { border-left: 3px solid var(--cds-support-error, #da1e28); }
    .eb__title-text { font-size: 0.875rem; font-weight: 500; }
    .eb__control { font-family: monospace; font-size: 0.75rem; }
    .eb__collected, .eb__valid { font-size: 0.75rem; color: var(--cds-text-secondary, #525252); }
    .eb__freshness { font-size: 0.625rem; padding: 0.125rem 0.5rem; border-radius: 999px; text-transform: uppercase; }
    .eb__freshness[data-freshness="fresh"]         { background: var(--cds-support-success-inverse, #defbe6); color: #0e6027; }
    .eb__freshness[data-freshness="expiring-soon"] { background: var(--cds-support-warning-inverse, #fdf6dd); color: #8a6116; }
    .eb__freshness[data-freshness="expired"]       { background: var(--cds-support-error-inverse, #fff1f1); color: #a51a23; }
    .eb__empty { color: var(--cds-text-secondary, #525252); font-style: italic; }
  `],
})
export class EvidenceBinderComponent {
  @Input() titleKey = 'Evidence Binder';
  @Input() emptyKey?: string;
  @Input() items: EvidenceItem[] = [];

  @Output() evidenceClick = new EventEmitter<EvidenceItem>();

  trackE = (_: number, e: EvidenceItem) => e.evidenceId;
}
