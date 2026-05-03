import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SectionHeaderComponent } from '@app/shared/widgets/section-header/section-header.component';

interface PainPoint {
  id: string;
  accent: string;
  severity: 'critical' | 'warning' | 'moderate';
  headlineEn: string;
  headlineAr: string;
  bodyEn: string;
  bodyAr: string;
  impactEn: string;
  impactAr: string;
  modules: string[];
  signals: Array<{ en: string; ar: string }>;
}

const PAIN_POINTS: PainPoint[] = [
  {
    id: 'regulatory-drift',
    accent: '#0f62fe',
    severity: 'critical',
    headlineEn: 'Regulatory drift between teams and frameworks',
    headlineAr: 'انحراف تنظيمي بين الفرق والأطر',
    bodyEn: 'Controls, assessments, and owners diverge across NCA, SAMA, ISO, and internal policy packs.',
    bodyAr: 'الضوابط والتقييمات والمالكون ينحرفون بين NCA وSAMA وISO وحزم السياسات الداخلية.',
    impactEn: 'Creates duplicate work, conflicting evidence, and delayed audit responses.',
    impactAr: 'ينتج عملاً مكررًا وأدلة متعارضة وتأخرًا في الاستجابة للتدقيق.',
    modules: ['Compliance', 'Controls', 'Framework Mapping'],
    signals: [
      { en: 'Same control mapped differently', ar: 'الضابطة نفسها مربوطة بشكل مختلف' },
      { en: 'Audit asks for evidence twice', ar: 'التدقيق يطلب الدليل مرتين' },
    ],
  },
  {
    id: 'evidence-sprawl',
    accent: '#24a148',
    severity: 'warning',
    headlineEn: 'Evidence lives in inboxes, drives, and chat threads',
    headlineAr: 'الأدلة موزعة بين البريد والمجلدات والمحادثات',
    bodyEn: 'Teams know the proof exists, but no one knows which version is current or who validated it last.',
    bodyAr: 'الفرق تعلم أن الدليل موجود، لكن لا أحد يعرف النسخة الأحدث أو من اعتمدها آخر مرة.',
    impactEn: 'Weakens audit readiness and breaks the chain between control, owner, and proof.',
    impactAr: 'يضعف الجاهزية للتدقيق ويكسر السلسلة بين الضابطة والمالك والدليل.',
    modules: ['Evidence', 'Audit', 'Workflow'],
    signals: [
      { en: 'Freshness is checked manually', ar: 'حداثة الأدلة تُراجع يدويًا' },
      { en: 'Ownership changes are not traceable', ar: 'تغيّر الملكية غير قابل للتتبع' },
    ],
  },
  {
    id: 'approval-fatigue',
    accent: '#8a3ffc',
    severity: 'critical',
    headlineEn: 'Approvals stall across committees and business owners',
    headlineAr: 'الاعتمادات تتعطل بين اللجان ومالكي الأعمال',
    bodyEn: 'Critical actions wait in email loops, with no operational view of who is blocking the decision path.',
    bodyAr: 'الإجراءات الحرجة تبقى في حلقات بريدية بلا رؤية تشغيلية لمن يوقف مسار القرار.',
    impactEn: 'Delays remediation, policy publication, and exception handling.',
    impactAr: 'يؤخر المعالجة ونشر السياسات وإدارة الاستثناءات.',
    modules: ['Workflow', 'Policy', 'Action Queue'],
    signals: [
      { en: 'Escalations happen too late', ar: 'التصعيد يحدث متأخرًا' },
      { en: 'No one sees approval bottlenecks live', ar: 'لا أحد يرى اختناقات الاعتماد مباشرة' },
    ],
  },
  {
    id: 'board-visibility',
    accent: '#ff832b',
    severity: 'moderate',
    headlineEn: 'Leadership gets status snapshots, not decision intelligence',
    headlineAr: 'القيادة تحصل على لقطات حالة لا على ذكاء قرار',
    bodyEn: 'Executives see lagging summaries instead of what changed, why it matters, and what must happen next.',
    bodyAr: 'يرى التنفيذيون ملخصات متأخرة بدل معرفة ما الذي تغير ولماذا يهم وما الذي يجب فعله الآن.',
    impactEn: 'Reduces board confidence and slows high-stakes risk decisions.',
    impactAr: 'يقلل ثقة مجلس الإدارة ويبطئ قرارات المخاطر عالية الأثر.',
    modules: ['Dashboard', 'Reporting', 'AI Agents'],
    signals: [
      { en: 'KPIs do not explain the movement', ar: 'المؤشرات لا تشرح سبب الحركة' },
      { en: 'Critical actions are buried in reports', ar: 'الإجراءات الحرجة مدفونة داخل التقارير' },
    ],
  },
  {
    id: 'vendor-blind-spots',
    accent: '#da1e28',
    severity: 'warning',
    headlineEn: 'Third-party risk is tracked quarterly, not operationally',
    headlineAr: 'مخاطر الأطراف الثالثة تُتابع ربعياً لا تشغيلياً',
    bodyEn: 'Vendor risk signals, contract obligations, and evidence requests remain disconnected from the operating cadence.',
    bodyAr: 'إشارات مخاطر الموردين والالتزامات التعاقدية وطلبات الأدلة منفصلة عن إيقاع التشغيل.',
    impactEn: 'Creates exposure between assessments and the next review cycle.',
    impactAr: 'يخلق فجوة تعرض بين التقييمات والدورة التالية للمراجعة.',
    modules: ['Vendor Risk', 'Contracts', 'Evidence'],
    signals: [
      { en: 'Critical vendors are reviewed too late', ar: 'الموردون الحرجون يُراجعون متأخرًا' },
      { en: 'Questionnaires are not tied to action owners', ar: 'الاستبيانات غير مرتبطة بمالكي الإجراءات' },
    ],
  },
  {
    id: 'policy-entropy',
    accent: '#198038',
    severity: 'moderate',
    headlineEn: 'Policy lifecycle is publishing documents, not governing behavior',
    headlineAr: 'دورة حياة السياسة تنشر مستندات ولا تحكم السلوك',
    bodyEn: 'Teams publish versions, but attestation, exceptions, and related controls are not kept in one decision loop.',
    bodyAr: 'الفرق تنشر إصدارات، لكن الإقرار والاستثناءات والضوابط المرتبطة لا تبقى ضمن حلقة قرار واحدة.',
    impactEn: 'Makes policy ownership look complete while execution remains fragmented.',
    impactAr: 'يجعل ملكية السياسة تبدو مكتملة بينما يظل التنفيذ مجزأً.',
    modules: ['Policy', 'Attestation', 'Exceptions'],
    signals: [
      { en: 'Published policies lack completion evidence', ar: 'السياسات المنشورة بلا دليل اكتمال' },
      { en: 'Exceptions do not close the loop', ar: 'الاستثناءات لا تغلق الحلقة' },
    ],
  },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pain-points-section',
  standalone: true,
  imports: [CommonModule, RouterLink, SectionHeaderComponent],
  template: `
    <section class="pain-section" aria-label="Pain points" [attr.dir]="i18n.direction()">
      <div class="pain-shell">
        <app-section-header
          badge="Enterprise Signals"
          badgeAr="إشارات المؤسسة"
          badgeIcon="pi pi-exclamation-circle"
          title="Choose the operating pain that is slowing your GRC program"
          titleAr="اختر ألم التشغيل الذي يبطئ برنامج الحوكمة لديك"
          subtitle="Pick the issues that feel familiar. The page responds like a diagnostic cockpit, not a brochure."
          subtitleAr="اختر المشكلات الأقرب لواقعك. هذه الصفحة تتصرف كقمرة تشخيص لا كبروشور تسويقي."
        />

        @if (selectedCount() > 0) {
          <div class="pain-diagnosis" role="status" aria-live="polite">
            <div class="pain-diagnosis__copy">
              <span class="pain-diagnosis__eyebrow">{{ i18n.localize('Selected enterprise signals', 'الإشارات المؤسسية المختارة') }}</span>
              <strong>{{ selectedSummary() }}</strong>
              <p>{{ i18n.localize(
                'We can map these issues to workflows, evidence streams, and Saudi-ready modules in one workspace setup.',
                'يمكننا ربط هذه المشكلات بسير العمل وتدفقات الأدلة والموديولات الجاهزة للسعودية ضمن مساحة عمل واحدة.'
              ) }}</p>
            </div>
            <div class="pain-diagnosis__actions">
              <button type="button" class="pain-btn pain-btn--secondary" (click)="scrollTo('solutions')">
                {{ i18n.localize('Show matching solution lanes', 'اعرض مسارات الحل المطابقة') }}
              </button>
              <a routerLink="/register" class="pain-btn pain-btn--primary">
                {{ i18n.localize('Generate my workspace', 'أنشئ مساحة عملي') }}
              </a>
            </div>
          </div>
        }

        <div class="pain-grid">
          @for (pain of painPoints(); track pain.id; let index = $index) {
            <article class="pain-card" [class.pain-card--selected]="pain.selected" [style.--pain-accent]="pain.accent">
              <div class="pain-card__top">
                <span class="pain-card__severity">{{ severityLabel(pain.severity) }}</span>
                <span class="pain-card__index">0{{ index + 1 }}</span>
              </div>

              <div class="pain-card__headline">
                <h3>{{ i18n.localize(pain.headlineEn, pain.headlineAr) }}</h3>
                <p>{{ i18n.localize(pain.bodyEn, pain.bodyAr) }}</p>
              </div>

              <div class="pain-card__impact">
                <span class="pain-card__label">{{ i18n.localize('Enterprise impact', 'الأثر المؤسسي') }}</span>
                <strong>{{ i18n.localize(pain.impactEn, pain.impactAr) }}</strong>
              </div>

              <div class="pain-card__signals">
                @for (signal of pain.signals; track signal.en) {
                  <span class="pain-signal">{{ i18n.localize(signal.en, signal.ar) }}</span>
                }
              </div>

              <div class="pain-card__modules">
                @for (module of pain.modules; track module) {
                  <span class="pain-module">{{ module }}</span>
                }
              </div>

              <div class="pain-card__actions">
                <button type="button" class="pain-btn pain-btn--ghost" (click)="scrollTo('solutions')">
                  {{ i18n.localize('See the response model', 'اعرض نموذج الاستجابة') }}
                </button>
                <button type="button" class="pain-btn pain-btn--toggle" [class.pain-btn--toggle-active]="pain.selected" [attr.aria-pressed]="pain.selected" (click)="toggle(pain.id)">
                  {{ pain.selected ? i18n.localize('Selected', 'تم الاختيار') : i18n.localize('Select issue', 'اختر المشكلة') }}
                </button>
              </div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }

    .pain-section {
      padding: clamp(56px, 7vw, 96px) 0;
      background:
        radial-gradient(circle at top, rgba(15, 98, 254, 0.08), transparent 28%),
        linear-gradient(180deg, var(--surface) 0%, var(--surface-ice) 100%);
    }

    .pain-shell {
      max-width: 1160px;
      margin: 0 auto;
      padding-inline: 24px;
    }

    .pain-diagnosis {
      position: sticky;
      top: 4.75rem;
      z-index: 8;
      display: grid;
      grid-template-columns: 1.6fr 1fr;
      gap: 1rem;
      margin-block: 1.5rem 1.75rem;
      padding: 1rem;
      border: 1px solid rgba(15, 98, 254, 0.12);
      border-radius: 1.5rem;
      background: rgba(255, 255, 255, 0.86);
      backdrop-filter: blur(16px);
      box-shadow: 0 18px 44px rgba(4, 21, 43, 0.08);
    }

    .pain-diagnosis__eyebrow {
      display: inline-flex;
      margin-bottom: 0.35rem;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--primary);
    }

    .pain-diagnosis__copy strong {
      display: block;
      font-size: clamp(1rem, 1.7vw, 1.2rem);
      color: var(--text-heading);
      line-height: 1.35;
    }

    .pain-diagnosis__copy p {
      margin: 0.45rem 0 0;
      font-size: 0.95rem;
      line-height: 1.65;
      color: var(--text-muted);
    }

    .pain-diagnosis__actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .pain-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1.15rem;
    }

    .pain-card {
      --pain-accent: #0f62fe;
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 100%;
      padding: 1.35rem;
      border-radius: 1.5rem;
      border: 1px solid rgba(4, 21, 43, 0.08);
      background:
        radial-gradient(circle at top right, color-mix(in srgb, var(--pain-accent) 10%, transparent), transparent 48%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 251, 0.96));
      box-shadow: 0 18px 40px rgba(4, 21, 43, 0.05);
      transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
      overflow: hidden;
    }

    .pain-card::before {
      content: '';
      position: absolute;
      inset: 0;
      inset-block-start: auto;
      block-size: 4px;
      background: linear-gradient(90deg, var(--pain-accent), rgba(255, 255, 255, 0));
      opacity: 0.85;
    }

    .pain-card:hover {
      transform: translateY(-4px);
      border-color: color-mix(in srgb, var(--pain-accent) 26%, rgba(4, 21, 43, 0.08));
      box-shadow: 0 26px 48px rgba(4, 21, 43, 0.1);
    }

    .pain-card--selected {
      border-color: color-mix(in srgb, var(--pain-accent) 52%, rgba(4, 21, 43, 0.08));
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--pain-accent) 30%, transparent), 0 28px 52px rgba(4, 21, 43, 0.12);
    }

    .pain-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .pain-card__severity,
    .pain-card__index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-block-size: 2rem;
      padding-inline: 0.8rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .pain-card__severity {
      color: var(--pain-accent);
      background: color-mix(in srgb, var(--pain-accent) 12%, white);
    }

    .pain-card__index {
      min-inline-size: 3rem;
      color: var(--text-heading);
      background: rgba(4, 21, 43, 0.06);
    }

    .pain-card__headline h3 {
      margin: 0;
      font-size: clamp(1.05rem, 1.6vw, 1.2rem);
      font-weight: 800;
      line-height: 1.35;
      color: var(--text-heading);
    }

    .pain-card__headline p {
      margin: 0.6rem 0 0;
      font-size: 0.95rem;
      line-height: 1.7;
      color: var(--text-muted);
    }

    .pain-card__impact {
      margin-top: 1rem;
      padding: 0.95rem 1rem;
      border-radius: 1rem;
      background: rgba(4, 21, 43, 0.035);
      border: 1px solid rgba(4, 21, 43, 0.05);
    }

    .pain-card__label {
      display: inline-flex;
      margin-bottom: 0.35rem;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .pain-card__impact strong {
      font-size: 0.92rem;
      line-height: 1.55;
      color: var(--text-heading);
    }

    .pain-card__signals,
    .pain-card__modules {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .pain-signal,
    .pain-module {
      display: inline-flex;
      align-items: center;
      min-block-size: 2rem;
      padding-inline: 0.8rem;
      border-radius: 999px;
      font-size: 0.82rem;
      line-height: 1.35;
    }

    .pain-signal {
      color: var(--text-muted);
      background: rgba(4, 21, 43, 0.05);
    }

    .pain-module {
      color: var(--pain-accent);
      border: 1px solid color-mix(in srgb, var(--pain-accent) 22%, rgba(4, 21, 43, 0.08));
      background: rgba(255, 255, 255, 0.7);
      font-weight: 700;
    }

    .pain-card__actions {
      display: flex;
      gap: 0.65rem;
      flex-wrap: wrap;
      margin-top: auto;
      padding-top: 1.25rem;
    }

    .pain-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-block-size: 2.8rem;
      padding-inline: 1rem;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 0.88rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
    }

    .pain-btn:hover { transform: translateY(-1px); }

    .pain-btn--primary {
      color: white;
      background: var(--primary-darker);
      box-shadow: 0 10px 24px rgba(4, 21, 43, 0.18);
    }

    .pain-btn--secondary,
    .pain-btn--ghost {
      color: var(--text-heading);
      background: rgba(255, 255, 255, 0.78);
      border-color: rgba(4, 21, 43, 0.08);
    }

    .pain-btn--toggle {
      color: var(--pain-accent);
      background: color-mix(in srgb, var(--pain-accent) 8%, white);
      border-color: color-mix(in srgb, var(--pain-accent) 20%, rgba(4, 21, 43, 0.08));
    }

    .pain-btn--toggle-active {
      color: white;
      background: var(--pain-accent);
    }

    @media (max-width: 1040px) {
      .pain-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .pain-diagnosis {
        grid-template-columns: 1fr;
      }

      .pain-diagnosis__actions {
        justify-content: flex-start;
      }
    }

    @media (max-width: 720px) {
      .pain-shell {
        padding-inline: 16px;
      }

      .pain-grid {
        grid-template-columns: 1fr;
      }

      .pain-diagnosis {
        top: 4.35rem;
        padding: 0.9rem;
      }

      .pain-diagnosis__actions,
      .pain-card__actions {
        flex-direction: column;
      }

      .pain-btn,
      .pain-btn--ghost,
      .pain-btn--toggle,
      .pain-btn--secondary,
      .pain-btn--primary {
        inline-size: 100%;
      }
    }
  `],
})
export class PainPointsSectionComponent {
  readonly i18n = inject(I18nService);
  private readonly selectedIds = signal<string[]>([]);

  readonly painPoints = computed(() =>
    PAIN_POINTS.map((pain) => ({
      ...pain,
      selected: this.selectedIds().includes(pain.id),
    })),
  );

  readonly selectedCount = computed(() => this.selectedIds().length);
  readonly selectedSummary = computed(() =>
    this.painPoints()
      .filter((pain) => pain.selected)
      .slice(0, 3)
      .map((pain) => this.i18n.localize(pain.headlineEn, pain.headlineAr))
      .join(' • '),
  );

  toggle(id: string): void {
    this.selectedIds.update((selected) =>
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  }

  scrollTo(id: string): void {
    const target = document.getElementById(id);
    if (!target) return;

    const offset = window.innerWidth <= 900 ? 78 : 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  severityLabel(severity: PainPoint['severity']): string {
    switch (severity) {
      case 'critical':
        return this.i18n.localize('Critical', 'حرج');
      case 'warning':
        return this.i18n.localize('Priority', 'أولوية');
      default:
        return this.i18n.localize('Watch', 'مراقبة');
    }
  }
}
