import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SectionHeaderComponent } from '@app/shared/widgets/section-header/section-header.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-how-it-works-section',
    imports: [CommonModule, SectionHeaderComponent],
    template: `
    <section class="hiw-section">
      <div class="hiw-container">
        <app-section-header
          badge="Shahin-AI Boot Sequence"
          badgeAr="تسلسل إقلاع Shahin-AI"
          badgeIcon="pi pi-power-off"
          title="Boot → Configure → Autonomous"
          titleAr="إقلاع → تهيئة → تشغيل مستقل"
          subtitle="Three steps to go from zero to a fully autonomous GRC operating system. No consultants. No templates. Real AI."
          subtitleAr="ثلاث خطوات للانتقال من الصفر إلى نظام حوكمة مستقل بالكامل. بدون مستشارين. بدون قوالب. ذكاء اصطناعي حقيقي."
        />

        <div class="steps-row">
          <!-- Step 1: Boot -->
          <div class="step-card">
            <div class="step-num-ring"><span class="step-icon"><i class="pi pi-power-off"></i></span></div>
            <div class="step-phase">{{ i18n.translate('landing.howItWorks.phase') }} 1</div>
            <h3>{{ i18n.translate('landing.howItWorks.boot') }}</h3>
            <p>{{ i18n.translate('landing.howItWorks.bootDesc') }}</p>
            <div class="step-output">
              <span class="so-chip"><i class="pi pi-building"></i> {{ i18n.translate('landing.howItWorks.sector') }}</span>
              <span class="so-chip"><i class="pi pi-shield"></i> {{ i18n.translate('landing.howItWorks.regulators') }}</span>
              <span class="so-chip"><i class="pi pi-book"></i> {{ i18n.translate('landing.howItWorks.frameworks') }}</span>
            </div>
          </div>

          <!-- Connector -->
          <div class="step-connector">
            <div class="conn-line"></div>
            <i class="pi pi-chevron-right"></i>
          </div>

          <!-- Step 2: Configure -->
          <div class="step-card">
            <div class="step-num-ring"><span class="step-icon"><i class="pi pi-microchip-ai"></i></span></div>
            <div class="step-phase">{{ i18n.translate('landing.howItWorks.phase') }} 2</div>
            <h3>{{ i18n.translate('landing.howItWorks.configure') }}</h3>
            <p>{{ i18n.translate('landing.howItWorks.configureDesc') }}</p>
            <div class="step-output">
              <span class="so-chip"><i class="pi pi-check-circle"></i> 4,000+ {{ i18n.translate('landing.howItWorks.controls') }}</span>
              <span class="so-chip"><i class="pi pi-file"></i> {{ i18n.translate('landing.howItWorks.policies') }}</span>
              <span class="so-chip"><i class="pi pi-calendar"></i> {{ i18n.translate('landing.howItWorks.ninetyDayPlan') }}</span>
            </div>
          </div>

          <!-- Connector -->
          <div class="step-connector">
            <div class="conn-line"></div>
            <i class="pi pi-chevron-right"></i>
          </div>

          <!-- Step 3: Autonomous -->
          <div class="step-card step-card-glow">
            <div class="step-num-ring step-green"><span class="step-icon"><i class="pi pi-check"></i></span></div>
            <div class="step-phase">{{ i18n.translate('landing.howItWorks.phase') }} 3</div>
            <h3>{{ i18n.translate('landing.howItWorks.autonomous') }}</h3>
            <p>{{ i18n.translate('landing.howItWorks.autonomousDesc') }}</p>
            <div class="step-output">
              <span class="so-chip so-live"><i class="pi pi-circle-fill"></i> {{ i18n.translate('landing.howItWorks.liveNow') }}</span>
              <span class="so-chip"><i class="pi pi-chart-bar"></i> {{ i18n.translate('landing.howItWorks.dashboards') }}</span>
              <span class="so-chip"><i class="pi pi-file-pdf"></i> {{ i18n.translate('landing.howItWorks.reports') }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
    styles: [`
    .hiw-section { padding: clamp(48px, 7vw, 88px) 0; background: var(--surface-ice); }
    .hiw-container { max-width: 1024px; margin: 0 auto; padding: 0 24px; }

    .steps-row {
      display: flex; align-items: stretch; justify-content: center; gap: 0;
    }

    .step-connector {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 0 6px; color: var(--border-subtle);
    }
    .conn-line { width: 40px; height: 2px; background: linear-gradient(90deg, var(--border-subtle), var(--primary), var(--border-subtle)); }
    .step-connector .pi { font-size: var(--font-size-sm); color: var(--primary); margin-top: 4px; }
    /* RTL: chevron-right is LTR-baked; flip horizontally so the visual
       reads in Arabic right-to-left progression. Connector gradient
       mirrored to match. :host-context lets the rule see the [dir]
       attribute set on the ancestor LandingComponent wrapper despite
       Angular's emulated view encapsulation. */
    :host-context([dir="rtl"]) .step-connector .pi { transform: scaleX(-1); }
    :host-context([dir="rtl"]) .conn-line { background: linear-gradient(270deg, var(--border-subtle), var(--primary), var(--border-subtle)); }

    .step-card {
      flex: 1; max-width: 340px; text-align: center;
      padding: 36px 24px 28px; border-radius: var(--radius-xl);
      border: 1px solid var(--border-subtle); background: var(--surface);
      position: relative; transition: all 300ms;
    }
    .step-card:hover { border-color: var(--primary); box-shadow: var(--shadow-xl); transform: translateY(-4px); }
    .step-card-glow { border-color: rgba(var(--module-accent-green-rgb), 0.3); box-shadow: 0 0 30px rgba(var(--module-accent-green-rgb), 0.06); }

    .step-num-ring {
      position: absolute; top: -18px; left: 50%; transform: translateX(-50%);
      width: 36px; height: 36px; border-radius: var(--radius-pill);
      background: linear-gradient(135deg, var(--primary-dark), var(--primary));
      display: flex; align-items: center; justify-content: center;
      box-shadow: var(--shadow-md);
    }
    .step-num-ring.step-green { background: linear-gradient(135deg, var(--success), var(--success)); box-shadow: var(--shadow-md); }
    .step-icon { color: white; font-size: var(--font-size-base); }

    .step-phase {
      font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
      color: var(--primary); margin-bottom: 6px;
    }

    .step-card h3 { font-size: var(--font-size-lg); font-weight: 900; color: var(--text-heading); margin: 0 0 10px; }
    .step-card p { font-size: var(--font-size-sm); color: var(--text-muted); line-height: 1.7; margin: 0 0 16px; }

    .step-output { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .so-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 12px; border-radius: var(--radius);
      background: var(--surface-ice); border: 1px solid var(--border-primary);
      font-size: var(--font-size-xs); font-weight: 600; color: var(--text-body);
    }
    .so-chip .pi { font-size: var(--font-size-xs); color: var(--primary); }
    .so-live { background: rgba(var(--module-accent-green-rgb), 0.08); border-color: rgba(var(--module-accent-green-rgb), 0.3); color: var(--success); }
    .so-live .pi { color: var(--success); font-size: 8px; animation: livePulse 2s infinite; }
    @keyframes livePulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

    @media (max-width: 900px) {
      .steps-row { flex-direction: column; align-items: center; gap: 24px; }
      .step-connector { display: none; }
    }
  `]
})
export class HowItWorksSectionComponent {
  i18n = inject(I18nService);
}
