import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import {
  DosMarketingHomePageComponent,
  MarketingPublicConfigService,
  BrandResolverService,
  type MarketingAsset,
} from '@dos/ui-system';
import type { AgentStripSummary, AgentState } from '@dos/ui-system';

/**
 * Phase M3 SPA mount — render the Carbon `marketing.home.page` (17-section
 * landing) at the public root. Wires:
 *   - BrandResolverService.init() so <dos-brand-eagle> + agent-tile assets
 *     resolve from the live /api/ui-os/brand bundle.
 *   - MarketingPublicConfigService.init() so footer groups + the
 *     `landingAgenticProof` feature flag come from /api/ui-os/marketing/config.
 *   - GET /api/ui-os/agentic/strip → [agentStripSummary] live agent counts.
 *   - GET /api/ui-os/marketing/assets → [downloadAssets] for the kit card.
 *   - `?locale=ar` → flips the entire surface to Arabic + RTL.
 *
 * Public, tenantless, no AccessStore, no permission_key.
 */
@Component({
  selector: 'app-marketing-landing',
  standalone: true,
  imports: [DosMarketingHomePageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-marketing-home
      brandCode="shahin-ai"
      [locale]="locale"
      [agentStripState]="agentStripState()"
      [agentStripSummary]="agentStripSummary()"
      [downloadAssets]="downloadAssets()"
      ctaPrimaryLabel="Create account"
      ctaPrimaryHref="/register"
      ctaSecondaryLabel="Sign in"
      ctaSecondaryHref="/login"
      pricingCtaLabel="See pricing"
      pricingHref="/pricing"
      ctaBannerTitle="Ready to get started?">
    </dos-marketing-home>
  `,
  styles: [`:host { display: block; min-height: 100vh; }`],
})
export class MarketingLandingComponent implements OnInit {
  private readonly cfg = inject(MarketingPublicConfigService);
  private readonly brand = inject(BrandResolverService);

  readonly locale: 'en' | 'ar' = (() => {
    if (typeof window === 'undefined') return 'en';
    const q = new URL(window.location.href).searchParams.get('locale');
    return q === 'ar' ? 'ar' : 'en';
  })();

  readonly agentStripState = signal<AgentState>('loading');
  readonly agentStripSummary = signal<AgentStripSummary | null>(null);
  readonly downloadAssets = signal<readonly MarketingAsset[]>([]);

  async ngOnInit(): Promise<void> {
    // 1. Brand bundle (eagle + agent-tile assets).
    this.brand.init('shahin-ai').catch((e) => console.warn('[marketing] brand init failed', e));
    // 2. Marketing config (footer + flags).
    this.cfg.init('shahin-ai', this.locale).catch((e) => console.warn('[marketing] cfg init failed', e));
    // 3. Live agent strip summary.
    try {
      const r = await fetch('/api/ui-os/agentic/strip', { credentials: 'omit' });
      if (r.ok) {
        this.agentStripSummary.set((await r.json()) as AgentStripSummary);
        this.agentStripState.set('ready');
      } else {
        this.agentStripState.set('failed');
      }
    } catch {
      this.agentStripState.set('failed');
    }
    // 4. Downloadable kit assets.
    try {
      const r = await fetch(`/api/ui-os/marketing/assets?brand=shahin-ai&locale=${this.locale}`, { credentials: 'omit' });
      if (r.ok) {
        const body = (await r.json()) as { assets: MarketingAsset[] };
        this.downloadAssets.set(body.assets ?? []);
      }
    } catch {
      // Non-fatal — card falls back to skeleton.
    }
  }
}
