/**
 * Phase M1 — `marketing.home.page` 16-section landing surface.
 *
 * Public, unauthenticated landing for shahin-ai + dogan-ai-os brands. Built
 * exclusively from approved primitives:
 *   - `<dos-brand-eagle>` for the brand mark (BrandResolverService).
 *   - `<dos-agent-status-strip>` from M0.5 (gated by flag('landingAgenticProof')).
 *   - 9 agent-tile brand assets resolved via BrandResolverService.
 *   - IBM Carbon `tiles`/`button`/`tag` styling hooks via data-cds-component.
 *
 * Sections (16 — single ordered list, every one rendered as a <section>):
 *   01 hero               09 ai-and-agents
 *   02 trust-pills        10 pricing-teaser
 *   03 value-props        11 testimonials
 *   04 agentic-proof      12 logos
 *   05 platform-overview  13 resources
 *   06 modules            14 faq
 *   07 industries         15 cta-banner
 *   08 architecture       16 footer
 *
 * NEVER imports AccessStore. NEVER reads tenant context. The agent strip
 * is fed by `summary` Input (consumer wires it from /api/ui-os/agentic/strip).
 */
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosBrandEagleComponent } from '../brand/dos-brand-eagle.component';
import { BrandResolverService } from '../brand/brand-resolver.service';
import { MarketingPublicConfigService } from './marketing-public-config.service';
import { DosAgentStatusStripComponent } from '../agentic/agentic-components';
import type { AgentState, AgentStripSummary } from '../agentic/agentic.contract';
import type { DosBrandCode } from '@dos/design-tokens';

/** Locked 16-section ordering. CI gate `marketing-home-coverage.mjs` greps. */
export const MARKETING_HOME_SECTIONS = [
  'hero',
  'trust-pills',
  'value-props',
  'agentic-proof',
  'platform-overview',
  'modules',
  'industries',
  'architecture',
  'ai-and-agents',
  'pricing-teaser',
  'testimonials',
  'logos',
  'resources',
  'faq',
  'cta-banner',
  'footer',
] as const;
export type MarketingHomeSectionId = (typeof MARKETING_HOME_SECTIONS)[number];

/** Agent-tile descriptor surfaced in the agentic-proof section. */
export interface MarketingAgentTile {
  agentCode: string;       // 'A01' .. 'A10'
  displayName: string;
  displayNameAr?: string;
  role?: string;
}

