import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-taxonomy',
    imports: [CommonModule],
    template: `
    <section class="page-shell">
      <header class="page-header">
        <h2>{{ i18n.translate('Taxonomy') }}</h2>
        <p class="text-muted">{{ i18n.translate('Manage taxonomy for your organization') }}</p>
      </header>
      <div class="page-body">
        @if (loading()) {
          <div class="card"><p>{{ i18n.translate('Loading...') }}</p></div>
        } @else {
          <div class="card">
            <h3 class="card-title">{{ i18n.translate('Regulators') }}</h3>
            <p>{{ i18n.translate('Count') }}: {{ regulators().length }}</p>
          </div>
          <div class="card">
            <h3 class="card-title">{{ i18n.translate('Sectors') }}</h3>
            <p>{{ i18n.translate('Count') }}: {{ sectors().length }}</p>
          </div>
        }
      </div>
    </section>
  `,
    styles: [`
    .page-shell { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h2 { font-size: var(--font-size-3xl); font-weight: 300; color: var(--text-heading); }
    .text-muted { color: var(--text-muted); margin-top: 4px; }
    .page-body { display: grid; gap: 16px; }
    .card-title { margin: 0 0 12px 0; font-size: var(--font-size-lg); }
  `]
})
export class TaxonomyComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  loading = signal(true);
  regulators = signal<GrcRecord[]>([]);
  sectors = signal<GrcRecord[]>([]);

  ngOnInit(): void {
    forkJoin({
      reg: this.apiclientSvc.get('/registry/regulators'),
      sec: this.apiclientSvc.get('/registry/sectors'),
    }).subscribe({
      next: ({ reg, sec }) => {
        this.regulators.set(Array.isArray((reg as GrcRecord)?.regulators) ? (reg as GrcRecord).regulators : []);
        this.sectors.set(Array.isArray((sec as GrcRecord)?.sectors) ? (sec as GrcRecord).sectors : []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
