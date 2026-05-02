import { Component, inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SectionHeaderComponent } from '@app/shared/widgets/section-header/section-header.component';
import { environment } from '@env/environment';
import { GrcOperationsService } from '@app/core/services/grc-operations.service';

interface KSAFeature {
  icon: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  color: string;
  route: string;
  stepsEn: string[];
  stepsAr: string[];
  badgeEn: string;
  badgeAr: string;
  exportFormats: string[];
  sampleReportKey: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-ksa-features-section',
    imports: [CommonModule, SectionHeaderComponent],
    template: `
    <section class="ksa-section">
      <div class="ksa-container">
        <app-section-header
          badge="KSA-First Features"
          badgeAr="مزايا حصرية للمملكة"
          badgeIcon="pi pi-star"
          title="Built for Saudi Arabia — Not Bolted On"
          titleAr="مصمم للمملكة العربية السعودية — ليس إضافة لاحقة"
          subtitle="The only GRC platform with native NCA ECC assessment, PDPL DPIA wizard, regulator heatmaps, and cross-framework mapping — all in Arabic & English with downloadable reports."
          subtitleAr="منصة الحوكمة الوحيدة مع تقييم NCA ECC الأصلي ومعالج DPIA وخرائط حرارية للجهات التنظيمية وربط الأطر المتقاطعة — بالعربية والإنجليزية مع تقارير قابلة للتنزيل."
        />

        <!-- Feature Cards -->
        <div class="feature-showcase">
          <div *ngFor="let f of features; let i = index" [id]="'ksa-' + f.sampleReportKey" class="showcase-card" [class.reversed]="i % 2 === 1">
            <!-- Visual Side -->
            <div class="showcase-visual" [style.background]="f.color + '0D'">
              <div class="visual-header" [style.background]="f.color">
                <i class="pi" [ngClass]="f.icon" style="color: var(--text-on-primary); font-size: var(--font-size-xl);"></i>
                <span class="visual-badge">{{ i18n.localize(f.badgeEn, f.badgeAr) }}</span>
              </div>
              <div class="visual-steps">
                <div *ngFor="let step of (i18n.currentLang() === 'ar' ? f.stepsAr : f.stepsEn); let si = index" class="step-row">
                  <span class="step-num" [style.background]="f.color" [style.color]="'var(--text-on-primary)'">{{ si + 1 }}</span>
                  <span class="step-text">{{ step }}</span>
                </div>
              </div>
              <div class="visual-exports">
                <span *ngFor="let fmt of f.exportFormats" class="export-badge" [class]="'fmt-' + fmt">{{ fmt }}</span>
              </div>
            </div>

            <!-- Content Side -->
            <div class="showcase-content">
              <h3 [style.color]="f.color">{{ i18n.localize(f.titleEn, f.titleAr) }}</h3>
              <p>{{ i18n.localize(f.descEn, f.descAr) }}</p>
              <div class="showcase-actions">
                <a class="showcase-cta" [style.background]="f.color" href="/login">
                  {{ i18n.translate('landing.ksaFeatures.getStarted') }}
                  <i class="pi pi-arrow-right"></i>
                </a>
                <a class="sample-btn" [style.border-color]="f.color" [style.color]="f.color"
                   [href]="apiUrl + '/public/sample-reports/' + f.sampleReportKey" target="_blank">
                  <i class="pi pi-download"></i>
                  {{ i18n.translate('landing.ksaFeatures.downloadSample') }}
                </a>
              </div>
              <div class="sample-note">
                <i class="pi pi-info-circle"></i>
                {{ i18n.translate('landing.ksaFeatures.sampleNote') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Export Formats Banner -->
        <div class="export-banner">
          <div class="export-banner-title">
            <i class="pi pi-download"></i>
            {{ i18n.translate('landing.ksaFeatures.exportBanner') }}
          </div>
          <div class="format-cards">
            <div class="fmt-card fmt-pdf-card">
              <div class="fmt-icon"><i class="pi pi-file-pdf"></i></div>
              <div class="fmt-name">PDF</div>
              <div class="fmt-desc">{{ i18n.translate('landing.ksaFeatures.pdfDesc') }}</div>
            </div>
            <div class="fmt-card fmt-excel-card">
              <div class="fmt-icon"><i class="pi pi-file-excel"></i></div>
              <div class="fmt-name">Excel</div>
              <div class="fmt-desc">{{ i18n.translate('landing.ksaFeatures.excelDesc') }}</div>
            </div>
            <div class="fmt-card fmt-html-card">
              <div class="fmt-icon"><i class="pi pi-globe"></i></div>
              <div class="fmt-name">{{ i18n.translate('landing.ksaFeatures.interactiveHtml') }}</div>
              <div class="fmt-desc">{{ i18n.translate('landing.ksaFeatures.htmlDesc') }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
    styles: [`
    .ksa-section { padding: clamp(48px, 7vw, 88px) 0; background: var(--surface); }
    .ksa-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

