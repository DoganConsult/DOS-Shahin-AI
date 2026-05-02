import {
  Component, inject, OnInit, signal, computed, effect,
  ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, HostListener, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import * as d3 from 'd3';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SectionHeaderComponent } from '@app/shared/widgets/section-header/section-header.component';
import { resolveTheme, observeThemeChange } from '@app/shared/widgets/d3-charts/theme-bridge';
import { SequencingEngineService, CapabilityItem, StageGroup, UserContext } from '@app/core/services/module-support/lifecycle/sequencing-engine.service';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/core/services/grc-operations.service';

interface Capability {
  titleEn: string; titleAr: string; descEn: string; descAr: string; icon: string; route: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-features-section',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SectionHeaderComponent],
  templateUrl: './features-section.component.html',
  styleUrls: ['./features-section.component.css'],
})
export class FeaturesSectionComponent implements OnInit, AfterViewInit, OnDestroy {
    private operationsSvc = inject(GrcOperationsService);
  @ViewChild('d3Viewport') viewportRef!: ElementRef<HTMLElement>;
  @ViewChild('d3Stage') stageRef!: ElementRef<HTMLElement>;
  @ViewChild('d3Dots') dotsRef!: ElementRef<HTMLElement>;

  i18n = inject(I18nService);
  private router = inject(Router);
  private zone = inject(NgZone);
  private sequencer = inject(SequencingEngineService);

  advancedMode = signal(false);
  scrollDir = signal<'horizontal' | 'vertical' | 'timeline' | 'carousel'>('horizontal');
  canScrollPrev = signal(false);
  canScrollNext = signal(true);
  canScrollDown = signal(true);
  currentPage = signal(0);
  showContextSelector = signal(false);
  detailItem = signal<CapabilityItem | null>(null);
  stageGroups = signal<StageGroup[]>([]);
  focusedIndex = signal(-1);

  // Context selector model
  selectedSector = this.sequencer.context().sector;
  selectedRole = this.sequencer.context().role;
  selectedMaturity = this.sequencer.context().maturity;

  sectors = ['general', 'banking', 'telecom', 'government', 'healthcare', 'energy', 'education'];
  roles = ['general', 'ciso', 'compliance_officer', 'risk_manager', 'auditor', 'executive'];
  maturities: ('beginner' | 'intermediate' | 'advanced')[] = ['beginner', 'intermediate', 'advanced'];

  private coreCapabilities = signal<Capability[]>([]);
  private resizeObserver?: ResizeObserver;
  private disposeThemeObserver?: () => void;
  private currentOffset = 0;
  private cardWidth = 0;
  private gap = 20;
  private colsPerView = 3;

  private langEffect = effect(() => {
    // Re-render D3 cards when language changes so card text updates dynamically
    this.i18n.currentLang();
    if (this.stageRef?.nativeElement) {
      setTimeout(() => this.renderD3(), 0);
    }
  });

