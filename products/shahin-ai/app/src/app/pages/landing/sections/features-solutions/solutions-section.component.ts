import { Component, inject, signal, afterNextRender, ElementRef, viewChild, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { LandingApiService } from '@app/core/services/api/landing-api.service';
import { GrcOperationsService } from '@app/core/services/grc-operations.service';

interface CounterMetric {
  numericValue: number;
  suffix: string;
  icon: string;
  labelAr: string;
  labelEn: string;
}

interface SolutionItem {
  icon: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
}

interface SolutionTier {
  id: string;
  icon: string;
  titleAr: string;
  titleEn: string;
  color: string;
  colorBg: string;
  items: SolutionItem[];
  expanded: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0) || 0;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-solutions-section',
    standalone: true,
    imports: [CommonModule],
    template: `
    <section class="sol-section" #solSection>
      <div class="sol-container">
        <div class="sol-header">
          <div class="sol-badge">
            <i class="pi pi-cog"></i>
            {{ i18n.translate('landing.solutions.badge') }}
          </div>
          <h2 class="sol-title">
            {{ totalServices }}{{ i18n.translate('landing.solutions.titleSuffix') }}
          </h2>
          <p class="sol-subtitle">
            {{ i18n.translate('landing.solutions.subtitle') }}
          </p>
        </div>

        <!-- Counter Banner — live from DB with animated count-up -->
        <div class="sol-counter">
          @for (m of counterMetrics(); track m.labelEn; let i = $index) {
            @if (i > 0) { <div class="counter-sep"></div> }
            <div class="counter-item">
              <i class="pi {{ m.icon }} counter-icon"></i>
              <span class="counter-num">{{ animatedValues()[i] }}{{ m.suffix }}</span>
              <span class="counter-label">{{ i18n.localize(m.labelEn, m.labelAr) }}</span>
            </div>
          }
        </div>

        <!-- Tier Accordion -->
        <div class="tiers-wrap">
          <div *ngFor="let tier of tiers" class="tier-block">
            <button class="tier-header" (click)="tier.expanded = !tier.expanded"
                    [style.borderColor]="tier.expanded ? tier.color : 'transparent'">
              <div class="tier-left">
                <div class="tier-icon" [style.background]="tier.colorBg" [style.color]="tier.color">
                  <i class="pi" [ngClass]="tier.icon"></i>
                </div>
                <div class="tier-info">
                  <h3 class="tier-name">{{ i18n.localize(tier.titleEn, tier.titleAr) }}</h3>
                  <span class="tier-count" [style.background]="tier.colorBg" [style.color]="tier.color">
                    {{ tier.items.length }} {{ i18n.translate('landing.solutions.capabilities') }}
                  </span>
                </div>
              </div>
              <i class="pi" [class.pi-chevron-down]="!tier.expanded" [class.pi-chevron-up]="tier.expanded"
                 [style.color]="tier.color"></i>
            </button>

            <div class="tier-body" *ngIf="tier.expanded">
              <div class="tier-grid">
                <div *ngFor="let item of tier.items" class="sol-card">
                  <div class="sol-card-icon" [style.background]="tier.colorBg" [style.color]="tier.color">
                    <i class="pi" [ngClass]="item.icon"></i>
                  </div>
                  <div class="sol-card-content">
                    <h4 class="sol-card-name">{{ i18n.localize(item.nameEn, item.nameAr) }}</h4>
                    <p class="sol-card-desc">{{ i18n.localize(item.descEn, item.descAr) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
    styles: [`
    .sol-section {
      padding: clamp(48px, 7vw, 88px) 0;
      background: var(--surface-ice);
    }
    .sol-container { max-width: 1024px; margin: 0 auto; padding: 0 24px; }

    .sol-header { text-align: center; margin-bottom: 40px; }
    .sol-badge {
      display: inline-flex; align-items: center; gap: var(--space-sm);
      padding: 7px 20px; border-radius: var(--radius-pill);
      background: var(--ld-badge-success-bg); border: 1px solid var(--ld-badge-success-border);
      color: var(--ld-badge-success-color); font-size: var(--font-size-sm); font-weight: var(--font-medium); margin-bottom: 20px;
    }
    .sol-badge .pi { font-size: var(--font-size-sm); }
    .sol-title {
      font-size: var(--font-size-xl); font-weight: var(--font-black); color: var(--text-heading);
      margin: 0 0 14px; letter-spacing: -0.02em;
    }
    .sol-subtitle {
      font-size: var(--font-size-md); color: var(--text-muted); max-width: 650px;
      margin: 0 auto; line-height: 1.8;
    }

    /* Counter Banner */
    .sol-counter {
      display: flex; align-items: center; justify-content: center; gap: var(--space-xl);
      padding: var(--space-lg) 40px; border-radius: var(--radius-lg); margin-bottom: 40px;
      background: var(--ld-gradient-blue-soft, linear-gradient(135deg, var(--primary-darker), var(--primary-dark)));
      border: 1px solid rgba(var(--color-white-rgb), 0.08);
    }
    .counter-item { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .counter-icon { font-size: var(--font-size-xl); color: rgba(var(--color-white-rgb), 0.78); }
    .counter-num {
      display: block; font-size: clamp(1.4rem, 2.5vw, 2rem); font-weight: var(--font-black);
      color: var(--text-on-primary); letter-spacing: -0.02em; line-height: 1;
    }
    .counter-label { display: block; font-size: var(--font-size-xs); color: rgba(var(--color-white-rgb), 0.85); font-weight: var(--font-medium); text-transform: uppercase; letter-spacing: 0.05em; }
    .counter-sep { width: 1px; height: 48px; background: rgba(var(--color-white-rgb), 0.12); }

    /* Tiers */
    .tiers-wrap { display: flex; flex-direction: column; gap: var(--radius); }
    .tier-block {
      border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);
      background: var(--surface); overflow: hidden; transition: all 300ms;
    }
    .tier-block:hover { box-shadow: var(--shadow-card); }
    .tier-header {
      display: flex; align-items: center; justify-content: space-between;
      width: 100%; padding: 20px var(--space-lg); background: none; border: none;
      border-inline-start: 3px solid transparent; cursor: pointer;
      transition: all 200ms;
    }
    .tier-header:hover { background: var(--surface-sunken); }
    .tier-left { display: flex; align-items: center; gap: var(--space-md); }
    .tier-icon {
      width: 44px; height: 44px; border-radius: var(--radius);
      display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-lg); flex-shrink: 0;
    }
    .tier-info { text-align: start; flex: 1; min-width: 0; }
    .tier-name { font-size: var(--font-size-md); font-weight: var(--font-black); color: var(--text-heading); margin: 0 0 var(--space-xs); white-space: normal; }
    .tier-count {
      display: inline-block; font-size: var(--font-size-xs); font-weight: var(--font-bold);
      padding: 2px 10px; border-radius: var(--radius-pill);
    }
    .tier-header .pi { font-size: var(--font-size-md); transition: transform 200ms; flex-shrink: 0; margin-inline-start: auto; }

    .tier-body { padding: 0 var(--space-lg) var(--space-lg); }
    .tier-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--radius);
    }
    .sol-card {
      display: flex; align-items: flex-start; gap: 14px;
      padding: var(--space-md); border-radius: var(--radius); border: 1px solid var(--border-subtle);
      background: var(--surface-sunken); transition: all 250ms;
    }
    .sol-card:hover {
      border-color: var(--border-primary); background: var(--surface-ice);
      transform: translateY(-2px); box-shadow: var(--shadow-card);
    }
    .sol-card-icon {
      width: 36px; height: 36px; border-radius: var(--radius-sm); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-md);
    }
    .sol-card-content { flex: 1; min-width: 0; }
    .sol-card-name { font-size: var(--font-size-base); font-weight: var(--font-bold); color: var(--text-heading); margin: 0 0 var(--space-xs); }
    .sol-card-desc { font-size: var(--font-size-xs); color: var(--text-muted); line-height: 1.6; margin: 0; }

    @media (max-width: 768px) {
      .tier-grid { grid-template-columns: 1fr; }
      .sol-counter { flex-direction: column; gap: 16px; padding: 20px; }
      .counter-sep { width: 60px; height: 1px; }
      .sol-title { font-size: var(--font-size-xl); }
    }
  `]
})
export class SolutionsSectionComponent implements OnInit {
  private operationsSvc = inject(GrcOperationsService);
  private landingApi = inject(LandingApiService);
  i18n = inject(I18nService);
  solSection = viewChild<ElementRef>('solSection');

  counterMetrics = signal<CounterMetric[]>([
    { numericValue: 220,   suffix: '+', icon: 'pi-sitemap',    labelAr: 'إطار تنظيمي', labelEn: 'Frameworks' },
    { numericValue: 6288,  suffix: '+', icon: 'pi-shield',     labelAr: 'ضابط رقابي',  labelEn: 'Controls' },
    { numericValue: 62988, suffix: '+', icon: 'pi-share-alt',  labelAr: 'ربط متقاطع',  labelEn: 'Cross-Mappings' },
    { numericValue: 217,   suffix: '+', icon: 'pi-building',   labelAr: 'جهة رقابية',  labelEn: 'Regulators' },
    { numericValue: 121,   suffix: '+', icon: 'pi-th-large',   labelAr: 'قطاع',         labelEn: 'Sectors' },
  ]);

  animatedValues = signal<string[]>(['0', '0', '0', '0', '0']);
  private hasAnimated = false;
  private observer: IntersectionObserver | null = null;

  constructor() {
    afterNextRender(() => {
      this.fetchStats();
      this.setupObserver();
    });
  }

  ngOnInit(): void {
    this.operationsSvc.getPublicLandingContent().subscribe({
      next: (res: Record<string, any>) => {
        if (res?.capabilities?.length) {
          for (const cap of res.capabilities) {
            const tierId = cap.tierId ?? cap.tier_id ?? '';
            const tier = this.tiers.find(t => t.id === tierId);
            if (!tier) continue;
            // Merge: update titles/descriptions from API but keep hardcoded features (items)
            if (cap.titleAr ?? cap.title_ar) tier.titleAr = cap.titleAr ?? cap.title_ar;
            if (cap.titleEn ?? cap.title_en ?? cap.title) tier.titleEn = cap.titleEn ?? cap.title_en ?? cap.title;
            // If API provides items, merge titles/descriptions but keep hardcoded icon/features
            if (cap.items?.length) {
              for (const apiItem of cap.items) {
                const itemId = apiItem.nameEn ?? apiItem.name_en ?? apiItem.name ?? '';
                const existing = tier.items.find(i => i.nameEn === itemId);
                if (existing) {
                  if (apiItem.nameAr ?? apiItem.name_ar) existing.nameAr = apiItem.nameAr ?? apiItem.name_ar;
                  if (apiItem.nameEn ?? apiItem.name_en ?? apiItem.name) existing.nameEn = apiItem.nameEn ?? apiItem.name_en ?? apiItem.name;
                  if (apiItem.descAr ?? apiItem.description_ar) existing.descAr = apiItem.descAr ?? apiItem.description_ar;
                  if (apiItem.descEn ?? apiItem.description_en ?? apiItem.description) existing.descEn = apiItem.descEn ?? apiItem.description_en ?? apiItem.description;
                  if (apiItem.icon) existing.icon = apiItem.icon;
                }
              }
            }
          }
        }
      },
      error: () => { /* keep hardcoded fallback */ }
    });
  }

  private fetchStats(): void {
    this.landingApi.getStats().subscribe({
      next: (d) => {
        const payload = asRecord(d);
        this.counterMetrics.set([
          { numericValue: asNumber(payload['frameworks']),    suffix: '+', icon: 'pi-sitemap',   labelAr: 'إطار تنظيمي', labelEn: 'Frameworks' },
          { numericValue: asNumber(payload['controls']),      suffix: '+', icon: 'pi-shield',    labelAr: 'ضابط رقابي',  labelEn: 'Controls' },
          { numericValue: asNumber(payload['crossMappings']), suffix: '+', icon: 'pi-share-alt', labelAr: 'ربط متقاطع',  labelEn: 'Cross-Mappings' },
          { numericValue: asNumber(payload['regulators']),    suffix: '+', icon: 'pi-building',  labelAr: 'جهة رقابية',  labelEn: 'Regulators' },
          { numericValue: asNumber(payload['sectors']),       suffix: '+', icon: 'pi-th-large',  labelAr: 'قطاع',         labelEn: 'Sectors' },
        ]);
        if (this.hasAnimated) this.setFinalValues();
      },
    });
  }

  private setupObserver(): void {
    const el = this.solSection()?.nativeElement;
    if (!el || typeof IntersectionObserver === 'undefined') { this.setFinalValues(); return; }
    this.observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !this.hasAnimated) {
          this.hasAnimated = true;
          this.animateCountUp();
          this.observer?.disconnect();
          this.observer = null;
        }
      }
    }, { threshold: 0.15 });
    this.observer.observe(el);
  }

  private animateCountUp(): void {
    const duration = 1800;
    const steps = 45;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      this.animatedValues.set(
        this.counterMetrics().map(m => Math.round(m.numericValue * eased).toLocaleString('en-US'))
      );
      if (step >= steps) { clearInterval(timer); this.setFinalValues(); }
    }, interval);
  }

  private setFinalValues(): void {
    this.animatedValues.set(this.counterMetrics().map(m => m.numericValue.toLocaleString('en-US')));
  }

  get totalServices(): number {
    return this.tiers.reduce((sum, t) => sum + t.items.length, 0);
  }

  tiers: SolutionTier[] = [
    {
      id: 'core', icon: 'pi pi-shield', expanded: true,
      titleAr: 'محركات الحل الجذرية', titleEn: 'Core Pain Killers',
      color: '#059669', colorBg: '#ecfdf5',
      items: [
        { icon: 'pi pi-folder-open', nameAr: 'كتالوج الأدلة + بوابات الجودة', nameEn: 'Evidence Catalog + Quality Gates', descAr: 'مستودع مركزي بسلسلة تجزئة تشفيرية — كل دليل موثّق وغير قابل للتلاعب.', descEn: 'Central repository with cryptographic hash-chain — every evidence item is tracked and tamper-proof.' },
        { icon: 'pi pi-sitemap', nameAr: 'الربط الموحد للأطر (12 كيان)', nameEn: 'Unified Cross-Framework Mapping', descAr: 'ربط ثنائي الاتجاه عبر 12 نوع كيان — طبّق مرة، غطّي أطر متعددة.', descEn: 'Bidirectional mapping across 12 entity types — implement once, cover multiple frameworks.' },
        { icon: 'pi pi-clock', nameAr: 'محرك الإيقاع (RACI + مهام)', nameEn: 'Cadence Engine (RACI + Tasks)', descAr: 'توليد مهام تلقائي من مصفوفة RACI مع نسب إنجاز وتصعيد عند التأخر.', descEn: 'Auto-generate tasks from RACI matrix with completion rates and overdue escalation.' },
        { icon: 'pi pi-sync', nameAr: 'دورة حياة الضوابط (6 حالات)', nameEn: 'Control Lifecycle (6 States)', descAr: 'آلة حالات: مسودة ← نشط ← قيد الاختبار ← معتمد ← متقادم ← متقاعد. مع تدقيق كامل.', descEn: 'State machine: draft → active → testing → approved → stale → retired. Full audit logging.' },
        { icon: 'pi pi-chart-bar', nameAr: 'تسجيل المخاطر (5×5 + مؤشرات)', nameEn: 'Risk Scoring (5×5 + KRI Trends)', descAr: 'خريطة حرارية 5×5 مع مؤشرات مخاطر رئيسية واتجاهات + تنبيهات عند تغيّر المستوى.', descEn: '5×5 heatmap with key risk indicators, trends, and threshold notifications on score change.' },
        { icon: 'pi pi-bolt', nameAr: 'محرك الأتمتة (20 قاعدة)', nameEn: 'Automation Engine (20 Rules)', descAr: '20 قاعدة مسبقة مع ناقل أحداث و8 أنواع إجراءات — يحلّ محل المتابعة اليدوية.', descEn: '20 pre-built rules with event bus and 8 action types — replaces manual follow-up.' },
      ],
    },
    {
      id: 'ksa', icon: 'pi pi-flag', expanded: false,
      titleAr: 'مصمّم للسوق السعودي', titleEn: 'KSA-Specific Capabilities',
      color: '#0369a1', colorBg: '#e0f2fe',
      items: [
        { icon: 'pi pi-verified', nameAr: 'تقييم NCA ECC (114 ضابط)', nameEn: 'NCA ECC Assessment (114 Controls)', descAr: 'تقييم موجّه بـ 114 ضابط مع تسجيل نقاط النطاقات وحساب التعرض للمخاطر.', descEn: 'Guided 114-control assessment with domain scoring and risk exposure calculation.' },
        { icon: 'pi pi-file-export', nameAr: 'تصدير بثلاث صيغ (عربي RTL)', nameEn: '3-Format Export (Arabic RTL)', descAr: 'PDF عربي (pdfkit RTL) + Excel بأربعة أوراق + HTML تفاعلي مع Chart.js.', descEn: 'Arabic PDF (pdfkit RTL) + 4-sheet Excel + interactive HTML with Chart.js.' },
        { icon: 'pi pi-map-marker', nameAr: 'مركز KSA: خريطة حرارية + DPIA', nameEn: 'KSA Hub: Heatmap + Mapping + DPIA', descAr: 'خريطة امتثال حرارية لكل جهة رقابية + ربط الأطر + معالج تقييم أثر الخصوصية.', descEn: 'Compliance heatmap per regulator + framework mapping + DPIA privacy wizard.' },
        { icon: 'pi pi-lock', nameAr: 'عمليات PDPL (RoPA + DSR + خرق)', nameEn: 'PDPL Privacy Ops (RoPA + DSR + Breach)', descAr: 'سجل أنشطة المعالجة، طلبات أصحاب البيانات (30 يوم SLA)، إدارة الخروقات (24 ساعة).', descEn: 'Records of processing, data subject requests (30-day SLA), breach management (24h critical).' },
        { icon: 'pi pi-percentage', nameAr: 'ميزانية الخصوصية التفاضلية', nameEn: 'Differential Privacy Budget', descAr: 'تتبع epsilon لكل مجموعة بيانات — خصوصية رياضية وليست شكلية.', descEn: 'Per-dataset epsilon tracking — mathematical privacy, not cosmetic.' },
        { icon: 'pi pi-file', nameAr: 'قوالب التقييم (NCA + SAMA + PDPL)', nameEn: 'Assessment Templates (NCA + SAMA + PDPL)', descAr: 'قوالب جاهزة مع منهجيات تسجيل لـ NCA ECC و CCC و SAMA CSF و PDPL و UCF.', descEn: 'Pre-built templates with scoring for NCA ECC, CCC, SAMA CSF, PDPL, and UCF.' },
        { icon: 'pi pi-box', nameAr: 'حزم المحتوى (تثبيت + ترقية + تراجع)', nameEn: 'Content Packs (Install + Upgrade + Rollback)', descAr: 'تثبيت أطر جديدة بمعاملة واحدة — مع ترقية وتراجع بدون فقد بيانات.', descEn: 'Install new frameworks in one transaction — with upgrade and rollback without data loss.' },
        { icon: 'pi pi-language', nameAr: 'ثنائي اللغة أصلاً (قاموس + RTL)', nameEn: 'Arabic-First Bilingual (Glossary + RTL)', descAr: 'إدارة محتوى عربي/إنجليزي مع قاموس مصطلحات GRC وعرض إشعارات ثنائي اللغة.', descEn: 'AR/EN content management with GRC glossary and bilingual notification rendering.' },
      ],
    },
    {
      id: 'ai', icon: 'pi pi-microchip-ai', expanded: false,
      titleAr: 'ذكاء اصطناعي حقيقي في كل مرحلة', titleEn: 'Real AI at Every Stage',
      color: '#7c3aed', colorBg: 'var(--purple-50, #f5f3ff)',
      items: [
        { icon: 'pi pi-users', nameAr: '10 وكلاء ذكاء اصطناعي متخصصين', nameEn: '10 Specialized AI Agents', descAr: 'تقييم مخاطر، تحليل فجوات، صياغة سياسات، إعداد تدقيق، فرز حوادث — كلها مؤتمتة.', descEn: 'Risk assessment, gap analysis, policy drafting, audit prep, incident triage — all automated.' },
        { icon: 'pi pi-comments', nameAr: 'مساعد AI Copilot (توجيه ذكي)', nameEn: 'AI Copilot (Intent Routing)', descAr: 'تصنيف نوايا + توجيه لـ 10 خدمات + سياق جلسة — مساعد محادثة حقيقي.', descEn: 'Intent classification + routing to 10 services + session context — real conversational assistant.' },
        { icon: 'pi pi-server', nameAr: 'LLM موحّد (Azure + Ollama محلي)', nameEn: 'Unified LLM (Azure + Ollama Local)', descAr: 'Azure OpenAI كأساسي مع Ollama محلي كاحتياطي — يشغّل جميع الوكلاء الاثني عشر.', descEn: 'Azure OpenAI primary with Ollama local fallback — powers all 12 agents.' },
        { icon: 'pi pi-sparkles', nameAr: 'محرك الإعداد الذكي', nameEn: 'AI Onboarding Engine', descAr: 'أجب عن أسئلة → يوصي بالأطر → يبني مساحة عمل كاملة تلقائيًا.', descEn: 'Answer questions → recommends frameworks → generates full workspace automatically.' },
        { icon: 'pi pi-directions', nameAr: 'محفزات سير عمل ذكية', nameEn: 'AI Workflow Triggers', descAr: 'عتبات مخاطر/امتثال/حوادث تُنشئ تلقائيًا مثيلات سير عمل.', descEn: 'Risk/compliance/incident thresholds auto-create workflow instances.' },
        { icon: 'pi pi-info-circle', nameAr: 'حزم التفسير (4 أدوار)', nameEn: 'Explainability Packs (4 Roles)', descAr: 'تفسيرات مخصصة لكل دور: مدقق، قانوني، تنفيذي، مهندس — ثنائي اللغة.', descEn: 'Role-specific explanations: auditor, legal, executive, engineer — bilingual.' },
        { icon: 'pi pi-sliders-h', nameAr: 'التحكم الذاتي بالمخاطر', nameEn: 'Risk-to-Action Autonomy', descAr: 'عتبات تلقائية: حظر / تقييد / تنبيه / مراقبة — حسب مستوى الخطر.', descEn: 'Auto-thresholds: block / restrict / alert / monitor — based on risk level.' },
      ],
    },
    {
      id: 'ops', icon: 'pi pi-cog', expanded: false,
      titleAr: 'عمليات وحوكمة متكاملة', titleEn: 'Operations & Governance',
      color: '#d97706', colorBg: 'var(--status-warning-bg, #fcf4d6)',
      items: [
        { icon: 'pi pi-file-edit', nameAr: 'دورة حياة السياسات', nameEn: 'Policy Lifecycle', descAr: 'إصدارات + سير عمل اعتماد + تتبع لجان — من المسودة للنشر.', descEn: 'Versioning + approval workflows + committee tracking — from draft to publication.' },
        { icon: 'pi pi-check-square', nameAr: 'محرك الامتثال', nameEn: 'Compliance Engine', descAr: 'ربط الأطر، اختبار الضوابط، تحليل الفجوات، وتتبع المعالجة.', descEn: 'Framework mapping, control testing, gap analysis, and remediation tracking.' },
        { icon: 'pi pi-flag', nameAr: 'إدارة الحوادث', nameEn: 'Incident Management', descAr: 'إبلاغ ← فرز ← إشعار حرج ← تسجيل نشاط — دورة كاملة.', descEn: 'Report → triage → critical notification → activity recording — full cycle.' },
        { icon: 'pi pi-truck', nameAr: 'مخاطر الموردين', nameEn: 'Vendor Risk Management', descAr: 'تقييم + تتبع عقود + اتفاقيات SLA + تصنيف مخاطر الموردين.', descEn: 'Assessment + contract tracking + SLA monitoring + vendor risk tiering.' },
        { icon: 'pi pi-replay', nameAr: 'استمرارية الأعمال (BCP/DRP)', nameEn: 'Business Continuity (BCP/DRP)', descAr: 'خطط استمرارية + جدولة اختبارات + وثائق التعافي من الكوارث.', descEn: 'Continuity plans + test scheduling + disaster recovery documentation.' },
        { icon: 'pi pi-ban', nameAr: 'الاستثناءات والإعفاءات', nameEn: 'Exceptions & Waivers', descAr: 'توجيه اعتماد حسب المخاطر + تاريخ انتهاء + إغلاق تلقائي.', descEn: 'Approval routing by risk level + expiry dates + auto-expiry job.' },
        { icon: 'pi pi-list-check', nameAr: 'محرك التقييم', nameEn: 'Assessment Engine', descAr: 'توليد تلقائي لعناصر التقييم من هيكل الأطر التنظيمية.', descEn: 'Auto-generate assessment items from regulatory framework structure.' },
        { icon: 'pi pi-chart-line', nameAr: 'قياس النضج (5 مستويات)', nameEn: 'Maturity Scoring (5 Levels)', descAr: 'من أولي إلى مُحسّن — 4 معايير قابلة للتكوين لكل مستوى.', descEn: 'Initial → optimized — 4 configurable criteria per level.' },
        { icon: 'pi pi-copy', nameAr: 'التوأم الرقمي', nameEn: 'Digital Twin', descAr: 'لقطة لحالة الامتثال الحالية + محاكاة تغييرات بدون أثر على الإنتاج.', descEn: 'Snapshot compliance state + simulate changes without production impact.' },
        { icon: 'pi pi-link', nameAr: '7 موصلات مؤسسية', nameEn: '7 Enterprise Connectors', descAr: 'M365, ERP, IAM, ITSM, SIEM, Vuln Scanner, CMDB — تنفيذ مجدول.', descEn: 'M365, ERP, IAM, ITSM, SIEM, Vuln Scanner, CMDB — scheduled execution.' },
      ],
    },
    {
      id: 'infra', icon: 'pi pi-server', expanded: false,
      titleAr: 'البنية التحتية للمنصة', titleEn: 'Platform Infrastructure',
      color: '#475569', colorBg: '#f1f5f9',
      items: [
        { icon: 'pi pi-sitemap', nameAr: 'محرك سير عمل بدون كود', nameEn: 'No-Code Workflow Engine', descAr: 'عُقد + حواف + حارات سباحة + تنفيذ + محاكاة — بدون برمجة.', descEn: 'Nodes + edges + swimlanes + execution + simulation — no coding required.' },
        { icon: 'pi pi-history', nameAr: 'سجل تدقيق غير قابل للتغيير', nameEn: 'Immutable Audit Trail', descAr: 'إضافة فقط — بدون تعديل أو حذف. ثقة المدقق مضمونة.', descEn: 'Append-only — no update or delete. Auditor trust guaranteed.' },
        { icon: 'pi pi-download', nameAr: 'حزمة التدقيق', nameEn: 'Audit Package', descAr: 'تجميع التقييم + الأدلة + المعالجة في حزمة واحدة قابلة للتحميل.', descEn: 'Bundle assessment + evidence + remediation into one downloadable package.' },
        { icon: 'pi pi-wifi', nameAr: 'تحديثات فورية (WebSocket)', nameEn: 'Real-Time WebSocket', descAr: 'غرف حسب المستأجر + مصادقة JWT + قائمة أحداث فائتة.', descEn: 'Tenant-scoped rooms + JWT auth + missed-event queue.' },
        { icon: 'pi pi-chart-pie', nameAr: 'تحليلات ومؤشرات أداء', nameEn: 'Analytics & KPIs', descAr: 'حساب مؤشرات + تكوين لوحات + مقارنة معيارية + دفع عبر WebSocket.', descEn: 'KPI computation + dashboard config + benchmarking + WebSocket push.' },
        { icon: 'pi pi-file-pdf', nameAr: 'محرك التقارير', nameEn: 'Report Engine', descAr: 'تقارير امتثال + لقطات تنفيذية بـ PDF و Excel و HTML تفاعلي.', descEn: 'Compliance reports + executive snapshots in PDF, Excel, and interactive HTML.' },
        { icon: 'pi pi-check-circle', nameAr: 'عناصر العمل الذكية', nameEn: 'Smart Action Items', descAr: 'توليد تلقائي + تذكيرات + تصعيد + ترميز لوني حسب الأولوية.', descEn: 'Auto-generation + reminders + escalation + urgency color coding.' },
        { icon: 'pi pi-comments', nameAr: 'المراسلة الداخلية', nameEn: 'Internal Messaging', descAr: 'قنوات + رسائل مباشرة + إشارات + مرفقات كيانات GRC.', descEn: 'Channels + DMs + mentions + GRC entity attachments.' },
        { icon: 'pi pi-search', nameAr: 'البحث الشامل', nameEn: 'Global Search', descAr: 'بحث عبر 6 أنواع كيانات عبر جميع الوحدات — نتائج فورية.', descEn: 'Cross-module search across 6 entity types — instant results.' },
        { icon: 'pi pi-bell', nameAr: 'محرك الإشعارات', nameEn: 'Notification Engine', descAr: 'داخل التطبيق + دفع WebSocket + بناء محفزات مخصصة.', descEn: 'In-app + WebSocket push + custom trigger builders.' },
        { icon: 'pi pi-calendar', nameAr: 'جدولة المهام', nameEn: 'Job Scheduler', descAr: 'مهام Cron مع قفل مثيل واحد وتسجيل التنفيذ.', descEn: 'Cron-based jobs with single-instance locking and execution recording.' },
        { icon: 'pi pi-arrows-alt', nameAr: 'روابط الكيانات', nameEn: 'Entity Links', descAr: 'علاقات ثنائية الاتجاه عبر الوحدات — ربط أي شيء بأي شيء.', descEn: 'Cross-module bidirectional relationships — link anything to anything.' },
        { icon: 'pi pi-list', nameAr: 'سجل النشاط', nameEn: 'Activity Stream', descAr: 'تغذية نشاط مع مرشحات جدول زمني — تتبع كل حركة.', descEn: 'Activity feed with timeline filters — track every action.' },
        { icon: 'pi pi-envelope', nameAr: 'خدمة البريد الإلكتروني', nameEn: 'Email Service', descAr: 'SMTP مع 3 محاولات إعادة وتراجع أسّي — إشعارات موثوقة.', descEn: 'SMTP with 3 retries and exponential backoff — reliable notifications.' },
        { icon: 'pi pi-arrow-up', nameAr: 'محرك التصعيد', nameEn: 'Escalation Engine', descAr: 'سلسلة تصعيد للاعتمادات المتأخرة — لا شيء يضيع.', descEn: 'Overdue approval escalation chain — nothing falls through the cracks.' },
        { icon: 'pi pi-th-large', nameAr: 'لوحة تحكم بأربع مناطق', nameEn: '4-Zone Dashboard', descAr: 'مهام + اعتمادات + مؤشرات أداء + نشاط — كل شيء في شاشة واحدة.', descEn: 'Tasks + approvals + KPIs + activity — everything on one screen.' },
      ],
    },
  ];

}
