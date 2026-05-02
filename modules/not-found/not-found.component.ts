import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SessionService } from '@app/dauth/session/session.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-not-found',
    imports: [CommonModule, RouterLink],
    template: `
    <div class="nf-root" [attr.dir]="i18n.direction()">
      <div class="nf-card">
        <div class="nf-code">404</div>
        <h1 class="nf-title">{{ i18n.translate('notFound.pageNotFound') }}</h1>
        <p class="nf-desc">
          {{ i18n.translate('notFound.linkNotExist') }}
        </p>
        <div class="nf-actions">
          <a [routerLink]="homeRoute" class="nf-btn nf-btn--primary">
            <i class="pi pi-home"></i>
            {{ i18n.translate('notFound.goHome') }}
          </a>
          <button class="nf-btn nf-btn--ghost" (click)="goBack()">
            <i class="pi pi-arrow-left"></i>
            {{ i18n.translate('notFound.goBack') }}
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .nf-root {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-ground, var(--surface-ice));
      padding: 24px;
    }
    .nf-card {
      text-align: center;
      max-width: 480px;
    }
    .nf-code {
      font-size: clamp(96px, 20vw, 160px);
      font-weight: 900;
      line-height: 1;
      background: linear-gradient(135deg, var(--primary, var(--primary)), var(--primary-dark, var(--primary)));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 16px;
    }
    .nf-title {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--text-heading, var(--text-heading));
      margin: 0 0 12px;
    }
    .nf-desc {
      font-size: var(--font-size-body-sm);
      color: var(--text-muted, var(--text-muted));
      margin: 0 0 32px;
      line-height: 1.6;
    }
    .nf-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .nf-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: var(--radius);
      font-size: var(--font-size-body-sm);
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 150ms;
      border: none;
    }
    .nf-btn--primary {
      background: var(--primary, var(--primary));
      color: #fff;
    }
    .nf-btn--primary:hover {
      background: var(--primary-dark, #0284c7);
    }
    .nf-btn--ghost {
      background: transparent;
      color: var(--text-body, #475569);
      border: 1px solid var(--border-subtle, var(--border-subtle));
    }
    .nf-btn--ghost:hover {
      background: var(--surface-ice, var(--surface-ice));
    }
  `]
})
export class NotFoundComponent {
  i18n = inject(I18nService);
  private auth = inject(SessionService);

  get homeRoute(): string { return this.auth.isLoggedIn() ? '/workspace-home' : '/login'; }

  goBack(): void { history.back(); }
}
