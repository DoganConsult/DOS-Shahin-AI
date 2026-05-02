import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-workpapers',
    imports: [CommonModule],
    template: `
    <section class="page-shell">
      <header class="page-header">
        <h2>{{ i18n.translate('Audit Workpapers') }}</h2>
        <p class="text-muted">{{ i18n.translate('Manage audit workpapers for your organization') }}</p>
      </header>
      <div class="page-body">
        @if (loading()) {
          <div class="card"><p>{{ i18n.translate('Loading...') }}</p></div>
        } @else if (plans().length > 0) {
          <div class="card">
            <h3 class="card-title">{{ i18n.translate('Audit plans') }}</h3>
            <ul class="list"><li *ngFor="let p of plans()">{{ p.name || p.plan_id }}</li></ul>
          </div>
        } @else {
          <div class="card"><p>{{ i18n.translate('No audit plans yet. Create one to get started.') }}</p></div>
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
    .list { margin: 0; padding-inline-start: 20px; }
  `]
})
export class AuditWorkpapersComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  loading = signal(true);
  plans = signal<GrcRecord[]>([]);

  ngOnInit(): void {
    this.apiclientSvc.get('/audit/plans').subscribe({
      next: (body: { plans?: Record<string, any>[] }) => { this.plans.set(body?.plans ?? []); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

}
