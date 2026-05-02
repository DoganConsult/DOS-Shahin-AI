import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AssessmentTemplatesComponent } from '@app/features/compliance/pages/assessments-group/assessment-templates/assessment-templates.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-templates-page',
    imports: [CommonModule, RouterModule, AssessmentTemplatesComponent],
    template: `
    <div class="templates-page" [dir]="i18n.direction()">
      <div class="integration-bar">
        <a [routerLink]="['/compliance/assessments']"><i class=""></i> {{ isAr ? 'التقييمات' : 'Assessments' }}</a>
        <a [routerLink]="['/compliance/frameworks']"><i class=""></i> {{ isAr ? 'الأطر' : 'Frameworks' }}</a>
        <a [routerLink]="['/compliance/controls']"><i class=""></i> {{ isAr ? 'الضوابط' : 'Controls' }}</a>
        <a [routerLink]="['/compliance/findings']"><i class=""></i> {{ isAr ? 'النتائج' : 'Findings' }}</a>
        <span class="bar-separator"></span>
        <a [routerLink]="['/risk/home']"><i class=""></i> {{ isAr ? 'المخاطر' : 'Risk Module' }}</a>
        <a [routerLink]="['/audit/overview']"><i class=""></i> {{ isAr ? 'التدقيق' : 'Audit Module' }}</a>
        <a [routerLink]="['/governance/overview']"><i class=""></i> {{ isAr ? 'الحوكمة' : 'Governance' }}</a>
        <a [routerLink]="['/foundation/evidence']"><i class=""></i> {{ isAr ? 'الأدلة' : 'Evidence' }}</a>
      </div>
      <app-assessment-templates />
    </div>
  `,
    styles: [`
    .templates-page { position: relative; }
    .integration-bar { display: flex; gap: 16px; padding: 8px 28px; background: var(--surface-50, var(--surface-ice)); border-bottom: 1px solid var(--surface-border, var(--border-subtle)); }
    .integration-bar a { display: inline-flex; align-items: center; gap: 5px; font-size: var(--font-size-sm); font-weight: 600; color: var(--primary-500, var(--primary)); text-decoration: none; }
    .integration-bar a:hover { text-decoration: underline; }
    .bar-separator { width: 1px; height: 20px; background: var(--surface-border, var(--border-subtle)); margin: 0 4px; }
  `]
})
export class ComplianceTemplatesPageComponent {
  i18n = inject(I18nService);
  get isAr() { return this.i18n.currentLang() === 'ar'; }
}