  private fallbackCapabilities: Capability[] = [
    { icon: 'pi pi-building', titleEn: 'Governance & Policy Management', titleAr: 'الحوكمة وإدارة السياسات', descEn: 'Full policy lifecycle with versioning, multi-stage approval workflows, expiry alerts, and bilingual document generation.', descAr: 'دورة حياة سياسات كاملة مع التحكم بالإصدارات وسير عمل الموافقة متعدد المراحل وتنبيهات الانتهاء وإنشاء وثائق ثنائية اللغة.', route: 'governance' },
    { icon: 'pi pi-exclamation-triangle', titleEn: 'Risk Management', titleAr: 'إدارة المخاطر', descEn: '5x5 likelihood x impact scoring with interactive sliders, risk heat maps, treatment plans, KRI tracking, and trend analysis.', descAr: 'تقييم 5x5 للاحتمالية والأثر مع مزلقات تفاعلية وخرائط حرارية وخطط معالجة وتتبع مؤشرات المخاطر الرئيسية وتحليل الاتجاهات.', route: 'risks' },
    { icon: 'pi pi-check-circle', titleEn: 'Compliance & Control Mapping', titleAr: 'الامتثال وربط الضوابط', descEn: 'Map 4,000+ controls to 60+ frameworks across 136 regulators. Cross-framework mapping shows 60% effort reduction.', descAr: 'ربط أكثر من 4,000 ضابط بأكثر من 60 إطارا عبر 136 جهة رقابية. ربط الأطر المتقاطعة يوضح تقليل الجهد بنسبة 60%.', route: 'compliance' },
    { icon: 'pi pi-search', titleEn: 'Audit & Evidence Management', titleAr: 'إدارة التدقيق والأدلة', descEn: 'Plan, execute, and track audits with AI-powered evidence collection, document analysis, and freshness tracking.', descAr: 'تخطيط وتنفيذ وتتبع عمليات التدقيق مع جمع أدلة مدعوم بالذكاء الاصطناعي. تحليل الوثائق وتتبع الحداثة والتحقق من الجودة.', route: 'audit' },
    { icon: 'pi pi-microchip-ai', titleEn: 'AI Agent Mesh - 10 Agents', titleAr: 'شبكة وكلاء الذكاء الاصطناعي - 10 وكلاء', descEn: 'Master Shahin orchestrates 10 specialized agents for onboarding, identity, framework mapping, control authoring, policies, vendors, and auditing.', descAr: 'يقود الصقر الرئيسي 10 وكلاء متخصصين: التهيئة والهوية وربط الأطر وتأليف الضوابط والأدلة ومعالجة الثغرات والمخاطر والسياسات والموردين والتدقيق.', route: 'ai-hub' },
    { icon: 'pi pi-download', titleEn: 'Report Center - 3 Formats', titleAr: 'مركز التقارير - 3 صيغ', descEn: '8 report types exportable as PDF (Arabic RTL + branding) or Excel (multi-sheet) or Interactive HTML (offline, sortable).', descAr: '8 أنواع تقارير قابلة للتصدير بصيغة PDF (عربية + علامة تجارية) أو Excel (أوراق متعددة) أو HTML تفاعلي (بدون إنترنت).', route: 'report-center' },
  ];

  extraCapabilities: Capability[] = [
    { icon: 'pi pi-shield', titleEn: 'Incident Management', titleAr: 'إدارة الحوادث', descEn: 'Track, classify, and resolve security incidents with automated escalation workflows and root cause analysis.', descAr: 'تتبع وتصنيف وحل الحوادث الأمنية مع سير عمل تصعيد تلقائي وتحليل الأسباب الجذرية.', route: 'incidents' },
    { icon: 'pi pi-truck', titleEn: 'Vendor Risk Management', titleAr: 'إدارة مخاطر الموردين', descEn: 'Assess and monitor third-party vendor risks with automated questionnaires and continuous monitoring.', descAr: 'تقييم ومراقبة مخاطر الموردين الخارجيين مع استبيانات آلية ومراقبة مستمرة.', route: 'vendor-risk' },
    { icon: 'pi pi-sitemap', titleEn: 'Business Continuity', titleAr: 'استمرارية الأعمال', descEn: 'BIA, recovery plans, and testing schedules to ensure operational resilience across all critical processes.', descAr: 'تحليل تأثير الأعمال وخطط التعافي وجداول الاختبار لضمان المرونة التشغيلية.', route: 'bcp' },
    { icon: 'pi pi-cog', titleEn: 'Workflow Automation', titleAr: 'أتمتة سير العمل', descEn: 'Visual workflow builder with conditional logic, SLA tracking, and multi-stage approval chains.', descAr: 'منشئ سير عمل مرئي مع منطق شرطي وتتبع اتفاقيات مستوى الخدمة وسلاسل موافقة متعددة.', route: 'workflows' },
    { icon: 'pi pi-lock', titleEn: 'Privacy & Data Protection', titleAr: 'الخصوصية وحماية البيانات', descEn: 'DPIA management, consent tracking, data mapping, and breach notification workflows for PDPL compliance.', descAr: 'إدارة تقييم تأثير الخصوصية وتتبع الموافقات وخرائط البيانات وإشعارات الاختراق.', route: 'privacy-ops' },
    { icon: 'pi pi-chart-line', titleEn: 'KRI Dashboard', titleAr: 'لوحة مؤشرات المخاطر', descEn: 'Real-time key risk indicator monitoring with threshold alerts, trend analysis, and executive dashboards.', descAr: 'مراقبة مؤشرات المخاطر الرئيسية في الوقت الفعلي مع تنبيهات العتبات وتحليل الاتجاهات.', route: 'risk-metrics' },
    { icon: 'pi pi-bolt', titleEn: 'Autonomy Engine', titleAr: 'محرك الاستقلالية', descEn: 'AI-driven autonomous compliance operations with configurable trust levels and human-in-the-loop controls.', descAr: 'عمليات امتثال مستقلة مدعومة بالذكاء الاصطناعي مع مستويات ثقة قابلة للتكوين.', route: 'autonomy-engine' },
    { icon: 'pi pi-map', titleEn: 'Framework Mapping', titleAr: 'ربط الأطر التنظيمية', descEn: 'Cross-map controls across 60+ frameworks to eliminate duplication and visualize coverage gaps.', descAr: 'ربط الضوابط عبر أكثر من 60 إطارًا لإزالة التكرار وتصور فجوات التغطية.', route: 'framework-mapping' },
    { icon: 'pi pi-file-check', titleEn: 'Assessment Center', titleAr: 'مركز التقييمات', descEn: 'NCA ECC, SAMA CSF, and custom assessment templates with scoring, gap analysis, and remediation tracking.', descAr: 'قوالب تقييم NCA ECC و SAMA CSF ومخصصة مع التسجيل وتحليل الفجوات وتتبع المعالجة.', route: 'assessments' },
    { icon: 'pi pi-code', titleEn: 'Policy as Code', titleAr: 'السياسات كرمز', descEn: 'Define compliance policies as executable code with automated testing and continuous validation.', descAr: 'تعريف سياسات الامتثال كرمز قابل للتنفيذ مع اختبار آلي وتحقق مستمر.', route: 'policy-code' },
  ];