@Component({
  selector: 'dos-marketing-home',
  standalone: true,
  imports: [CommonModule, DosBrandEagleComponent, DosAgentStatusStripComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="dos-marketing-home"
      [attr.data-brand]="brandCode"
      [attr.data-surface]="'marketing'"
      [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'"
    >
      <!-- 01 hero ────────────────────────────────────────────────────── -->
      <section
        class="dos-mh-section dos-mh-hero"
        data-section-id="hero"
        data-cds-layer="01"
      >
        <div class="dos-mh-container">
          <dos-brand-eagle [brandCode]="brandCode" [locale]="locale" [size]="64" />
          <p class="dos-mh-eyebrow">{{ heroEyebrow }}</p>
          <h1 class="dos-mh-title">{{ heroTitle }}</h1>
          <p class="dos-mh-sub">{{ heroSub }}</p>
          <div class="dos-mh-cta-row">
            <a class="dos-mh-cta" data-cds-component="button" data-kind="primary" [href]="ctaPrimaryHref">
              {{ ctaPrimaryLabel }}
            </a>
            <a class="dos-mh-cta" data-cds-component="button" data-kind="tertiary" [href]="ctaSecondaryHref">
              {{ ctaSecondaryLabel }}
            </a>
          </div>
        </div>
      </section>

      <!-- 02 trust-pills ─────────────────────────────────────────────── -->
      <section class="dos-mh-section dos-mh-trust" data-section-id="trust-pills">
        <div class="dos-mh-container dos-mh-pill-row">
          @for (p of trustPills; track p.id) {
            <span class="dos-mh-pill" data-cds-component="tag" data-kind="cool-gray">{{ p.label }}</span>
          }
        </div>
      </section>

      <!-- 03 value-props ─────────────────────────────────────────────── -->
      <section class="dos-mh-section dos-mh-value-props" data-section-id="value-props">
        <div class="dos-mh-container dos-mh-grid-3">
          @for (v of valueProps; track v.id) {
            <article class="dos-mh-card" data-cds-component="tile">
              <h3>{{ v.title }}</h3>
              <p>{{ v.body }}</p>
            </article>
          }
        </div>
      </section>

      <!-- 04 agentic-proof — gated by flag('landingAgenticProof') ───── -->
      @if (showAgenticProof()) {
        <section class="dos-mh-section dos-mh-agentic" data-section-id="agentic-proof">
          <div class="dos-mh-container">
            <p class="dos-mh-eyebrow">{{ agenticEyebrow }}</p>
            <h2 class="dos-mh-section-title">{{ agenticTitle }}</h2>

            <dos-agent-status-strip
              [state]="agentStripState"
              [summary]="agentStripSummary"
              emptyLabel="No agents enrolled"
              failedLabel="Agent service unavailable"
            />

            <ul class="dos-mh-agent-tiles" role="list">
              @for (t of agentTiles; track t.agentCode) {
                <li class="dos-mh-agent-tile" data-cds-component="tile" [attr.data-agent-code]="t.agentCode">
                  @if (tileAsset(t.agentCode); as a) {
                    <img
                      class="dos-mh-agent-img"
                      [src]="a.source.kind === 'url' ? a.source.url : ''"
                      [alt]="locale === 'ar' ? (t.displayNameAr || t.displayName) : t.displayName"
                      [width]="96"
                      [height]="96"
                      loading="lazy"
                      decoding="async"
                    />
                  } @else {
                    <span class="dos-mh-agent-letter" aria-hidden="true">{{ t.agentCode }}</span>
                  }
                  <strong>{{ locale === 'ar' ? (t.displayNameAr || t.displayName) : t.displayName }}</strong>
                  @if (t.role) { <small>{{ t.role }}</small> }
                </li>
              }
            </ul>
          </div>
        </section>
      }

      <!-- 05 platform-overview ──────────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="platform-overview">
        <div class="dos-mh-container">
          <h2 class="dos-mh-section-title">{{ platformTitle }}</h2>
          <p>{{ platformBody }}</p>
        </div>
      </section>

      <!-- 06 modules ─────────────────────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="modules">
        <div class="dos-mh-container dos-mh-grid-3">
          @for (m of moduleTiles; track m.id) {
            <article class="dos-mh-card" data-cds-component="tile">
              <h3>{{ m.title }}</h3>
              <p>{{ m.body }}</p>
            </article>
          }
        </div>
      </section>

      <!-- 07 industries ─────────────────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="industries">
        <div class="dos-mh-container dos-mh-pill-row">
          @for (i of industries; track i.id) {
            <span class="dos-mh-pill" data-cds-component="tag" data-kind="warm-gray">{{ i.label }}</span>
          }
        </div>
      </section>

      <!-- 08 architecture ───────────────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="architecture">
        <div class="dos-mh-container">
          <h2 class="dos-mh-section-title">{{ architectureTitle }}</h2>
          <p>{{ architectureBody }}</p>
        </div>
      </section>

      <!-- 09 ai-and-agents ──────────────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="ai-and-agents">
        <div class="dos-mh-container">
          <h2 class="dos-mh-section-title">{{ aiTitle }}</h2>
          <p>{{ aiBody }}</p>
        </div>
      </section>

      <!-- 10 pricing-teaser ─────────────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="pricing-teaser">
        <div class="dos-mh-container">
          <h2 class="dos-mh-section-title">{{ pricingTitle }}</h2>
          <a class="dos-mh-cta" data-cds-component="button" data-kind="primary" [href]="pricingHref">
            {{ pricingCtaLabel }}
          </a>
        </div>
      </section>

      <!-- 11 testimonials ───────────────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="testimonials">
        <div class="dos-mh-container dos-mh-grid-3">
          @for (q of testimonials; track q.id) {
            <blockquote class="dos-mh-card" data-cds-component="tile">
              <p>"{{ q.quote }}"</p>
              <footer><strong>{{ q.author }}</strong> · <small>{{ q.role }}</small></footer>
            </blockquote>
          }
        </div>
      </section>

      <!-- 12 logos ──────────────────────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="logos">
        <div class="dos-mh-container dos-mh-pill-row">
          @for (l of customerLogos; track l.id) {
            <span class="dos-mh-logo">{{ l.name }}</span>
          }
        </div>
      </section>

      <!-- 13 resources ──────────────────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="resources">
        <div class="dos-mh-container dos-mh-grid-3">
          @for (r of resources; track r.id) {
            <a class="dos-mh-card" data-cds-component="tile" [href]="r.href">
              <h3>{{ r.title }}</h3>
              <p>{{ r.body }}</p>
            </a>
          }
        </div>
      </section>

      <!-- 14 faq ────────────────────────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="faq">
        <div class="dos-mh-container">
          @for (f of faq; track f.q) {
            <details class="dos-mh-faq">
              <summary>{{ f.q }}</summary>
              <p>{{ f.a }}</p>
            </details>
          }
        </div>
      </section>

      <!-- 15 cta-banner ─────────────────────────────────────────────── -->
      <section class="dos-mh-section dos-mh-cta-banner" data-section-id="cta-banner">
        <div class="dos-mh-container">
          <h2 class="dos-mh-section-title">{{ ctaBannerTitle }}</h2>
          <a class="dos-mh-cta" data-cds-component="button" data-kind="primary" [href]="ctaPrimaryHref">
            {{ ctaPrimaryLabel }}
          </a>
        </div>
      </section>

      <!-- 16 footer ─────────────────────────────────────────────────── -->
      <footer class="dos-mh-section dos-mh-footer" data-section-id="footer">
        <div class="dos-mh-container dos-mh-footer-grid">
          @for (g of footerGroups(); track g.id) {
            <div class="dos-mh-footer-col">
              <strong>{{ g.titleKey }}</strong>
              <ul>
                @for (it of g.items; track it.id) {
                  <li><a [href]="it.href">{{ it.labelKey }}</a></li>
                }
              </ul>
            </div>
          }
          <div class="dos-mh-footer-col dos-mh-footer-brand">
            <dos-brand-eagle [brandCode]="brandCode" [locale]="locale" [size]="32" />
            <small>© {{ year }} {{ brandCode }}</small>
          </div>
        </div>
      </footer>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .dos-marketing-home { color: var(--dos-color-text, #161616); container-type: inline-size; }
    .dos-mh-section { padding-block: var(--dos-marketing-section-pad-block, 4rem); }
    .dos-mh-container { max-inline-size: var(--dos-marketing-container-max, 1200px); margin-inline: auto; padding-inline: var(--dos-marketing-container-pad-x, 1.25rem); }
    .dos-mh-eyebrow { font-size: var(--dos-marketing-hero-eyebrow-size, 0.875rem); text-transform: uppercase; letter-spacing: 0.08em; color: var(--dos-color-brand-accent, currentColor); margin: 0 0 0.5rem; }
    .dos-mh-title { font-size: var(--dos-marketing-hero-title-size, clamp(2rem, 5vw, 3.5rem)); line-height: var(--dos-marketing-hero-line, 1.1); margin: 0 0 1rem; }
    .dos-mh-sub { font-size: var(--dos-marketing-hero-sub-size, 1.125rem); margin: 0 0 1.5rem; }
    .dos-mh-section-title { font-size: var(--dos-marketing-section-title-size, 2rem); margin: 0 0 1.5rem; }
    .dos-mh-cta-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .dos-mh-cta { display: inline-flex; align-items: center; padding: var(--dos-marketing-cta-pad-y, 0.75rem) var(--dos-marketing-cta-pad-x, 1.25rem); border-radius: var(--dos-marketing-cta-radius, 0); font-size: var(--dos-marketing-cta-font-size, 1rem); min-block-size: var(--dos-marketing-cta-min-tap, 44px); text-decoration: none; }
    .dos-mh-pill-row { display: flex; gap: var(--dos-marketing-trust-gap, 0.75rem); flex-wrap: wrap; }
    .dos-mh-pill { padding: var(--dos-marketing-pill-pad-y, 0.25rem) var(--dos-marketing-pill-pad-x, 0.75rem); border-radius: var(--dos-marketing-pill-radius, 999px); font-size: 0.875rem; }
    .dos-mh-grid-3 { display: grid; gap: var(--dos-marketing-card-gap, 1.5rem); grid-template-columns: repeat(3, 1fr); }
    .dos-mh-card { padding: var(--dos-marketing-card-pad, 1.5rem); border-radius: var(--dos-marketing-card-radius, 0); box-shadow: var(--dos-marketing-card-shadow, none); display: block; text-decoration: none; color: inherit; }
    .dos-mh-agent-tiles { list-style: none; margin: 1.5rem 0 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(3, 1fr); }
    .dos-mh-agent-tile { padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center; }
    .dos-mh-agent-img { inline-size: 96px; block-size: 96px; object-fit: contain; }
    .dos-mh-agent-letter { font-weight: 700; font-size: 1.25rem; padding: 0.5rem 0.75rem; border: 1px solid currentColor; border-radius: 0; }
    .dos-mh-faq { padding-block: 0.5rem; border-block-end: 1px solid var(--dos-color-border, #e0e0e0); }
    .dos-mh-footer { background: var(--dos-color-brand-primary, #0f1f3d); color: var(--dos-color-brand-on-primary, #fff); }
    .dos-mh-footer a { color: inherit; text-decoration: none; }
    .dos-mh-footer-grid { display: grid; gap: 2rem; grid-template-columns: repeat(4, 1fr); }
    .dos-mh-footer-col ul { list-style: none; padding: 0; margin: 0.5rem 0 0; }
    @container (max-width: 720px) {
      .dos-mh-grid-3 { grid-template-columns: 1fr; }
      .dos-mh-agent-tiles { grid-template-columns: repeat(2, 1fr); }
      .dos-mh-footer-grid { grid-template-columns: 1fr 1fr; }
    }
    @container (max-width: 480px) {
      .dos-mh-agent-tiles { grid-template-columns: 1fr; }
      .dos-mh-footer-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class DosMarketingHomePageComponent {
  private readonly brandResolver = inject(BrandResolverService);
  private readonly marketingCfg = inject(MarketingPublicConfigService);

  @Input({ required: true }) brandCode!: DosBrandCode;
  @Input() locale: 'en' | 'ar' = 'en';

  // Hero
  @Input() heroEyebrow = 'Agentic GRC, brought to life';
  @Input() heroTitle = 'The operating system for agentic enterprises.';
  @Input() heroSub = 'Observe, suggest, approve, execute, verify, log — every action accounted for.';
  @Input() ctaPrimaryLabel = 'Start free trial';
  @Input() ctaPrimaryHref = '/trial';
  @Input() ctaSecondaryLabel = 'See the platform';
  @Input() ctaSecondaryHref = '/platform';

  // Trust pills
  @Input() trustPills: ReadonlyArray<{ id: string; label: string }> = [
    { id: 'iso',  label: 'ISO 27001' },
    { id: 'soc2', label: 'SOC 2 Type II' },
    { id: 'gdpr', label: 'GDPR' },
    { id: 'nca',  label: 'NCA ECC' },
    { id: 'sama', label: 'SAMA CSF' },
  ];

  // Value props (3)
  @Input() valueProps: ReadonlyArray<{ id: string; title: string; body: string }> = [
    { id: 'one',   title: 'One platform', body: 'GRC, security ops, AI agents, evidence — unified.' },
    { id: 'auto',  title: 'Automated proof', body: 'Continuous evidence with cryptographic audit trail.' },
    { id: 'safe',  title: 'Human-in-the-loop', body: 'Every agent action approved, traceable, reversible.' },
  ];

  // Agentic-proof
  @Input() agenticEyebrow = 'Agentic proof';
  @Input() agenticTitle = 'Nine agents already at work.';
  @Input() agentStripState: AgentState = 'ready';
  @Input() agentStripSummary: AgentStripSummary | null = null;
  @Input() agentTiles: ReadonlyArray<MarketingAgentTile> = [
    { agentCode: 'A01', displayName: 'Onboarding Agent',           displayNameAr: 'وكيل التهيئة',            role: 'onboarding' },
    { agentCode: 'A02', displayName: 'Identity Provisioning',      displayNameAr: 'وكيل توفير الهوية',       role: 'identity' },
    { agentCode: 'A04', displayName: 'Control Authoring',          displayNameAr: 'وكيل تأليف الضوابط',     role: 'controls' },
    { agentCode: 'A05', displayName: 'Evidence Collection',        displayNameAr: 'وكيل جمع الأدلة',         role: 'evidence' },
    { agentCode: 'A06', displayName: 'Gap Remediation',            displayNameAr: 'وكيل معالجة الفجوات',     role: 'remediation' },
    { agentCode: 'A07', displayName: 'Risk Register',              displayNameAr: 'وكيل سجل المخاطر',        role: 'risk' },
    { agentCode: 'A08', displayName: 'Policy Lifecycle',           displayNameAr: 'وكيل دورة حياة السياسات', role: 'policy' },
    { agentCode: 'A09', displayName: 'Third-Party Risk',           displayNameAr: 'وكيل مخاطر الأطراف',     role: 'vendor' },
    { agentCode: 'A10', displayName: 'Audit Reporting',            displayNameAr: 'وكيل تقارير التدقيق',     role: 'audit' },
  ];

  // Platform overview
  @Input() platformTitle = 'A platform, not a checklist tool.';
  @Input() platformBody = 'Foundation, DAuth, Dynamic UI, AI engine, Audit ledger — composable from day one.';

  // Modules
  @Input() moduleTiles: ReadonlyArray<{ id: string; title: string; body: string }> = [
    { id: 'risk',     title: 'Risk',       body: 'Quantified risk register, AI explainability built in.' },
    { id: 'controls', title: 'Controls',   body: 'Author once, prove everywhere.' },
    { id: 'evidence', title: 'Evidence',   body: 'Continuous collection, cryptographic ledger.' },
    { id: 'audit',    title: 'Audit',      body: 'Always-ready, examiner-grade exports.' },
    { id: 'policy',   title: 'Policy',     body: 'Lifecycle, approvals, attestations.' },
    { id: 'vendor',   title: 'Third-party', body: 'Continuous vendor monitoring.' },
  ];

  // Industries
  @Input() industries: ReadonlyArray<{ id: string; label: string }> = [
    { id: 'finance',  label: 'Financial services' },
    { id: 'health',   label: 'Healthcare' },
    { id: 'gov',      label: 'Government' },
    { id: 'energy',   label: 'Energy' },
    { id: 'tech',     label: 'Technology' },
  ];

  // Architecture
  @Input() architectureTitle = 'Built on platform DNA.';
  @Input() architectureBody = 'Four tiers — products → modules → services → platform. Never reverse.';

  // AI / Agents
  @Input() aiTitle = 'AI agents you can audit.';
  @Input() aiBody = 'Every model decision carries provenance, confidence, and reversal path.';

  // Pricing
  @Input() pricingTitle = 'Pricing that scales with proof, not seats.';
  @Input() pricingCtaLabel = 'See pricing';
  @Input() pricingHref = '/pricing';

  // Testimonials
  @Input() testimonials: ReadonlyArray<{ id: string; quote: string; author: string; role: string }> = [
    { id: '1', quote: 'Our auditors finished in days, not weeks.',  author: 'Head of GRC', role: 'Bank' },
    { id: '2', quote: 'The first GRC tool people actually use.',   author: 'CISO',        role: 'Insurer' },
    { id: '3', quote: 'Continuous evidence, finally.',             author: 'VP Risk',     role: 'Telco' },
  ];

  // Logos
  @Input() customerLogos: ReadonlyArray<{ id: string; name: string }> = [
    { id: '1', name: 'BankCo' }, { id: '2', name: 'GovDept' },
    { id: '3', name: 'HealthOrg' }, { id: '4', name: 'Energy+' }, { id: '5', name: 'Telco9' },
  ];

  // Resources
  @Input() resources: ReadonlyArray<{ id: string; title: string; body: string; href: string }> = [
    { id: 'docs',  title: 'Docs',       body: 'Build with the platform SDK.', href: '/docs' },
    { id: 'blog',  title: 'Blog',       body: 'Field notes from agentic GRC.', href: '/blog' },
    { id: 'wp',    title: 'White papers', body: 'In-depth research.',          href: '/whitepapers' },
  ];

  // FAQ
  @Input() faq: ReadonlyArray<{ q: string; a: string }> = [
    { q: 'Is this on-prem ready?',              a: 'Yes — same product, same DB topology.' },
    { q: 'How are agent actions authorised?',   a: 'Through dauth + module-level RBAC, with audit trail.' },
    { q: 'Can we bring our own AI model?',      a: 'Yes — the AI engine is provider-agnostic.' },
  ];

  // CTA banner
  @Input() ctaBannerTitle = 'Ready to see it run?';

  readonly year = new Date().getFullYear();

  readonly footerGroups = computed(() => this.marketingCfg.marketingFooterGroups());

  readonly showAgenticProof = computed(() => this.marketingCfg.flag('landingAgenticProof'));

  /** Resolve the agent-tile asset for a given agent code via BrandResolverService. */
  tileAsset(agentCode: string) {
    const all = this.brandResolver.bundle()?.assets ?? [];
    return all.find(
      (a) => a.brandCode === this.brandCode
          && a.assetKind === 'agent-tile'
          && (a as unknown as { assetCode?: string }).assetCode === agentCode,
    ) ?? null;
  }
}
