import { Component, inject, afterNextRender, signal, OnDestroy, ChangeDetectionStrategy, HostListener} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SessionService } from '@app/dauth/session/session.service';
import { DosLanguageSwitcherComponent } from '@dos/ui-system';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-navbar-section',
    imports: [CommonModule, RouterLink, DosLanguageSwitcherComponent],
    template: `
    <nav class="navbar" [class.scrolled]="scrolled">
      <div class="navbar-inner">
        <div tabindex="0" role="button" (keyup.enter)="scrollTo('hero')" class="brand" (click)="scrollTo('hero')">
          <span class="brand-icon"><img src="logoiconapphero.png" alt="Shahin-AI home" width="32" height="32" loading="eager" /></span>
          <span class="brand-name">Shahin<span class="brand-ai">-AI</span></span>
        </div>

        <!-- Section navigation links -->
        <div class="nav-links" id="nav-links" [class.open]="menuOpen" role="navigation" aria-label="Section navigation">
          <!-- Drawer header: visible only on mobile, gives a clear close affordance -->
          <div class="drawer-header">
            <span class="drawer-title">{{ i18n.localize('Menu', 'القائمة') }}</span>
            <button type="button" class="drawer-close" (click)="closeMenu()" [attr.aria-label]="i18n.localize('Close menu', 'إغلاق القائمة')">
              <i class="pi pi-times" aria-hidden="true"></i>
            </button>
          </div>
          @for (link of navLinks; track link.id) {
            <a class="nav-link" [class.active]="activeSection === link.id" (click)="scrollTo(link.id); closeMenu()">
              {{ i18n.localize(link.en, link.ar) }}
            </a>
          }
          <!-- Mobile-only: in-menu auth + language -->
          <div class="menu-auth-group">
            <dos-language-switcher />
            @if (!auth.isLoggedIn()) {
              <a class="menu-auth-link" (click)="navigateToLogin(); closeMenu()">{{ i18n.translate('landing.navbar.signIn') }}</a>
            }
          </div>
        </div>
        <!-- Mobile overlay backdrop -->
        @if (menuOpen) {
          <div class="menu-backdrop" (click)="closeMenu()" aria-hidden="true"></div>
        }

        <div class="actions">
          <span class="desktop-only"><dos-language-switcher /></span>
          @if (auth.isLoggedIn()) {
            <a routerLink="/dashboard" class="nav-icon-btn" title="Dashboard" aria-label="Dashboard"><i class="pi pi-th-large"></i></a>
            <button class="nav-icon-btn" (click)="auth.logout()" [title]="i18n.translate('landing.navbar.logout')" [attr.aria-label]="i18n.translate('landing.navbar.logout')"><i class="pi pi-sign-out"></i></button>
          } @else {
            <button class="nav-icon-btn" (click)="navigateToLogin()" [title]="i18n.translate('landing.navbar.signIn')" [attr.aria-label]="i18n.translate('landing.navbar.signIn')"><i class="pi pi-sign-in" aria-hidden="true"></i><span class="sign-in-label">Sign In</span></button>
            <a routerLink="/register" class="nav-cta-btn">{{ i18n.localize('Start', 'ابدأ') }}</a>
          }
          <button class="nav-icon-btn hamburger" (click)="toggleMenu()" [attr.aria-expanded]="menuOpen" aria-label="Menu" aria-controls="nav-links"><i class="pi" [class.pi-bars]="!menuOpen" [class.pi-times]="menuOpen"></i></button>
        </div>
      </div>
    </nav>

    <!-- Sticky mobile CTA bar -->
    @if (showStickyCta && !auth.isLoggedIn()) {
      <div class="sticky-cta-bar">
        <a routerLink="/register" class="sticky-cta-primary">
          <i class="pi pi-play" aria-hidden="true"></i>
          {{ i18n.translate('landing.hero.ctaStart') }}
        </a>
        <a routerLink="/login" class="sticky-cta-secondary">
          {{ i18n.translate('landing.hero.ctaSignIn') }}
        </a>
      </div>
    }
  `,
    styles: [`
    .navbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      padding-top: env(safe-area-inset-top, 0px);
      background: rgba(var(--color-navy-dark-rgb), 0.88);
      -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(var(--color-white-rgb), 0.1);
      box-shadow: 0 2px 12px rgba(var(--color-black-rgb), 0.18);
      transition: background 0.3s, box-shadow 0.3s;
    }
    .navbar.scrolled {
      background: rgba(var(--color-navy-dark-rgb), 0.96);
      box-shadow: 0 4px 24px rgba(var(--color-black-rgb), 0.3);
      border-bottom-color: rgba(var(--color-white-rgb), 0.14);
    }
    .navbar-inner {
      max-width: 1300px; margin: 0 auto; padding: 0 var(--space-lg);
      display: flex; align-items: center; justify-content: space-between;
      height: 56px; min-width: 0;
    }
    .brand { display: flex; align-items: center; gap: 10px; cursor: pointer; }
    .brand-icon img { border-radius: var(--radius-pill); vertical-align: middle; }
    .brand-name { font-size: var(--font-size-lg); font-weight: var(--font-black); color: var(--text-on-primary); letter-spacing: -0.02em; }
    .brand-ai { color: var(--accent-gold); }

    /* Section nav links */
    .nav-links {
      display: flex; align-items: center; gap: 4px;
    }
    .nav-link {
      padding: 6px 12px; border-radius: var(--radius); font-size: var(--font-size-sm); font-weight: 600;
      color: rgba(var(--color-white-rgb), 0.85); cursor: pointer; transition: all 0.2s;
      white-space: nowrap; text-decoration: none;
    }
    .nav-link:hover { color: rgba(var(--color-white-rgb), 0.9); background: rgba(var(--color-white-rgb), 0.08); }
    .nav-link.active { color: var(--ld-cta-primary-color); background: rgba(var(--color-amber-400-rgb), 0.1); }
    .menu-auth-group { display: none; }

    .actions { display: flex; align-items: center; gap: 8px; }
    .nav-icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 44px; height: 44px; border-radius: var(--radius);
      background: rgba(var(--color-white-rgb), 0.16); border: 1px solid rgba(var(--color-white-rgb), 0.32);
      color: rgba(var(--color-white-rgb), 0.96); cursor: pointer; transition: all 0.2s;
      text-decoration: none; font-size: var(--font-size-base);
    }
    .nav-icon-btn:hover { background: rgba(var(--color-white-rgb), 0.24); border-color: rgba(var(--color-white-rgb), 0.45); }
    .nav-cta-btn {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 8px 20px; border-radius: var(--radius-pill);
      background: var(--ld-cta-primary-bg); border: 1px solid var(--ld-cta-primary-border); color: var(--ld-cta-primary-color);
      font-size: var(--font-size-sm); font-weight: var(--font-bold);
      text-decoration: none; cursor: pointer; transition: all 0.2s; white-space: nowrap;
    }
    .nav-cta-btn:hover { background: var(--ld-cta-primary-bg-hover); border-color: rgba(var(--color-amber-400-rgb), 0.7); }

    .sign-in-label {
      font-size: var(--font-size-sm); font-weight: 600;
      margin-left: 6px; white-space: nowrap;
    }
    .hamburger { display: none; }
    .menu-backdrop { display: none; }

    /* Drawer header — hidden on desktop, only used in mobile drawer */
    .drawer-header { display: none; }
    .drawer-close {
      width: 40px; height: 40px; border-radius: var(--radius);
      display: inline-flex; align-items: center; justify-content: center;
      background: rgba(var(--color-white-rgb), 0.08);
      border: 1px solid rgba(var(--color-white-rgb), 0.18);
      color: rgba(var(--color-white-rgb), 0.96);
      cursor: pointer; transition: all 0.2s; font-size: var(--font-size-base);
    }
    .drawer-close:hover { background: rgba(var(--color-white-rgb), 0.16); border-color: rgba(var(--color-white-rgb), 0.32); }
    .drawer-close:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }

    /* Sticky mobile CTA bar */
    .sticky-cta-bar {
      display: none;
    }

    @media (max-width: 900px) {
      /* hide desktop-only elements */
      .desktop-only { display: none !important; }
      .sign-in-label { display: none; }

      /* Backdrop: covers everything (including the navbar) so the drawer reads as a sheet */
      .menu-backdrop {
        position: fixed; inset: 0; z-index: 1100;
        background: rgba(var(--color-black-rgb), 0.55);
        -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
        animation: backdropFade 180ms ease-out both;
      }
      @keyframes backdropFade { from { opacity: 0; } to { opacity: 1; } }

      /* Side-sheet drawer: anchored to inline-end, RTL-correct via logical props */
      .nav-links {
        display: flex;
        position: fixed; top: 0; bottom: 0;
        inset-inline-end: 0;
        width: min(360px, 86vw); max-width: 100vw;
        flex-direction: column; align-items: stretch;
        padding: 0 0 max(16px, env(safe-area-inset-bottom, 0px));
        gap: 0;
        background: var(--primary-darker, #0a1f44);
        z-index: 1200;
        overflow-y: auto; overscroll-behavior: contain;
        box-shadow: 0 0 0 1px rgba(var(--color-white-rgb), 0.06),
                    -12px 0 32px rgba(var(--color-black-rgb), 0.45);
        transform: translateX(100%);
        visibility: hidden; pointer-events: none; overflow: hidden;
        transition: transform 240ms cubic-bezier(0.2, 0, 0, 1), visibility 0s linear 240ms;
      }
      /* RTL: drawer is on the start (left) side, slide from -100% */
      :host-context([dir="rtl"]) .nav-links { transform: translateX(-100%); box-shadow: 0 0 0 1px rgba(var(--color-white-rgb), 0.06), 12px 0 32px rgba(var(--color-black-rgb), 0.45); }
      .nav-links.open {
        transform: translateX(0);
        visibility: visible;
        transition: transform 240ms cubic-bezier(0.2, 0, 0, 1), visibility 0s;
      }

      /* Drawer header inside the sheet — own "Menu" label + clear close button. No logo, never duplicates the navbar brand. */
      .drawer-header {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px;
        padding: max(12px, env(safe-area-inset-top, 0px)) 16px 12px;
        border-bottom: 1px solid rgba(var(--color-white-rgb), 0.08);
        background: rgba(var(--color-black-rgb), 0.18);
      }
      .drawer-title {
        font-size: var(--font-size-md); font-weight: var(--font-black);
        color: rgba(var(--color-white-rgb), 0.96); letter-spacing: 0.02em;
      }

      .nav-link {
        padding: 14px 16px; margin: 0 12px; font-size: var(--font-size-base); width: auto;
        border-radius: var(--radius-md); text-align: start;
        color: rgba(var(--color-white-rgb), 0.92);
      }
      .nav-link + .nav-link { margin-top: 2px; }
      .nav-link:first-of-type { margin-top: 12px; }
      .nav-link:hover { background: rgba(var(--color-white-rgb), 0.08); color: #fff; }
      .nav-link.active { color: var(--ld-cta-primary-color); background: rgba(var(--color-amber-400-rgb), 0.12); }

      .menu-auth-group {
        display: flex; flex-direction: column; gap: 6px;
        margin: 16px 12px 0;
        padding-top: 16px;
        border-top: 1px solid rgba(var(--color-white-rgb), 0.1);
      }
      .menu-auth-link {
        padding: 14px 16px; border-radius: var(--radius-md);
        color: rgba(var(--color-white-rgb), 0.96); font-size: var(--font-size-base);
        font-weight: 600; cursor: pointer; transition: all 0.2s;
      }
      .menu-auth-link:hover { background: rgba(var(--color-white-rgb), 0.08); color: white; }
      .hamburger { display: inline-flex; }
      .drawer-header { display: flex; }

      /* Sticky mobile CTA bar */
      .sticky-cta-bar {
        display: flex; position: fixed; bottom: 0; left: 0; right: 0;
        z-index: var(--z-dropdown);
        padding: 10px 16px; gap: 10px;
        background: rgba(var(--color-navy-dark-rgb), 0.96); backdrop-filter: blur(16px);
        border-top: 1px solid rgba(var(--color-white-rgb), 0.1);
        box-shadow: 0 -4px 24px rgba(var(--color-black-rgb), 0.3);
        transform: translateY(0); transition: transform 0.3s;
      }
      .sticky-cta-primary {
        flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
        padding: 12px 16px; border-radius: var(--radius-pill);
        background: var(--ld-cta-primary-bg);
        border: 1.5px solid var(--ld-cta-primary-border); color: var(--ld-cta-primary-color);
        font-size: var(--font-size-sm); font-weight: var(--font-bold);
        text-decoration: none; white-space: nowrap;
      }
      .sticky-cta-primary:hover { background: var(--ld-cta-primary-bg-hover); }
      .sticky-cta-primary .pi { font-size: 12px; }
      .sticky-cta-secondary {
        display: flex; align-items: center; justify-content: center;
        padding: 12px 20px; border-radius: var(--radius-pill);
        background: var(--ld-cta-secondary-bg); border: 1.5px solid var(--ld-cta-secondary-border);
        color: var(--ld-cta-secondary-color); font-size: var(--font-size-sm); font-weight: 600;
        text-decoration: none; white-space: nowrap;
      }
      .sticky-cta-secondary:hover { background: var(--ld-cta-secondary-bg-hover); }
    }
  `]
})
export class NavbarSectionComponent implements OnDestroy {
  i18n = inject(I18nService);
  auth = inject(SessionService);
  private router = inject(Router);

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  menuOpen = false;
  scrolled = false;
  showStickyCta = false;
  activeSection = 'hero';
  private scrollHandler = () => this.onScroll();