  visibleCapabilities = computed(() =>
    this.advancedMode() ? [...this.coreCapabilities(), ...this.extraCapabilities] : this.coreCapabilities()
  );
  totalPages = computed(() => Math.ceil(this.visibleCapabilities().length / this.colsPerView));
  dotsArray = computed(() => Array.from({ length: this.totalPages() }));

  ngOnInit(): void {
    this.operationsSvc.getPublicLandingContent().subscribe({
      next: (res: Record<string, any>) => {
        const payload = asRecord(res);
        const caps = asRecordArray(payload['capabilities']);
        this.coreCapabilities.set(caps.length > 0 ? this.mergeRoutes(caps) : this.fallbackCapabilities);
        this.applySequencing();
        if (this.stageRef) this.renderD3();
      },
      error: () => {
        this.coreCapabilities.set(this.fallbackCapabilities);
        this.applySequencing();
        if (this.stageRef) this.renderD3();
      },
    });
  }

  /** Apply sequencing engine to reorder capabilities */
  private applySequencing(): void {
    const ctx = this.sequencer.context();
    const allCaps: CapabilityItem[] = [...this.coreCapabilities(), ...(this.advancedMode() ? this.extraCapabilities : [])].map(c => ({
      content_id: c.titleEn.toLowerCase().replace(/\s+/g, '-'),
      ...c,
      category: (c as GrcRecord).category || 'core',
      relevanceTags: (c as GrcRecord).relevanceTags || ['all-sectors'],
      detailContent: (c as GrcRecord).detailContent || { en: c.descEn, ar: c.descAr },
    }));
    const scored = this.sequencer.rankCapabilities(allCaps, ctx);
    this.stageGroups.set(this.sequencer.groupByStage(scored));
  }

  applyContext(): void {
    this.sequencer.updateContext({
      sector: this.selectedSector,
      role: this.selectedRole,
      maturity: this.selectedMaturity,
    });
    this.applySequencing();
    this.showContextSelector.set(false);
    setTimeout(() => { this.computeLayout(); this.renderD3(); }, 50);
  }

  openDetail(item: CapabilityItem): void {
    this.detailItem.set(item);
  }

