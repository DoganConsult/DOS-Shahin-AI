import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilingualPipe } from '../shared/bilingual.pipe';

interface UseCaseTile {
  code: string;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  icon: string;
  modulesEn: string;
  modulesAr: string;
  complexity: 'low' | 'medium' | 'high';
}

@Component({
    selector: 'app-use-case-selector',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, BilingualPipe],
    template: `
    <div class="usecase-selector" [class.rtl]="lang === 'ar'">
      <h2 class="usecase-title">
        {{ { en: 'What is your primary objective?', ar: 'ما هو هدفك الأساسي؟' } | bilingual:lang }}
      </h2>
      <p class="usecase-subtitle">
        {{ { en: 'Shahin will tailor your workspace based on what matters most to your organization.', ar: 'سيخصص شاهين بيئة عملك بناءً على ما يهم مؤسستك.' } | bilingual:lang }}
      </p>

      <div class="usecase-grid">
        <button *ngFor="let uc of useCases; let i = index"
          class="usecase-tile"
          [class.selected]="selectedCode === uc.code"
          [style.animation-delay]="(i * 60) + 'ms'"
          (click)="selected.emit(uc.code)"
          type="button"
          [attr.aria-pressed]="selectedCode === uc.code">
          <div class="tile-icon"><i class="pi" [ngClass]="uc.icon"></i></div>
          <h3>{{ { en: uc.labelEn, ar: uc.labelAr } | bilingual:lang }}</h3>
          <p class="tile-desc">{{ { en: uc.descEn, ar: uc.descAr } | bilingual:lang }}</p>
          <div class="tile-meta">
            <span class="tile-modules">{{ { en: uc.modulesEn, ar: uc.modulesAr } | bilingual:lang }}</span>
            <span class="tile-complexity" [class]="'complexity-' + uc.complexity">
              {{ { en: uc.complexity, ar: uc.complexity === 'low' ? 'منخفض' : uc.complexity === 'medium' ? 'متوسط' : 'عالي' } | bilingual:lang }}
            </span>
          </div>
          <div class="tile-check" *ngIf="selectedCode === uc.code"><i class="pi pi-check"></i></div>
        </button>
      </div>
    </div>
  `,
    styles: [`
    .usecase-selector { max-width: 820px; }
    .usecase-title { font-size: var(--font-size-2xl); font-weight: 700; margin: 0 0 0.5rem; }
    .usecase-subtitle { font-size: var(--font-size-body-sm); color: var(--text-secondary); margin: 0 0 1.5rem; line-height: 1.5; }
    .usecase-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
    .usecase-tile {
      position: relative; padding: 1.25rem; border-radius: var(--radius-lg);
      border: 2px solid var(--border-subtle, #e5e7eb); background: var(--surface-card, #fff);
      cursor: pointer; text-align: left; transition: all 0.2s ease;
      animation: fade-in-tile 0.4s ease both;
    }
    .usecase-tile:hover { border-color: var(--primary); transform: translateY(-2px); }
    .usecase-tile.selected { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.03); }
    .tile-icon { margin-bottom: 0.75rem; }
    .tile-icon i { font-size: var(--font-size-2xl); color: var(--primary); }
    .usecase-tile h3 { font-size: var(--font-size-body-sm); font-weight: 700; margin: 0 0 0.35rem; }
    .tile-desc { font-size: var(--font-size-caption); color: var(--text-secondary); line-height: 1.4; margin: 0 0 0.75rem; min-height: 2.8em; }
    .tile-meta { display: flex; justify-content: space-between; align-items: center; font-size: var(--font-size-xs); }
    .tile-modules { color: var(--text-muted); }
    .tile-complexity { padding: 0.1rem 0.4rem; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .complexity-low { background: #e8f5e9; color: #2e7d32; }
    .complexity-medium { background: #fff3e0; color: #ef6c00; }
    .complexity-high { background: #fce4ec; color: #c62828; }
    .tile-check {
      position: absolute; top: 0.75rem; right: 0.75rem;
      width: 22px; height: 22px; border-radius: 50%; background: var(--primary);
      display: flex; align-items: center; justify-content: center;
    }
    .tile-check i { color: #fff; font-size: var(--font-size-2xs); }
    .rtl .usecase-tile { text-align: right; }
    .rtl .tile-check { right: auto; left: 0.75rem; }
    @keyframes fade-in-tile { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class UseCaseSelectorComponent {
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() selectedCode: string = '';
  @Output() selected = new EventEmitter<string>();

  useCases: UseCaseTile[] = [
    { code: 'compliance', labelEn: 'Compliance Management', labelAr: 'إدارة الامتثال', descEn: 'Framework mapping, control testing, and regulatory posture management.', descAr: 'ربط الأُطر واختبار الضوابط وإدارة الوضع التنظيمي.', icon: 'pi-shield', modulesEn: 'compliance, risk, policy, evidence', modulesAr: 'الامتثال، المخاطر، السياسات، الأدلة', complexity: 'medium' },
    { code: 'risk', labelEn: 'Risk Management', labelAr: 'إدارة المخاطر', descEn: 'Enterprise risk register, scoring, treatment plans, and KRI monitoring.', descAr: 'سجل المخاطر المؤسسي والتقييم وخطط المعالجة ومراقبة المؤشرات.', icon: 'pi-exclamation-triangle', modulesEn: 'risk, compliance, action', modulesAr: 'المخاطر، الامتثال، الإجراءات', complexity: 'medium' },
    { code: 'audit', labelEn: 'Internal Audit', labelAr: 'التدقيق الداخلي', descEn: 'Audit planning, fieldwork, workpapers, findings, and follow-up.', descAr: 'تخطيط التدقيق والعمل الميداني والنتائج والمتابعة.', icon: 'pi-search', modulesEn: 'audit, evidence, issues, risk', modulesAr: 'التدقيق، الأدلة، المشاكل، المخاطر', complexity: 'medium' },
    { code: 'policy', labelEn: 'Policy Governance', labelAr: 'حوكمة السياسات', descEn: 'Policy lifecycle management from draft to retirement.', descAr: 'إدارة دورة حياة السياسات من المسودة إلى التقاعد.', icon: 'pi-file', modulesEn: 'policy, governance, workflow', modulesAr: 'السياسات، الحوكمة، سير العمل', complexity: 'low' },
    { code: 'third_party', labelEn: 'Third-Party Risk', labelAr: 'مخاطر الأطراف الثالثة', descEn: 'Vendor assessment, due diligence, and ongoing monitoring.', descAr: 'تقييم الموردين والعناية الواجبة والمراقبة المستمرة.', icon: 'pi-link', modulesEn: 'vendor, risk, bcp, asset', modulesAr: 'الموردين، المخاطر، الاستمرارية، الأصول', complexity: 'high' },
    { code: 'privacy', labelEn: 'Privacy & Data Protection', labelAr: 'الخصوصية وحماية البيانات', descEn: 'ROPA, DSR handling, consent management, and breach notification.', descAr: 'سجل الأنشطة وطلبات الحذف وإدارة الموافقة وإخطار الاختراق.', icon: 'pi-eye-slash', modulesEn: 'privacy, compliance, incident', modulesAr: 'الخصوصية، الامتثال، الحوادث', complexity: 'high' },
    { code: 'ai_governance', labelEn: 'AI Governance', labelAr: 'حوكمة الذكاء الاصطناعي', descEn: 'AI system registry, risk assessment, and responsible AI operations.', descAr: 'سجل أنظمة الذكاء الاصطناعي وتقييم المخاطر والعمليات المسؤولة.', icon: 'pi-bolt', modulesEn: 'ai-governance, analytics, qiyas', modulesAr: 'حوكمة الذكاء، التحليلات، قياس', complexity: 'high' },
    { code: 'full_grc', labelEn: 'Full GRC Operating System', labelAr: 'نظام الحوكمة الشامل', descEn: 'Complete enterprise GRC with all 20 modules, 17+ agents, and full automation.', descAr: 'نظام حوكمة مؤسسي شامل مع 20 موديول و17+ وكيل وأتمتة كاملة.', icon: 'pi-globe', modulesEn: 'All 20 business modules', modulesAr: 'جميع الـ 20 موديول', complexity: 'high' },
  ];
}
