/**
 * Phase M2 — Public marketing pages (pricing, trust, security, contact,
 * about, legal). Six standalone Angular components, all Carbon-tiles only,
 * all PUBLIC and TENANTLESS — they MUST NOT import AccessStore, MUST NOT
 * read tenant context, MUST NOT gate on permission_key.
 *
 * Wave 3 changes:
 *   - CommonModule removed; all loops use @for (Angular 17+ control flow).
 *   - Footer brand name uses brandDisplayName getter (fixes #15 hardcoding).
 *   - DosMarketingContactPageComponent now has a CTA row (fixes #10).
 */
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DosBrandEagleComponent } from '../brand/dos-brand-eagle.component';
import type { DosBrandCode } from '@dos/design-tokens';
import {
  DosCarbonBreadcrumbComponent,
  type DosCarbonBreadcrumbItem,
} from '../carbon/dos-carbon-breadcrumb.component';
import { DosCarbonTileComponent } from '../carbon/dos-carbon-tile.component';
import { DosCarbonButtonComponent } from '../carbon/dos-carbon-button.component';
import { DosCarbonNotificationComponent } from '../carbon/dos-carbon-notification.component';
import { DosCarbonInlineLoadingComponent } from '../carbon/dos-carbon-inline-loading.component';
import {
  DosDownloadKitCardComponent,
  DosGatedDownloadModalComponent,
  DosDownloadSuccessComponent,
} from './download-kit.components';
import type { MarketingAsset, MarketingDownloadEvent } from './download-kit.contract';

const SHARED_STYLES = `
  :host { display: block; min-height: 100vh; background: var(--cds-background, #ffffff); color: var(--cds-text-primary, #161616); }
  .dos-mp-wrap { max-width: 1200px; margin: 0 auto; padding: 4rem 1.5rem; }
  .dos-mp-hero { display: grid; gap: 1rem; padding-block-end: 3rem; border-block-end: 1px solid var(--cds-border-subtle, #e0e0e0); }
  .dos-mp-hero h1 { font: 600 clamp(2rem, 5vw, 3.5rem)/1.1 'IBM Plex Sans', system-ui; margin: 0; }
  .dos-mp-hero p  { font: 400 clamp(1rem, 2.2vw, 1.25rem)/1.5 'IBM Plex Sans', system-ui; max-width: 64ch; color: var(--cds-text-secondary, #525252); margin: 0; }
  .dos-mp-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 1rem; padding-block: 2.5rem; }
  dos-carbon-tile.dos-mp-tile { display: block; }
  .dos-mp-tile h3 { font: 600 1.125rem/1.3 'IBM Plex Sans'; margin: 0 0 0.75rem; }
  .dos-mp-tile p  { font: 400 0.9375rem/1.5 'IBM Plex Sans'; margin: 0; color: var(--cds-text-secondary, #525252); }
  .dos-mp-cta-row { display: flex; flex-wrap: wrap; gap: 0.75rem; padding-block-start: 2rem; }
  .dos-mp-cta-row dos-carbon-button { display: inline-flex; }
  .dos-mp-cta-row dos-carbon-button ::ng-deep .cds--btn { min-inline-size: 11rem; }
  .dos-mp-copy-stack { display: grid; gap: 0.75rem; }
  .dos-mp-copy-stack p { margin: 0; color: var(--cds-text-secondary, #525252); }
  .dos-mp-kit-stack { display: grid; gap: 1.25rem; padding-block: 2rem 0; }
  .dos-mp-footer { padding-block-start: 3rem; border-block-start: 1px solid var(--cds-border-subtle, #e0e0e0); display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
  .dos-mp-footer small { color: var(--cds-text-secondary, #525252); }
  @media (max-width: 480px) {
    .dos-mp-wrap { padding: 2.5rem 1rem; }
    .dos-mp-cta-row dos-carbon-button { flex: 1 1 100%; }
    .dos-mp-cta-row dos-carbon-button ::ng-deep .cds--btn { inline-size: 100%; }
  }
  [dir="rtl"] :host, :host[dir="rtl"] { font-family: 'IBM Plex Sans Arabic', 'Tajawal', system-ui; }
`;

interface MarketingTile {
  readonly title: string;
  readonly body: string;
  readonly tag?: string;
}

