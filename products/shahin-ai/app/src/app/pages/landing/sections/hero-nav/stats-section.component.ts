import { Component, inject, signal, ElementRef, viewChild, afterNextRender, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { LandingApiService } from '@app/core/services/api/landing-api.service';

interface StatMetric {
  numericValue: number;
  suffix: string;
  labelEn: string;
  labelAr: string;
  icon: string;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0) || 0;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-stats-section',
    imports: [CommonModule],
    template: `
    <section class="stats-section" #statsSection>
      <div class="stats-container">
        <div class="stats-eyebrow">
          <span class="live-dot"></span>
          {{ i18n.translate('stats.liveData') }}
        </div>

        @if (!loading() && allZero()) {
          <!-- Zero-state: avoid +0 marketing counters when no real values are available. -->
          <div class="stats-empty" role="status">
            <div class="stats-empty-icon"><i class="pi pi-cog"></i></div>
            <h3 class="stats-empty-title">{{ i18n.localize('Ready to configure for your environment', 'جاهز للتكوين حسب بيئة العميل') }}</h3>
            <p class="stats-empty-desc">{{ i18n.localize(
              'Live counters appear here once your tenant catalog is loaded — frameworks, controls, regulators, sectors, mappings, and AI agents.',
              'تظهر العدّادات الحيّة هنا فور تحميل كتالوج المستأجر — الأطر والضوابط والجهات الرقابية والقطاعات والربط ووكلاء الذكاء الاصطناعي.'
            ) }}</p>
            <div class="stats-empty-chips" aria-hidden="true">
              @for (stat of stats(); track stat.labelEn) {
                <span class="stats-empty-chip"><i class="pi {{ stat.icon }}"></i> {{ i18n.direction() === 'rtl' ? stat.labelAr : stat.labelEn }}</span>
              }
            </div>
          </div>
        } @else {
          <div class="stats-grid" [attr.aria-busy]="loading()" role="list" aria-label="Platform statistics">
            @for (stat of stats(); track stat.labelEn; let i = $index) {
              <div class="stat-card" role="listitem">
                @if (loading()) {
                  <span class="skeleton skeleton-num" aria-hidden="true"></span>
                  <span class="skeleton skeleton-label" aria-hidden="true"></span>
                } @else {
                  <div class="stat-icon-wrap">
                    <i class="pi {{ stat.icon }}"></i>
                  </div>
                  @if (stat.numericValue > 0) {
                    <span class="stat-num">{{ animatedValues()[i] }}{{ stat.suffix }}</span>
                    <span class="stat-label">{{ i18n.direction() === 'rtl' ? stat.labelAr : stat.labelEn }}</span>
                    <span class="stat-trend"><i class="pi pi-arrow-up"></i> {{ i18n.translate('stats.live') }}</span>
                  } @else {
                    <span class="stat-num stat-pending" [attr.aria-label]="i18n.localize('Pending', 'قيد التكوين')">—</span>
                    <span class="stat-label">{{ i18n.direction() === 'rtl' ? stat.labelAr : stat.labelEn }}</span>
                    <span class="stat-trend stat-trend--pending">{{ i18n.localize('Pending', 'قيد التكوين') }}</span>
                  }
                }
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
    styles: [`
    .stats-section {
      padding: clamp(48px, 7vw, 88px) 0;
      background: var(--ld-gradient-blue, linear-gradient(135deg, var(--primary-darker) 0%, var(--primary-dark) 50%, var(--primary) 100%));
    }
    .stats-container { max-width: 1200px; margin: 0 auto; padding: 0 var(--space-lg); }

    .stats-eyebrow {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      margin-bottom: var(--space-2xl);
      font-size: var(--font-size-sm); font-weight: 600;
      color: rgba(var(--color-white-rgb), 0.78); text-transform: uppercase; letter-spacing: 0.1em;
    }
    .live-dot {
      display: inline-block; width: 8px; height: 8px; border-radius: var(--radius-pill);
      background: var(--success); box-shadow: 0 0 8px var(--success);
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 16px;
    }
    .stat-card {
      text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 20px 12px; border-radius: var(--radius-lg);
      background: rgba(var(--color-white-rgb), 0.06); border: 1px solid rgba(var(--color-white-rgb), 0.08);
      backdrop-filter: blur(8px);
      transition: transform 0.25s, background 0.25s;
    }
    .stat-card:hover {
      transform: translateY(-3px);
      background: rgba(var(--color-white-rgb), 0.1);
    }
    .stat-icon-wrap {
      width: 40px; height: 40px; border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      background: rgba(var(--color-white-rgb), 0.12); font-size: var(--font-size-lg);
      color: rgba(var(--color-white-rgb), 0.85);
    }
    .stat-num {
      display: block; font-size: clamp(1.5rem, 2.8vw, 2.1rem); font-weight: var(--font-black);
      color: var(--text-on-primary); letter-spacing: -0.02em; line-height: 1;
    }
    .stat-label {
      display: block; font-size: var(--font-size-sm);
      color: rgba(var(--color-white-rgb), 0.88); font-weight: var(--font-medium);
    }
    .stat-trend {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: var(--font-size-xs); font-weight: 600; color: var(--success);
      padding: 2px 8px; border-radius: var(--radius-md);
      background: rgba(var(--color-green-500-rgb), 0.1);
    }
    .stat-trend .pi { font-size: var(--font-size-xs); }
    .stat-num.stat-pending {
      color: rgba(var(--color-white-rgb), 0.55); font-weight: var(--font-bold);
      letter-spacing: 0.04em;
    }
    .stat-trend--pending {
      color: rgba(var(--color-white-rgb), 0.7);
      background: rgba(var(--color-white-rgb), 0.08);
      border: 1px dashed rgba(var(--color-white-rgb), 0.18);
    }

    /* Skeleton loading placeholders */
    .skeleton {
      display: block; border-radius: var(--radius-sm);
      background: rgba(var(--color-white-rgb), 0.1);
      animation: shimmer 1.5s ease-in-out infinite;
    }
    .skeleton-num { width: 100px; height: 40px; margin: 0 auto var(--space-sm); }
    .skeleton-label { width: 80px; height: 14px; margin: 0 auto; }
    @keyframes shimmer {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.7; }
    }

    /* Zero-state */
    .stats-empty {
      max-width: 720px; margin: 0 auto; text-align: center;
      padding: 32px 24px; border-radius: var(--radius-lg);
      background: rgba(var(--color-white-rgb), 0.04);
      border: 1px dashed rgba(var(--color-white-rgb), 0.18);
    }
    .stats-empty-icon {
      width: 48px; height: 48px; margin: 0 auto 14px;
      border-radius: var(--radius-pill); display: flex; align-items: center; justify-content: center;
      background: rgba(var(--color-white-rgb), 0.08);
      color: rgba(var(--color-white-rgb), 0.92);
      font-size: 22px;
    }
    .stats-empty-title {
      font-size: clamp(1.05rem, 1.8vw, 1.35rem); font-weight: var(--font-black);
      color: #ffffff; margin: 0 0 8px; letter-spacing: -0.01em;
    }
    .stats-empty-desc {
      font-size: var(--font-size-sm); color: rgba(var(--color-white-rgb), 0.78);
      line-height: 1.7; margin: 0 0 18px;
    }
    .stats-empty-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
    .stats-empty-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: var(--radius-pill);
      background: rgba(var(--color-white-rgb), 0.08);
      border: 1px solid rgba(var(--color-white-rgb), 0.14);
      color: rgba(var(--color-white-rgb), 0.88);
      font-size: var(--font-size-xs); font-weight: 600;
    }
    .stats-empty-chip .pi { font-size: var(--font-size-xs); color: rgba(var(--color-white-rgb), 0.7); }

    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 600px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .stat-num { font-size: 1.4rem; }
      .stat-card { padding: 14px 8px; }
    }
  `]
})
export class StatsSectionComponent {
  private landingApi = inject(LandingApiService);
  i18n = inject(I18nService);

  get isAr(): boolean { return this.i18n.currentLang() === 'ar'; }

  statsSection = viewChild<ElementRef>('statsSection');

  loading = signal(true);

  stats = signal<StatMetric[]>([
    { numericValue: 217,   suffix: '+', labelEn: 'Regulators',     labelAr: 'جهة رقابية',   icon: 'pi-building'       },
    { numericValue: 220,   suffix: '+', labelEn: 'Frameworks',     labelAr: 'إطار تنظيمي',  icon: 'pi-sitemap'        },
    { numericValue: 6288,  suffix: '+', labelEn: 'Controls',       labelAr: 'ضابط رقابي',   icon: 'pi-shield'         },
    { numericValue: 62988, suffix: '+', labelEn: 'Cross-Mappings', labelAr: 'ربط متقاطع',   icon: 'pi-share-alt'      },
    { numericValue: 121,   suffix: '+', labelEn: 'Sectors',        labelAr: 'قطاع',          icon: 'pi-th-large'       },
    { numericValue: 10,    suffix: '',  labelEn: 'AI Agents',      labelAr: 'وكيل ذكاء',    icon: 'pi-microchip-ai'   },
  ]);

  animatedValues = signal<string[]>(['0', '0', '0', '0', '0', '0']);
  private hasAnimated = false;
  private observer: IntersectionObserver | null = null;

  /** Zero-state guard: every numeric value is 0 → render config-ready notice instead of +0 cards. */
  allZero(): boolean {
    return this.stats().every(s => !s.numericValue || s.numericValue <= 0);
  }

  constructor() {
    afterNextRender(() => {
      this.fetchLiveStats();
      this.setupObserver();
    });
  }

  private fetchLiveStats(): void {
    this.landingApi.getStats().subscribe({
      next: (data) => {
        this.stats.set([
          { numericValue: asNumber(data.regulators),    suffix: '+', labelEn: 'Regulators',     labelAr: 'جهة رقابية',   icon: 'pi-building'     },
          { numericValue: asNumber(data.frameworks),    suffix: '+', labelEn: 'Frameworks',     labelAr: 'إطار تنظيمي',  icon: 'pi-sitemap'      },
          { numericValue: asNumber(data.controls),      suffix: '+', labelEn: 'Controls',       labelAr: 'ضابط رقابي',   icon: 'pi-shield'       },
          { numericValue: asNumber(data.crossMappings), suffix: '+', labelEn: 'Cross-Mappings', labelAr: 'ربط متقاطع',   icon: 'pi-share-alt'    },
          { numericValue: asNumber(data.sectors),       suffix: '+', labelEn: 'Sectors',        labelAr: 'قطاع',          icon: 'pi-th-large'     },
          { numericValue: asNumber(data.aiAgents),      suffix: '',  labelEn: 'AI Agents',      labelAr: 'وكيل ذكاء',    icon: 'pi-microchip-ai' },
        ]);
        this.loading.set(false);
        if (!this.hasAnimated) {
          this.animatedValues.set(this.stats().map(() => '0'));
        } else {
          this.setFinalValues();
        }
      },
      error: () => {
        this.loading.set(false);
        this.setFinalValues();
      },
    });
  }

  private setupObserver(): void {
    const el = this.statsSection()?.nativeElement;
    if (!el || typeof IntersectionObserver === 'undefined') {
      this.setFinalValues();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !this.hasAnimated) {
            this.hasAnimated = true;
            this.animateCountUp();
            this.observer?.disconnect();
            this.observer = null;
          }
        }
      },
      { threshold: 0.2 },
    );

    this.observer.observe(el);
  }

  private animateCountUp(): void {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.setFinalValues();
      return;
    }
    const duration = 1500;
    const steps = 40;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);

      const values = this.stats().map((stat) => {
        const current = Math.round(stat.numericValue * eased);
        return this.formatNumber(current);
      });

      this.animatedValues.set(values);

      if (step >= steps) {
        clearInterval(timer);
        this.setFinalValues();
      }
    }, interval);
  }

  private setFinalValues(): void {
    this.animatedValues.set(
      this.stats().map((stat) => this.formatNumber(stat.numericValue)),
    );
  }

  private formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }
}
