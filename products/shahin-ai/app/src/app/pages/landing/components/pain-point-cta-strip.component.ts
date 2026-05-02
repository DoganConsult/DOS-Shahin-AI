/**
 * PainPointCtaStripComponent — Dumb presentational component
 * Section header wrapper for the pain points section.
 * Re-exports the section header with badge, title, subtitle in both languages.
 * Parent: PainPointsSectionComponent
 *
 * Note: This component wraps <app-section-header> so the parent can
 * keep a clean composition without duplicating header configuration.
 */
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SectionHeaderComponent } from '@app/shared/widgets/section-header/section-header.component';

@Component({
  selector: 'app-pain-point-cta-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SectionHeaderComponent],
  template: `
    <app-section-header
      badge="Challenges"
      badgeAr="التحديات"
      badgeIcon="pi pi-exclamation-circle"
      title="Pick 3 challenges you face — we'll show the fix"
      titleAr="اختر 3 تحديات لديك — وسنريك الحل مباشرة"
      subtitle="Not just marketing — a quick diagnosis linking your pain to the right Shahin-AI module."
      subtitleAr="هذا ليس محتوى تسويقي فقط — هو تشخيص سريع يربط ألمك بالموديول الصحيح داخل Shahin-AI."
    />
  `,
})
export class PainPointCtaStripComponent {
  i18n = inject(I18nService);
}