    .feature-showcase { display: flex; flex-direction: column; gap: 40px; margin-bottom: var(--space-2xl); }

    .showcase-card {
      display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xl);
      background: var(--surface); border-radius: var(--radius-lg); border: 1px solid var(--border-primary);
      overflow: hidden; transition: all 300ms;
    }
    .showcase-card:hover { box-shadow: var(--shadow-card-hover); border-color: var(--primary-lightest); }
    .showcase-card.reversed .showcase-visual { order: 2; }
    .showcase-card.reversed .showcase-content { order: 1; }
    :host-context([dir="rtl"]) .showcase-card.reversed .showcase-visual { order: 1; }
    :host-context([dir="rtl"]) .showcase-card.reversed .showcase-content { order: 2; }
    :host-context([dir="rtl"]) .showcase-card:not(.reversed) .showcase-visual { order: 2; }
    :host-context([dir="rtl"]) .showcase-card:not(.reversed) .showcase-content { order: 1; }

    .showcase-visual { padding: var(--space-lg); border-radius: var(--radius-lg) 0 0 var(--radius-lg); }
    .visual-header {
      display: flex; align-items: center; gap: 10px; padding: var(--radius) var(--space-md);
      border-radius: var(--radius); margin-bottom: var(--space-md);
    }
    .visual-badge { color: var(--text-on-primary); font-size: var(--font-size-base); font-weight: var(--font-bold); }

    .visual-steps { display: flex; flex-direction: column; gap: var(--space-sm); margin-bottom: var(--space-md); }
    .step-row { display: flex; align-items: center; gap: 10px; }
    .step-num {
      width: 24px; height: 24px; border-radius: var(--radius-pill); display: flex; align-items: center;
      justify-content: center; font-size: var(--font-size-xs); font-weight: var(--font-black); flex-shrink: 0;
    }
    .step-text { font-size: var(--font-size-sm); color: var(--text-body); font-weight: var(--font-medium); }

    .visual-exports { display: flex; gap: 6px; }
    .export-badge {
      padding: var(--space-xs) var(--radius); border-radius: var(--radius-pill); font-size: var(--font-size-xs); font-weight: var(--font-bold);
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .fmt-pdf { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .fmt-Excel { background: #bbf7d0; color: #14532d; }
    .fmt-HTML { background: #bfdbfe; color: #1e3a5f; }

    .showcase-content {
      padding: var(--space-xl); display: flex; flex-direction: column; justify-content: center;
    }
    .showcase-content h3 { font-size: var(--font-size-lg); font-weight: var(--font-black); margin: 0 0 var(--radius); }
    .showcase-content p { font-size: var(--font-size-base); color: var(--text-body); line-height: 1.8; margin: 0 0 20px; }
    .showcase-cta {
      display: inline-flex; align-items: center; gap: var(--space-sm); padding: var(--radius) var(--space-lg);
      border-radius: var(--radius); color: var(--text-on-primary); font-size: var(--font-size-base); font-weight: var(--font-bold);
      text-decoration: none; transition: all 200ms; width: fit-content;
    }
    .showcase-cta:hover { opacity: 0.9; transform: translateX(4px); }
    .showcase-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .sample-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px;
      border-radius: var(--radius); font-size: var(--font-size-sm); font-weight: var(--font-bold);
      text-decoration: none; border: 2px solid; transition: all 200ms;
      background: transparent; width: fit-content;
    }
    .sample-btn:hover { opacity: 0.85; transform: translateY(-1px); }
    .sample-note {
      display: flex; align-items: center; gap: 6px; margin-top: 10px;
      font-size: var(--font-size-xs); color: var(--text-muted); font-style: italic;
    }

    .export-banner {
      background: var(--ld-gradient-blue, linear-gradient(135deg, var(--primary-darker) 0%, var(--primary-dark) 50%, var(--primary) 100%));
      border-radius: var(--ld-card-radius, var(--radius-lg)); padding: var(--space-xl); text-align: center; color: var(--ld-text-on-dark, var(--text-on-primary));
    }
    .export-banner-title {
      font-size: var(--font-size-lg); font-weight: var(--font-black); margin-bottom: var(--space-lg);
      display: flex; align-items: center; justify-content: center; gap: 10px;
    }
    .format-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); }
    .fmt-card {
      padding: 20px; border-radius: var(--radius); text-align: center;
    }
    .fmt-pdf-card { background: rgba(var(--color-white-rgb), 0.18); border: 1px solid rgba(var(--color-white-rgb), 0.22); }
    .fmt-excel-card { background: rgba(var(--color-white-rgb), 0.18); border: 1px solid rgba(var(--color-white-rgb), 0.22); }
    .fmt-html-card { background: rgba(var(--color-white-rgb), 0.18); border: 1px solid rgba(var(--color-white-rgb), 0.22); }
    .fmt-icon { font-size: var(--font-size-xl); margin-bottom: var(--space-sm); }
    .fmt-name { font-size: var(--font-size-md); font-weight: var(--font-black); margin-bottom: var(--space-xs); }
    .fmt-desc { font-size: var(--font-size-xs); opacity: 0.95; }

    @media (max-width: 900px) {
      .showcase-card { grid-template-columns: 1fr; }
      .showcase-card.reversed .showcase-visual { order: 1; }
      .showcase-card.reversed .showcase-content { order: 2; }
      .format-cards { grid-template-columns: 1fr; }
    }
  `]
})
export class KSAFeaturesSectionComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  apiUrl = environment.apiUrl;

  features: KSAFeature[] = [];

  private fallbackFeatures: KSAFeature[] = [
    {
      icon: 'pi-verified', titleEn: 'NCA ECC Assessment', titleAr: 'تقييم NCA ECC',
      descEn: 'Guided 114-control assessment with domain scoring, risk exposure calculation, and board-ready reports in Arabic RTL.',
      descAr: 'تقييم موجّه بـ 114 ضابط مع تسجيل نقاط النطاقات وحساب التعرض للمخاطر وتقارير جاهزة بالعربية.',
      color: '#0369a1', route: '/nca-assessment',
      stepsEn: ['Select NCA ECC framework', 'Answer 114 controls', 'View domain scores', 'Download report'],
      stepsAr: ['اختر إطار NCA ECC', 'أجب على 114 ضابط', 'اعرض نقاط النطاقات', 'حمّل التقرير'],
      badgeEn: 'NCA ECC', badgeAr: 'الضوابط الأساسية', exportFormats: ['pdf', 'Excel', 'HTML'], sampleReportKey: 'nca-ecc',
    },
    {
      icon: 'pi-map-marker', titleEn: 'KSA Regulator Heatmap', titleAr: 'خريطة الجهات الرقابية',
      descEn: 'Visual compliance heatmap per Saudi regulator with cross-framework mapping and gap analysis.',
      descAr: 'خريطة امتثال حرارية لكل جهة رقابية سعودية مع ربط الأطر المتقاطعة وتحليل الفجوات.',
      color: '#059669', route: '/ksa',
      stepsEn: ['View regulator map', 'Check coverage per regulator', 'Identify gaps', 'Generate action plan'],
      stepsAr: ['اعرض خريطة الجهات', 'تحقق من التغطية', 'حدد الفجوات', 'أنشئ خطة عمل'],
      badgeEn: 'KSA Hub', badgeAr: 'مركز المملكة', exportFormats: ['pdf', 'Excel', 'HTML'], sampleReportKey: 'ksa-heatmap',
    },
    {
      icon: 'pi-lock', titleEn: 'PDPL Privacy (DPIA + DSR)', titleAr: 'خصوصية PDPL (DPIA + DSR)',
      descEn: 'Data Protection Impact Assessment wizard, Data Subject Request tracking with 30-day SLA, and breach management.',
      descAr: 'معالج تقييم أثر حماية البيانات وتتبع طلبات أصحاب البيانات مع SLA 30 يوم وإدارة الخروقات.',
      color: '#7c3aed', route: '/privacy',
      stepsEn: ['Start DPIA wizard', 'Assess processing activities', 'Track DSR requests', 'Manage breaches'],
      stepsAr: ['ابدأ معالج DPIA', 'قيّم أنشطة المعالجة', 'تتبع طلبات DSR', 'أدر الخروقات'],
      badgeEn: 'PDPL', badgeAr: 'حماية البيانات', exportFormats: ['pdf', 'Excel', 'HTML'], sampleReportKey: 'pdpl-dpia',
    },
  ];

  ngOnInit(): void {
    this.operationsSvc.getPublicLandingContent().subscribe({
      next: (res: Record<string, any>) => {
        const f = res.ksaFeatures || [];
        this.features = f.length > 0 ? f : this.fallbackFeatures;
      },
      error: () => { this.features = this.fallbackFeatures; },
    });
  }

}

