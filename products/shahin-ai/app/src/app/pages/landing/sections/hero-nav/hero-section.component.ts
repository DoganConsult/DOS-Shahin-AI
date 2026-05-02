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
      <div class="hero-content">
        <!-- Layer 1: OS Status Badge -->
        <div class="hero-badge">
          <span class="badge-dot"></span>
          {{ i18n.translate('landing.hero.badge') }}
        </div>

        <!-- Prominent Hawk Logo with Engine Rings -->
        <div class="hero-logo">
          <div class="engine-ring ring-1"></div>
          <div class="engine-ring ring-2"></div>
          <div class="engine-ring ring-3"></div>
          <div class="logo-glow"></div>
          <img src="logoiconapphero.png" alt="Shahin-AI governance platform logo" width="130" height="130" loading="eager" />
        </div>

        <!-- Layer 2: Title + Tagline -->
        <h1 class="hero-title">
          {{ i18n.translate('landing.hero.brandName') }}<span class="title-ai">{{ i18n.translate('landing.hero.brandSuffix') }}</span>
        </h1>
        <p class="hero-tagline">{{ i18n.translate('landing.hero.tagline') }}</p>
        <p class="hero-subtitle">{{ i18n.translate('landing.hero.subtitle') }}</p>

        <!-- Layer 3: Labeled CTAs -->
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

        <!-- Trust row -->
        <p class="hero-trust">
          {{ i18n.translate('landing.hero.trustRow') }}
        </p>

      </div>
    </section>
  `,
    styles: [`
    .hero {
      position: relative;
      min-height: 100vh;        /* legacy fallback */
      min-height: 100svh;       /* small-viewport fallback for browsers w/o dvh */
      min-height: 100dvh;       /* dynamic viewport — Safari URL-bar safe */
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
      background: var(--ld-gradient-blue-strong, linear-gradient(160deg, var(--ld-hero-bg-deep) 0%, var(--primary-darker) 30%, var(--primary-dark) 60%, var(--primary) 100%));
    }
    .hero-bg { position: absolute; inset: 0; pointer-events: none; }
    .orb {
      position: absolute; border-radius: var(--radius-pill); filter: blur(120px); opacity: 0.25;
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
      position: absolute; inset: 0;
      background-image: radial-gradient(var(--glass-subtle) 1px, transparent 1px);
      background-size: var(--space-2xl) var(--space-2xl);
    }
    .hero-content {
      position: relative; z-index: var(--z-base); max-width: 920px; margin: 0 auto;
      padding: 80px var(--space-lg) 60px;
      text-align: center; display: flex; flex-direction: column; align-items: center;
      width: 100%; min-width: 0;
    }

    /* Layer 1: Badge */
    .hero-badge {
      display: inline-flex; align-items: center; gap: var(--space-sm);
      padding: 8px 12px; border-radius: var(--radius-pill);
      background: var(--glass-subtle); border: 1px solid var(--glass-border);
      color: var(--ld-badge-info-color); font-size: clamp(11px, 1vw, 13px); font-weight: var(--font-medium);
      line-height: 1.2; margin-bottom: var(--space-xl);
      backdrop-filter: blur(12px);
    }
    .badge-dot {
      width: var(--space-sm); height: var(--space-sm); border-radius: var(--radius-pill);
      background: var(--success);
      box-shadow: 0 0 10px var(--success); animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    /* Engine Rings around Logo */
    .hero-logo {
      position: relative; margin-bottom: var(--space-xl); width: 200px; height: 200px;
      display: flex; align-items: center; justify-content: center;
    }
    .engine-ring {
      position: absolute; border-radius: var(--radius-pill); border: 1.5px solid;
    }
    .ring-1 {
      inset: 0; border-color: rgba(var(--module-accent-sky-rgb), 0.3);
      animation: spinSlow 20s linear infinite;
      border-top-color: rgba(var(--module-accent-sky-rgb), 0.8);
    }
    .ring-2 {
      inset: -12px; border-color: rgba(var(--module-accent-yellow-rgb), 0.2);
      animation: spinSlow 30s linear infinite reverse;
      border-bottom-color: rgba(var(--module-accent-yellow-rgb), 0.6);
    }
    .ring-3 {
      inset: -24px; border-color: rgba(var(--module-accent-green-rgb), 0.15);
      animation: spinSlow 40s linear infinite;
      border-left-color: rgba(var(--module-accent-green-rgb), 0.5);
    }
    @keyframes spinSlow { to { transform: rotate(360deg); } }
    .logo-glow {
      position: absolute; inset: -20px; border-radius: var(--radius-pill);
      background: radial-gradient(circle, rgba(var(--module-accent-yellow-rgb), 0.25) 0%, transparent 70%);
      animation: logoGlow 3s ease-in-out infinite;
    }
    @keyframes logoGlow {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.08); }
    }
    .hero-logo img {
      position: relative; z-index: var(--z-base); border-radius: var(--radius-pill);
      border: 3px solid rgba(var(--module-accent-yellow-rgb), 0.5);
      filter: drop-shadow(0 8px 32px rgba(var(--module-accent-yellow-rgb), 0.35));
      object-fit: cover;
    }

    /* Layer 2: Title + Taglines */
    .hero-title {
      font-size: clamp(32px, 7vw, 78px); font-weight: 900;
      color: var(--text-on-primary); letter-spacing: -0.02em;
      margin: 0 0 10px; line-height: 1.08;
      text-wrap: balance;
      word-break: keep-all; overflow-wrap: anywhere;
    }
    :host-context([dir="rtl"]) .hero-title { line-height: 1.22; letter-spacing: 0; }
    .title-ai { color: var(--accent-gold); }
    .hero-tagline {
      font-size: clamp(15px, 1.9vw, 22px); font-weight: 800;
      color: rgba(var(--color-white-rgb), 0.92); margin: 0 0 10px;
      letter-spacing: 0.02em; font-style: italic; line-height: 1.4;
      text-wrap: balance;
    }
    :host-context([dir="rtl"]) .hero-tagline { line-height: 1.7; letter-spacing: 0; }
    .hero-subtitle {
      font-size: clamp(13px, 1.3vw, 17px); font-weight: 600;
      color: rgba(var(--color-white-rgb), 0.85); margin: 0 0 28px;
      letter-spacing: 0.06em; line-height: 1.6;
      text-wrap: balance;
    }
    :host-context([dir="rtl"]) .hero-subtitle { line-height: 1.85; letter-spacing: 0; }

    /* Layer 3: Labeled CTAs */
    .hero-actions {
      display: flex; gap: 14px; margin-bottom: 20px;
      justify-content: center; flex-wrap: wrap;
    }
    .hero-cta {
      display: inline-flex; align-items: center; justify-content: center; gap: 10px;
      padding: 14px 32px; border-radius: var(--radius-pill);
      font-size: var(--font-size-base); font-weight: var(--font-bold);
      text-decoration: none; cursor: pointer;
      transition: all 0.3s; backdrop-filter: blur(6px);
      letter-spacing: 0.02em; white-space: nowrap;
    }
    .hero-cta .pi { font-size: var(--font-size-sm); }
    .hero-cta--primary {
      background: var(--ld-cta-primary-bg);
      border: 1.5px solid var(--ld-cta-primary-border); color: var(--ld-cta-primary-color);
      box-shadow: var(--ld-cta-primary-shadow);
    }
    .hero-cta--primary:hover {
      background: var(--ld-cta-primary-bg-hover);
      border-color: rgba(var(--color-amber-400-rgb), 0.7); transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(var(--color-amber-400-rgb), 0.25);
    }
    .hero-cta--secondary {
      background: var(--ld-cta-secondary-bg); border: 1.5px solid var(--ld-cta-secondary-border);
      color: var(--ld-cta-secondary-color);
    }
    .hero-cta--secondary:hover {
      background: var(--ld-cta-secondary-bg-hover); border-color: rgba(var(--color-white-rgb), 0.4);
      transform: translateY(-2px);
    }
    .hero-trust {
      font-size: var(--font-size-sm); color: rgba(var(--color-white-rgb), 0.72);
      margin: 0; font-weight: 500; letter-spacing: 0.02em;
    }

    @media (max-width: 768px) {
      .hero-content { padding: 60px var(--space-md) 40px; }
      .hero-logo img { width: 100px; height: 100px; }
      .hero-cta { padding: 14px 24px; font-size: var(--font-size-base); min-height: 48px; }
    }
    @media (max-width: 480px) {
      .hero-content { padding: 40px var(--space-sm) 32px; }
      .hero-logo { width: 150px; height: 150px; }
      .hero-logo img { width: 80px; height: 80px; }
      .hero-cta { padding: 12px 18px; }
    }
  `]
})
export class HeroSectionComponent {
  i18n = inject(I18nService);

}
