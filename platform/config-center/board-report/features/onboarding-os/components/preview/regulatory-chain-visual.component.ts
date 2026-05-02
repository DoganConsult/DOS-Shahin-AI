import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { GrcRecord } from '../../models/onboarding.models';
import { CommonModule } from '@angular/common';

/**
 * RegulatoryChainVisualComponent
 *
 * Renders the deterministic regulatory resolution chain:
 * Sector → Authorities → Frameworks → Controls → Evidence
 *
 * Each step shows real DB-computed counts. The chain is animated
 * left-to-right (or right-to-left in RTL) to visually communicate
 * how Shahin derives governance requirements from business context.
 */
@Component({
    selector: 'app-regulatory-chain-visual',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="chain" [class.rtl]="lang === 'ar'" *ngIf="chainData">
      <div class="chain-header">
        <h3>
          <i class="pi pi-sitemap"></i>
          {{ lang === 'ar' ? 'سلسلة الامتثال التنظيمي' : 'Your Regulatory Intelligence Chain' }}
        </h3>
        <p class="chain-sub">{{ lang === 'ar'
          ? 'هذه السلسلة مُحتسبة من قاعدة البيانات التنظيمية بناءً على قطاعك — كل رقم حقيقي.'
          : 'This chain is computed from the regulatory database based on your sector — every number is real.' }}</p>
      </div>

      <div class="chain-flow">
        <!-- Step 1: Sector -->
        <div class="chain-step" [style.animation-delay]="'0ms'">
          <div class="chain-step-icon sector"><i class="pi pi-building"></i></div>
          <div class="chain-step-label">{{ lang === 'ar' ? 'القطاع' : 'Sector' }}</div>
          <div class="chain-step-value">{{ chainData.sectorName || chainData.sectorCode || '—' }}</div>
        </div>

        <div class="chain-arrow"><i class="pi pi-arrow-right"></i></div>

        <!-- Step 2: Authorities -->
        <div class="chain-step" [style.animation-delay]="'100ms'">
          <div class="chain-step-icon authority"><i class="pi pi-shield"></i></div>
          <div class="chain-step-label">{{ lang === 'ar' ? 'الجهات الرقابية' : 'Authorities' }}</div>
          <div class="chain-step-count">{{ chainData.authorities?.length || 0 }}</div>
          <div class="chain-step-details" *ngIf="chainData.authorities?.length > 0">
            <span *ngFor="let a of chainData.authorities" class="chain-detail-tag">
              {{ lang === 'ar' ? (a.name_ar || a.name_en || a.code) : (a.name_en || a.code) }}
            </span>
          </div>
        </div>

        <div class="chain-arrow"><i class="pi pi-arrow-right"></i></div>

        <!-- Step 3: Frameworks -->
        <div class="chain-step" [style.animation-delay]="'200ms'">
          <div class="chain-step-icon framework"><i class="pi pi-book"></i></div>
          <div class="chain-step-label">{{ lang === 'ar' ? 'الأطر التنظيمية' : 'Frameworks' }}</div>
          <div class="chain-step-count">{{ chainData.frameworks?.length || 0 }}</div>
          <div class="chain-step-details" *ngIf="chainData.frameworks?.length > 0">
            <span *ngFor="let fw of chainData.frameworks" class="chain-detail-tag">{{ fw.code || fw.name }}</span>
          </div>
        </div>

        <div class="chain-arrow"><i class="pi pi-arrow-right"></i></div>

        <!-- Step 4: Controls -->
        <div class="chain-step" [style.animation-delay]="'300ms'">
          <div class="chain-step-icon control"><i class="pi pi-check-square"></i></div>
          <div class="chain-step-label">{{ lang === 'ar' ? 'الضوابط' : 'Controls' }}</div>
          <div class="chain-step-count">{{ chainData.controlCount || 0 }}</div>
        </div>

        <div class="chain-arrow"><i class="pi pi-arrow-right"></i></div>

        <!-- Step 5: Evidence -->
        <div class="chain-step" [style.animation-delay]="'400ms'">
          <div class="chain-step-icon evidence"><i class="pi pi-folder"></i></div>
          <div class="chain-step-label">{{ lang === 'ar' ? 'مهام الأدلة' : 'Evidence Tasks' }}</div>
          <div class="chain-step-count">{{ chainData.evidenceTaskCount || 0 }}</div>
        </div>
      </div>

      <div class="chain-source">
        <i class="pi pi-database"></i>
        {{ lang === 'ar' ? 'مصدر البيانات: قاعدة البيانات التنظيمية — حتمي وقابل للتتبع' : 'Source: Regulatory database — deterministic and traceable' }}
      </div>
    </div>
  `,
    styles: [`
    .chain {
      margin-bottom: 1.5rem;
      background: var(--surface, #fff);
      border: 1px solid var(--border-subtle, rgba(var(--color-black-rgb), 0.08));
      border-radius: var(--radius-lg, 12px);
      padding: 1.5rem 2rem;
      border-inline-start: 3px solid var(--primary, #0f62fe);
    }
    .chain.rtl { direction: rtl; }
    .chain.rtl .chain-arrow i { transform: rotate(180deg); }

    .chain-header { margin-bottom: 1.25rem; }
    .chain-header h3 {
      font-size: 1.05rem; font-weight: 700; color: var(--text-heading, #161616);
      display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.35rem;
    }
    .chain-header h3 i { color: var(--primary, #0f62fe); }
    .chain-sub { font-size: 0.82rem; color: var(--text-muted, #6f6f6f); margin: 0; line-height: 1.5; }

    .chain-flow {
      display: flex; align-items: flex-start; gap: 0.5rem;
      overflow-x: auto; padding: 0.5rem 0;
    }

    .chain-step {
      display: flex; flex-direction: column; align-items: center;
      min-width: 100px; flex-shrink: 0; text-align: center;
      animation: chainStepIn 0.4s ease both;
    }

    .chain-step-icon {
      width: 44px; height: 44px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-body-md); margin-bottom: 0.5rem;
    }
    .chain-step-icon.sector { background: rgba(var(--primary-rgb), 0.1); color: var(--primary, #0f62fe); }
    .chain-step-icon.authority { background: rgba(var(--color-ibm-purple-rgb), 0.1); color: #6929c4; }
    .chain-step-icon.framework { background: rgba(var(--module-accent-teal-rgb), 0.1); color: #009d9a; }
    .chain-step-icon.control { background: rgba(var(--success-rgb), 0.1); color: var(--status-success, #24a148); }
    .chain-step-icon.evidence { background: rgba(var(--warning-rgb), 0.1); color: #f1c21b; }

    .chain-step-label {
      font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--text-muted, #6f6f6f);
      margin-bottom: 0.25rem;
    }

    .chain-step-value {
      font-size: 0.88rem; font-weight: 600; color: var(--text-heading, #161616);
    }

    .chain-step-count {
      font-size: 1.4rem; font-weight: 700; color: var(--primary, #0f62fe);
      line-height: 1;
    }

    .chain-step-details {
      display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.4rem;
      justify-content: center; max-width: 140px;
    }

    .chain-detail-tag {
      font-size: 0.62rem; font-weight: 500; padding: 0.12rem 0.4rem;
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.08));
      border-radius: var(--radius-pill, 20px); color: var(--text-body, #525252);
      white-space: nowrap;
    }

    .chain-arrow {
      display: flex; align-items: center; padding-top: 0.75rem;
      color: var(--text-muted, #6f6f6f); font-size: var(--font-size-tag); flex-shrink: 0;
    }

    .chain-source {
      display: flex; align-items: center; gap: 0.3rem;
      font-size: 0.68rem; color: var(--status-success, #24a148);
      margin-top: 1rem; padding-top: 0.75rem;
      border-top: 1px solid var(--border-subtle, rgba(var(--color-black-rgb), 0.06));
      font-weight: 500;
    }
    .chain-source i { font-size: 0.6rem; }

    @keyframes chainStepIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 640px) {
      .chain-flow { flex-direction: column; align-items: stretch; }
      .chain-step { flex-direction: row; gap: 0.75rem; min-width: unset; text-align: start; }
      .chain-step-details { justify-content: flex-start; max-width: none; }
      .chain-arrow { display: none; }
    }

    @media (prefers-reduced-motion: reduce) {
      .chain-step { animation: none !important; }
    }
  `]
})
export class RegulatoryChainVisualComponent {
  @Input() chainData: GrcRecord;
  @Input() lang: 'en' | 'ar' = 'en';
}
