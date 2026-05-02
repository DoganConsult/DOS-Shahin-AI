import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ControlLibraryMatrixComponent — compliance signature widget for `/compliance/controls`.
 *
 * Spec ref: §32.3 Compliance domain widgets, §35.3 signatureWidgets.
 * Renders the control library as a matrix of frameworks × control families
 * with implementation status. Cells are coloured per status; click → drills
 * into the control 360 page (host wires the route via output).
 *
 * Pure presentation component. Data is supplied by the page-level service via
 * `@Input() rows`. No SQL, no role logic — §3.4.
 */

export interface ControlMatrixCell {
  controlId: string;
  controlCode: string;
  status: 'implemented' | 'partial' | 'not-implemented' | 'not-applicable' | 'unknown';
  effectivenessScore?: number; // 0..100
}

export interface ControlMatrixRow {
  frameworkCode: string;
  frameworkName: string;
  cells: ControlMatrixCell[];
}

@Component({
  selector: 'compliance-control-library-matrix',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ccm" aria-label="Control Library Matrix">
      <header class="ccm__head">
        <h3 class="ccm__title">{{ titleKey }}</h3>
        <span class="ccm__count">{{ totalCells() }} controls · {{ rows.length }} frameworks</span>
      </header>
      <div class="ccm__legend">
        <span class="ccm__chip" data-status="implemented">Implemented</span>
        <span class="ccm__chip" data-status="partial">Partial</span>
        <span class="ccm__chip" data-status="not-implemented">Missing</span>
        <span class="ccm__chip" data-status="not-applicable">N/A</span>
      </div>
      <div class="ccm__grid">
        <div *ngFor="let row of rows" class="ccm__row">
          <div class="ccm__row-head">
            <strong>{{ row.frameworkCode }}</strong>
            <small>{{ row.frameworkName }}</small>
          </div>
          <div class="ccm__cells">
            <button
              *ngFor="let c of row.cells; trackBy: trackCell"
              type="button"
              class="ccm__cell"
              [attr.data-status]="c.status"
              [attr.title]="c.controlCode + ' · ' + c.status"
              (click)="cellClick.emit(c)"
            >{{ c.controlCode }}</button>
          </div>
        </div>
        <p *ngIf="rows.length === 0" class="ccm__empty">{{ emptyKey || 'No controls in the library yet.' }}</p>
      </div>
    </section>
  `,
  styles: [`
    .ccm { background: var(--cds-layer-01, #f4f4f4); border-radius: 8px; padding: var(--cds-spacing-05, 0.75rem); }
    .ccm__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .ccm__title { margin: 0; font-size: 1rem; font-weight: 600; }
    .ccm__count { font-size: 0.75rem; color: var(--cds-text-secondary, #525252); }
    .ccm__legend { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
    .ccm__chip { font-size: 0.625rem; padding: 0.125rem 0.5rem; border-radius: 999px; text-transform: uppercase; }
    .ccm__chip[data-status="implemented"]     { background: var(--cds-support-success-inverse, #defbe6); color: #0e6027; }
    .ccm__chip[data-status="partial"]         { background: var(--cds-support-warning-inverse, #fdf6dd); color: #8a6116; }
    .ccm__chip[data-status="not-implemented"] { background: var(--cds-support-error-inverse, #fff1f1); color: #a51a23; }
    .ccm__chip[data-status="not-applicable"]  { background: var(--cds-layer-02, #fff); color: #525252; }
    .ccm__row { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: flex-start; }
    .ccm__row-head { min-width: 120px; }
    .ccm__row-head strong { display: block; font-size: 0.875rem; }
    .ccm__row-head small { color: var(--cds-text-secondary, #525252); font-size: 0.75rem; }
    .ccm__cells { display: flex; flex-wrap: wrap; gap: 0.25rem; flex: 1; }
    .ccm__cell { font-size: 0.625rem; padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--cds-border-subtle-01, #e0e0e0); cursor: pointer; }
    .ccm__cell[data-status="implemented"]     { background: #defbe6; border-color: #aff0c5; }
    .ccm__cell[data-status="partial"]         { background: #fdf6dd; border-color: #f1d97a; }
    .ccm__cell[data-status="not-implemented"] { background: #fff1f1; border-color: #ffb3b8; }
    .ccm__cell[data-status="not-applicable"]  { background: #fff; }
    .ccm__cell[data-status="unknown"]         { background: var(--cds-layer-02, #fff); }
    .ccm__empty { color: var(--cds-text-secondary, #525252); font-style: italic; }
  `],
})
export class ControlLibraryMatrixComponent {
  @Input() titleKey = 'Control Library Matrix';
  @Input() emptyKey?: string;
  @Input() rows: ControlMatrixRow[] = [];

  @Output() cellClick = new EventEmitter<ControlMatrixCell>();

  private readonly _rows = signal<ControlMatrixRow[]>([]);
  totalCells = computed(() => this.rows.reduce((sum, r) => sum + r.cells.length, 0));

  trackCell = (_: number, c: ControlMatrixCell) => c.controlId;
}
