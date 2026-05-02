import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { environment } from '@env/environment';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { DosLanguageSwitcherComponent } from '@dos/ui-system';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-verify-email',
    imports: [CommonModule, RouterLink, ButtonModule, CardModule, ProgressSpinnerModule, DosLanguageSwitcherComponent],
    template: `
    <div class="verify-page">
      <div class="auth-top-bar">
        <a routerLink="/">{{ i18n.translate('verifyEmail.home') }}</a>
        <dos-language-switcher variant="light" />
      </div>
      <div class="verify-container">
        <img loading="eager" src="logoiconapphero.png" alt="Shahin GRC" width="48" height="48" style="border-radius:var(--radius-lg); margin-bottom:16px" />

        <div *ngIf="loading" style="text-align:center">
          <p-progressSpinner strokeWidth="4" [style]="{width:'50px', height:'50px'}" />
          <p>{{ i18n.translate('verifyEmail.verifying') }}</p>
        </div>

        <div *ngIf="!loading && success" style="text-align:center">
          <i class="pi pi-check-circle" style="font-size:48px;color:var(--success)"></i>
          <h2>{{ i18n.translate('verifyEmail.successTitle') }}</h2>
          <p>{{ i18n.translate('verifyEmail.successMessage') }}</p>
          <p-button [label]="i18n.translate('verifyEmail.goToLogin')" icon="pi pi-sign-in" (onClick)="router.navigate(['/login'])" />
        </div>

        <div *ngIf="!loading && !success" style="text-align:center">
          <i class="pi pi-times-circle" style="font-size:48px;color:var(--error)"></i>
          <h2>{{ i18n.translate('verifyEmail.failedTitle') }}</h2>
          <p>{{ error }}</p>
          <p-button [label]="i18n.translate('verifyEmail.goToLogin')" icon="pi pi-sign-in" (onClick)="router.navigate(['/login'])" />
        </div>
      </div>
    </div>
  `,
    styles: [`
    .verify-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--surface-sunken); position: relative; }
    .auth-top-bar { position: absolute; top: 1rem; right: 1rem; display: flex; align-items: center; gap: 1rem; }
    .auth-top-bar a { color: var(--text-muted); text-decoration: none; font-size: var(--font-size-body-sm); }
    .auth-top-bar a:hover { color: var(--primary); }
    .auth-lang-dropdown { padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); font-size: var(--font-size-base); }
    .verify-container { max-width: 420px; width: 100%; padding: 2rem; text-align: center; background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); }
    h2 { margin: 1rem 0 0.5rem; color: var(--text-heading); }
    p { color: var(--text-muted); margin-bottom: 1.5rem; }
  `]
})
export class VerifyEmailComponent implements OnInit {
  readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  loading = true;
  success = false;
  error = '';

  ngOnInit(): void {
    const rawToken =
      this.route.snapshot.queryParams['token']
      || this.route.snapshot.queryParams['verificationToken']
      || this.extractTokenFromFragment(this.route.snapshot.fragment);
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!token) {
      this.router.navigateByUrl('/email-verification-pending');
      return;
    }
    this.http.get(`${environment.apiUrl}/auth/verify-email`, { params: { token } }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.loading = false;
        const errorBody = typeof err === 'object' && err !== null && 'error' in err ? err.error : undefined;
        const errorMessage = typeof errorBody === 'object' && errorBody !== null && 'error' in errorBody ? errorBody.error : undefined;
        this.error = typeof errorMessage === 'string' ? errorMessage : 'Invalid or expired verification token.';
        this.cdr.markForCheck();
      },
    });
  }

  private extractTokenFromFragment(fragment: string | null): string | null {
    if (!fragment) return null;
    const asQuery = new URLSearchParams(fragment.startsWith('?') ? fragment.substring(1) : fragment);
    return asQuery.get('token');
  }
}
