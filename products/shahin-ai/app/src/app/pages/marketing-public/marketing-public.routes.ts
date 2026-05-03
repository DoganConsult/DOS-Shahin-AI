import { Routes } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  DosMarketingPricingPageComponent,
  DosMarketingTrustPageComponent,
  DosMarketingSecurityPageComponent,
  DosMarketingContactPageComponent,
  DosMarketingAboutPageComponent,
  DosMarketingLegalPageComponent,
} from '@dos/ui-system';

/**
 * Phase M2 SPA mounts — six PUBLIC marketing pages.
 *
 * Each route mounts the corresponding @dos/ui-system component_key:
 *   /pricing   → marketing.pricing.page
 *   /trust     → marketing.trust.page
 *   /security  → marketing.security.page
 *   /contact   → marketing.contact.page
 *   /about     → marketing.about.page
 *   /legal     → marketing.legal.page
 *
 * No AccessStore. No tenant context. No permission_key. Locale resolved
 * from `?locale=en|ar` query param (default 'en').
 */

@Component({
  selector: 'app-marketing-pricing',
  standalone: true,
  imports: [DosMarketingPricingPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dos-marketing-pricing brandCode="shahin-ai" [locale]="locale"></dos-marketing-pricing>`,
  styles: [`:host { display: block; }`],
})
export class MarketingPricingComponent {
  readonly locale: 'en' | 'ar' = (new URL(typeof window !== 'undefined' ? window.location.href : 'http://x/').searchParams.get('locale') as 'en' | 'ar') === 'ar' ? 'ar' : 'en';
}

@Component({
  selector: 'app-marketing-trust',
  standalone: true,
  imports: [DosMarketingTrustPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dos-marketing-trust brandCode="shahin-ai" [locale]="locale"></dos-marketing-trust>`,
  styles: [`:host { display: block; }`],
})
export class MarketingTrustComponent {
  readonly locale: 'en' | 'ar' = (new URL(typeof window !== 'undefined' ? window.location.href : 'http://x/').searchParams.get('locale') as 'en' | 'ar') === 'ar' ? 'ar' : 'en';
}

@Component({
  selector: 'app-marketing-security',
  standalone: true,
  imports: [DosMarketingSecurityPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dos-marketing-security brandCode="shahin-ai" [locale]="locale"></dos-marketing-security>`,
  styles: [`:host { display: block; }`],
})
export class MarketingSecurityComponent {
  readonly locale: 'en' | 'ar' = (new URL(typeof window !== 'undefined' ? window.location.href : 'http://x/').searchParams.get('locale') as 'en' | 'ar') === 'ar' ? 'ar' : 'en';
}

@Component({
  selector: 'app-marketing-contact',
  standalone: true,
  imports: [DosMarketingContactPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dos-marketing-contact brandCode="shahin-ai" [locale]="locale"></dos-marketing-contact>`,
  styles: [`:host { display: block; }`],
})
export class MarketingContactComponent {
  readonly locale: 'en' | 'ar' = (new URL(typeof window !== 'undefined' ? window.location.href : 'http://x/').searchParams.get('locale') as 'en' | 'ar') === 'ar' ? 'ar' : 'en';
}

@Component({
  selector: 'app-marketing-about',
  standalone: true,
  imports: [DosMarketingAboutPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dos-marketing-about brandCode="shahin-ai" [locale]="locale"></dos-marketing-about>`,
  styles: [`:host { display: block; }`],
})
export class MarketingAboutComponent {
  readonly locale: 'en' | 'ar' = (new URL(typeof window !== 'undefined' ? window.location.href : 'http://x/').searchParams.get('locale') as 'en' | 'ar') === 'ar' ? 'ar' : 'en';
}

@Component({
  selector: 'app-marketing-legal',
  standalone: true,
  imports: [DosMarketingLegalPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dos-marketing-legal brandCode="shahin-ai" [locale]="locale"></dos-marketing-legal>`,
  styles: [`:host { display: block; }`],
})
export class MarketingLegalComponent {
  readonly locale: 'en' | 'ar' = (new URL(typeof window !== 'undefined' ? window.location.href : 'http://x/').searchParams.get('locale') as 'en' | 'ar') === 'ar' ? 'ar' : 'en';
}

export const MARKETING_PUBLIC_ROUTES: Routes = [
  { path: 'pricing',  component: MarketingPricingComponent,  data: { contractRoute: '/pricing',  componentKey: 'marketing.pricing.page'  } },
  { path: 'trust',    component: MarketingTrustComponent,    data: { contractRoute: '/trust',    componentKey: 'marketing.trust.page'    } },
  { path: 'security', component: MarketingSecurityComponent, data: { contractRoute: '/security', componentKey: 'marketing.security.page' } },
  { path: 'contact',  component: MarketingContactComponent,  data: { contractRoute: '/contact',  componentKey: 'marketing.contact.page'  } },
  { path: 'about',    component: MarketingAboutComponent,    data: { contractRoute: '/about',    componentKey: 'marketing.about.page'    } },
  { path: 'legal',    component: MarketingLegalComponent,    data: { contractRoute: '/legal',    componentKey: 'marketing.legal.page'    } },
];
