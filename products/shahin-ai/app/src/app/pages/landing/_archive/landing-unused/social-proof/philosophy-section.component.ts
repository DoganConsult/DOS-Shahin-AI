import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface Belief {
  icon: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-philosophy-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="phil-section" id="philosophy">
      <div class="phil-bg">
        <div class="phil-orb phil-orb-1"></div>
        <div class="phil-orb phil-orb-2"></div>
        <div class="phil-grid-overlay"></div>
      </div>
      <div class="phil-container">
        <div class="phil-header">
          <div class="phil-badge">
            <i class="pi pi-heart"></i>
            {{ i18n.translate('landing.philosophy.badge') }}
          </div>
          <h2 class="phil-title">
            {{ i18n.translate('landing.philosophy.title') }}
          </h2>
          <p class="phil-manifesto">
            {{ i18n.translate('landing.philosophy.manifesto') }}
          </p>
        </div>

        <div class="beliefs-grid">
          <div *ngFor="let belief of beliefs" class="belief-card">
            <div class="belief-icon">
              <i class="pi" [ngClass]="belief.icon"></i>
            </div>
            <h3 class="belief-title">{{ i18n.localize(belief.titleEn, belief.titleAr) }}</h3>
            <p class="belief-desc">{{ i18n.localize(belief.descEn, belief.descAr) }}</p>
          </div>
        </div>

        <div class="phil-quote">
          <div class="quote-mark">"</div>
          <p class="quote-text">
            {{ i18n.translate('landing.philosophy.quote') }}
          </p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .phil-section {
      position: relative; padding: 100px 0 80px; overflow: hidden;
      background: linear-gradient(160deg, #0c1a2e 0%, #0f2942 40%, #0c3a5e 100%);
    }
    .phil-bg { position: absolute; inset: 0; pointer-events: none; }
    .phil-orb {
      position: absolute; border-radius: var(--radius-pill); filter: blur(140px); opacity: 0.12;
    }
    .phil-orb-1 { width: 500px; height: 500px; top: -10%; left: -10%; background: var(--primary); }
    .phil-orb-2 { width: 400px; height: 400px; bottom: -15%; right: -5%; background: #eab308; }
    .phil-grid-overlay {
      position: absolute; inset: 0;
      background-image: radial-gradient(rgba(var(--color-white-rgb), 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
    }

    .phil-container {
      position: relative; z-index: var(--z-base);
      max-width: 1024px; margin: 0 auto; padding: 0 24px;
    }

    .phil-header { text-align: center; margin-bottom: 56px; }
    .phil-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 7px 20px; border-radius: var(--radius-pill);
      background: rgba(var(--module-accent-sky-rgb), 0.12); border: 1px solid rgba(var(--module-accent-sky-rgb), 0.25);
      color: #7dd3fc; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 24px;
    }
    .phil-badge .pi { font-size: var(--font-size-sm); }
    .phil-title {
      font-size: 36px; font-weight: 900; color: #ffffff;
      margin: 0 0 16px; letter-spacing: -0.02em;
    }
    .phil-manifesto {
      font-size: var(--font-size-lg); color: rgba(var(--color-white-rgb), 0.6); max-width: 600px;
      margin: 0 auto; line-height: 1.8;
    }

    .beliefs-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;
      margin-bottom: 48px;
    }
    .belief-card {
      padding: 28px 24px; border-radius: var(--radius-xl);
      background: rgba(var(--color-white-rgb), 0.04);
      border: 1px solid rgba(var(--color-white-rgb), 0.08);
      backdrop-filter: blur(12px);
      transition: all 350ms;
    }
    .belief-card:hover {
      background: rgba(var(--color-white-rgb), 0.07);
      border-color: rgba(var(--module-accent-sky-rgb), 0.3);
      transform: translateY(-4px);
      box-shadow: var(--shadow-xl);
    }
    .belief-icon {
      width: 48px; height: 48px; border-radius: var(--radius-lg);
      display: flex; align-items: center; justify-content: center;
      background: rgba(var(--module-accent-sky-rgb), 0.12); color: #7dd3fc;
      font-size: var(--font-size-2xl); margin-bottom: 16px;
    }
    .belief-title {
      font-size: 17px; font-weight: 800; color: #ffffff;
      margin: 0 0 10px;
    }
    .belief-desc {
      font-size: var(--font-size-base); color: rgba(var(--color-white-rgb), 0.5); line-height: 1.7; margin: 0;
    }

    .phil-quote {
      text-align: center; position: relative;
      padding: 32px; border-radius: var(--radius-xl);
      background: rgba(var(--module-accent-yellow-rgb), 0.06); border: 1px solid rgba(var(--module-accent-yellow-rgb), 0.15);
    }
    .quote-mark {
      font-size: 64px; font-weight: 900; color: rgba(var(--module-accent-yellow-rgb), 0.25);
      line-height: 0.6; margin-bottom: 8px;
    }
    .quote-text {
      font-size: var(--font-size-xl); font-weight: 700; color: rgba(var(--color-white-rgb), 0.85);
      max-width: 550px; margin: 0 auto; line-height: 1.6;
      font-style: italic;
    }

    @media (max-width: 768px) {
      .beliefs-grid { grid-template-columns: 1fr; }
      .phil-title { font-size: var(--font-size-3xl); }
      .phil-section { padding: 60px 0; }
    }
  `],
})
export class PhilosophySectionComponent {
  i18n = inject(I18nService);

  beliefs: Belief[] = [
    {
      icon: 'pi pi-sync',
      titleAr: 'دورة حياة — ليس قائمة تحقق',
      titleEn: 'Lifecycle — Not a Checklist',
      descAr: 'الامتثال ليس مشروعاً ينتهي. بل دورة مستمرة: خطّط ← نفّذ ← راقب ← حسّن ← كرّر.',
      descEn: 'Compliance isn\'t a project that ends. It\'s a continuous cycle: plan → execute → monitor → improve → repeat.',
    },
    {
      icon: 'pi pi-microchip-ai',
      titleAr: 'الذكاء الاصطناعي داخل القرار',
      titleEn: 'AI Inside the Decision',
      descAr: 'ليس chatbot على الجانب. بل ذكاء مدمج في كل تقييم مخاطر، كل فجوة، كل توصية.',
      descEn: 'Not a chatbot on the side. Intelligence embedded in every risk assessment, every gap, every recommendation.',
    },
    {
      icon: 'pi pi-chart-line',
      titleAr: 'النضج أهم من الامتثال',
      titleEn: 'Maturity Over Compliance',
      descAr: 'الامتثال يقول "هل طبّقت؟" — النضج يقول "هل تحسّنت فعلاً؟" نحن نقيس الثاني.',
      descEn: 'Compliance asks "did you implement?" — Maturity asks "did you actually improve?" We measure the latter.',
    },
    {
      icon: 'pi pi-users',
      titleAr: 'الثقافة أقوى من التقارير',
      titleEn: 'Culture Over Reports',
      descAr: 'التقارير تُرضي المدقق. الثقافة تحمي المؤسسة. نحن نبني أنظمة تخلق ثقافة حوكمة.',
      descEn: 'Reports satisfy auditors. Culture protects organizations. We build systems that create governance culture.',
    },
  ];

}