const I18N_PRICING = {
  en: {
    h1: 'Pricing built for governance teams',
    sub: 'Transparent pricing. Trial available. No payment gateway required to start.',
    tiles: [
      { title: 'Trial', body: 'Free 30-day trial. Full module library. EN/AR. Includes AI assistant.' },
      { title: 'Standard', body: 'Per-tenant subscription. Manual billing supported (no payment gateway needed).' },
      { title: 'Enterprise', body: 'On-prem deployment available. Dedicated workflow + AI runtime.' },
    ] as MarketingTile[],
  },
  ar: {
    h1: 'تسعير مصمم لفرق الحوكمة',
    sub: 'تسعير شفاف. تجربة مجانية متاحة. لا يلزم بوابة دفع للبدء.',
    tiles: [
      { title: 'تجريبي', body: 'تجربة مجانية لمدة 30 يومًا. مكتبة الوحدات الكاملة. إنجليزي/عربي.' },
      { title: 'قياسي', body: 'اشتراك لكل مستأجر. دعم الفوترة اليدوية بدون بوابة دفع.' },
      { title: 'مؤسسي', body: 'نشر داخلي متاح. سير عمل وتشغيل AI مخصص.' },
    ] as MarketingTile[],
  },
};

const I18N_TRUST = {
  en: {
    h1: 'Trust, security, and audit',
    sub: 'How DOS protects tenant data, enforces SoD, and proves every decision.',
    tiles: [
      { title: 'Tenant isolation', body: 'Schema-per-tenant + RLS + OpenFGA. Frontend visibility is never the boundary.' },
      { title: 'Audit ledger', body: 'Every write is recorded with who/when/why and signed by the workflow engine.' },
      { title: 'Separation of duties', body: 'SoD rules evaluated at AccessStore — no platform-admin bypass.' },
    ] as MarketingTile[],
  },
  ar: {
    h1: 'الثقة والأمان والتدقيق',
    sub: 'كيف تحمي منصة DOS بيانات المستأجر وتفرض الفصل بين المهام وتُثبت كل قرار.',
    tiles: [
      { title: 'عزل المستأجر', body: 'مخطط لكل مستأجر + RLS + OpenFGA. ظهور الواجهة الأمامية ليس هو الحد.' },
      { title: 'سجل التدقيق', body: 'يُسجَّل كل تعديل بتفاصيل من/متى/لماذا ويُوقَّع من محرك سير العمل.' },
      { title: 'الفصل بين المهام', body: 'تُقيَّم قواعد SoD في AccessStore — لا يوجد تجاوز لمسؤول المنصة.' },
    ] as MarketingTile[],
  },
};

const I18N_SECURITY = {
  en: {
    h1: 'Security posture',
    sub: 'Defence in depth from gateway through policy.',
    tiles: [
      { title: 'Gateway', body: 'JWT + tenant header enforced at the edge. PM2 cluster mode.' },
      { title: 'Secrets', body: 'Centralised secret rotation through platform/secrets/.' },
      { title: 'Policy', body: 'Cerbos + OpenFGA + DAuth. SoD baked into AccessStore.' },
    ] as MarketingTile[],
  },
  ar: {
    h1: 'الوضع الأمني',
    sub: 'دفاع متعمق من البوابة حتى السياسة.',
    tiles: [
      { title: 'البوابة', body: 'JWT + رأس المستأجر يُفرَض عند الحافة. وضع عنقودي PM2.' },
      { title: 'الأسرار', body: 'تدوير مركزي للأسرار عبر platform/secrets/.' },
      { title: 'السياسة', body: 'Cerbos + OpenFGA + DAuth. SoD مدمج في AccessStore.' },
    ] as MarketingTile[],
  },
};

const I18N_CONTACT = {
  en: {
    h1: 'Contact us',
    sub: 'Talk to a governance specialist or request a guided demo.',
    cta: 'Get in touch',
    tiles: [
      { title: 'Sales', body: 'sales@shahin-ai.com' },
      { title: 'Support', body: 'support@shahin-ai.com' },
      { title: 'Security disclosure', body: 'security@shahin-ai.com' },
    ] as MarketingTile[],
  },
  ar: {
    h1: 'تواصل معنا',
    sub: 'تحدث إلى متخصص حوكمة أو اطلب عرضًا توجيهيًا.',
    cta: 'تواصل معنا',
    tiles: [
      { title: 'المبيعات', body: 'sales@shahin-ai.com' },
      { title: 'الدعم', body: 'support@shahin-ai.com' },
      { title: 'الإفصاح الأمني', body: 'security@shahin-ai.com' },
    ] as MarketingTile[],
  },
};

const I18N_ABOUT = {
  en: {
    h1: 'About Shahin-AI',
    sub: 'Governance that sees the path — and protects it.',
    tiles: [
      { title: 'Mission', body: 'Make GRC operational, AI-native, and bilingual by default.' },
      { title: 'Platform', body: 'Four-tier: platform DNA + microservices + module library + product consumers.' },
      { title: 'Brands', body: 'Shahin-AI, Dogan-AI, Dogan-Consult, Dogan-Hub, Dogan-Lab.' },
    ] as MarketingTile[],
  },
  ar: {
    h1: 'عن شاهين-AI',
    sub: 'حوكمة ترى الطريق — وتحميه.',
    tiles: [
      { title: 'المهمة', body: 'جعل GRC تشغيليًا وذكيًا ومُوحَّدًا ثنائي اللغة افتراضيًا.' },
      { title: 'المنصة', body: 'أربع طبقات: DNA المنصة + الخدمات المصغرة + مكتبة الوحدات + المنتجات.' },
      { title: 'العلامات التجارية', body: 'شاهين-AI، دوغان-AI، دوغان-كونسلت، دوغان-هاب، دوغان-لاب.' },
    ] as MarketingTile[],
  },
};

