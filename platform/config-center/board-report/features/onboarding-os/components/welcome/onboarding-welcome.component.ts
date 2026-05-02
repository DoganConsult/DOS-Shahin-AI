import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { BilingualPipe } from '../shared/bilingual.pipe';

interface MissionPhase {
  icon: string;
  labelEn: string;
  labelAr: string;
}

@Component({
    selector: 'app-onboarding-welcome',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonModule, BilingualPipe],
    template: `
    <div class="welcome-mission" [class.rtl]="lang === 'ar'">
      <div class="welcome-hero">
        <div class="welcome-icon-ring">
          <i class="pi pi-shield"></i>
        </div>
        <h1>{{ { en: 'Build Your Governance Operating System', ar: 'ابنِ نظام التشغيل الحوكمي الخاص بك' } | bilingual:lang }}</h1>
        <p class="welcome-subtitle">
          {{ { en: 'Shahin will guide you through setting up an enterprise-grade GRC environment — powered by 17+ AI agents, 50+ MCP tools, and 21+ temporal workers.',
               ar: 'سيرشدك شاهين لإعداد بيئة حوكمة مؤسسية — مدعومة بـ 17+ وكيل ذكاء اصطناعي و50+ أداة MCP و21+ عامل زمني.' } | bilingual:lang }}
        </p>
      </div>

      <div class="welcome-time">
        <i class="pi pi-clock"></i>
        <span>{{ { en: 'Estimated setup time: ~15 minutes', ar: 'الوقت المقدر للإعداد: ~15 دقيقة' } | bilingual:lang }}</span>
      </div>

      <div class="welcome-journey">
        <h3>{{ { en: 'Your Journey', ar: 'رحلتك' } | bilingual:lang }}</h3>
        <div class="journey-phases">
          <div *ngFor="let phase of phases; let i = index; let last = last" class="journey-phase" [style.animation-delay]="(i * 120) + 'ms'">
            <div class="phase-dot">
              <i [class]="'pi ' + phase.icon"></i>
            </div>
            <span class="phase-label">{{ { en: phase.labelEn, ar: phase.labelAr } | bilingual:lang }}</span>
            <div class="phase-connector" *ngIf="!last"></div>
          </div>
        </div>
      </div>

      <div class="welcome-guarantees">
        <div class="guarantee" *ngFor="let g of guarantees">
          <i [class]="'pi ' + g.icon"></i>
          <span>{{ { en: g.textEn, ar: g.textAr } | bilingual:lang }}</span>
        </div>
      </div>

      <div class="welcome-cta">
        <button pButton
          [label]="({ en: 'Start Setup', ar: 'ابدأ الإعداد' } | bilingual:lang)"
          icon="pi pi-arrow-right" iconPos="right"
          class="p-button-lg p-button-primary"
          (click)="started.emit()">
        </button>
      </div>
    </div>
  `,
    styles: [`
    .welcome-mission {
      max-width: 680px; margin: 0 auto; padding: 2rem 1rem;
      display: flex; flex-direction: column; align-items: center; gap: 2rem;
      animation: premium-fade-up 0.6s ease both;
    }
    .welcome-hero { text-align: center; }
    .welcome-icon-ring {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary, #0f62fe), var(--primary-dark, #002d9c));
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1.25rem; animation: pulse-scale 2s ease infinite;
    }
    .welcome-icon-ring i { font-size: var(--font-size-4xl); color: #fff; }
    .welcome-hero h1 {
      font-size: var(--font-size-3xl); font-weight: 800; color: var(--text-primary, #111827);
      margin: 0 0 0.75rem; line-height: 1.3;
    }
    .welcome-subtitle {
      font-size: var(--font-size-body-sm); color: var(--text-secondary, #6b7280);
      line-height: 1.6; max-width: 560px; margin: 0 auto;
    }
    .welcome-time {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: var(--font-size-tag); font-weight: 600; color: var(--primary);
      background: var(--surface-ground, #f4f4f4); border-radius: 20px;
      padding: 0.5rem 1.25rem;
    }
    .welcome-journey { width: 100%; }
    .welcome-journey h3 {
      font-size: var(--font-size-tag); font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--text-heading); margin: 0 0 1rem;
    }
    .journey-phases {
      display: flex; align-items: center; justify-content: center;
      gap: 0; flex-wrap: wrap;
    }
    .journey-phase {
      display: flex; align-items: center; gap: 0.5rem;
      animation: premium-fade-up 0.4s ease both;
    }
    .phase-dot {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--surface-card, #fff);
      border: 2px solid var(--border-subtle, #e5e7eb);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .phase-dot i { font-size: var(--font-size-body-sm); color: var(--primary); }
    .phase-label {
      font-size: var(--font-size-caption); font-weight: 600; color: var(--text-body);
      white-space: nowrap;
    }
    .phase-connector {
      width: 24px; height: 2px; background: var(--border-subtle, #e5e7eb);
      margin: 0 0.25rem; flex-shrink: 0;
    }
    .welcome-guarantees {
      display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;
    }
    .guarantee {
      display: flex; align-items: center; gap: 0.35rem;
      font-size: var(--font-size-caption); color: var(--text-secondary);
    }
    .guarantee i { color: var(--status-success, #24a148); font-size: var(--font-size-tag); }
    .welcome-cta { margin-top: 0.5rem; }
    .rtl { direction: rtl; text-align: right; }
    .rtl .journey-phases { direction: rtl; }
    @keyframes premium-fade-up {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse-scale {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `]
})
export class OnboardingWelcomeComponent {
  @Input() lang: 'en' | 'ar' = 'en';
  @Output() started = new EventEmitter<void>();

  phases: MissionPhase[] = [
    { icon: 'pi-user', labelEn: 'Identity', labelAr: 'الهوية' },
    { icon: 'pi-building', labelEn: 'Organization', labelAr: 'المؤسسة' },
    { icon: 'pi-box', labelEn: 'Operating Pack', labelAr: 'حزمة التشغيل' },
    { icon: 'pi-shield', labelEn: 'Frameworks', labelAr: 'الأُطر' },
    { icon: 'pi-users', labelEn: 'Team', labelAr: 'الفريق' },
    { icon: 'pi-play', labelEn: 'Launch', labelAr: 'الإطلاق' },
  ];

  guarantees = [
    { icon: 'pi-lock', textEn: 'Bank-grade encryption', textAr: 'تشفير بمستوى بنكي' },
    { icon: 'pi-cloud', textEn: 'KSA data residency', textAr: 'إقامة بيانات سعودية' },
    { icon: 'pi-check-circle', textEn: 'NCA ECC aligned', textAr: 'متوافق مع الهيئة الوطنية' },
    { icon: 'pi-bolt', textEn: '17+ AI agents ready', textAr: '17+ وكيل ذكاء جاهز' },
  ];
}
