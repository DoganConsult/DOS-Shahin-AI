import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ObligationMapComponent — compliance signature widget for `/compliance/obligations`.
 *
 * Spec ref: §32.3, §35.3. Renders obligations grouped by framework with
 * due-date heat coloring (overdue / due-soon / on-track) and a count badge
 * per group. Click → opens the obligation detail (host emits route via output).
 */

export interface ObligationItem {
  obligationId: string;
  obligationRef: string;
  title: string;
  frameworkCode: string;
  dueDate?: string; // ISO
  status: 'open' | 'in-progress' | 'met' | 'overdue';
  daysUntilDue?: number;
}

export interface ObligationGroup {
  frameworkCode: string;
  frameworkName: string;
  obligations: ObligationItem[];
}

@Component({
  selector: 'compliance-obligation-map',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="om" aria-label="Obligation Map">
      <header class="om__head">
        <h3 class="om__title">{{ titleKey }}</h3>
      </header>
      <div *ngFor="let g of groups" class="om__group">
        <div class="om__group-head">
          <strong>{{ g.frameworkCode }}</strong>
          <small>{{ g.frameworkName }} · {{ g.obligations.length }} obligations</small>
        </div>
        <ul class="om__list">
          <li
            *ngFor="let o of g.obligations; trackBy: trackO"
            class="om__item"
            [attr.data-status]="o.status"
            (click)="obligationClick.emit(o)"
          >
            <span class="om__ref">{{ o.obligationRef }}</span>
            <span class="om__title-text">{{ o.title }}</span>
            <span class="om__due" *ngIf="o.dueDate">{{ o.dueDate }}</span>
          </li>
        </ul>
      </div>
      <p *ngIf="groups.length === 0" class="om__empty">{{ emptyKey || 'No obligations registered.' }}</p>
    </section>
  `,
  styles: [`
    .om { background: var(--cds-layer-01, #f4f4f4); border-radius: 8px; padding: var(--cds-spacing-05, 0.75rem); }
    .om__head { margin-bottom: 0.5rem; }
    .om__title { margin: 0; font-size: 1rem; font-weight: 600; }
    .om__group { margin-bottom: 0.75rem; }
    .om__group-head { display: flex; gap: 0.5rem; align-items: baseline; padding: 0.25rem 0; border-bottom: 1px solid var(--cds-border-subtle-01, #e0e0e0); }
    .om__group-head strong { font-size: 0.875rem; }
    .om__group-head small { color: var(--cds-text-secondary, #525252); font-size: 0.75rem; }
    .om__list { list-style: none; padding: 0; margin: 0; }
    .om__item { display: grid; grid-template-columns: 100px 1fr 100px; gap: 0.5rem; padding: 0.375rem 0.5rem; cursor: pointer; align-items: center; }
    .om__item:hover { background: var(--cds-layer-hover-01, #e8e8e8); }
    .om__item[data-status="overdue"] { border-left: 3px solid var(--cds-support-error, #da1e28); }
    .om__item[data-status="met"] { opacity: 0.7; }
    .om__ref { font-family: monospace; font-size: 0.75rem; color: var(--cds-text-secondary, #525252); }
    .om__title-text { font-size: 0.875rem; }
    .om__due { font-size: 0.75rem; font-variant-numeric: tabular-nums; color: var(--cds-text-secondary, #525252); }
    .om__empty { color: var(--cds-text-secondary, #525252); font-style: italic; }
  `],
})
export class ObligationMapComponent {
  @Input() titleKey = 'Obligation Map';
  @Input() emptyKey?: string;
  @Input() groups: ObligationGroup[] = [];

  @Output() obligationClick = new EventEmitter<ObligationItem>();

  trackO = (_: number, o: ObligationItem) => o.obligationId;
}
