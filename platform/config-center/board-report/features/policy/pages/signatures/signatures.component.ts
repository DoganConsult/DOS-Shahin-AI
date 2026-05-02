import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-signatures',
    imports: [CommonModule],
    template: `
    <section class="page-shell">
      <header class="page-header">
        <h2>{{ i18n.translate('Digital Signatures') }}</h2>
        <p class="text-muted">{{ i18n.translate('Manage digital signatures for your organization') }}</p>
      </header>
      <div class="page-body">
        @if (loading()) {
          <div class="card"><p>{{ i18n.translate('Loading...') }}</p></div>
        } @else if (errorMsg()) {
          <div class="card"><p class="text-muted">{{ errorMsg() }}</p></div>
        } @else {
          <div class="card">
            <h3 class="card-title">{{ i18n.translate('Profile') }}</h3>
            <p>{{ i18n.translate('Signed in as') }}: {{ user().userName || user().email || '—' }}</p>
            <p>{{ i18n.translate('Digital signature settings for document signing, approval chains, and regulatory submissions.') }}</p>
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
export class SignaturesComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  loading = signal(true);
  user = signal<{ userName?: string; email?: string }>({});
  errorMsg = signal('');

  ngOnInit(): void {
    this.apiclientSvc.get('/auth/userinfo').subscribe({
      next: (body) => { this.user.set(body ?? {}); this.loading.set(false); },
      error: () => { this.errorMsg.set('Failed to load user profile'); this.loading.set(false); },
    });
  }
}
