import { Component, inject, signal, EventEmitter, Output, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MobilePlatformService } from '../../services/mobile-platform.service';
import { BiometricAuthService } from '../../services/biometric-auth.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { HapticFeedbackService } from '../../services/haptic-feedback.service';
import { Preferences } from '@capacitor/preferences';

interface OnboardingSlide {
  icon: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  action?: 'biometric' | 'push' | 'done';
}

/**
 * First-launch mobile onboarding wizard.
 *
 * Shown once on first app open — walks the user through:
 * 1. Welcome screen with Shahin GRC branding
 * 2. Biometric authentication opt-in
 * 3. Push notification permission request
 * 4. Offline evidence capture showcase
 * 5. Get started
 */
@Component({
  selector: 'app-mobile-onboarding',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showOnboarding()) {
      <div class="onboarding-overlay">
        <div class="slide-container">
          <!-- Progress dots -->
          <div class="progress-dots">
            @for (slide of slides; track slide.icon; let i = $index) {
              <div class="dot" [class.active]="i === currentSlide()"></div>
            }
          </div>

          <!-- Current slide -->
          <div class="slide" (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)">
            <div class="slide-icon-container">
              <span class="material-icons-outlined slide-icon">{{ slides[currentSlide()].icon }}</span>
            </div>
            <h2 class="slide-title">
              {{ isArabic() ? slides[currentSlide()].title.ar : slides[currentSlide()].title.en }}
            </h2>
            <p class="slide-description">
              {{ isArabic() ? slides[currentSlide()].description.ar : slides[currentSlide()].description.en }}
            </p>
          </div>

          <!-- Actions -->
          <div class="slide-actions">
            @if (currentSlide() < slides.length - 1) {
              <button class="btn-secondary" (click)="skip()">
                {{ isArabic() ? 'تخطي' : 'Skip' }}
              </button>
              <button class="btn-primary" (click)="next()">
                {{ isArabic() ? 'التالي' : 'Next' }}
              </button>
            } @else {
              <button class="btn-primary full-width" (click)="complete()">
                {{ isArabic() ? 'ابدأ الآن' : 'Get Started' }}
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .onboarding-overlay {
      position: fixed;
      inset: 0;
      z-index: var(--z-skip-link);
      background: #0a1628;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: env(safe-area-inset-top, 20px) 24px env(safe-area-inset-bottom, 20px);
    }

    .slide-container {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32px;
    }

    .progress-dots {
      display: flex;
      gap: 8px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(var(--color-white-rgb), 0.15);
      transition: background 0.3s ease, transform 0.3s ease;
    }

    .dot.active {
      background: #3b82f6;
      transform: scale(1.25);
    }

    .slide {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      min-height: 300px;
      justify-content: center;
    }

    .slide-icon-container {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: rgba(var(--module-accent-blue-rgb), 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }

    .slide-icon {
      font-size: var(--font-size-6xl);
      color: #3b82f6;
    }

    .slide-title {
      font-size: var(--font-size-2xl);
      font-weight: 800;
      color: white;
      margin: 0;
      line-height: 1.2;
    }

    .slide-description {
      font-size: 15px;
      color: rgba(var(--color-white-rgb), 0.5);
      margin: 0;
      line-height: 1.5;
      max-width: 300px;
    }

    .slide-actions {
      display: flex;
      gap: 12px;
      width: 100%;
    }

    .btn-primary {
      flex: 1;
      padding: 16px 24px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: var(--radius-lg);
      font-size: var(--font-size-md);
      font-weight: 700;
      cursor: pointer;
      min-height: 52px;
    }

    .btn-primary:active { background: #2563eb; }

    .btn-secondary {
      padding: 16px 24px;
      background: transparent;
      color: rgba(var(--color-white-rgb), 0.5);
      border: none;
      font-size: var(--font-size-md);
      cursor: pointer;
    }

    .full-width { width: 100%; }
  `],
})
export class MobileOnboardingComponent implements OnInit {
  @Output() completed = new EventEmitter<void>();

  private readonly platform = inject(MobilePlatformService);
  private readonly biometric = inject(BiometricAuthService);
  private readonly push = inject(PushNotificationService);
  private readonly haptic = inject(HapticFeedbackService);

  readonly showOnboarding = signal(false);
  readonly currentSlide = signal(0);
  readonly isArabic = signal(document.documentElement.getAttribute('lang') === 'ar');

  private touchStartX = 0;
  private readonly ONBOARDING_KEY = 'grc_mobile_onboarding_done';

  readonly slides: OnboardingSlide[] = [
    {
      icon: 'shield',
      title: { en: 'Shahin GRC', ar: 'شاهين GRC' },
      description: {
        en: 'AI-powered Governance, Risk & Compliance — now in your pocket. Built for Saudi Arabia.',
        ar: 'الحوكمة والمخاطر والالتزام بالذكاء الاصطناعي — الآن في جيبك. مصمم للمملكة.',
      },
    },
    {
      icon: 'fingerprint',
      title: { en: 'Biometric Security', ar: 'الأمان البيومتري' },
      description: {
        en: 'Protect GRC data with Face ID or fingerprint. Your compliance data stays secure.',
        ar: 'حماية بيانات GRC ببصمة الوجه أو الإصبع. بياناتك آمنة.',
      },
      action: 'biometric',
    },
    {
      icon: 'notifications_active',
      title: { en: 'Stay Informed', ar: 'كن على اطلاع' },
      description: {
        en: 'Get instant alerts for SLA deadlines, risk changes, and approval requests.',
        ar: 'إشعارات فورية للمواعيد النهائية وتغيرات المخاطر وطلبات الموافقة.',
      },
      action: 'push',
    },
    {
      icon: 'photo_camera',
      title: { en: 'Field Audits', ar: 'التدقيق الميداني' },
      description: {
        en: 'Capture evidence with GPS + SHA-256 hashing. Works fully offline.',
        ar: 'التقاط الأدلة مع GPS وتجزئة SHA-256. يعمل بالكامل بدون إنترنت.',
      },
    },
    {
      icon: 'rocket_launch',
      title: { en: 'Ready to Go', ar: 'جاهز للانطلاق' },
      description: {
        en: 'Your mobile GRC command center is ready. Swipe, tap, and stay compliant.',
        ar: 'مركز قيادة GRC الخاص بك جاهز. اسحب، انقر، وابق ملتزماً.',
      },
      action: 'done',
    },
  ];

  ngOnInit(): void {
    void this.initializeOnboarding();
  }

  private async initializeOnboarding(): Promise<void> {
    if (!this.platform.isNative) return;

    const { value } = await Preferences.get({ key: this.ONBOARDING_KEY });
    if (value !== 'true') {
      this.showOnboarding.set(true);
    }
  }

  async next(): Promise<void> {
    await this.haptic.tap();
    const slide = this.slides[this.currentSlide()];

    // Handle permission actions on the current slide
    if (slide.action === 'biometric') {
      await (this.biometric as any).enable();
    } else if (slide.action === 'push') {
      await this.push.init();
    }

    if (this.currentSlide() < this.slides.length - 1) {
      this.currentSlide.update((i) => i + 1);
    }
  }

  async skip(): Promise<void> {
    await this.complete();
  }

  async complete(): Promise<void> {
    await this.haptic.success();
    await Preferences.set({ key: this.ONBOARDING_KEY, value: 'true' });
    this.showOnboarding.set(false);
    this.completed.emit();
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    const dx = event.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && this.currentSlide() < this.slides.length - 1) {
        this.next();
      } else if (dx > 0 && this.currentSlide() > 0) {
        this.currentSlide.update((i) => i - 1);
        this.haptic.tap();
      }
    }
  }
}
