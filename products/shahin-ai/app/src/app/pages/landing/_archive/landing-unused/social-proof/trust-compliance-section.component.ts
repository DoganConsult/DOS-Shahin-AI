import { Component, computed, inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SectionHeaderComponent } from '@app/shared/widgets/section-header/section-header.component';
import { TrustBadgeComponent } from '@app/shared/widgets/presentation/trust-badge/trust-badge.component';
import { RevealDirective } from '@app/shared/directives/reveal.directive';
import { GrcOperationsService } from '@app/api';

interface TrustBadge {
  code: string;
  label: string;
  labelAr: string;
  color: string;
  status: 'ready' | 'aligned' | 'certified';
  highlight?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-trust-compliance-section',
  standalone: true,
  imports: [SectionHeaderComponent, TrustBadgeComponent, RevealDirective],
  template: `
    <section class="trust-section" id="trust-compliance">
      <div class="trust-container">
        <app-section-header
          badge="Trust & Compliance"
          badgeAr="الثقة والامتثال"
          badgeIcon="pi pi-shield"
          title="KSA Regulatory Coverage & International Frameworks"
          titleAr="التغطية التنظيمية السعودية والأطر الدولية"
          subtitle="Full alignment with Saudi regulators and global compliance standards to protect your organization."
          subtitleAr="توافق كامل مع الجهات التنظيمية السعودية ومعايير الامتثال العالمية لحماية مؤسستك."
        />

        <div class="badge-group">
          <h3 class="badge-group-title">{{ i18n.translate('trustCompliance.ksaFrameworks') }}</h3>
          <div class="badge-grid">
            @for (badge of ksaBadges; track badge.code) {
            <app-trust-badge
              [code]="badge.code" [label]="badge.label" [labelAr]="badge.labelAr"
              [color]="badge.color" [status]="badge.status" [highlight]="badge.highlight ?? false" />
            }
          </div>
        </div>

        <div class="badge-group">
          <h3 class="badge-group-title">{{ i18n.translate('trustCompliance.internationalFrameworks') }}</h3>
          <div class="badge-grid">
            @for (badge of internationalBadges; track badge.code) {
            <app-trust-badge
              [code]="badge.code" [label]="badge.label" [labelAr]="badge.labelAr"
              [color]="badge.color" [status]="badge.status" [highlight]="badge.highlight ?? false" />
            }
          </div>
        </div>

        <div class="vision-banner">
          <h3 class="vision-title">{{ i18n.translate('trustCompliance.visionAligned') }}</h3>
          <p class="vision-desc">{{ visionDesc() }}</p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .trust-section { padding: 80px 0; background: var(--surface); }
    .trust-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .badge-group { margin-bottom: var(--space-2xl); }
    .badge-group-title { font-size: var(--font-size-lg); font-weight: var(--font-bold); color: var(--text-heading); text-align: center; margin: 0 0 var(--space-lg); }
    .badge-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-md); max-width: 1024px; margin: 0 auto; }
    .vision-banner {
      max-width: 768px; margin: 0 auto; padding: 40px; border-radius: var(--radius-lg);
      background: linear-gradient(135deg, var(--success), var(--success)); text-align: center; color: var(--text-on-primary);
    }
    .vision-title { font-size: var(--font-size-lg); font-weight: var(--font-black); margin: 0 0 var(--radius); }
    .vision-desc { font-size: var(--font-size-base); color: rgba(var(--color-white-rgb), 0.85); max-width: 600px; margin: 0 auto; line-height: 1.7; }
    @media (max-width: 900px) { .badge-grid { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 600px) { .badge-grid { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class TrustComplianceSectionComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);

  visionDesc = computed(() => this.i18n.translate('trustCompliance.visionDesc'));

  ksaBadges: TrustBadge[] = [];
  internationalBadges: TrustBadge[] = [];
  private fallbackKsa: TrustBadge[] = [
    { code: 'NCA ECC', label: 'Essential Cybersecurity Controls', labelAr: 'الضوابط الأساسية للأمن السيبراني', color: '#0369a1', status: 'ready', highlight: true },
    { code: 'NCA CCC', label: 'Critical Systems Controls', labelAr: 'ضوابط الأنظمة الحساسة', color: '#0369a1', status: 'ready' },
    { code: 'SAMA CSF', label: 'Cyber Security Framework', labelAr: 'إطار الأمن السيبراني', color: '#059669', status: 'ready', highlight: true },
    { code: 'PDPL', label: 'Personal Data Protection Law', labelAr: 'نظام حماية البيانات الشخصية', color: '#7c3aed', status: 'ready', highlight: true },
    { code: 'NDMO', label: 'National Data Governance', labelAr: 'الحوكمة الوطنية للبيانات', color: '#0369a1', status: 'aligned' },
    { code: 'CITC', label: 'Telecom Regulatory', labelAr: 'هيئة الاتصالات', color: '#d97706', status: 'aligned' },
    { code: 'CMA', label: 'Capital Market Authority', labelAr: 'هيئة السوق المالية', color: '#059669', status: 'aligned' },
  ];
  private fallbackIntl: TrustBadge[] = [
    { code: 'ISO 27001', label: 'Information Security', labelAr: 'أمن المعلومات', color: '#1e40af', status: 'ready', highlight: true },
    { code: 'ISO 27701', label: 'Privacy Information', labelAr: 'خصوصية المعلومات', color: '#1e40af', status: 'aligned' },
    { code: 'ISO 22301', label: 'Business Continuity', labelAr: 'استمرارية الأعمال', color: '#1e40af', status: 'aligned' },
    { code: 'NIST CSF', label: 'Cybersecurity Framework', labelAr: 'إطار الأمن السيبراني', color: '#059669', status: 'ready' },
    { code: 'SOC 2', label: 'Service Organization', labelAr: 'ضوابط منظمات الخدمة', color: '#d97706', status: 'aligned' },
    { code: 'PCI DSS', label: 'Payment Card Security', labelAr: 'أمن بطاقات الدفع', color: 'var(--error)', status: 'aligned' },
    { code: 'COBIT', label: 'IT Governance', labelAr: 'حوكمة تقنية المعلومات', color: '#7c3aed', status: 'aligned' },
  ];

  ngOnInit(): void {
    this.operationsSvc.getPublicLandingContent().subscribe({
      next: (res: Record<string, unknown>) => {
        this.ksaBadges = (res.ksaBadges && res.ksaBadges.length > 0) ? res.ksaBadges : this.fallbackKsa;
        this.internationalBadges = (res.internationalBadges && res.internationalBadges.length > 0) ? res.internationalBadges : this.fallbackIntl;
      },
      error: () => { this.ksaBadges = this.fallbackKsa; this.internationalBadges = this.fallbackIntl; },
    });
  }
}