const I18N_LEGAL = {
  en: {
    h1: 'Legal',
    sub: 'Privacy, terms, and acceptable use.',
    tiles: [
      { title: 'Privacy policy', body: 'Tenant data is isolated. Telemetry is opt-in. No third-party trackers on this site.' },
      { title: 'Terms of service', body: 'Trial subscriptions and standard subscriptions are governed by the order form.' },
      { title: 'Acceptable use', body: 'No abuse, no scraping, no bypass of permission checks.' },
    ] as MarketingTile[],
  },
  ar: {
    h1: 'الشؤون القانونية',
    sub: 'الخصوصية والشروط والاستخدام المقبول.',
    tiles: [
      { title: 'سياسة الخصوصية', body: 'بيانات المستأجر معزولة. القياس عن بُعد اختياري. لا متعقبات لطرف ثالث.' },
      { title: 'شروط الخدمة', body: 'تخضع الاشتراكات التجريبية والقياسية لنموذج الطلب.' },
      { title: 'الاستخدام المقبول', body: 'ممنوع الإساءة، التجريف، أو تجاوز فحوصات الأذونات.' },
    ] as MarketingTile[],
  },
};

type PublicLocale = 'en' | 'ar';

@Component({
  selector: 'dos-marketing-pricing',
  standalone: true,
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent, DosCarbonTileComponent, DosCarbonButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="dos-mp-wrap" [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'" data-page-id="marketing.pricing.page">
      <dos-carbon-breadcrumb [items]="breadcrumb"></dos-carbon-breadcrumb>
      <header class="dos-mp-hero" data-section-id="hero">
        <dos-brand-eagle [brandCode]="brandCode" pictogramSize="lg"></dos-brand-eagle>
        <h1>{{ copy().h1 }}</h1>
        <p>{{ copy().sub }}</p>
      </header>
      <section class="dos-mp-tiles" data-section-id="tiles" data-cds-component="tiles">
        @for (t of copy().tiles; track t.title) {
          <dos-carbon-tile class="dos-mp-tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </dos-carbon-tile>
        }
      </section>
      <div class="dos-mp-cta-row" data-section-id="cta">
        <dos-carbon-button kind="primary" size="lg" (clicked)="openRoute(ctaPrimaryHref)">{{ ctaPrimaryLabel }}</dos-carbon-button>
        <dos-carbon-button kind="tertiary" size="lg" (clicked)="openRoute(ctaSecondaryHref)">{{ ctaSecondaryLabel }}</dos-carbon-button>
      </div>
      <footer class="dos-mp-footer" data-section-id="footer"><small>© {{ year }} {{ brandDisplayName }}</small></footer>
    </main>
  `,
  styles: [SHARED_STYLES],
})
export class DosMarketingPricingPageComponent {
  @Input() brandCode: DosBrandCode = 'shahin-ai';
  @Input() locale: PublicLocale = 'en';
  @Input() ctaPrimaryHref = '/register';
  @Input() ctaPrimaryLabel = 'Start trial';
  @Input() ctaSecondaryHref = '/contact';
  @Input() ctaSecondaryLabel = 'Talk to sales';
  readonly year = new Date().getFullYear();
  openRoute(href: string): void { if (typeof window !== 'undefined') window.location.assign(href); }
  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_PRICING[this.locale] ?? I18N_PRICING.en; }
}

@Component({
  selector: 'dos-marketing-trust',
  standalone: true,
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent, DosCarbonTileComponent, DosCarbonButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="dos-mp-wrap" [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'" data-page-id="marketing.trust.page">
      <dos-carbon-breadcrumb [items]="breadcrumb"></dos-carbon-breadcrumb>
      <header class="dos-mp-hero" data-section-id="hero">
        <dos-brand-eagle [brandCode]="brandCode" pictogramSize="lg"></dos-brand-eagle>
        <h1>{{ copy().h1 }}</h1>
        <p>{{ copy().sub }}</p>
      </header>
      <section class="dos-mp-tiles" data-section-id="tiles" data-cds-component="tiles">
        @for (t of copy().tiles; track t.title) {
          <dos-carbon-tile class="dos-mp-tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </dos-carbon-tile>
        }
      </section>
      <div class="dos-mp-cta-row" data-section-id="cta">
        <dos-carbon-button kind="primary" size="lg" (clicked)="openRoute(ctaHref)">{{ ctaLabel }}</dos-carbon-button>
      </div>
      <footer class="dos-mp-footer" data-section-id="footer"><small>© {{ year }} {{ brandDisplayName }}</small></footer>
    </main>
  `,
  styles: [SHARED_STYLES],
})
export class DosMarketingTrustPageComponent {
  @Input() brandCode: DosBrandCode = 'shahin-ai';
  @Input() locale: PublicLocale = 'en';
  @Input() ctaHref = '/security';
  @Input() ctaLabel = 'Security details';
  readonly year = new Date().getFullYear();
  openRoute(href: string): void { if (typeof window !== 'undefined') window.location.assign(href); }
  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_TRUST[this.locale] ?? I18N_TRUST.en; }
}