  closeDetail(): void {
    this.detailItem.set(null);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    // Close detail panel on Escape
    if (event.key === 'Escape' && this.detailItem()) {
      this.closeDetail();
      return;
    }
    // Arrow key navigation for cards
    const caps = this.visibleCapabilities();
    if (!caps.length) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusedIndex.set(Math.min(this.focusedIndex() + 1, caps.length - 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusedIndex.set(Math.max(this.focusedIndex() - 1, 0));
    } else if (event.key === 'Enter' && this.focusedIndex() >= 0) {
      const cap = caps[this.focusedIndex()];
      if (cap) this.router.navigate(['/' + cap.route]);
    }
  }

  private mergeRoutes(caps: Record<string, unknown>[]): Capability[] {
    const routeMap: Record<string, string> = {
      'Governance': 'governance', 'Risk Management': 'risks', 'Compliance': 'compliance',
      'Audit': 'audit', 'AI Agent': 'ai-hub', 'Report Center': 'report-center',
    };
    return caps.map((raw) => {
      const c = asRecord(raw);
      const titleEn = asString(c['titleEn']) || asString(c['title_en']) || asString(c['title']) || 'Capability';
      return {
        titleEn,
        titleAr: asString(c['titleAr']) || asString(c['title_ar']) || titleEn,
        descEn: asString(c['descEn']) || asString(c['description_en']) || asString(c['description']),
        descAr: asString(c['descAr']) || asString(c['description_ar']) || asString(c['description']) || asString(c['descEn']) || asString(c['description_en']),
        icon: asString(c['icon']) || 'pi pi-star',
        route: asString(c['route']) || Object.entries(routeMap).find(([k]) => titleEn.includes(k))?.[1] || 'workspace-home',
      };
    });
  }

  ngAfterViewInit(): void {
    this.disposeThemeObserver = observeThemeChange(() => this.renderD3());
    this.resizeObserver = new ResizeObserver(() => {
      this.computeLayout();
      this.renderD3();
    });
    if (this.viewportRef?.nativeElement) {
      this.resizeObserver.observe(this.viewportRef.nativeElement);
    }
    this.computeLayout();
    this.renderD3();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.disposeThemeObserver?.();
    this.stopCarouselAuto();
  }

  toggleAdvanced(): void {
    this.advancedMode.set(!this.advancedMode());
    this.currentOffset = 0;
    this.currentPage.set(0);
    setTimeout(() => { this.computeLayout(); this.renderD3(); }, 50);
  }

  carouselAngle = signal(0);
  private carouselAutoTimer: ReturnType<typeof setInterval> | null = null;

  setScrollDir(dir: 'horizontal' | 'vertical' | 'timeline' | 'carousel'): void {
    this.stopCarouselAuto();
    this.scrollDir.set(dir);
    this.currentOffset = 0;
    this.currentPage.set(0);
    this.carouselAngle.set(0);
    setTimeout(() => { this.computeLayout(); this.renderD3(); }, 50);
    if (dir === 'carousel') this.startCarouselAuto();
  }

  rotateCarousel(dir: number): void {
    const caps = this.visibleCapabilities();
    if (!caps.length) return;
    const step = 360 / caps.length;
    this.carouselAngle.set(this.carouselAngle() + dir * step);
    this.renderD3();
  }

  private startCarouselAuto(): void {
    this.carouselAutoTimer = setInterval(() => {
      this.zone.run(() => this.rotateCarousel(1));
    }, 4000);
  }

  private stopCarouselAuto(): void {
    if (this.carouselAutoTimer) { clearInterval(this.carouselAutoTimer); this.carouselAutoTimer = null; }
  }

  scrollPrev(): void {
    const page = Math.max(0, this.currentPage() - 1);
    this.goToPage(page);
  }

  scrollNext(): void {
    const page = Math.min(this.totalPages() - 1, this.currentPage() + 1);
    this.goToPage(page);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    const pageOffset = page * this.colsPerView * (this.cardWidth + this.gap);
    this.currentOffset = Math.min(pageOffset, this.getMaxOffset());
    this.animateToOffset(this.currentOffset);
    this.updateNavState();
    this.renderDots();
  }

  private computeLayout(): void {
    const vp = this.viewportRef?.nativeElement;
    if (!vp) return;
    const w = vp.clientWidth;
    if (w < 600) { this.colsPerView = 1; }
    else if (w < 900) { this.colsPerView = 2; }
    else { this.colsPerView = 3; }
    this.cardWidth = (w - this.gap * (this.colsPerView - 1)) / this.colsPerView;
  }

  /** Main D3 render — creates positioned card divs with D3 data-join and transitions */
  private renderD3(): void {
    const stage = this.stageRef?.nativeElement;
    if (!stage) return;
    const caps = this.visibleCapabilities();
    const isAr = this.i18n.currentLang() === 'ar';
    const dir = this.scrollDir();

    d3.select(stage).selectAll('*').remove();

    if (dir === 'horizontal') {
      this.renderHorizontal(stage, caps, isAr);
    } else if (dir === 'timeline') {
      this.renderTimeline(stage, caps, isAr);
    } else if (dir === 'carousel') {
      this.renderCarousel(stage, caps, isAr);
    } else {
      this.renderVertical(stage, caps, isAr);
    }

    this.renderDots();
    this.updateNavState();
  }

  private renderHorizontal(stage: HTMLElement, caps: Capability[], isAr: boolean): void {
    const totalW = caps.length * (this.cardWidth + this.gap) - this.gap;
    const stageD3 = d3.select(stage)
      .style('width', totalW + 'px')
      .style('height', '100%')
      .style('transform', `translateX(${-this.currentOffset}px)`)
      .style('transition', 'none');

    const cards = stageD3.selectAll<HTMLDivElement, Capability>('.d3-card')
      .data(caps, (d: Capability) => d.titleEn)
      .join(
        enter => enter.append('div')
          .attr('class', 'd3-card')
          .style('opacity', '0')
          .style('transform', 'translateY(20px)')
          .call(sel => this.populateCard(sel, isAr))
          .call(sel => sel.transition().duration(400).delay((_, i) => i * 60)
            .style('opacity', '1')
            .style('transform', 'translateY(0)'))
      );

    const xScale = d3.scaleLinear()
      .domain([0, caps.length - 1])
      .range([0, (caps.length - 1) * (this.cardWidth + this.gap)]);

    cards
      .style('left', (_, i) => xScale(i) + 'px')
      .style('top', '8px')
      .style('width', this.cardWidth + 'px')
      .style('height', 'calc(100% - 16px)');

    // D3 drag for swipe gesture
    let dragStartX = 0;
    let startOffset = 0;
    const drag = d3.drag<HTMLElement, any>()
      .on('start', (event) => {
        dragStartX = event.x;
        startOffset = this.currentOffset;
        d3.select(stage).style('transition', 'none');
      })
      .on('drag', (event) => {
        const dx = event.x - dragStartX;
        const newOffset = Math.max(0, startOffset - dx);
        d3.select(stage).style('transform', `translateX(${-newOffset}px)`);
      })
      .on('end', (event) => {
        const dx = event.x - dragStartX;
        const threshold = this.cardWidth / 3;
        if (Math.abs(dx) > threshold) {
          if (dx > 0) this.goToPage(Math.max(0, this.currentPage() - 1));
          else this.goToPage(Math.min(this.totalPages() - 1, this.currentPage() + 1));
        } else {
          this.animateToOffset(this.currentOffset);
        }
      });

    d3.select(stage.parentElement!).call(drag as any);

    cards.on('click', (event: MouseEvent, d: Capability) => {
      if (Math.abs((event as GrcRecord).dx || 0) < 5) {
        this.zone.run(() => this.router.navigate(['/' + d.route]));
      }
    });
  }

  private renderVertical(stage: HTMLElement, caps: Capability[], isAr: boolean): void {
    const cols = Math.min(this.colsPerView, 2);
    const colW = (this.viewportRef.nativeElement.clientWidth - this.gap * (cols - 1)) / cols;
    const rowH = 240;
    const rows = Math.ceil(caps.length / cols);
    const totalH = rows * (rowH + this.gap) - this.gap;

    const stageD3 = d3.select(stage)
      .style('width', '100%')
      .style('height', totalH + 'px')
      .style('transform', 'none')
      .style('position', 'relative');

    const cards = stageD3.selectAll<HTMLDivElement, Capability>('.d3-card')
      .data(caps, (d: Capability) => d.titleEn)
      .join(
        enter => enter.append('div')
          .attr('class', 'd3-card')
          .style('opacity', '0')
          .style('transform', 'scale(0.92)')
          .call(sel => this.populateCard(sel, isAr))
          .call(sel => sel.transition().duration(350).delay((_, i) => i * 50)
            .style('opacity', '1')
            .style('transform', 'scale(1)'))
      );

    cards.each(function(this: HTMLDivElement, _d: Capability, i: number) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      d3.select(this)
        .style('left', col * (colW + 20) + 'px')
        .style('top', row * (rowH + 20) + 'px')
        .style('width', colW + 'px')
        .style('height', rowH + 'px');
    });

    cards.on('click', (_event: MouseEvent, d: Capability) => {
      this.zone.run(() => this.router.navigate(['/' + d.route]));
    });

    const vp = this.viewportRef?.nativeElement;
    if (vp) {
      vp.onscroll = () => {
        this.canScrollDown.set(vp.scrollTop < vp.scrollHeight - vp.clientHeight - 5);
      };
    }
  }

