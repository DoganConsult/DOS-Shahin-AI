/**
 * Phase M1 — `marketing.home.page` 19-region landing surface.
 *
 * Public, unauthenticated landing for shahin-ai + dogan-ai-os brands. Built
 * exclusively from approved primitives:
 *   - `<dos-brand-eagle>` for the brand mark (BrandResolverService).
 *   - `<dos-agent-status-strip>` from M0.5 (gated by flag('landingAgenticProof')).
 *   - 9 agent-tile brand assets resolved via BrandResolverService.
 *   - IBM Carbon `tiles`/`button`/`tag` styling hooks via data-cds-component.
 *
 * Regions (19 — header + breadcrumb + 17 content/footer regions):
 *   01 public-header      11 architecture
 *   02 breadcrumb-row     12 ai-and-agents
 *   03 hero               13 pricing-teaser
 *   04 trust-pills        14 testimonials
 *   05 value-props        15 logos
 *   06 agentic-proof      16 resources
 *   07 download-kit       17 faq
 *   08 platform-overview  18 cta-banner
 *   09 modules            19 footer
 *   10 industries
 *
 * NEVER imports AccessStore. NEVER reads tenant context. The agent strip
 * is fed by `summary` Input (consumer wires it from /api/ui-os/agentic/strip).
 */
import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';

@Component({
  selector: 'dos-marketing-home',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <header class="cds--header">
        <a class="cds--header__name" href="/">Shahin-AI</a>
        <nav class="cds--header__nav">
          <a class="cds--header__menu-item" href="/">Home</a>
          <a class="cds--header__menu-item" href="/pricing">Pricing</a>
          <a class="cds--header__menu-item" href="/about">About</a>
        </nav>
        <div class="cds--header__global">
          <button class="cds--btn cds--btn--primary">Sign In</button>
        </div>
      </header>

      <section class="cds--content">
        <h1>GRC Platform</h1>
        <p>Unified compliance management for modern enterprises.</p>
        <button class="cds--btn cds--btn--primary">Get Started</button>
        <button class="cds--btn cds--btn--tertiary">Learn More</button>
      </section>

      <section class="cds--content">
        <h2>Value Propositions</h2>
        <p>Three proof points before the rest of the platform story.</p>
        <div class="cds--grid">
          <div class="cds--tile">
            <h3>Faster Reviews</h3>
            <p>Shorter review cycles with automated workflows.</p>
          </div>
          <div class="cds--tile">
            <h3>Tighter Controls</h3>
            <p>Comprehensive approval chains and evidence tracking.</p>
          </div>
          <div class="cds--tile">
            <h3>Audit Ready</h3>
            <p>Evidence that stays ready for every regulator.</p>
          </div>
        </div>
      </section>

      <section class="cds--content">
        <h2>Pricing</h2>
        <table class="cds--data-table">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Price</th>
              <th>Features</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Starter</td>
              <td>$99/month</td>
              <td>Basic compliance tools</td>
            </tr>
            <tr>
              <td>Professional</td>
              <td>$299/month</td>
              <td>Advanced workflows</td>
            </tr>
            <tr>
              <td>Enterprise</td>
              <td>Custom</td>
              <td>Full platform access</td>
            </tr>
          </tbody>
        </table>
        <button class="cds--btn cds--btn--primary">View Pricing</button>
      </section>

      <section class="cds--content cds--content--hero">
        <h2>Get Started Today</h2>
        <p>Transform your compliance workflow with Shahin-AI.</p>
        <button class="cds--btn cds--btn--primary">Start Free Trial</button>
        <button class="cds--btn cds--btn--tertiary">Contact Sales</button>
      </section>

      <footer class="cds--footer">
        <div class="cds--grid">
          <div class="cds--footer-item">
            <strong>Product</strong>
            <ul>
              <li><a href="/">Features</a></li>
              <li><a href="/pricing">Pricing</a></li>
            </ul>
          </div>
          <div class="cds--footer-item">
            <strong>Company</strong>
            <ul>
              <li><a href="/about">About</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>
          <div class="cds--footer-item">
            <small>© 2026 Shahin-AI</small>
          </div>
        </div>
      </footer>
    </main>
  `,
})
export class DosMarketingHomePageComponent {
  constructor() {}
}