@Component({
  selector: 'dos-marketing-security',
  standalone: true,
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent, DosCarbonTileComponent, DosCarbonButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="dos-mp-wrap" [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'" data-page-id="marketing.security.page">
      <dos-carbon-breadcrumb [items]="breadcrumb"></dos-carbon-breadcrumb>
      <header class="dos-mp-hero" data-section-id="hero">
        <dos-brand-eagle [brandCode]="brandCode" pictogramSize="lg"></dos-brand-eagle>
        <h1>{{ copy().h1 }}</h1>
        <p>{{ copy().sub }}</p>
      </header>
      <section class="dos-mp-tiles" data-section-id="tiles" data-cds-component="tiles">
        @for (t of copy().tiles; track t.title) {
          <dos-carbon-tile class="dos-mp-tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </dos-carbon-tile>
        }
      </section>
      <div class="dos-mp-cta-row" data-section-id="cta">
        <dos-carbon-button kind="primary" size="lg" (clicked)="openRoute(ctaHref)">{{ ctaLabel }}</dos-carbon-button>
      </div>
      <footer class="dos-mp-footer" data-section-id="footer"><small>© {{ year }} {{ brandDisplayName }}</small></footer>
    </main>
  `,
  styles: [SHARED_STYLES],
})
export class DosMarketingSecurityPageComponent {
  @Input() brandCode: DosBrandCode = 'shahin-ai';
  @Input() locale: PublicLocale = 'en';
  @Input() ctaHref = '/contact';
  @Input() ctaLabel = 'Report a vulnerability';
  readonly year = new Date().getFullYear();
  openRoute(href: string): void { if (typeof window !== 'undefined') window.location.assign(href); }
  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_SECURITY[this.locale] ?? I18N_SECURITY.en; }
}

@Component({
  selector: 'dos-marketing-contact',
  standalone: true,
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent, DosCarbonTileComponent, DosCarbonButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="dos-mp-wrap" [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'" data-page-id="marketing.contact.page">
      <dos-carbon-breadcrumb [items]="breadcrumb"></dos-carbon-breadcrumb>
      <header class="dos-mp-hero" data-section-id="hero">
        <dos-brand-eagle [brandCode]="brandCode" pictogramSize="lg"></dos-brand-eagle>
        <h1>{{ copy().h1 }}</h1>
        <p>{{ copy().sub }}</p>
      </header>
      <section class="dos-mp-tiles" data-section-id="tiles" data-cds-component="tiles">
        @for (t of copy().tiles; track t.title) {
          <dos-carbon-tile class="dos-mp-tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </dos-carbon-tile>
        }
      </section>
      <!-- Wave 3 fix #10: Contact page was missing a CTA — added below -->
      <div class="dos-mp-cta-row" data-section-id="cta">
        <dos-carbon-button kind="primary" size="lg" (clicked)="openRoute(ctaHref)">{{ copy().cta }}</dos-carbon-button>
      </div>
      <footer class="dos-mp-footer" data-section-id="footer"><small>© {{ year }} {{ brandDisplayName }}</small></footer>
    </main>
  `,
  styles: [SHARED_STYLES],
})
export class DosMarketingContactPageComponent {
  @Input() brandCode: DosBrandCode = 'shahin-ai';
  @Input() locale: PublicLocale = 'en';
  @Input() ctaHref = '/register';
  readonly year = new Date().getFullYear();
  openRoute(href: string): void { if (typeof window !== 'undefined') window.location.assign(href); }
  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_CONTACT[this.locale] ?? I18N_CONTACT.en; }
}

