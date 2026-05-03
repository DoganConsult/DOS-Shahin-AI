import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NavbarSectionComponent } from './sections/hero-nav/navbar-section.component';
import { HeroSectionComponent } from './sections/hero-nav/hero-section.component';
import { StatsSectionComponent } from './sections/hero-nav/stats-section.component';
import { CtaSectionComponent } from './sections/hero-nav/cta-section.component';
import { FooterSectionComponent } from './sections/hero-nav/footer-section.component';

import { PainPointsSectionComponent } from './sections/social-proof/pain-points-section.component';

import { FeaturesSectionComponent } from './sections/features-solutions/features-section.component';
import { SolutionsSectionComponent } from './sections/features-solutions/solutions-section.component';
import { AIAgentsSectionComponent } from './sections/features-solutions/ai-agents-section.component';
import { KSAFeaturesSectionComponent } from './sections/features-solutions/ksa-features-section.component';
import { HowItWorksSectionComponent } from './sections/features-solutions/how-it-works-section.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    NavbarSectionComponent,
    HeroSectionComponent,
    StatsSectionComponent,
    PainPointsSectionComponent,
    FeaturesSectionComponent,
    SolutionsSectionComponent,
    AIAgentsSectionComponent,
    KSAFeaturesSectionComponent,
    HowItWorksSectionComponent,
    CtaSectionComponent,
    FooterSectionComponent,
  ],
  template: `
    <div class="landing-root" aria-label="Shahin-AI">
      <app-navbar-section />
      <main class="landing-main" id="main-content">
        <app-hero-section id="hero" />
        <app-stats-section id="stats" />
        <app-pain-points-section id="pain-points" />
        <app-features-section id="features" />
        <app-solutions-section id="solutions" />
        <app-ai-agents-section id="ai-agents" />
        <app-ksa-features-section id="ksa-features" />
        <app-how-it-works-section id="how-it-works" />
        <app-cta-section id="cta" />
      </main>
      <app-footer-section />
    </div>
  `,
  styles: [`
    :host { display: block; }
    .landing-root { min-block-size: 100vh; display: flex; flex-direction: column; background: var(--surface); }
    .landing-main { flex: 1; }

    @media (max-width: 900px) {
      .landing-main {
        padding-block-end: calc(6rem + env(safe-area-inset-bottom, 0px));
      }
    }
  `],
})
export class LandingComponent {}
