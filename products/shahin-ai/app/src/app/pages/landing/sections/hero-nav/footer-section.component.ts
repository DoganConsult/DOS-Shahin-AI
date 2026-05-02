import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-footer-section',
  standalone: true,
  template: `
    <footer class="footer" id="footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-col footer-brand-col">
            <div class="footer-brand"><img loading="eager" src="logoiconapphero.png" alt="Shahin-AI" width="36" height="36" class="footer-logo" /> <span class="footer-brand-name">Shahin-AI</span></div>
            <p class="footer-tagline">{{ i18n.translate('landing.footer.tagline') }}</p>
          </div>
          <div class="footer-col">
            <h4>{{ i18n.translate('landing.footer.colPlatform') }}</h4>
            <ul>
              <li><a (click)="scrollTo('solutions')">{{ i18n.translate('landing.footer.services') }}</a></li>
              <li><a (click)="scrollTo('features')">{{ i18n.translate('landing.footer.capabilities') }}</a></li>
              <li><a (click)="scrollTo('agents')">{{ i18n.translate('landing.footer.aiAgents') }}</a></li>
              <li><a (click)="scrollTo('stats')">{{ i18n.translate('landing.footer.liveStats') }}</a></li>
              <li><a (click)="scrollTo('how')">{{ i18n.translate('landing.footer.howItWorks') }}</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>{{ i18n.translate('landing.footer.colCompliance') }}</h4>
            <ul>
              <li><a (click)="scrollTo('ksa-nca-ecc')">{{ i18n.translate('landing.footer.complianceNcaEcc') }}</a></li>
              <li><a (click)="scrollTo('solutions')">{{ i18n.translate('landing.footer.complianceSamaCsf') }}</a></li>
              <li><a (click)="scrollTo('ksa-pdpl-dpia')">{{ i18n.translate('landing.footer.compliancePdpl') }}</a></li>
              <li><a (click)="scrollTo('solutions')">{{ i18n.translate('landing.footer.complianceIso27001') }}</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>{{ i18n.translate('landing.footer.colMore') }}</h4>
            <ul>
              <li><a (click)="scrollTo('pain')">{{ i18n.translate('landing.footer.challenges') }}</a></li>
              <li><a (click)="scrollTo('ksa')">{{ i18n.translate('landing.footer.ksaFeatures') }}</a></li>
              <li><a (click)="scrollTo('cta')">{{ i18n.translate('landing.footer.getStarted') }}</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <div class="footer-powered">
            <span class="dc-label">{{ i18n.translate('landing.footer.poweredBy') }}</span>
            <a href="https://www.doganconsult.com" target="_blank" rel="noopener" class="dc-link" title="www.doganconsult.com">
              <span class="dc-brand">
                <span class="dc-icon-wrap">
                  <img loading="eager" src="doganconsult-icon.png" alt="DoganConsult" width="42" height="42" class="dc-logo-img" />
                </span>
                <span class="dc-wordmark">
                  <span class="dc-name">DOGAN</span>
                  <span class="dc-separator"></span>
                  <span class="dc-type">CONSULT</span>
                </span>
              </span>
            </a>
          </div>
          <div class="footer-observability">
            <a href="https://shahin-ai.com/admin/langfuse/project/ai-engine-service"
               target="_blank" rel="noopener"
               class="obs-link" title="AI Engine — Langfuse traces"
               aria-label="AI Engine — Langfuse traces">
              <svg class="obs-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 3v18h18"/>
                <path d="M7 14l4-4 4 4 5-5"/>
              </svg>
              <span class="obs-label">Engine</span>
            </a>
            <a href="https://shahin-ai.com/admin/langfuse/project/ai-gateway-service"
               target="_blank" rel="noopener"
               class="obs-link" title="AI Gateway — Langfuse traces"
               aria-label="AI Gateway — Langfuse traces">
              <svg class="obs-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M17 3l4 4-4 4"/>
                <path d="M21 7H7"/>
                <path d="M7 21l-4-4 4-4"/>
                <path d="M3 17h14"/>
              </svg>
              <span class="obs-label">Gateway</span>
            </a>
            <a href="https://shahin-ai.com/admin/langfuse/project/ai-governance-service"
               target="_blank" rel="noopener"
               class="obs-link" title="AI Governance — Langfuse traces"
               aria-label="AI Governance — Langfuse traces">
              <svg class="obs-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              <span class="obs-label">Governance</span>
            </a>
            <a href="https://shahin-ai.com/admin/pm2/"
               target="_blank" rel="noopener"
               class="obs-link" title="PM2 Fleet Dashboard"
               aria-label="PM2 Fleet Dashboard">
              <svg class="obs-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="6" rx="1.5"/>
                <rect x="2" y="14" width="20" height="6" rx="1.5"/>
                <line x1="6" y1="7" x2="6.01" y2="7"/>
                <line x1="6" y1="17" x2="6.01" y2="17"/>
              </svg>
              <span class="obs-label">PM2 Fleet</span>
            </a>
            <a href="https://shahin-ai.com/admin/"
               target="_blank" rel="noopener"
               class="obs-link" title="Platform Admin Workspace"
               aria-label="Platform Admin Workspace">
              <svg class="obs-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span class="obs-label">Admin</span>
            </a>
          </div>
          <div class="footer-copy">&copy; 2024&ndash;2026 Shahin-AI by Dogan Consult. {{ i18n.translate('landing.allRights') }}</div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer { padding: clamp(40px, 5vw, 64px) 0 clamp(24px, 3vw, 36px); background: var(--primary-darker); }
    .footer-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .footer-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .footer-logo { border-radius: var(--radius-pill); }
    .footer-brand-name { font-size: var(--font-size-lg); font-weight: var(--font-black); color: var(--text-on-primary); letter-spacing: -0.02em; }
    .footer-tagline { font-size: var(--font-size-sm); color: rgba(var(--color-white-rgb), 0.82); line-height: 1.7; max-width: 280px; }
    .footer-col h4 { font-size: var(--font-size-sm); font-weight: var(--font-bold); text-transform: uppercase; letter-spacing: 0.08em; color: rgba(var(--color-white-rgb), 0.7); margin: 0 0 var(--space-md); }
    .footer-col ul { list-style: none; padding: 0; margin: 0; }
    .footer-col ul li { margin-bottom: 10px; }
    .footer-col ul li a { font-size: var(--font-size-base); color: rgba(var(--color-white-rgb), 0.92); text-decoration: none; transition: color 200ms; cursor: pointer; }
    .footer-col ul li a:hover { color: var(--primary-light); }
    .footer-bottom { border-top: 1px solid rgba(var(--color-white-rgb), 0.08); padding-top: var(--space-lg); text-align: center; }
    .footer-powered {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      margin-bottom: var(--space-md);
    }
    .dc-label { font-size: var(--font-size-xs); color: rgba(var(--color-white-rgb), 0.6); letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }
    .dc-link {
      display: inline-flex; align-items: center; text-decoration: none;
      transition: opacity 250ms ease, transform 250ms ease; cursor: pointer;
    }
    .dc-link:hover { opacity: 0.88; transform: scale(1.015); }
    .dc-brand { display: inline-flex; align-items: center; gap: 12px; }
    .dc-icon-wrap { display: flex; align-items: center; justify-content: center; line-height: 0; flex-shrink: 0; }
    .dc-logo-img { display: block; border-radius: var(--radius-pill); object-fit: contain; }
    .dc-wordmark { display: flex; flex-direction: column; gap: 2px; }
    .dc-name {
      font-family: var(--font-stack);
      font-size: var(--font-size-base); font-weight: 700; letter-spacing: 0.22em;
      color: #fff; line-height: 1.1;
    }
    .dc-separator {
      width: 100%; height: 1px;
      background: linear-gradient(90deg, rgba(var(--color-gold-rgb), 0.8), rgba(var(--color-gold-rgb), 0.2), transparent);
    }
    .dc-type {
      font-family: var(--font-stack);
      font-size: 8.5px; font-weight: 400; letter-spacing: 0.38em;
      color: rgba(var(--color-gold-rgb), 0.7); line-height: 1.1; text-transform: uppercase;
    }
    .footer-copy { font-size: var(--font-size-sm); color: rgba(var(--color-white-rgb), 0.72); }
    .footer-observability {
      display: flex; justify-content: center; flex-wrap: wrap; gap: 18px;
      margin-bottom: var(--space-sm); padding: 10px 0;
      border-top: 1px dashed rgba(var(--color-white-rgb), 0.06);
    }
    .obs-link {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: var(--font-size-xs); color: rgba(var(--color-white-rgb), 0.55);
      text-decoration: none; letter-spacing: 0.06em; text-transform: uppercase;
      transition: color 200ms ease, transform 200ms ease;
    }
    .obs-link:hover { color: var(--primary-light); transform: translateY(-1px); }
    .obs-icon { stroke: currentColor; flex-shrink: 0; }
    @media (max-width: 768px) { .footer-top { grid-template-columns: 1fr 1fr; gap: 24px; } }
    @media (max-width: 500px) { .footer-top { grid-template-columns: 1fr; } }
  `],
})
export class FooterSectionComponent {
  i18n = inject(I18nService);
  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
