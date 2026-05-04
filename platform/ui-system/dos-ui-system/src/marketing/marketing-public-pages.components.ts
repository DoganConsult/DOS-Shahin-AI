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
} from '@angular/core';
import { DosBrandEagleComponent } from '../brand/dos-brand-eagle.component';
import type { DosBrandCode } from '@dos/design-tokens';
import {
  DosCarbonBreadcrumbComponent,
  type DosCarbonBreadcrumbItem,
} from '../carbon/dos-carbon-breadcrumb.component';

const SHARED_STYLES = `
  :host { display: block; min-height: 100vh; background: var(--cds-background, #ffffff); color: var(--cds-text-primary, #161616); }
  .dos-mp-wrap { max-width: 1200px; margin: 0 auto; padding: 4rem 1.5rem; }
  .dos-mp-hero { display: grid; gap: 1rem; padding-block-end: 3rem; border-block-end: 1px solid var(--cds-border-subtle, #e0e0e0); }
  .dos-mp-hero h1 { font: 600 clamp(2rem, 5vw, 3.5rem)/1.1 'IBM Plex Sans', system-ui; margin: 0; }
  .dos-mp-hero p  { font: 400 clamp(1rem, 2.2vw, 1.25rem)/1.5 'IBM Plex Sans', system-ui; max-width: 64ch; color: var(--cds-text-secondary, #525252); margin: 0; }
  .dos-mp-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 1rem; padding-block: 2.5rem; }
  .dos-mp-tile  { padding: 1.5rem; border: 1px solid var(--cds-border-subtle, #e0e0e0); border-radius: 0; background: var(--cds-layer, #f4f4f4); display: flex; flex-direction: column; gap: 0.75rem; }
  .dos-mp-tile h3 { font: 600 1.125rem/1.3 'IBM Plex Sans'; margin: 0; }
  .dos-mp-tile p  { font: 400 0.9375rem/1.5 'IBM Plex Sans'; margin: 0; color: var(--cds-text-secondary, #525252); }
  .dos-mp-cta-row { display: flex; flex-wrap: wrap; gap: 0.75rem; padding-block-start: 2rem; }
  .dos-mp-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; min-width: 11rem; padding: 0 1rem; border: 1px solid transparent; font: 500 0.875rem/1 'IBM Plex Sans'; cursor: pointer; text-decoration: none; }
  .dos-mp-btn--primary   { background: var(--cds-button-primary, #0f62fe); color: #fff; }
  .dos-mp-btn--secondary { background: transparent; color: var(--cds-button-primary, #0f62fe); border-color: var(--cds-button-primary, #0f62fe); }
  .dos-mp-footer { padding-block-start: 3rem; border-block-start: 1px solid var(--cds-border-subtle, #e0e0e0); display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
  .dos-mp-footer small { color: var(--cds-text-secondary, #525252); }
  @media (max-width: 480px) {
    .dos-mp-wrap { padding: 2.5rem 1rem; }
    .dos-mp-cta-row .dos-mp-btn { flex: 1 1 100%; }
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
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent],
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
          <article class="dos-mp-tile" data-cds-component="tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </article>
        }
      </section>
      <div class="dos-mp-cta-row" data-section-id="cta">
        <a class="dos-mp-btn dos-mp-btn--primary" [attr.href]="ctaPrimaryHref" data-cds-component="button">{{ ctaPrimaryLabel }}</a>
        <a class="dos-mp-btn dos-mp-btn--secondary" [attr.href]="ctaSecondaryHref" data-cds-component="button">{{ ctaSecondaryLabel }}</a>
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
  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_PRICING[this.locale] ?? I18N_PRICING.en; }
}

@Component({
  selector: 'dos-marketing-trust',
  standalone: true,
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent],
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
          <article class="dos-mp-tile" data-cds-component="tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </article>
        }
      </section>
      <div class="dos-mp-cta-row" data-section-id="cta">
        <a class="dos-mp-btn dos-mp-btn--primary" [attr.href]="ctaHref" data-cds-component="button">{{ ctaLabel }}</a>
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
  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_TRUST[this.locale] ?? I18N_TRUST.en; }
}

@Component({
  selector: 'dos-marketing-security',
  standalone: true,
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent],
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
          <article class="dos-mp-tile" data-cds-component="tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </article>
        }
      </section>
      <div class="dos-mp-cta-row" data-section-id="cta">
        <a class="dos-mp-btn dos-mp-btn--primary" [attr.href]="ctaHref" data-cds-component="button">{{ ctaLabel }}</a>
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
  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_SECURITY[this.locale] ?? I18N_SECURITY.en; }
}

@Component({
  selector: 'dos-marketing-contact',
  standalone: true,
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent],
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
          <article class="dos-mp-tile" data-cds-component="tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </article>
        }
      </section>
      <!-- Wave 3 fix #10: Contact page was missing a CTA — added below -->
      <div class="dos-mp-cta-row" data-section-id="cta">
        <a class="dos-mp-btn dos-mp-btn--primary" [attr.href]="ctaHref" data-cds-component="button">{{ copy().cta }}</a>
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
  get brandDisplayName(): string { return this.brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'; }
  get breadcrumb(): DosCarbonBreadcrumbItem[] { return [{ label: this.locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' }, { label: this.copy().h1, current: true }]; }
  copy() { return I18N_CONTACT[this.locale] ?? I18N_CONTACT.en; }
}

@Component({
  selector: 'dos-marketing-about',
  standalone: true,
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent],
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
          <article class="dos-mp-tile" data-cds-component="tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </article>
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
  imports: [DosBrandEagleComponent, DosCarbonBreadcrumbComponent],
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
          <article class="dos-mp-tile" data-cds-component="tile">
            <h3>{{ t.title }}</h3>
            <p>{{ t.body }}</p>
          </article>
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

export const MARKETING_PUBLIC_PAGE_KEYS = [
  'marketing.pricing.page',
  'marketing.trust.page',
  'marketing.security.page',
  'marketing.contact.page',
  'marketing.about.page',
  'marketing.legal.page',
] as const;
export type MarketingPublicPageKey = (typeof MARKETING_PUBLIC_PAGE_KEYS)[number];
