/**
 * Foundation — Diagnostics page.
 *
 * Surfaces foundation module health for operators:
 *   GET /api/foundation/health           (foundationHealthRouter)
 *   GET /api/health/foundation           (host-mounted health probe)
 *   GET /api/foundation/suggestions      (foundationSuggestionsRouter)
 *
 * Backing service: getFoundationDiagnostics() (interface/diagnostics).
 *
 * Permission: foundation.read.
 */
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'foundation-diagnostics-page',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="foundation-diagnostics"
      data-cds-component="grid"
      [attr.data-page-key]="pageKey"
    >
      <header data-cds-component="tile">
        <h1>Foundation Diagnostics</h1>
        <p>Module health, registry coverage, and runtime invariants.</p>
      </header>
      <div data-cds-component="data-table" data-resource="foundation.health"></div>
    </section>
  `,
})
export class FoundationDiagnosticsPage {
  @Input() pageKey = 'foundation.diagnostics.page';
  @Input() locale: 'en' | 'ar' = 'en';
}