@Component({
  selector: 'dos-marketing-about',
  standalone: true,
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent, DosCarbonTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="dos-mp-wrap" [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'" data-page-id="marketing.about.page">
      <dos-carbon-breadcrumb [items]="breadcrumb"></dos-carbon-breadcrumb>
      <header class="dos-mp-hero" data-section-id="hero">
        <dos-brand-eagle [brandCode]="brandCode" pictogramSize="lg"></dos-brand-eagle>
        <h1>{{ copy().h1 }}</h1>
        <p>{{ copy().sub }}</p>
      </header>
      <section class="dos-mp-tiles" data-section-id="tiles" data-cds-component="tiles">
        @for (t of copy().tiles; track t.title) {
          <dos-carbon-tile class="dos-mp-tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </dos-carbon-tile>
        }
      </section>
      <footer class="dos-mp-footer" data-section-id="footer"><small>© {{ year }} {{ brandDisplayName }}</small></footer>
    </main>
  `,
  styles: [SHARED_STYLES],
})
export class DosMarketingAboutPageComponent {
  @Input() brandCode: DosBrandCode = 'shahin-ai';
  @Input() locale: PublicLocale = 'en';
  readonly year = new Date().getFullYear();
  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_ABOUT[this.locale] ?? I18N_ABOUT.en; }
}

@Component({
  selector: 'dos-marketing-legal',
  standalone: true,
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent, DosCarbonTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="dos-mp-wrap" [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'" data-page-id="marketing.legal.page">
      <dos-carbon-breadcrumb [items]="breadcrumb"></dos-carbon-breadcrumb>
      <header class="dos-mp-hero" data-section-id="hero">
        <dos-brand-eagle [brandCode]="brandCode" pictogramSize="lg"></dos-brand-eagle>
        <h1>{{ copy().h1 }}</h1>
        <p>{{ copy().sub }}</p>
      </header>
      <section class="dos-mp-tiles" data-section-id="tiles" data-cds-component="tiles">
        @for (t of copy().tiles; track t.title) {
          <dos-carbon-tile class="dos-mp-tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </dos-carbon-tile>
        }
      </section>
      <footer class="dos-mp-footer" data-section-id="footer"><small>© {{ year }} {{ brandDisplayName }}</small></footer>
    </main>
  `,
  styles: [SHARED_STYLES],
})
export class DosMarketingLegalPageComponent {
  @Input() brandCode: DosBrandCode = 'shahin-ai';
  @Input() locale: PublicLocale = 'en';
  readonly year = new Date().getFullYear();
  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_LEGAL[this.locale] ?? I18N_LEGAL.en; }
}

const I18N_PLATFORM = {
  en: {
    h1: 'Platform DNA for governed AI operations',
    sub: 'The Shahin public site is only the front door. Under it sits the four-tier DOS platform: platform DNA, services, modules, and product composition.',
    tiles: [
      { title: 'Platform DNA', body: 'Foundation, DAuth, Workflow, Audit, AI OS, and the UI System stay unconditional and shared.' },
      { title: 'Tenant-safe modules', body: 'Risk, controls, evidence, policy, audit, and vendor workflows stay entitled by module rather than hardcoded by product.' },
      { title: 'Real microservices', body: 'Operational surfaces resolve through Express services and PM2-managed workloads rather than front-end-only placeholders.' },
      { title: 'Operator proof', body: 'Every approval, workflow action, and AI-assisted decision leaves a reversible, auditable record.' },
    ] as MarketingTile[],
  },
  ar: {
    h1: 'بنية منصة لإدارة الذكاء الاصطناعي بشكل منضبط',
    sub: 'موقع شاهين العام هو الباب الأمامي فقط. تحته تعمل منصة DOS ذات الطبقات الأربع: DNA المنصة، الخدمات، الوحدات، وتركيب المنتج.',
    tiles: [
      { title: 'DNA المنصة', body: 'تبقى Foundation و DAuth و Workflow و Audit و AI OS وواجهة النظام طبقات مشتركة وغير مشروطة.' },
      { title: 'وحدات آمنة للمستأجر', body: 'تبقى المخاطر والضوابط والأدلة والسياسات والتدقيق والموردون مؤهلة بالوحدة لا بالمنتج الصلب.' },
      { title: 'خدمات حقيقية', body: 'تُحل الأسطح التشغيلية عبر خدمات Express وأحمال PM2 لا عبر واجهات شكلية فقط.' },
      { title: 'إثبات تشغيلي', body: 'كل موافقة أو إجراء سير عمل أو قرار مدعوم بالذكاء يترك أثراً قابلاً للتدقيق والعكس.' },
    ] as MarketingTile[],
  },
};

