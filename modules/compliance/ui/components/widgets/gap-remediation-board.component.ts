import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * GapRemediationBoardComponent — compliance signature widget for `/compliance/gaps`.
 *
 * Spec ref: §32.3, §35.3. Kanban-style board grouping gaps by lifecycle
 * (open / assigned / in-progress / under-review / closed). Severity drives
 * card tone. Click → opens gap detail; drag → state change (host enforces
 * permission + workflow validity per §14.2).
 */

export interface GapCard {
  gapId: string;
  controlCode: string;
  title?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  ownerId?: string;
  daysOpen: number;
  dueDate?: string;
}

export interface GapColumn {
  status: 'open' | 'assigned' | 'in-progress' | 'under-review' | 'closed';
  labelKey: string;
  cards: GapCard[];
}

@Component({
  selector: 'compliance-gap-remediation-board',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="gb" aria-label="Gap Remediation Board">
      <header class="gb__head">
        <h3 class="gb__title">{{ titleKey }}</h3>
      </header>
      <div class="gb__cols">
        <div *ngFor="let col of columns" class="gb__col">
          <div class="gb__col-head">
            <strong>{{ col.labelKey }}</strong>
            <span class="gb__col-count">{{ col.cards.length }}</span>
          </div>
          <ul class="gb__list">
            <li
              *ngFor="let c of col.cards; trackBy: trackC"
              class="gb__card"
              [attr.data-severity]="c.severity"
              (click)="gapClick.emit(c)"
            >
              <span class="gb__control">{{ c.controlCode }}</span>
              <span class="gb__title-text" *ngIf="c.title">{{ c.title }}</span>
              <small class="gb__age">{{ c.daysOpen }} days open</small>
              <span class="gb__sev" [attr.data-severity]="c.severity">{{ c.severity }}</span>
            </li>
            <p *ngIf="col.cards.length === 0" class="gb__col-empty">No gaps</p>
          </ul>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .gb { background: var(--cds-layer-01, #f4f4f4); border-radius: 8px; padding: var(--cds-spacing-05, 0.75rem); }
    .gb__title { margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 600; }
    .gb__cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.5rem; }
    .gb__col { background: var(--cds-layer-02, #fff); border-radius: 6px; padding: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .gb__col-head { display: flex; justify-content: space-between; padding-bottom: 0.25rem; border-bottom: 1px solid var(--cds-border-subtle-01, #e0e0e0); }
    .gb__col-count { font-size: 0.75rem; color: var(--cds-text-secondary, #525252); }
    .gb__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.375rem; }
    .gb__card { background: var(--cds-layer-01, #f4f4f4); border-radius: 4px; padding: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem; cursor: pointer; border-left: 3px solid var(--cds-border-subtle-01, #e0e0e0); }
    .gb__card:hover { background: var(--cds-layer-hover-01, #e8e8e8); }
    .gb__card[data-severity="critical"] { border-left-color: #6f0a17; }
    .gb__card[data-severity="high"]     { border-left-color: var(--cds-support-error, #da1e28); }
    .gb__card[data-severity="medium"]   { border-left-color: var(--cds-support-warning, #f1c21b); }
    .gb__card[data-severity="low"]      { border-left-color: var(--cds-support-success, #24a148); }
    .gb__control { font-family: monospace; font-size: 0.75rem; color: var(--cds-text-secondary, #525252); }
    .gb__title-text { font-size: 0.875rem; }
    .gb__age { font-size: 0.625rem; color: var(--cds-text-secondary, #525252); }
    .gb__sev { font-size: 0.625rem; padding: 0.125rem 0.375rem; border-radius: 999px; text-transform: uppercase; align-self: flex-start; }
    .gb__sev[data-severity="critical"] { background: #6f0a17; color: #fff; }
    .gb__sev[data-severity="high"]     { background: #fff1f1; color: #a51a23; }
    .gb__sev[data-severity="medium"]   { background: #fdf6dd; color: #8a6116; }
    .gb__sev[data-severity="low"]      { background: #defbe6; color: #0e6027; }
    .gb__col-empty { color: var(--cds-text-secondary, #525252); font-size: 0.75rem; font-style: italic; padding: 0.25rem; }
  `],
})
export class GapRemediationBoardComponent {
  @Input() titleKey = 'Gap Remediation Board';
  @Input() columns: GapColumn[] = [];

  @Output() gapClick = new EventEmitter<GapCard>();

  trackC = (_: number, c: GapCard) => c.gapId;
}