  /** Render a horizontal timeline with D3 path connector and stage nodes */
  private renderTimeline(stage: HTMLElement, caps: Capability[], isAr: boolean): void {
    const vp = this.viewportRef?.nativeElement;
    if (!vp) return;
    const vpW = vp.clientWidth;
    const nodeW = Math.min(260, vpW * 0.22);
    const nodeH = 200;
    const spacing = nodeW + 40;
    const totalW = caps.length * spacing;
    const timelineH = 460;

    const stageD3 = d3.select(stage)
      .style('width', totalW + 'px')
      .style('height', timelineH + 'px')
      .style('transform', `translateX(${-this.currentOffset}px)`)
      .style('transition', 'none');

    // SVG for connector line
    const svg = stageD3.append('svg')
      .attr('width', totalW)
      .attr('height', timelineH)
      .style('position', 'absolute')
      .style('top', '0')
      .style('left', '0')
      .style('pointer-events', 'none');

    const midY = 40;
    // Main horizontal line
    svg.append('line')
      .attr('x1', spacing / 2)
      .attr('y1', midY)
      .attr('x2', (caps.length - 1) * spacing + spacing / 2)
      .attr('y2', midY)
      .attr('stroke', 'var(--primary)')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '8 4')
      .attr('opacity', 0.4);

