/**
 * Foundation — Segregation of Duties (SoD) configuration page.
 *
 * Backed by:
 *   GET  /api/foundation/sod/rules              (sodCheckRouter)
 *   POST /api/foundation/sod/rules              (sodCheckRouter)
 *   DELETE /api/foundation/sod/rules/:id
 *   POST /api/foundation/sod/check              (sodCheckRouter)
 *   GET  /api/foundation/sod/violations         (authoritySodRouter)
 *   POST /api/foundation/sod/violations/:id/resolve
 *
 * Tables: dos.foundation_sod_rules, dos.foundation_sod_violations.
 *
 * Permission: foundation.record.write (rule edits) / foundation.read (read).
 */
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'foundation-sod-config-page',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="foundation-sod-config"
      data-cds-component="grid"
      [attr.data-page-key]="pageKey"
    >
      <header data-cds-component="tile">
        <h1>Segregation of Duties</h1>
        <p>Conflict rules · live violations · waivers.</p>
      </header>
      <div data-cds-component="data-table" data-resource="foundation.sod.rules"></div>
      <div data-cds-component="data-table" data-resource="foundation.sod.violations"></div>
    </section>
  `,
})
export class FoundationSodConfigPage {
  @Input() pageKey = 'foundation.sod.page';
  @Input() locale: 'en' | 'ar' = 'en';
}