const I18N_RESOURCES = {
  en: {
    h1: 'Resources for evaluation teams',
    sub: 'Use the public material in the order most teams buy: platform overview, executive kit, trust evidence, then a live walkthrough.',
    tiles: [
      { title: 'Executive Kit', body: 'Board-ready summary for sponsors who need the fast version of Shahin before a working session.' },
      { title: 'Trust Surface', body: 'Security, audit, and tenant-isolation proof for reviewers who need architectural clarity.' },
      { title: 'Live Demo', body: 'Book a product walkthrough once the business and security reviewers are aligned.' },
    ] as MarketingTile[],
  },
  ar: {
    h1: 'موارد فرق التقييم',
    sub: 'استخدم المواد العامة بالترتيب الذي تشتري به أغلب الفرق: نظرة المنصة، الحزمة التنفيذية، أدلة الثقة، ثم العرض المباشر.',
    tiles: [
      { title: 'الحزمة التنفيذية', body: 'ملخص مناسب لمجلس الإدارة للجهات الراعية التي تحتاج النسخة السريعة قبل الجلسة العملية.' },
      { title: 'سطح الثقة', body: 'إثبات الأمان والتدقيق وعزل المستأجر للمراجعين الذين يحتاجون وضوحاً معمارياً.' },
      { title: 'عرض مباشر', body: 'احجز جولة منتج عندما تتفق الجهات التجارية والأمنية على الخطوة التالية.' },
    ] as MarketingTile[],
  },
};

const I18N_EXECUTIVE_KIT = {
  en: {
    h1: 'Executive Kit',
    sub: 'A gated public package for executive sponsors who need the platform narrative, commercial framing, and rollout posture in one place.',
    noteTitle: 'Public, ungated page. Gated asset.',
    noteBody: 'The page is public; the asset request captures the sponsor context before unlock.',
    fallback: 'Loading the current Shahin executive asset…',
  },
  ar: {
    h1: 'الحزمة التنفيذية',
    sub: 'حزمة عامة محمية للجهات التنفيذية التي تحتاج سرد المنصة والإطار التجاري ووضع الإطلاق في مكان واحد.',
    noteTitle: 'صفحة عامة، أصل محمي.',
    noteBody: 'الصفحة عامة، لكن طلب الأصل يلتقط سياق الجهة الراعية قبل الفتح.',
    fallback: 'جارٍ تحميل أصل شاهين التنفيذي الحالي…',
  },
};

@Component({
  selector: 'dos-marketing-platform',
  standalone: true,
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent, DosCarbonTileComponent, DosCarbonButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="dos-mp-wrap" [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'" data-page-id="marketing.platform.page">
      <dos-carbon-breadcrumb [items]="breadcrumb"></dos-carbon-breadcrumb>
      <header class="dos-mp-hero" data-section-id="hero">
        <dos-brand-eagle [brandCode]="brandCode" pictogramSize="lg"></dos-brand-eagle>
        <h1>{{ copy().h1 }}</h1>
        <p>{{ copy().sub }}</p>
      </header>
      <section class="dos-mp-tiles" data-section-id="tiles">
        @for (t of copy().tiles; track t.title) {
          <dos-carbon-tile class="dos-mp-tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </dos-carbon-tile>
        }
      </section>
      <div class="dos-mp-cta-row" data-section-id="cta">
        <dos-carbon-button kind="primary" size="lg" (clicked)="openRoute('/pricing')">{{ locale === 'ar' ? 'استعرض التسعير' : 'See pricing' }}</dos-carbon-button>
        <dos-carbon-button kind="tertiary" size="lg" (clicked)="openRoute('/trust')">{{ locale === 'ar' ? 'مركز الثقة' : 'Trust center' }}</dos-carbon-button>
      </div>
      <footer class="dos-mp-footer" data-section-id="footer"><small>© {{ year }} {{ brandDisplayName }}</small></footer>
    </main>
  `,
  styles: [SHARED_STYLES],
})
export class DosMarketingPlatformPageComponent {
  @Input() brandCode: DosBrandCode = 'shahin-ai';
  @Input() locale: PublicLocale = 'en';
  readonly year = new Date().getFullYear();
  openRoute(href: string): void { if (typeof window !== 'undefined') window.location.assign(href); }
  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_PLATFORM[this.locale] ?? I18N_PLATFORM.en; }
}

@Component({
  selector: 'dos-marketing-resources',
  standalone: true,
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent, DosCarbonTileComponent, DosCarbonButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="dos-mp-wrap" [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'" data-page-id="marketing.resources.page">
      <dos-carbon-breadcrumb [items]="breadcrumb"></dos-carbon-breadcrumb>
      <header class="dos-mp-hero" data-section-id="hero">
        <dos-brand-eagle [brandCode]="brandCode" pictogramSize="lg"></dos-brand-eagle>
        <h1>{{ copy().h1 }}</h1>
        <p>{{ copy().sub }}</p>
      </header>
      <section class="dos-mp-tiles" data-section-id="tiles">
        @for (t of copy().tiles; track t.title) {
          <dos-carbon-tile class="dos-mp-tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </dos-carbon-tile>
        }
      </section>
      <div class="dos-mp-cta-row" data-section-id="cta">
        <dos-carbon-button kind="primary" size="lg" (clicked)="openRoute('/resources/executive-kit')">{{ locale === 'ar' ? 'افتح الحزمة التنفيذية' : 'Open executive kit' }}</dos-carbon-button>
        <dos-carbon-button kind="tertiary" size="lg" (clicked)="openRoute('/trust')">{{ locale === 'ar' ? 'إثبات الثقة' : 'Review trust proof' }}</dos-carbon-button>
        <dos-carbon-button kind="ghost" size="lg" (clicked)="openRoute('/contact')">{{ locale === 'ar' ? 'احجز عرضاً' : 'Book a live demo' }}</dos-carbon-button>
      </div>
      <footer class="dos-mp-footer" data-section-id="footer"><small>© {{ year }} {{ brandDisplayName }}</small></footer>
    </main>
  `,
  styles: [SHARED_STYLES],
})
export class DosMarketingResourcesPageComponent {
  @Input() brandCode: DosBrandCode = 'shahin-ai';
  @Input() locale: PublicLocale = 'en';
  readonly year = new Date().getFullYear();
  openRoute(href: string): void { if (typeof window !== 'undefined') window.location.assign(href); }
  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_RESOURCES[this.locale] ?? I18N_RESOURCES.en; }
}

