import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';


@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-cta-section',
    imports: [RouterLink],
    template: `
    <section class="cta-section">
      <div class="cta-shell">
        <div class="cta-panel">
          <div class="cta-copy">
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
          </div>

          <div class="cta-steps" aria-hidden="true">
            <article class="cta-step">
              <span class="cta-step__index">01</span>
              <h3>{{ i18n.localize('Diagnose', 'شخّص') }}</h3>
              <p>{{ i18n.localize('Map operating pain to modules, owners, and Saudi framework scope.', 'اربط ألم التشغيل بالموديولات والمالكين ونطاق الأطر السعودية.') }}</p>
            </article>

            <article class="cta-step">
              <span class="cta-step__index">02</span>
              <h3>{{ i18n.localize('Launch', 'أطلِق') }}</h3>
              <p>{{ i18n.localize('Start a workspace with workflows, evidence lanes, and AI agents already sequenced.', 'ابدأ مساحة عمل مع سير العمل ومسارات الأدلة ووكلاء الذكاء وقد تم ترتيبهم مسبقًا.') }}</p>
            </article>

            <article class="cta-step">
              <span class="cta-step__index">03</span>
              <h3>{{ i18n.localize('Operate', 'شغّل') }}</h3>
              <p>{{ i18n.localize('Run daily decisions from one mobile surface instead of scattered queues and reports.', 'أدر القرارات اليومية من سطح جوال واحد بدل الطوابير والتقارير المتفرقة.') }}</p>
            </article>
          </div>
        </div>

        <p class="cta-trust">{{ i18n.translate('landing.cta.trust') }}</p>
      </div>
    </section>
  `,
    styles: [`
    .cta-section {
      padding: clamp(56px, 7vw, 96px) 0;
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(circle at top, rgba(15, 98, 254, 0.16), transparent 28%),
        linear-gradient(135deg, var(--primary-darker) 0%, var(--primary-dark) 50%, var(--primary) 100%);
    }

    .cta-shell {
      max-width: 1180px;
      margin: 0 auto;
      padding: 0 24px;
      position: relative;
      z-index: var(--z-base);
    }

    .cta-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
      gap: clamp(1.25rem, 4vw, 2.5rem);
      padding: clamp(1.25rem, 3vw, 2rem);
      border-radius: 2rem;
      border: 1px solid rgba(var(--color-white-rgb), 0.12);
      background: rgba(5, 16, 34, 0.52);
      box-shadow: 0 28px 72px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(18px);
    }

    .cta-copy {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: start;
      min-width: 0;
    }

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
    .cta-title {
      font-size: clamp(24px, 4vw, 40px);
      font-weight: var(--font-black);
      color: var(--text-on-primary);
      margin: 0 0 var(--space-md);
      letter-spacing: -0.02em;
      max-inline-size: 12ch;
      line-height: 1.08;
    }
    .cta-desc {
      font-size: var(--font-size-md);
      color: rgba(var(--color-white-rgb), 0.9);
      max-width: 600px;
      margin: 0 0 32px;
      line-height: 1.7;
    }
    .cta-actions {
      display: flex;
      gap: 14px;
      justify-content: flex-start;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
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

    .cta-steps {
      display: grid;
      gap: 0.9rem;
      align-content: start;
    }

    .cta-step {
      padding: 1rem;
      border-radius: 1.35rem;
      border: 1px solid rgba(var(--color-white-rgb), 0.1);
      background: rgba(var(--color-white-rgb), 0.06);
      box-shadow: inset 0 1px 0 rgba(var(--color-white-rgb), 0.08);
    }

    .cta-step__index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-inline-size: 3rem;
      min-block-size: 2rem;
      padding-inline: 0.7rem;
      border-radius: 999px;
      background: rgba(var(--color-white-rgb), 0.12);
      color: var(--accent-gold);
      font-size: 0.75rem;
      font-weight: 900;
      letter-spacing: 0.12em;
    }

    .cta-step h3 {
      margin: 0.8rem 0 0;
      font-size: 1.02rem;
      color: var(--text-on-primary);
      line-height: 1.35;
    }

    .cta-step p {
      margin: 0.45rem 0 0;
      font-size: 0.9rem;
      line-height: 1.65;
      color: rgba(var(--color-white-rgb), 0.74);
    }

    .cta-trust {
      font-size: var(--font-size-sm);
      color: rgba(var(--color-white-rgb), 0.78);
      margin: 1rem 0 0;
      font-weight: 500;
      letter-spacing: 0.02em;
      text-align: center;
    }

    @media (max-width: 900px) {
      .cta-panel {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .cta-shell { padding: 0 16px; }
      .cta-btn { padding: 14px 28px; min-height: 48px; }
    }

    @media (max-width: 480px) {
      .cta-title { font-size: var(--font-size-xl); }
      .cta-desc { font-size: var(--font-size-base); }
      .cta-actions { inline-size: 100%; }
      .cta-btn { inline-size: 100%; }
    }
  `]
})
export class CtaSectionComponent {
  i18n = inject(I18nService);
}
