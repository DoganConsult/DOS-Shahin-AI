import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DosMarketingHomePageComponent } from '@dos/ui-system';

/**
 * Phase M2 SPA mount — render the Carbon `marketing.home.page` (17-section
 * landing) at the public root. Wired for desktop + mobile (component is
 * responsive at 390/430/768/1440 via `dos-marketing-home` styles).
 *
 * `brandCode='shahin-ai'` selects the Shahin brand assets registered in
 * dos.marketing_brand_registry / dos.marketing_brand_assets.
 */
@Component({
  selector: 'app-marketing-landing',
  standalone: true,
  imports: [DosMarketingHomePageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-marketing-home
      brandCode="shahin-ai"
      locale="en"
      ctaPrimaryHref="/register"
      ctaSecondaryHref="/login">
    </dos-marketing-home>
  `,
  styles: [`:host { display: block; min-height: 100vh; }`],
})
export class MarketingLandingComponent {}
