import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface FailReason {
  icon: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-why-fail-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="fail-section" id="why-fail">
      <div class="fail-container">
        <div class="fail-header">
          <div class="fail-badge">
            <i class="pi pi-question-circle"></i>
            {{ i18n.translate('landing.whyFail.badge') }}
          </div>
          <h2 class="fail-title">
            {{ i18n.translate('landing.whyFail.title') }}
          </h2>
          <p class="fail-subtitle">
            {{ i18n.translate('landing.whyFail.subtitle') }}
          </p>
        </div>

        <div class="fail-grid">
          <div *ngFor="let reason of reasons; let i = index" class="fail-card">
            <div class="fail-num">{{ i + 1 }}</div>
            <div class="fail-icon-box">
              <i class="pi" [ngClass]="reason.icon"></i>
            </div>
            <h3 class="fail-card-title">{{ i18n.localize(reason.titleEn, reason.titleAr) }}</h3>
            <p class="fail-card-desc">{{ i18n.localize(reason.descEn, reason.descAr) }}</p>
          </div>
        </div>

        <div class="fail-bridge">
          <i class="pi pi-arrow-down fail-bridge-icon"></i>
          <p class="fail-bridge-text">
            {{ i18n.translate('landing.whyFail.bridge') }}
          </p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .fail-section {
      padding: 80px 0; background: #ffffff;
    }
    .fail-container {
      max-width: 1024px; margin: 0 auto; padding: 0 24px;
    }

    .fail-header { text-align: center; margin-bottom: 48px; }
    .fail-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 7px 20px; border-radius: var(--radius-pill);
      background: var(--status-warning-bg, #fcf4d6); border: 1px solid #fde68a;
      color: #92400e; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 20px;
    }
    .fail-badge .pi { font-size: var(--font-size-sm); }
    .fail-title {
      font-size: var(--font-size-4xl); font-weight: 900; color: var(--text-heading);
      margin: 0 0 14px; letter-spacing: -0.02em;
    }
    .fail-subtitle {
      font-size: var(--font-size-md); color: var(--text-muted); max-width: 600px;
      margin: 0 auto; line-height: 1.8;
    }

    .fail-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;
    }
    .fail-card {
      position: relative; padding: 28px 24px 28px 28px;
      border-radius: 18px; border: 1px solid var(--surface-ice);
      background: #fafbfc; transition: all 300ms;
    }
    .fail-card:hover {
      border-color: #fde68a; background: #fffbeb;
      box-shadow: var(--shadow-xl);
      transform: translateY(-3px);
    }
    .fail-num {
      position: absolute; top: 16px; inset-inline-end: 16px;
      width: 28px; height: 28px; border-radius: var(--radius-pill);
      display: flex; align-items: center; justify-content: center;
      background: var(--status-warning-bg, #fcf4d6); color: #92400e;
      font-size: var(--font-size-sm); font-weight: 800;
      direction: ltr;
    }
    .fail-icon-box {
      width: 44px; height: 44px; border-radius: var(--radius-lg);
      display: flex; align-items: center; justify-content: center;
      background: var(--status-warning-bg, #fcf4d6); color: var(--warning);
      font-size: var(--font-size-xl); margin-bottom: 14px;
    }
    .fail-card-title {
      font-size: var(--font-size-md); font-weight: 800; color: var(--text-heading);
      margin: 0 0 8px;
    }
    .fail-card-desc {
      font-size: var(--font-size-base); color: var(--text-muted); line-height: 1.7; margin: 0;
    }

    .fail-bridge {
      text-align: center; margin-top: 48px;
    }
    .fail-bridge-icon {
      display: block; font-size: var(--font-size-xl); color: var(--primary);
      margin-bottom: 12px;
      animation: bridgeBounce 2s ease-in-out infinite;
    }
    @keyframes bridgeBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(6px); }
    }
    .fail-bridge-text {
      font-size: var(--font-size-lg); font-weight: 700; color: #0369a1;
      max-width: 550px; margin: 0 auto; line-height: 1.6;
    }

    @media (max-width: 768px) {
      .fail-grid { grid-template-columns: 1fr; }
      .fail-title { font-size: var(--font-size-2xl); }
    }
  `],
})
export class WhyFailSectionComponent {
  i18n = inject(I18nService);

  reasons: FailReason[] = [
    {
      icon: 'pi pi-chart-line',
      titleAr: 'الأدوات تتبّع — لا تطوّر',
      titleEn: 'Tools Track — They Don\'t Mature',
      descAr: 'أنظمة GRC التقليدية تسجّل الحالة الحالية. لا تقيس النضج، لا تبني خطة تحسين، ولا تربط بين السبب والنتيجة.',
      descEn: 'Traditional GRC systems record current state. They don\'t measure maturity, build improvement plans, or connect cause to effect.',
    },
    {
      icon: 'pi pi-link',
      titleAr: 'المخاطر والضوابط والأدلة منفصلة',
      titleEn: 'Risks, Controls & Evidence Are Disconnected',
      descAr: 'كل وحدة تعمل لوحدها. المخاطر في جدول، الضوابط في جدول آخر، والأدلة في مجلد ثالث — لا ربط بينها.',
      descEn: 'Each module works alone. Risks in one sheet, controls in another, evidence in a folder — no linkage between them.',
    },
    {
      icon: 'pi pi-map',
      titleAr: 'لا سياق سعودي حقيقي',
      titleEn: 'No Real KSA Context',
      descAr: 'المنتجات الأجنبية تضيف "حزمة سعودية" كإضافة. لا تفهم NCA ECC بعمق، ولا PDPL، ولا خصوصية السوق.',
      descEn: 'Foreign products bolt on a "Saudi package." They don\'t deeply understand NCA ECC, PDPL, or local market nuances.',
    },
    {
      icon: 'pi pi-microchip-ai',
      titleAr: 'الذكاء الاصطناعي شكلي فقط',
      titleEn: 'AI Is Just a Label',
      descAr: 'أغلب الأنظمة تضيف chatbot ثم تسمّي نفسها "AI-powered." لا يوجد ذكاء حقيقي في دورة حياة الامتثال.',
      descEn: 'Most systems add a chatbot and call themselves "AI-powered." There\'s no real intelligence in the compliance lifecycle.',
    },
  ];

}
