import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';


@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-cta-section',
    imports: [RouterLink],
    template: `
    <section class="cta-section">
      <div class="cta-container">
        <div class="cta-os-badge">
          <span class="cta-pulse"></span>
          {{ i18n.translate('landing.cta.osBadge') }}
        </div>
        <h2 class="cta-title">{{ i18n.translate('landing.cta.title') }}</h2>
        <p class="cta-desc">{{ i18n.translate('landing.cta.desc') }}</p>
        <div class="cta-actions">
          <a routerLink="/register" class="cta-btn cta-btn--primary" [attr.aria-label]="i18n.translate('landing.cta.startDiagnosis')">
            <i class="pi pi-play" aria-hidden="true"></i>
            {{ i18n.translate('landing.cta.startDiagnosis') }}
          </a>
          <a routerLink="/login" class="cta-btn cta-btn--secondary" [attr.aria-label]="i18n.translate('landing.cta.signIn')">
            <i class="pi pi-sign-in" aria-hidden="true"></i>
            {{ i18n.translate('landing.cta.signIn') }}
          </a>
        </div>
        <p class="cta-openclaw">
          <a routerLink="/login" [queryParams]="{ returnUrl: '/integrations' }" class="cta-openclaw-link">
            {{ i18n.translate('landing.cta.openClawLink') }}
          </a>
          — {{ i18n.translate('landing.cta.openClawHint') }}
        </p>
        <p class="cta-trust">{{ i18n.translate('landing.cta.trust') }}
      </div>
    </section>
  `,
    styles: [`
    .cta-section {
      padding: clamp(48px, 7vw, 88px) 0; position: relative; overflow: hidden;
      background: var(--ld-gradient-blue, linear-gradient(135deg, var(--primary-darker) 0%, var(--primary-dark) 50%, var(--primary) 100%));
    }
    .cta-container { max-width: 768px; margin: 0 auto; padding: 0 24px; text-align: center; position: relative; z-index: var(--z-base); }
    .cta-os-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 7px 20px; border-radius: var(--radius-pill);
      background: rgba(var(--color-white-rgb), 0.12); border: 1px solid rgba(var(--color-white-rgb), 0.25);
      color: rgba(var(--color-white-rgb), 0.95); font-size: var(--font-size-sm); font-weight: 600;
      margin-bottom: 24px; backdrop-filter: blur(8px);
    }
    .cta-pulse {
      width: 8px; height: 8px; border-radius: var(--radius-pill); background: var(--success);
      box-shadow: 0 0 8px var(--success); animation: ctaPulse 2s infinite;
    }
    @keyframes ctaPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .cta-title { font-size: clamp(24px, 4vw, 36px); font-weight: var(--font-black); color: var(--text-on-primary); margin: 0 0 var(--space-md); letter-spacing: -0.02em; }
    .cta-desc { font-size: var(--font-size-md); color: rgba(var(--color-white-rgb), 0.9); max-width: 600px; margin: 0 auto 32px; line-height: 1.7; }
    .cta-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
    .cta-openclaw { font-size: var(--font-size-sm); color: rgba(var(--color-white-rgb), 0.85); margin: 0 0 16px; line-height: 1.5; }
    .cta-openclaw-link { color: rgba(var(--color-white-rgb), 0.95); font-weight: var(--font-bold); text-decoration: underline; text-underline-offset: 3px; }
    .cta-openclaw-link:hover { color: white; }
    .cta-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 10px;
      padding: 14px 32px; border-radius: var(--radius-pill);
      font-size: var(--font-size-base); font-weight: var(--font-bold);
      text-decoration: none; cursor: pointer;
      transition: all 0.3s; backdrop-filter: blur(6px);
      letter-spacing: 0.02em; white-space: nowrap;
    }
    .cta-btn .pi { font-size: var(--font-size-sm); }
    .cta-btn--primary {
      background: var(--ld-cta-primary-bg);
      border: 1.5px solid var(--ld-cta-primary-border); color: var(--ld-cta-primary-color);
      box-shadow: var(--ld-cta-primary-shadow);
    }
    .cta-btn--primary:hover {
      background: var(--ld-cta-primary-bg-hover);
      border-color: rgba(var(--color-amber-400-rgb), 0.7); transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(var(--color-amber-400-rgb), 0.25);
    }
    .cta-btn--secondary {
      background: var(--ld-cta-secondary-bg); border: 1.5px solid var(--ld-cta-secondary-border);
      color: var(--ld-cta-secondary-color);
    }
    .cta-btn--secondary:hover { background: var(--ld-cta-secondary-bg-hover); border-color: rgba(var(--color-white-rgb), 0.4); transform: translateY(-2px); }
    .cta-trust {
      font-size: var(--font-size-sm); color: rgba(var(--color-white-rgb), 0.78); margin: 0;
      font-weight: 500; letter-spacing: 0.02em;
    }
    @media (max-width: 768px) {
      .cta-container { padding: 0 16px; }
      .cta-btn { padding: 14px 28px; min-height: 48px; }
    }
    @media (max-width: 480px) {
      .cta-title { font-size: var(--font-size-xl); }
      .cta-desc { font-size: var(--font-size-base); }
    }
  `]
})
export class CtaSectionComponent {
  i18n = inject(I18nService);
}