  navLinks = [
    { id: 'stats',     ar: 'الإحصائيات',  en: 'Stats' },
    { id: 'pain',      ar: 'التحديات',     en: 'Challenges' },
    { id: 'how',       ar: 'كيف تعمل',     en: 'How It Works' },
    { id: 'solutions', ar: 'الخدمات',      en: 'Services' },
    { id: 'agents',    ar: 'الوكلاء',      en: 'AI Agents' },
    { id: 'ksa',       ar: 'السعودية',     en: 'KSA' },
    { id: 'features',  ar: 'القدرات',      en: 'Features' },
  ];

  private sectionIds = ['hero', 'stats', 'pain', 'how', 'solutions', 'agents', 'ksa', 'features', 'cta'];

  constructor() {
    afterNextRender(() => {
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler);
    document.body.style.overflow = '';
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }

  closeMenu(): void {
    this.menuOpen = false;
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuOpen) this.closeMenu();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.menuOpen && window.innerWidth > 900) this.closeMenu();
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private onScroll(): void {
    this.scrolled = window.scrollY > 50;
    // Show sticky CTA after scrolling past hero (viewport height)
    this.showStickyCta = window.scrollY > window.innerHeight * 0.8;
    const offset = window.scrollY + 80;
    for (let i = this.sectionIds.length - 1; i >= 0; i--) {
      const el = document.getElementById(this.sectionIds[i]);
      if (el && el.offsetTop <= offset) {
        this.activeSection = this.sectionIds[i];
        break;
      }
    }
  }
}
