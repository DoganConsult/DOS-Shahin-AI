import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface AIContrast {
  icon: string;
  oldAr: string;
  oldEn: string;
  newAr: string;
  newEn: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-builtin-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="aib-section" id="ai-builtin">
      <div class="aib-bg">
        <div class="aib-orb aib-orb-1"></div>
        <div class="aib-orb aib-orb-2"></div>
        <div class="aib-grid-overlay"></div>
      </div>
      <div class="aib-container">
        <div class="aib-header">
          <div class="aib-badge">
            <i class="pi pi-microchip-ai"></i>
            {{ i18n.translate('landing.aiBuiltin.badge') }}
          </div>
          <h2 class="aib-title">
            {{ i18n.translate('landing.aiBuiltin.title') }}
          </h2>
          <p class="aib-subtitle">
            {{ i18n.translate('landing.aiBuiltin.subtitle') }}
          </p>
        </div>

        <div class="contrast-grid">
          <div *ngFor="let c of contrasts" class="contrast-card">
            <div class="contrast-icon">
              <i class="pi" [ngClass]="c.icon"></i>
            </div>
            <div class="contrast-row old-row">
              <div class="contrast-tag old-tag">
                <i class="pi pi-times"></i>
                {{ i18n.translate('landing.aiBuiltin.others') }}
              </div>
              <p class="contrast-text old-text">{{ i18n.localize(c.oldEn, c.oldAr) }}</p>
            </div>
            <div class="contrast-divider"></div>
            <div class="contrast-row new-row">
              <div class="contrast-tag new-tag">
                <i class="pi pi-check"></i>
                Shahin-AI
              </div>
              <p class="contrast-text new-text">{{ i18n.localize(c.newEn, c.newAr) }}</p>
            </div>
          </div>
        </div>

        <div class="aib-proof">
          <div class="proof-item">
            <span class="proof-num">10</span>
            <span class="proof-label">{{ i18n.translate('landing.aiBuiltin.specializedAgents') }}</span>
          </div>
          <div class="proof-sep"></div>
          <div class="proof-item">
            <span class="proof-num">585</span>
            <span class="proof-label">{{ i18n.translate('landing.aiBuiltin.linesOfCode') }}</span>
          </div>
          <div class="proof-sep"></div>
          <div class="proof-item">
            <span class="proof-num">4</span>
            <span class="proof-label">{{ i18n.translate('landing.aiBuiltin.explainabilityPacks') }}</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .aib-section {
      position: relative; padding: 100px 0 80px; overflow: hidden;
      background: linear-gradient(160deg, #0c1a2e 0%, #0f2942 40%, #0c3a5e 100%);
    }
    .aib-bg { position: absolute; inset: 0; pointer-events: none; }
    .aib-orb {
      position: absolute; border-radius: var(--radius-pill); filter: blur(140px); opacity: 0.15;
    }
    .aib-orb-1 { width: 500px; height: 500px; top: -10%; right: -10%; background: var(--primary); }
    .aib-orb-2 { width: 400px; height: 400px; bottom: -15%; left: -5%; background: #eab308; }
    .aib-grid-overlay {
      position: absolute; inset: 0;
      background-image: radial-gradient(rgba(var(--color-white-rgb), 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
    }

    .aib-container {
      position: relative; z-index: var(--z-base);
      max-width: 1024px; margin: 0 auto; padding: 0 24px;
    }

    .aib-header { text-align: center; margin-bottom: 56px; }
    .aib-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 7px 20px; border-radius: var(--radius-pill);
      background: rgba(var(--module-accent-sky-rgb), 0.12); border: 1px solid rgba(var(--module-accent-sky-rgb), 0.25);
      color: #7dd3fc; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 24px;
    }
    .aib-badge .pi { font-size: var(--font-size-sm); }
    .aib-title {
      font-size: var(--font-size-4xl); font-weight: 900; color: #ffffff;
      margin: 0 0 16px; letter-spacing: -0.02em;
    }
    .aib-subtitle {
      font-size: var(--font-size-md); color: rgba(var(--color-white-rgb), 0.55); max-width: 620px;
      margin: 0 auto; line-height: 1.8;
    }

    .contrast-grid {
      display: flex; flex-direction: column; gap: 16px;
      margin-bottom: 48px;
    }
    .contrast-card {
      padding: 28px; border-radius: var(--radius-xl);
      background: rgba(var(--color-white-rgb), 0.04);
      border: 1px solid rgba(var(--color-white-rgb), 0.08);
      backdrop-filter: blur(12px);
      transition: all 350ms;
    }
    .contrast-card:hover {
      background: rgba(var(--color-white-rgb), 0.06);
      border-color: rgba(var(--module-accent-sky-rgb), 0.3);
      transform: translateY(-2px);
      box-shadow: var(--shadow-xl);
    }
    .contrast-icon {
      width: 44px; height: 44px; border-radius: var(--radius-lg);
      display: flex; align-items: center; justify-content: center;
      background: rgba(var(--module-accent-sky-rgb), 0.12); color: #7dd3fc;
      font-size: var(--font-size-xl); margin-bottom: 20px;
    }

    .contrast-row { display: flex; align-items: flex-start; gap: 14px; }
    .contrast-tag {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 12px; border-radius: var(--radius);
      font-size: var(--font-size-xs); font-weight: 700; flex-shrink: 0;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .contrast-tag .pi { font-size: var(--font-size-xs); }
    .old-tag { background: rgba(var(--module-accent-red-rgb), 0.15); color: #fca5a5; }
    .new-tag { background: rgba(var(--color-green-400-rgb), 0.15); color: #86efac; }

    .contrast-text { margin: 0; font-size: var(--font-size-base); line-height: 1.6; padding-top: 2px; }
    .old-text { color: rgba(var(--color-white-rgb), 0.4); }
    .new-text { color: rgba(var(--color-white-rgb), 0.85); font-weight: 600; }

    .contrast-divider {
      width: 100%; height: 1px; margin: 14px 0;
      background: linear-gradient(90deg, transparent, rgba(var(--color-white-rgb), 0.08), transparent);
    }

    .aib-proof {
      display: flex; align-items: center; justify-content: center; gap: 32px;
      padding: 24px 40px; border-radius: 18px;
      background: rgba(var(--module-accent-sky-rgb), 0.08); border: 1px solid rgba(var(--module-accent-sky-rgb), 0.15);
    }
    .proof-item { text-align: center; }
    .proof-num { display: block; font-size: var(--font-size-4xl); font-weight: 900; color: #ffffff; }
    .proof-label { display: block; font-size: var(--font-size-sm); color: rgba(var(--color-white-rgb), 0.5); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
    .proof-sep { width: 1px; height: 40px; background: rgba(var(--color-white-rgb), 0.1); }

    @media (max-width: 768px) {
      .aib-title { font-size: var(--font-size-2xl); }
      .aib-section { padding: 60px 0; }
      .aib-proof { flex-direction: column; gap: 16px; padding: 20px; }
      .proof-sep { width: 60px; height: 1px; }
      .contrast-row { flex-direction: column; gap: 8px; }
    }
  `],
})
export class AIBuiltinSectionComponent {
  i18n = inject(I18nService);

  contrasts: AIContrast[] = [
    {
      icon: 'pi pi-folder-open',
      oldAr: 'يسألك: "هل عندك دليل؟"',
      oldEn: 'Asks: "Do you have evidence?"',
      newAr: 'يقول لك: "هذا الدليل لا يثبت ما تعتقد — وهذا ما ينقصك."',
      newEn: 'Says: "This evidence doesn\'t prove what you think — and here\'s what\'s missing."',
    },
    {
      icon: 'pi pi-exclamation-triangle',
      oldAr: 'يقول: "المخاطر عالية."',
      oldEn: 'Says: "Risk is high."',
      newAr: 'يقول: "إذا استمر هذا 6 أشهر، هذا ما سيحدث — وهذه خطة المعالجة."',
      newEn: 'Says: "If this continues 6 months, here\'s what happens — and here\'s the remediation plan."',
    },
    {
      icon: 'pi pi-file',
      oldAr: 'ينشئ تقريراً عاماً.',
      oldEn: 'Generates a generic report.',
      newAr: 'ينشئ حزمة تفسير مخصصة لدورك: مدقق، قانوني، تنفيذي، أو مهندس.',
      newEn: 'Generates a role-specific explanation pack: auditor, legal, executive, or engineer.',
    },
    {
      icon: 'pi pi-cog',
      oldAr: 'يحتاج إعداد يدوي لكل إطار.',
      oldEn: 'Requires manual setup for each framework.',
      newAr: 'أجب عن 5 أسئلة — ويبني مساحة عمل كاملة مع الأطر والضوابط والسياسات تلقائيًا.',
      newEn: 'Answer 5 questions — and it builds a complete workspace with frameworks, controls, and policies automatically.',
    },
  ];

}
