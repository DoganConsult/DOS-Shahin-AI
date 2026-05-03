import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-hero-section',
    imports: [RouterLink],
    template: `
    <section class="hero">
      <div class="hero-bg">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
        <div class="orb orb-gold"></div>
        <div class="grid-overlay"></div>
      </div>

      <div class="hero-shell">
        <div class="hero-copy">
          <div class="hero-badge">
            <span class="badge-dot"></span>
            {{ i18n.translate('landing.hero.badge') }}
          </div>

          <div class="hero-brand-row">
            <div class="hero-logo" aria-hidden="true">
              <div class="engine-ring ring-1"></div>
              <div class="engine-ring ring-2"></div>
              <div class="engine-ring ring-3"></div>
              <div class="logo-glow"></div>
              <img src="logoiconapphero.png" alt="Shahin-AI governance platform logo" width="88" height="88" loading="eager" />
            </div>

            <div class="hero-brand-stamp">
              <span>{{ i18n.localize('Mobile enterprise cockpit', 'قمرة مؤسسة متنقلة') }}</span>
              <strong>{{ i18n.localize('Saudi-ready by design', 'جاهز للسعودية من الأساس') }}</strong>
            </div>
          </div>

          <h1 class="hero-title">
            {{ i18n.translate('landing.hero.brandName') }}<span class="title-ai">{{ i18n.translate('landing.hero.brandSuffix') }}</span>
          </h1>
          <p class="hero-tagline">{{ i18n.translate('landing.hero.tagline') }}</p>
          <p class="hero-subtitle">{{ i18n.translate('landing.hero.subtitle') }}</p>

          <div class="hero-actions">
            <a routerLink="/register" class="hero-cta hero-cta--primary" [attr.aria-label]="i18n.translate('landing.hero.ctaStart')">
              <i class="pi pi-play" aria-hidden="true"></i>
              {{ i18n.translate('landing.hero.ctaStart') }}
            </a>
            <a routerLink="/login" class="hero-cta hero-cta--secondary" [attr.aria-label]="i18n.translate('landing.hero.ctaSignIn')">
              <i class="pi pi-sign-in" aria-hidden="true"></i>
              {{ i18n.translate('landing.hero.ctaSignIn') }}
            </a>
          </div>

          <div class="hero-proof-grid">
            <div class="proof-chip">
              <strong>129</strong>
              <span>{{ i18n.localize('regulators mapped', 'جهة رقابية مربوطة') }}</span>
            </div>
            <div class="proof-chip">
              <strong>10</strong>
              <span>{{ i18n.localize('AI lanes active', 'مسارات ذكاء فعالة') }}</span>
            </div>
            <div class="proof-chip">
              <strong>24h</strong>
              <span>{{ i18n.localize('to a working workspace', 'للوصول إلى مساحة عمل تشغيلية') }}</span>
            </div>
          </div>

          <p class="hero-trust">{{ i18n.translate('landing.hero.trustRow') }}</p>
        </div>

        <div class="hero-command-deck" aria-hidden="true">
          <article class="command-card command-card--primary">
            <span class="command-card__eyebrow">{{ i18n.localize('Executive pulse', 'نبض القيادة') }}</span>
            <h2>{{ i18n.localize('The first screen behaves like a live command lane, not a static brochure.', 'الشاشة الأولى تتصرف كمسار قيادة مباشر لا كبروشور ثابت.') }}</h2>

            <div class="command-list">
              <div class="command-item">
                <span class="command-item__status command-item__status--critical"></span>
                <div class="command-item__copy">
                  <strong>{{ i18n.localize('Urgent approvals', 'اعتمادات عاجلة') }}</strong>
                  <small>{{ i18n.localize('3 committees waiting on decisions', '3 لجان تنتظر قرارات') }}</small>
                </div>
                <span class="command-item__metric">08</span>
              </div>

              <div class="command-item">
                <span class="command-item__status command-item__status--stable"></span>
                <div class="command-item__copy">
                  <strong>{{ i18n.localize('Evidence freshness', 'حداثة الأدلة') }}</strong>
                  <small>{{ i18n.localize('92% of critical controls are current', '92% من الضوابط الحرجة محدثة') }}</small>
                </div>
                <span class="command-item__metric">92%</span>
              </div>

              <div class="command-item">
                <span class="command-item__status command-item__status--watch"></span>
                <div class="command-item__copy">
                  <strong>{{ i18n.localize('Vendor watchlist', 'قائمة مراقبة الموردين') }}</strong>
                  <small>{{ i18n.localize('2 high-risk suppliers need action', 'موردان مرتفعا المخاطر يحتاجان إجراء') }}</small>
                </div>
                <span class="command-item__metric">02</span>
              </div>
            </div>
          </article>

          <div class="command-stack">
            <article class="command-card">
              <div class="command-card__topline">
                <span>{{ i18n.localize('AI squad readiness', 'جاهزية فرقة الذكاء') }}</span>
                <strong>10/10</strong>
              </div>
              <div class="agent-pill-row">
                <span class="agent-pill agent-pill--on">A01</span>
                <span class="agent-pill agent-pill--on">A02</span>
                <span class="agent-pill agent-pill--on">A03</span>
                <span class="agent-pill agent-pill--on">A04</span>
                <span class="agent-pill agent-pill--on">A05</span>
                <span class="agent-pill agent-pill--on">A06</span>
                <span class="agent-pill agent-pill--on">A07</span>
                <span class="agent-pill agent-pill--on">A08</span>
                <span class="agent-pill agent-pill--on">A09</span>
                <span class="agent-pill agent-pill--on">A10</span>
              </div>
            </article>

            <article class="command-card">
              <div class="command-card__topline">
                <span>{{ i18n.localize('Saudi control lanes', 'مسارات الضوابط السعودية') }}</span>
                <strong>{{ i18n.localize('Ready', 'جاهز') }}</strong>
              </div>
              <div class="signal-bar">
                <div class="signal-bar__row">
                  <span>NCA ECC</span>
                  <span>92%</span>
                </div>
                <div class="signal-bar__track"><span style="width: 92%"></span></div>

                <div class="signal-bar__row">
                  <span>SAMA CSF</span>
                  <span>87%</span>
                </div>
                <div class="signal-bar__track"><span style="width: 87%"></span></div>

                <div class="signal-bar__row">
                  <span>PDPL</span>
                  <span>85%</span>
                </div>
                <div class="signal-bar__track"><span style="width: 85%"></span></div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  `,
    styles: [`
    .hero {
      position: relative;
      min-height: 100vh;
      min-height: 100svh;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: var(--ld-gradient-blue-strong, linear-gradient(160deg, var(--ld-hero-bg-deep) 0%, var(--primary-darker) 32%, var(--primary-dark) 65%, var(--primary) 100%));
    }

    .hero-bg { position: absolute; inset: 0; pointer-events: none; }

    .orb {
      position: absolute;
      border-radius: var(--radius-pill);
      filter: blur(120px);
      opacity: 0.25;
      animation: float 10s ease-in-out infinite;
    }

    .orb-1 { width: 700px; height: 700px; top: -15%; right: -15%; background: var(--ld-orbit-cyan); animation-delay: 0s; }
    .orb-2 { width: 500px; height: 500px; bottom: -10%; left: -10%; background: var(--primary-light); animation-delay: -4s; }
    .orb-3 { width: 350px; height: 350px; top: 50%; left: 25%; background: var(--primary-lightest); animation-delay: -6s; opacity: 0.12; }
    .orb-gold { width: 300px; height: 300px; top: 15%; left: 50%; background: var(--ld-orbit-gold); opacity: 0.08; animation-delay: -2s; }

    @keyframes float {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-25px) scale(1.06); }
    }

    .grid-overlay {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(var(--glass-subtle) 1px, transparent 1px);
      background-size: var(--space-2xl) var(--space-2xl);
    }

    .hero-shell {
      position: relative;
      z-index: var(--z-base);
      display: grid;
      grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
      gap: clamp(1.5rem, 4vw, 4rem);
      align-items: center;
      max-width: 1240px;
      margin: 0 auto;
      padding: calc(5.75rem + env(safe-area-inset-top, 0px)) 24px 64px;
      width: 100%;
    }

    .hero-copy {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: start;
      min-width: 0;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: 8px 12px;
      border-radius: var(--radius-pill);
      background: var(--glass-subtle);
      border: 1px solid var(--glass-border);
      color: var(--ld-badge-info-color);
      font-size: clamp(11px, 1vw, 13px);
      font-weight: var(--font-medium);
      line-height: 1.2;
      margin-bottom: 1rem;
      backdrop-filter: blur(12px);
    }

    .badge-dot {
      width: var(--space-sm);
      height: var(--space-sm);
      border-radius: var(--radius-pill);
      background: var(--success);
      box-shadow: 0 0 10px var(--success);
      animation: pulse 2s infinite;
    }

    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    .hero-brand-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.4rem;
    }

    .hero-logo {
      position: relative;
      width: 96px;
      height: 96px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .engine-ring {
      position: absolute;
      border-radius: var(--radius-pill);
      border: 1.5px solid;
    }

    .ring-1 {
      inset: 0;
      border-color: rgba(var(--module-accent-sky-rgb), 0.3);
      animation: spinSlow 20s linear infinite;
      border-top-color: rgba(var(--module-accent-sky-rgb), 0.8);
    }

    .ring-2 {
      inset: -12px;
      border-color: rgba(var(--module-accent-yellow-rgb), 0.2);
      animation: spinSlow 30s linear infinite reverse;
      border-bottom-color: rgba(var(--module-accent-yellow-rgb), 0.6);
    }

    .ring-3 {
      inset: -24px;
      border-color: rgba(var(--module-accent-green-rgb), 0.15);
      animation: spinSlow 40s linear infinite;
      border-left-color: rgba(var(--module-accent-green-rgb), 0.5);
    }

    @keyframes spinSlow { to { transform: rotate(360deg); } }

    .logo-glow {
      position: absolute;
      inset: -16px;
      border-radius: var(--radius-pill);
      background: radial-gradient(circle, rgba(var(--module-accent-yellow-rgb), 0.25) 0%, transparent 70%);
      animation: logoGlow 3s ease-in-out infinite;
    }

    @keyframes logoGlow {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.08); }
    }

    .hero-logo img {
      position: relative;
      z-index: var(--z-base);
      border-radius: var(--radius-pill);
      border: 3px solid rgba(var(--module-accent-yellow-rgb), 0.5);
      filter: drop-shadow(0 8px 32px rgba(var(--module-accent-yellow-rgb), 0.35));
      object-fit: cover;
    }

    .hero-brand-stamp {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-inline-size: 0;
      padding: 0.9rem 1rem;
      border-radius: 1.1rem;
      border: 1px solid rgba(var(--color-white-rgb), 0.14);
      background: rgba(var(--color-white-rgb), 0.07);
      box-shadow: inset 0 1px 0 rgba(var(--color-white-rgb), 0.08);
      backdrop-filter: blur(10px);
    }

    .hero-brand-stamp span {
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(var(--color-white-rgb), 0.72);
    }

    .hero-brand-stamp strong {
      font-size: 0.98rem;
      line-height: 1.35;
      color: var(--text-on-primary);
    }

    .hero-title {
      font-size: clamp(32px, 7vw, 78px);
      font-weight: 900;
      color: var(--text-on-primary);
      letter-spacing: -0.02em;
      margin: 0 0 12px;
      line-height: 1.04;
      text-wrap: balance;
      word-break: keep-all;
      overflow-wrap: anywhere;
      max-inline-size: 10ch;
    }

    :host-context([dir="rtl"]) .hero-title { line-height: 1.22; letter-spacing: 0; }

    .title-ai { color: var(--accent-gold); }

    .hero-tagline {
      font-size: clamp(15px, 1.9vw, 22px);
      font-weight: 800;
      color: rgba(var(--color-white-rgb), 0.94);
      margin: 0 0 12px;
      letter-spacing: 0.02em;
      line-height: 1.45;
      text-wrap: balance;
      max-inline-size: 34rem;
    }

    :host-context([dir="rtl"]) .hero-tagline { line-height: 1.7; letter-spacing: 0; }

    .hero-subtitle {
      font-size: clamp(13px, 1.3vw, 17px);
      font-weight: 600;
      color: rgba(var(--color-white-rgb), 0.82);
      margin: 0 0 1.75rem;
      letter-spacing: 0.02em;
      line-height: 1.75;
      text-wrap: balance;
      max-inline-size: 36rem;
    }

    :host-context([dir="rtl"]) .hero-subtitle { line-height: 1.85; letter-spacing: 0; }

    .hero-actions {
      display: flex;
      gap: 14px;
      margin-bottom: 1.35rem;
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    .hero-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px 32px;
      border-radius: var(--radius-pill);
      font-size: var(--font-size-base);
      font-weight: var(--font-bold);
      text-decoration: none;
      cursor: pointer;
      transition: all 0.3s;
      backdrop-filter: blur(6px);
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .hero-cta .pi { font-size: var(--font-size-sm); }

    .hero-cta--primary {
      background: var(--ld-cta-primary-bg);
      border: 1.5px solid var(--ld-cta-primary-border);
      color: var(--ld-cta-primary-color);
      box-shadow: var(--ld-cta-primary-shadow);
    }

    .hero-cta--primary:hover {
      background: var(--ld-cta-primary-bg-hover);
      border-color: rgba(var(--color-amber-400-rgb), 0.7);
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(var(--color-amber-400-rgb), 0.25);
    }

    .hero-cta--secondary {
      background: var(--ld-cta-secondary-bg);
      border: 1.5px solid var(--ld-cta-secondary-border);
      color: var(--ld-cta-secondary-color);
    }

    .hero-cta--secondary:hover {
      background: var(--ld-cta-secondary-bg-hover);
      border-color: rgba(var(--color-white-rgb), 0.4);
      transform: translateY(-2px);
    }

    .hero-proof-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
      width: 100%;
      max-width: 38rem;
      margin-bottom: 1rem;
    }

    .proof-chip {
      padding: 1rem;
      border-radius: 1.15rem;
      border: 1px solid rgba(var(--color-white-rgb), 0.12);
      background: rgba(var(--color-white-rgb), 0.08);
      box-shadow: inset 0 1px 0 rgba(var(--color-white-rgb), 0.08);
      backdrop-filter: blur(10px);
    }

    .proof-chip strong {
      display: block;
      font-size: 1.2rem;
      font-weight: 900;
      color: var(--text-on-primary);
      line-height: 1.1;
    }

    .proof-chip span {
      display: block;
      margin-top: 0.3rem;
      font-size: 0.82rem;
      line-height: 1.45;
      color: rgba(var(--color-white-rgb), 0.76);
    }

    .hero-trust {
      font-size: var(--font-size-sm);
      color: rgba(var(--color-white-rgb), 0.72);
      margin: 0;
      font-weight: 500;
      letter-spacing: 0.02em;
      max-inline-size: 35rem;
    }

    .hero-command-deck {
      display: grid;
      gap: 1rem;
      min-width: 0;
    }

    .command-card {
      border-radius: 1.6rem;
      border: 1px solid rgba(var(--color-white-rgb), 0.12);
      background: rgba(6, 19, 39, 0.58);
      box-shadow: 0 24px 54px rgba(0, 0, 0, 0.24);
      padding: 1.2rem;
      backdrop-filter: blur(18px);
    }

    .command-card--primary {
      background:
        linear-gradient(180deg, rgba(11, 28, 56, 0.84), rgba(6, 19, 39, 0.68)),
        radial-gradient(circle at top right, rgba(var(--color-amber-400-rgb), 0.12), transparent 42%);
    }

    .command-card__eyebrow,
    .command-card__topline span {
      display: inline-flex;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(var(--color-white-rgb), 0.6);
    }

    .command-card--primary h2 {
      margin: 0.6rem 0 0;
      font-size: clamp(1.1rem, 2vw, 1.45rem);
      line-height: 1.4;
      color: var(--text-on-primary);
    }

    .command-list {
      display: grid;
      gap: 0.8rem;
      margin-top: 1rem;
    }

    .command-item {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.75rem;
      align-items: center;
      padding: 0.9rem 1rem;
      border-radius: 1rem;
      background: rgba(var(--color-white-rgb), 0.06);
      border: 1px solid rgba(var(--color-white-rgb), 0.08);
    }

    .command-item__status {
      inline-size: 0.7rem;
      block-size: 0.7rem;
      border-radius: 999px;
      box-shadow: 0 0 0 6px rgba(var(--color-white-rgb), 0.04);
    }

    .command-item__status--critical { background: #ff5d5d; }
    .command-item__status--stable { background: #42be65; }
    .command-item__status--watch { background: #f1c21b; }

    .command-item__copy strong,
    .command-item__copy small {
      display: block;
    }

    .command-item__copy strong {
      font-size: 0.95rem;
      color: var(--text-on-primary);
      line-height: 1.35;
    }

    .command-item__copy small {
      margin-top: 0.18rem;
      font-size: 0.8rem;
      color: rgba(var(--color-white-rgb), 0.68);
      line-height: 1.45;
    }

    .command-item__metric {
      font-size: 0.92rem;
      font-weight: 800;
      color: var(--accent-gold);
    }

    .command-stack {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    .command-card__topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.9rem;
      color: var(--text-on-primary);
    }

    .command-card__topline strong {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text-on-primary);
    }

    .agent-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .agent-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-inline-size: 3rem;
      min-block-size: 2rem;
      padding-inline: 0.7rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      border: 1px solid rgba(var(--color-white-rgb), 0.08);
      background: rgba(var(--color-white-rgb), 0.05);
      color: rgba(var(--color-white-rgb), 0.84);
    }

    .agent-pill--on {
      background: rgba(36, 161, 72, 0.18);
      color: #beffd1;
      border-color: rgba(36, 161, 72, 0.36);
    }

    .signal-bar {
      display: grid;
      gap: 0.5rem;
    }

    .signal-bar__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      font-size: 0.82rem;
      color: rgba(var(--color-white-rgb), 0.74);
    }

    .signal-bar__track {
      block-size: 0.45rem;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(var(--color-white-rgb), 0.1);
      margin-bottom: 0.2rem;
    }

    .signal-bar__track span {
      display: block;
      block-size: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--accent-gold), #ffd166);
    }

    @media (max-width: 1080px) {
      .hero-shell {
        grid-template-columns: 1fr;
      }

      .hero-title {
        max-inline-size: 12ch;
      }
    }

    @media (max-width: 768px) {
      .hero-shell {
        padding: calc(5.2rem + env(safe-area-inset-top, 0px)) 16px 40px;
      }

      .command-stack {
        grid-template-columns: 1fr;
      }

      .hero-proof-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .hero-cta {
        min-height: 48px;
      }
    }

    @media (max-width: 480px) {
      .hero-proof-grid {
        grid-template-columns: 1fr;
      }

      .hero-actions {
        inline-size: 100%;
      }

      .hero-cta {
        inline-size: 100%;
        padding: 13px 18px;
      }

      .command-item {
        grid-template-columns: auto 1fr;
      }

      .command-item__metric {
        grid-column: 2;
      }
    }
  `]
})
export class HeroSectionComponent {
  i18n = inject(I18nService);
}