@Component({
  selector: 'dos-marketing-executive-kit-page',
  standalone: true,
  imports: [
    DosBrandEagleComponent,
    DosCarbonBreadcrumbComponent,
    DosCarbonTileComponent,
    DosCarbonButtonComponent,
    DosCarbonNotificationComponent,
    DosCarbonInlineLoadingComponent,
    DosDownloadKitCardComponent,
    DosGatedDownloadModalComponent,
    DosDownloadSuccessComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="dos-mp-wrap" [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'" data-page-id="marketing.executive-kit.page">
      <dos-carbon-breadcrumb [items]="breadcrumb"></dos-carbon-breadcrumb>
      <header class="dos-mp-hero" data-section-id="hero">
        <dos-brand-eagle [brandCode]="brandCode" pictogramSize="lg"></dos-brand-eagle>
        <h1>{{ copy().h1 }}</h1>
        <p>{{ copy().sub }}</p>
        <div class="dos-mp-cta-row">
          <dos-carbon-button kind="primary" size="lg" (clicked)="openRoute('/pricing')">{{ locale === 'ar' ? 'استعرض التسعير' : 'See pricing' }}</dos-carbon-button>
          <dos-carbon-button kind="tertiary" size="lg" (clicked)="openRoute('/contact')">{{ locale === 'ar' ? 'تحدث إلى الفريق' : 'Talk to the team' }}</dos-carbon-button>
        </div>
      </header>
      <section class="dos-mp-kit-stack" data-section-id="kit-flow">
        <dos-carbon-notification
          variant="inline"
          kind="info"
          [title]="copy().noteTitle"
          [subtitle]="copy().noteBody"
          [hideClose]="true"
        ></dos-carbon-notification>

        @if (featuredAsset(); as asset) {
          <dos-download-kit-card
            [asset]="asset"
            [ctaLabel]="locale === 'ar' ? 'اطلب الحزمة' : 'Request executive kit'"
            [gatedLabel]="locale === 'ar' ? 'يتطلب طلباً' : 'Request required'"
            [openLabel]="locale === 'ar' ? 'تنزيل مباشر' : 'Open download'"
            (event)="onDownloadEvent($event)"
          ></dos-download-kit-card>
        } @else {
          <dos-carbon-inline-loading state="active" [loadingText]="copy().fallback"></dos-carbon-inline-loading>
        }

        <div class="dos-mp-tiles" data-section-id="reasons">
          <dos-carbon-tile class="dos-mp-tile">
            <h3>{{ locale === 'ar' ? 'ماذا يوجد داخل الحزمة؟' : 'What is inside the kit?' }}</h3>
            <p>{{ locale === 'ar' ? 'سرد تنفيذي، وضع الإطلاق، رؤية التسعير، ونظرة سريعة على ضوابط الأمان.' : 'Executive narrative, rollout posture, commercial framing, and a concise view of the control posture.' }}</p>
          </dos-carbon-tile>
          <dos-carbon-tile class="dos-mp-tile">
            <h3>{{ locale === 'ar' ? 'متى تستخدمها؟' : 'When should you use it?' }}</h3>
            <p>{{ locale === 'ar' ? 'عندما يحتاج الراعي التنفيذي أو لجنة المشتريات إلى نسخة مختصرة قبل العرض التشغيلي.' : 'When sponsors or procurement reviewers need the short version before a working product session.' }}</p>
          </dos-carbon-tile>
          <dos-carbon-tile class="dos-mp-tile">
            <h3>{{ locale === 'ar' ? 'ما الخطوة التالية؟' : 'What happens next?' }}</h3>
            <p>{{ locale === 'ar' ? 'بعد فتح الحزمة يمكنك الانتقال مباشرة إلى الثقة أو التسعير أو ترتيب عرض مباشر.' : 'After unlock, move straight into trust review, pricing alignment, or a live walkthrough.' }}</p>
          </dos-carbon-tile>
        </div>

        @if (downloadSuccess()) {
          <dos-download-success
            [asset]="featuredAsset()"
            [bookDemoHref]="'/contact'"
            [exploreHref]="'/platform'"
            (event)="onDownloadEvent($event)"
          ></dos-download-success>
        }

        @if (modalOpen()) {
          <dos-gated-download-modal
            [asset]="featuredAsset()"
            [open]="true"
            [title]="copy().h1"
            (event)="onDownloadEvent($event)"
            (closed)="onModalClosed()"
          ></dos-gated-download-modal>
        }
      </section>
      <footer class="dos-mp-footer" data-section-id="footer"><small>© {{ year }} {{ brandDisplayName }}</small></footer>
    </main>
  `,
  styles: [SHARED_STYLES],
})
export class DosMarketingExecutiveKitPageComponent implements OnInit {
  @Input() brandCode: DosBrandCode = 'shahin-ai';
  @Input() locale: PublicLocale = 'en';
  @ViewChild(DosGatedDownloadModalComponent)
  private readonly gatedDownloadModal?: DosGatedDownloadModalComponent;

  readonly year = new Date().getFullYear();
  readonly modalOpen = signal(false);
  readonly downloadSuccess = signal(false);
  readonly downloadAssets = signal<readonly MarketingAsset[]>([]);
  private readonly featuredAssetKey = 'shahin-executive-overview';

  async ngOnInit(): Promise<void> {
    const response = await fetch(`/api/ui-os/marketing/assets?brand=${this.brandCode}&locale=${this.locale}`, {
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    }).catch((): null => null);
    if (!response?.ok) return;
    const payload = await response.json().catch(() => ({ assets: [] as MarketingAsset[] }));
    this.downloadAssets.set((payload as { assets?: MarketingAsset[] }).assets ?? []);
  }

  openRoute(href: string): void {
    if (typeof window !== 'undefined') window.location.assign(href);
  }

  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_EXECUTIVE_KIT[this.locale] ?? I18N_EXECUTIVE_KIT.en; }

  featuredAsset(): MarketingAsset | null {
    const assets = this.downloadAssets();
    return assets.find((asset) => asset.assetKey === this.featuredAssetKey && asset.locale === this.locale)
      ?? assets.find((asset) => asset.assetKey === this.featuredAssetKey)
      ?? null;
  }

  async onDownloadEvent(event: MarketingDownloadEvent): Promise<void> {
    if (event.key === 'marketing.download.opened') {
      const asset = this.featuredAsset();
      if (asset?.isGated) {
        this.modalOpen.set(true);
      } else if (asset?.fileUrl && typeof window !== 'undefined') {
        window.open(asset.fileUrl, '_blank', 'noopener');
        this.downloadSuccess.set(true);
      }
    }
    if (event.key === 'marketing.download.submitted') {
      await this.submitMarketingDownload(event);
    }
    if (event.key === 'marketing.download.completed') {
      this.modalOpen.set(false);
      this.downloadSuccess.set(true);
    }
  }

  onModalClosed(): void {
    this.modalOpen.set(false);
  }

  private async submitMarketingDownload(event: MarketingDownloadEvent): Promise<void> {
    const response = await fetch('/api/ui-os/marketing/downloads', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'omit',
      body: JSON.stringify(event),
    }).catch((error: unknown) => {
      throw new Error((error as Error)?.message || 'download_submit_failed');
    });

    if (response.ok) {
      this.gatedDownloadModal?.markCompleted();
      return;
    }

    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.message === 'string'
      ? payload.message
      : typeof payload?.error === 'string'
        ? payload.error
        : this.locale === 'ar'
          ? 'تعذر إرسال طلب الحزمة التنفيذية.'
          : 'Unable to submit the executive kit request.';
    this.gatedDownloadModal?.markFailed(message);
  }
}

export const MARKETING_PUBLIC_PAGE_KEYS = [
  'marketing.pricing.page',
  'marketing.trust.page',
  'marketing.security.page',
  'marketing.contact.page',
  'marketing.about.page',
  'marketing.legal.page',
] as const;
export type MarketingPublicPageKey = (typeof MARKETING_PUBLIC_PAGE_KEYS)[number];