    // Animated progress line
    const progressLine = svg.append('line')
      .attr('x1', spacing / 2)
      .attr('y1', midY)
      .attr('x2', spacing / 2)
      .attr('y2', midY)
      .attr('stroke', 'var(--primary)')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round');

    progressLine.transition().duration(1200).ease(d3.easeCubicOut)
      .attr('x2', (caps.length - 1) * spacing + spacing / 2);

    // Stage dots on the line
    const dots = svg.selectAll('.tl-dot')
      .data(caps)
      .join('circle')
      .attr('class', 'tl-dot')
      .attr('cx', (_, i) => i * spacing + spacing / 2)
      .attr('cy', midY)
      .attr('r', 0)
      .attr('fill', 'var(--primary)')
      .attr('stroke', 'var(--surface)')
      .attr('stroke-width', 3);

    dots.transition().duration(400).delay((_, i) => 200 + i * 120)
      .attr('r', 10);

    // Pulse animation on dots
    svg.selectAll('.tl-pulse')
      .data(caps)
      .join('circle')
      .attr('class', 'tl-pulse')
      .attr('cx', (_, i) => i * spacing + spacing / 2)
      .attr('cy', midY)
      .attr('r', 10)
      .attr('fill', 'none')
      .attr('stroke', 'var(--primary)')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0)
      .each(function(_, i) {
        const el = d3.select(this);
        const pulse = () => {
          el.attr('r', 10).attr('opacity', 0.6)
            .transition().duration(1400).delay(i * 200)
            .attr('r', 22).attr('opacity', 0)
            .on('end', pulse);
        };
        pulse();
      });

    // Step number labels
    svg.selectAll('.tl-num')
      .data(caps)
      .join('text')
      .attr('class', 'tl-num')
      .attr('x', (_, i) => i * spacing + spacing / 2)
      .attr('y', midY + 1)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#fff')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text((_, i) => i + 1)
      .attr('opacity', 0)
      .transition().duration(300).delay((_, i) => 400 + i * 120)
      .attr('opacity', 1);

    // Vertical connector from dot to card
    svg.selectAll('.tl-vline')
      .data(caps)
      .join('line')
      .attr('class', 'tl-vline')
      .attr('x1', (_, i) => i * spacing + spacing / 2)
      .attr('y1', midY + 14)
      .attr('x2', (_, i) => i * spacing + spacing / 2)
      .attr('y2', midY + 14)
      .attr('stroke', 'var(--border-primary)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3 3')
      .transition().duration(400).delay((_, i) => 500 + i * 120)
      .attr('y2', 80);

    // Cards below the timeline
    const cards = stageD3.selectAll<HTMLDivElement, Capability>('.d3-card')
      .data(caps, (d: Capability) => d.titleEn)
      .join(
        enter => enter.append('div')
          .attr('class', 'd3-card tl-card')
          .style('opacity', '0')
          .style('transform', 'translateY(30px)')
          .call(sel => this.populateCard(sel, isAr))
          .call(sel => sel.transition().duration(500).delay((_, i) => 500 + i * 120)
            .style('opacity', '1')
            .style('transform', 'translateY(0)'))
      );

    cards
      .style('left', (_, i) => (i * spacing + spacing / 2 - nodeW / 2) + 'px')
      .style('top', '90px')
      .style('width', nodeW + 'px')
      .style('height', nodeH + 'px');

    cards.on('click', (_event: MouseEvent, d: Capability) => {
      this.zone.run(() => this.router.navigate(['/' + d.route]));
    });

    // D3 drag for horizontal scroll
    let dragStartX = 0;
    let startOffset = 0;
    const drag = d3.drag<HTMLElement, any>()
      .on('start', (event) => {
        dragStartX = event.x;
        startOffset = this.currentOffset;
        d3.select(stage).style('transition', 'none');
      })
      .on('drag', (event) => {
        const dx = event.x - dragStartX;
        const newOffset = Math.max(0, Math.min(startOffset - dx, totalW - vpW));
        d3.select(stage).style('transform', `translateX(${-newOffset}px)`);
      })
      .on('end', (event) => {
        const dx = event.x - dragStartX;
        this.currentOffset = Math.max(0, Math.min(startOffset - dx, totalW - vpW));
        this.animateToOffset(this.currentOffset);
      });

    d3.select(stage.parentElement!).call(drag as any);
  }

  /** Render a 3D carousel with CSS perspective and D3 transforms */
  private renderCarousel(stage: HTMLElement, caps: Capability[], isAr: boolean): void {
    const vp = this.viewportRef?.nativeElement;
    if (!vp) return;
    const vpW = vp.clientWidth;
    const count = caps.length;
    const cardW = Math.min(300, vpW * 0.35);
    const cardH = 280;
    const radius = Math.max(cardW * 1.2, 280);
    const angle = this.carouselAngle();

    d3.select(stage)
      .style('width', '100%')
      .style('height', (cardH + 120) + 'px')
      .style('perspective', '1200px')
      .style('transform', 'none')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center');

    // Scene container
    const scene = d3.select(stage).append('div')
      .attr('class', 'carousel-scene')
      .style('width', cardW + 'px')
      .style('height', cardH + 'px')
      .style('position', 'relative')
      .style('transform-style', 'preserve-3d')
      .style('transform', `rotateY(${-angle}deg)`)
      .style('transition', 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)');

    const cards = scene.selectAll<HTMLDivElement, Capability>('.d3-card')
      .data(caps, (d: Capability) => d.titleEn)
      .join(
        enter => enter.append('div')
          .attr('class', 'd3-card carousel-card')
          .call(sel => this.populateCard(sel, isAr))
      );

    const stepAngle = 360 / count;
    cards.each(function(this: HTMLDivElement, _d: Capability, i: number) {
      const rot = i * stepAngle;
      d3.select(this)
        .style('position', 'absolute')
        .style('width', cardW + 'px')
        .style('height', cardH + 'px')
        .style('left', '0')
        .style('top', '0')
        .style('transform', `rotateY(${rot}deg) translateZ(${radius}px)`)
        .style('backface-visibility', 'hidden');
    });

    cards.on('click', (_event: MouseEvent, d: Capability) => {
      this.zone.run(() => this.router.navigate(['/' + d.route]));
    });

    // Bottom indicator showing current front card
    const frontIndex = Math.round((angle % 360 + 360) % 360 / stepAngle) % count;
    const frontCap = caps[frontIndex];
    if (frontCap) {
      d3.select(stage).append('div')
        .attr('class', 'carousel-indicator')
        .style('text-align', 'center')
        .style('margin-top', '16px')
        .style('position', 'absolute')
        .style('bottom', '0')
        .style('left', '0')
        .style('right', '0')
        .html(`<span class="carousel-indicator-text">${isAr ? frontCap.titleAr : frontCap.titleEn}</span>
               <span class="carousel-indicator-count">${frontIndex + 1} / ${count}</span>`);
    }
  }

  /** Populate a card div with icon, title, description, and explore link */
  private populateCard(
    sel: d3.Selection<HTMLDivElement, Capability, HTMLElement, any>,
    isAr: boolean
  ): void {
    sel.each(function(this: HTMLDivElement, d: Capability) {
      const card = d3.select(this);
      card.append('span').attr('class', 'd3-card-icon')
        .append('i').attr('class', d.icon);
      card.append('h3').attr('class', 'd3-card-name')
        .text(isAr ? d.titleAr : d.titleEn);
      card.append('p').attr('class', 'd3-card-desc')
        .text(isAr ? d.descAr : d.descEn);
      const link = card.append('span').attr('class', 'd3-card-link');
      link.append('i').attr('class', 'pi pi-arrow-right');
      link.append('span').text(isAr ? 'استكشف' : 'Explore');
    });
  }

  /** Render SVG dot indicators using D3 */
  private renderDots(): void {
    const dotsEl = this.dotsRef?.nativeElement;
    if (!dotsEl || this.scrollDir() !== 'horizontal') return;

    d3.select(dotsEl).selectAll('*').remove();
    const pages = this.totalPages();
    if (pages <= 1) return;

    const dotR = 5;
    const dotGap = 18;
    const svgW = pages * dotGap;
    const svg = d3.select(dotsEl).append('svg')
      .attr('width', svgW)
      .attr('height', dotR * 2 + 4)
      .attr('role', 'tablist')
      .attr('aria-label', 'Pages');

    const current = this.currentPage();
    svg.selectAll('circle')
      .data(d3.range(pages))
      .join('circle')
      .attr('cx', (_, i) => i * dotGap + dotR + 2)
      .attr('cy', dotR + 2)
      .attr('r', (_, i) => i === current ? dotR + 1.5 : dotR)
      .attr('fill', (_, i) => i === current
        ? (resolveTheme().primary)
        : (resolveTheme().borderSubtle))
      .attr('role', 'tab')
      .attr('aria-selected', (_, i) => i === current ? 'true' : 'false')
      .style('cursor', 'pointer')
      .style('transition', 'all 200ms')
      .on('click', (_event: MouseEvent, pageIdx: number) => {
        this.zone.run(() => this.goToPage(pageIdx));
      });
  }

  private animateToOffset(offset: number): void {
    const stage = this.stageRef?.nativeElement;
    if (!stage) return;
    this.currentOffset = offset;
    d3.select(stage)
      .transition()
      .duration(400)
      .ease(d3.easeCubicOut)
      .style('transform', `translateX(${-offset}px)`);
  }

  private updateNavState(): void {
    if (this.scrollDir() === 'horizontal') {
      const maxOffset = this.getMaxOffset();
      this.canScrollPrev.set(this.currentOffset > 5);
      this.canScrollNext.set(this.currentOffset < maxOffset - 5);
    }
  }

  private getMaxOffset(): number {
    const vp = this.viewportRef?.nativeElement;
    if (!vp) return 0;
    const caps = this.visibleCapabilities();
    const totalW = caps.length * (this.cardWidth + this.gap) - this.gap;
    return Math.max(0, totalW - vp.clientWidth);
  }
}
