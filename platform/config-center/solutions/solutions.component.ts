import { Component, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-solutions',
    imports: [CommonModule, RouterModule],
    template: `
    <div class="solutions-page">
      <header class="hero">
        <h1>Enterprise GRC Solutions</h1>
        <p class="subtitle">Governance, Risk & Compliance — purpose-built for Saudi Arabia and the GCC</p>
      </header>

      <section class="solutions-grid">
        <div class="solution-card" *ngFor="let s of solutions">
          <i [class]="'pi ' + s.icon + ' card-icon'" [style.color]="s.color"></i>
          <h3>{{ s.titleEn }}</h3>
          <p class="ar-subtitle">{{ s.titleAr }}</p>
          <p class="desc">{{ s.descEn }}</p>
          <ul>
            <li *ngFor="let f of s.features">{{ f }}</li>
          </ul>
        </div>
      </section>

      <section class="cta-section">
        <h2>Ready to get started?</h2>
        <p>Start your free trial or request a personalized demo.</p>
        <div class="cta-buttons">
          <a routerLink="/register" class="btn-primary">Start Free Trial</a>
          <a routerLink="/request-demo" class="btn-secondary">Request Demo</a>
        </div>
      </section>
    </div>
  `,
    styles: [`
    .solutions-page { max-width: 1200px; margin: 0 auto; padding: 3rem 1.5rem; }
    .hero { text-align: center; margin-bottom: 3rem; }
    .hero h1 { font-size: var(--font-size-5xl); font-weight: 700; color: var(--text-heading); }
    .hero .subtitle { font-size: 1.15rem; color: var(--text-muted); margin-top: 0.5rem; }
    .solutions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; }
    .solution-card { background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 2rem; transition: box-shadow 0.2s; }
    .solution-card:hover { box-shadow: 0 4px 24px rgba(var(--color-black-rgb), 0.08); }
    .card-icon { font-size: var(--font-size-4xl); margin-bottom: 1rem; display: block; }
    .solution-card h3 { font-size: var(--font-size-xl); font-weight: 600; color: var(--text-heading); margin: 0 0 0.25rem; }
    .ar-subtitle { font-size: var(--font-size-body-sm); color: var(--text-muted); margin: 0 0 0.75rem; direction: rtl; }
    .desc { color: #475569; font-size: var(--font-size-body-sm); line-height: 1.6; }
    .solution-card ul { margin: 1rem 0 0; padding-inline-start: 1.25rem; }
    .solution-card li { color: var(--text-muted); font-size: var(--font-size-body-sm); margin-bottom: 0.35rem; }
    .cta-section { text-align: center; margin-top: 4rem; padding: 3rem; background: var(--surface-ice); border-radius: var(--radius-xl); }
    .cta-section h2 { font-size: var(--font-size-3xl); color: var(--text-heading); }
    .cta-section p { color: var(--text-muted); margin: 0.5rem 0 1.5rem; }
    .cta-buttons { display: flex; gap: 1rem; justify-content: center; }
    .btn-primary { background: #2563eb; color: #fff; padding: 0.75rem 2rem; border-radius: var(--radius); text-decoration: none; font-weight: 600; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #fff; color: var(--primary); border: 2px solid #2563eb; padding: 0.75rem 2rem; border-radius: var(--radius); text-decoration: none; font-weight: 600; }
    .btn-secondary:hover { background: #eff6ff; }
  `]
})
export class SolutionsComponent {
  solutions = [
    { icon: 'pi-shield', color: '#1e40af', titleEn: 'AGRC — Governance, Risk & Compliance', titleAr: 'الحوكمة والمخاطر والامتثال', descEn: 'Unified platform for NCA ECC, SAMA CSF, PDPL, ISO 27001 and 60+ frameworks with cross-mapping efficiency.', features: ['114-control NCA ECC assessment', 'Cross-framework control mapping', 'Risk register & KRI tracking', 'Evidence vault with auto-collection'] },
    { icon: 'pi-chart-bar', color: '#0d9488', titleEn: 'Qiyas — Maturity Assessment Engine', titleAr: 'قياس — محرك تقييم النضج', descEn: 'Build, deploy and benchmark maturity assessments across any domain with AI-powered scoring.', features: ['Custom maturity models', 'AI-powered gap analysis', 'Benchmark against industry peers', 'Action plan generation'] },
    { icon: 'pi-lock', color: '#7c3aed', titleEn: 'Privacy Operations (PDPL)', titleAr: 'عمليات الخصوصية (نظام حماية البيانات)', descEn: 'Full Saudi PDPL compliance with DPIA wizard, consent management, and SDAIA-ready reporting.', features: ['DPIA impact assessment wizard', 'Data processing register', 'Consent lifecycle management', 'Breach notification workflow'] },
    { icon: 'pi-truck', color: '#ea580c', titleEn: 'Vendor Governance', titleAr: 'حوكمة الموردين', descEn: 'Vendor risk assessment, due diligence, and continuous monitoring with portal-based collaboration.', features: ['Vendor risk scoring', 'Due diligence questionnaires', 'Contract compliance tracking', 'Vendor portal for self-service'] },
    { icon: 'pi-sitemap', color: '#0369a1', titleEn: 'Data Governance', titleAr: 'حوكمة البيانات', descEn: 'Data classification, lineage, quality management and data stewardship aligned with NDMO standards.', features: ['Data classification engine', 'Lineage & impact analysis', 'Quality scorecards', 'Stewardship workflows'] },
    { icon: 'pi-microchip-ai', color: '#9333ea', titleEn: 'Shahin AI — 10 Autonomous Agents', titleAr: 'شاهين الذكاء الاصطناعي — 10 وكلاء مستقلين', descEn: 'AI fleet with specialized agents for compliance monitoring, risk analysis, audit readiness and more.', features: ['Continuous compliance monitoring', 'Risk pattern detection', 'Policy drafting assistant', 'Audit preparation automation'] },
  ];

}
