import { Component, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AppEchartComponent } from '@app/shared/widgets/echart-wrapper/app-echart.component';
import type { EChartsOption } from 'echarts';

interface MatrixCell { en: string[]; ar: string[]; }
interface Pillar {
  icon: string; color: string; bg: string;
  label: string; labelAr: string; metric: string;
  subs: string[]; subsAr: string[];
  matrix: [MatrixCell, MatrixCell, MatrixCell];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-value-map',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, AppEchartComponent],
  template: `
    <section class="vm" id="value-map">
      <div class="vm-wrap">

        <!-- ── Compact header row ── -->
        <div class="vm-hdr">
          <div class="vm-hdr-left">
            <span class="vm-badge"><i class="pi pi-map"></i>{{ isAr ? 'بنية نظام التشغيل' : 'OS Architecture' }}</span>
            <h2>{{ isAr ? 'كيف يعمل Shahin-AI؟' : 'How Shahin-AI Works' }}</h2>
            <p>{{ isAr
              ? 'نظام تشغيل كامل: نواة مستقلة تدير الامتثال، 10 وكلاء يعملون تلقائياً، لوحات قيادة تعرض النتائج.'
              : 'A full operating system: autonomous kernel runs compliance, 12 agents work automatically, dashboards show results.' }}</p>
          </div>
          <div class="vm-toggle">
            <button class="t-btn" [class.t-on]="mode() === 'flow'" (click)="setMode('flow')">
              <i class="pi pi-arrows-h"></i>{{ isAr ? 'عرض التدفق' : 'Flow View' }}
            </button>
            <button class="t-btn" [class.t-on]="mode() === 'matrix'" (click)="setMode('matrix')">
              <i class="pi pi-chart-bar"></i>{{ isAr ? 'المصفوفة' : 'Matrix View' }}
            </button>
          </div>
        </div>

        <!-- ═══════════ FLOW VIEW ═══════════ -->
        <ng-container *ngIf="mode() === 'flow'">
          <div class="flow-body">

            <!-- Left: pillar cards -->
            <div class="cards-col">
              <div class="cards-grid">
                <div tabindex="0" role="button" (keyup.enter)="selectPillar(i)" *ngFor="let p of pillars; let i = index"
                     class="pc" [class.pc-on]="activeIdx() === i"
                     [style.--pc]="p.color" [style.--pcbg]="p.bg"
                     (click)="selectPillar(i)"
                     (mouseenter)="hoveredIdx.set(i)"
                     (mouseleave)="hoveredIdx.set(null)">

                  <!-- Card body -->
                  <div class="pc-icon" [style.background]="p.bg">
                    <i [class]="'pi ' + p.icon" [style.color]="p.color"></i>
                  </div>
                  <span class="pc-name">{{ isAr ? p.labelAr : p.label }}</span>
                  <span class="pc-metric" [style.color]="p.color">{{ p.metric }}</span>
                  <div class="pc-subs">
                    <span *ngFor="let s of (isAr ? p.subsAr : p.subs)" class="pc-sub">{{ s }}</span>
                  </div>

                  <!-- Hover popup -->
                  <div class="pc-popup" [style.borderTopColor]="p.color">
                    <div class="pcp-title" [style.color]="p.color">
                      <i [class]="'pi ' + p.icon"></i>
                      {{ isAr ? p.labelAr : p.label }} — {{ p.metric }}
                    </div>
                    <div class="pcp-rows">
                      <div *ngFor="let aud of audiences; let ai = index" class="pcp-row">
                        <span class="pcp-aud" [style.color]="aud.color">
                          <i [class]="aud.icon"></i>{{ isAr ? aud.labelAr : aud.label }}
                        </span>
                        <ul class="pcp-list">
                          <li *ngFor="let item of getMatrix(i, ai)">
                            <i class="pi pi-check" [style.color]="aud.color"></i>{{ item }}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Audience legend -->
              <div class="aud-legend">
                <div *ngFor="let aud of audiences" class="aud-pill" [style.color]="aud.color" [style.borderColor]="aud.color + '44'">
                  <i [class]="aud.icon"></i>{{ isAr ? aud.labelAr : aud.label }}
                </div>
              </div>
            </div>

            <!-- Right: radar chart -->
            <div class="radar-col">
              <div class="chart-lbl">
                <i class="pi pi-chart-scatter"></i>
                {{ isAr ? 'تغطية القيمة' : 'Value Coverage' }}
                <span>{{ isAr ? '(مرّر فوق بطاقة لعرض التفاصيل)' : '(hover a card for details)' }}</span>
              </div>
              <div class="radar-canvas">
                <app-echart [options]="radarOptions()" ariaLabel="Shahin-AI value coverage spider chart"></app-echart>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- ═══════════ MATRIX VIEW ═══════════ -->
        <ng-container *ngIf="mode() === 'matrix'">
          <div class="matrix-body">
            <div class="bar-canvas">
              <app-echart [options]="barOptions()" ariaLabel="Shahin-AI value delivery bar chart"></app-echart>
            </div>
            <div class="aud-legend mat-legend">
              <div *ngFor="let aud of audiences" class="aud-pill" [style.color]="aud.color" [style.borderColor]="aud.color + '44'">
                <i [class]="aud.icon"></i>{{ isAr ? aud.labelAr : aud.label }}
              </div>
            </div>
          </div>
        </ng-container>

        <!-- CTA strip -->
        <div class="vm-cta">
          <span>{{ isAr ? 'هل أنت مستعد لرؤية Shahin-AI في العمل؟' : 'Ready to see Shahin-AI in action?' }}</span>
          <a routerLink="/register" class="cta-btn">
            {{ isAr ? 'ابدأ مجاناً' : 'Get Started Free' }}<i class="pi pi-arrow-right"></i>
          </a>
        </div>

      </div>
    </section>
  `,
  styles: [`
    /* ── Shell ── */
    .vm {
      padding: 48px 0 36px;
      background: linear-gradient(170deg, #f0f4f8 0%, #fafbff 60%, #fff 100%);
      border-top: 1px solid var(--border-subtle);
    }
    .vm-wrap { max-width: 1360px; margin: 0 auto; padding: 0 28px; }

    /* ── Compact header row ── */
    .vm-hdr {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 24px; margin-bottom: 28px; flex-wrap: wrap;
    }
    .vm-hdr-left { flex: 1; min-width: 240px; }
    .vm-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 14px; border-radius: var(--radius-pill);
      background: #eff6ff; color: var(--primary); border: 1px solid #bfdbfe;
      font-size: var(--font-size-xs); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      margin-bottom: 10px;
    }
    .vm-hdr-left h2 {
      font-size: clamp(22px, 3.2vw, 34px); font-weight: 900; color: var(--text-heading);
      margin: 0 0 6px; letter-spacing: -0.025em;
    }
    .vm-hdr-left p { font-size: var(--font-size-base); color: var(--text-muted); margin: 0; line-height: 1.5; max-width: 440px; }

    /* ── Toggle ── */
    .vm-toggle {
      flex-shrink: 0; display: inline-flex; gap: 0;
      background: var(--surface-ice); padding: 4px; border-radius: var(--radius-md); align-self: flex-start;
    }
    .t-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 20px; border-radius: var(--radius); border: none;
      font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted);
      cursor: pointer; background: transparent; transition: all 180ms; white-space: nowrap;
    }
    .t-btn:hover { color: var(--text-heading); }
    .t-btn.t-on { background: white; color: #1d4ed8; box-shadow: var(--shadow-sm); }

    /* ══════════ FLOW VIEW ══════════ */
    .flow-body {
      display: flex; gap: 20px; align-items: flex-start;
      animation: fadeUp 280ms ease forwards;
    }

    /* Cards column */
    .cards-col { flex: 1; min-width: 0; }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    /* Individual card */
    .pc {
      position: relative;
      padding: 14px 10px 12px;
      border-radius: var(--radius-lg); border: 2px solid #e8edf5; background: white;
      cursor: pointer; text-align: center;
      transition: all 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: var(--shadow-sm);
      overflow: visible;
    }
    .pc:hover {
      border-color: var(--pc);
      transform: translateY(-6px) scale(1.02);
      box-shadow: 0 14px 32px rgba(0,0,0,0.12), 0 0 0 3px color-mix(in srgb, var(--pc) 15%, transparent);
      z-index: var(--z-base);
    }
    .pc.pc-on {
      border-color: var(--pc); background: var(--pcbg, #eff6ff);
      transform: translateY(-4px);
      box-shadow: 0 10px 28px rgba(0,0,0,0.10);
    }

    .pc-icon {
      width: 44px; height: 44px; border-radius: var(--radius-lg);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 9px; border: 1px solid rgba(0,0,0,0.05); font-size: var(--font-size-xl);
    }
    .pc-name   { display: block; font-size: 11.5px; font-weight: 800; color: var(--text-heading); margin-bottom: 5px; }
    .pc-metric {
      display: block; font-size: var(--font-size-xs); font-weight: 800; margin-bottom: 8px;
      transition: transform 200ms;
    }
    .pc:hover .pc-metric {
      animation: metricBounce 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
    }
    @keyframes metricBounce {
      0%   { transform: scale(1); }
      25%  { transform: scale(1.35); }
      55%  { transform: scale(0.9); }
      75%  { transform: scale(1.12); }
      100% { transform: scale(1); }
    }
    .pc-subs { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; }
    .pc-sub  {
      font-size: var(--font-size-xs); font-weight: 500; color: var(--text-muted);
      background: var(--surface-ice); border-radius: var(--radius-xs); padding: 2px 5px;
    }

    /* ── Hover popup ── */
    .pc-popup {
      position: absolute; bottom: calc(100% + 10px); left: 50%;
      transform: translateX(-50%) translateY(6px);
      width: 300px; background: white; border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle); border-top: 3px solid;
      padding: 14px 14px 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.16);
      opacity: 0; pointer-events: none;
      transition: opacity 180ms ease, transform 180ms ease;
      z-index: var(--z-sticky);
      text-align: start;
    }
    .pc:hover .pc-popup {
      opacity: 1; pointer-events: auto;
      transform: translateX(-50%) translateY(0);
    }
    /* Keep popup on-screen for edge cards */
    .pc:first-child .pc-popup, .pc:nth-child(2) .pc-popup {
      left: 0; transform: translateX(0) translateY(6px);
    }
    .pc:first-child:hover .pc-popup, .pc:nth-child(2):hover .pc-popup {
      transform: translateX(0) translateY(0);
    }
    .pc:last-child .pc-popup, .pc:nth-last-child(2) .pc-popup {
      left: auto; right: 0; transform: translateX(0) translateY(6px);
    }
    .pc:last-child:hover .pc-popup, .pc:nth-last-child(2):hover .pc-popup {
      transform: translateX(0) translateY(0);
    }
    /* Caret arrow */
    .pc-popup::after {
      content: ''; position: absolute; top: 100%; left: 50%;
      transform: translateX(-50%);
      border: 7px solid transparent;
      border-top-color: white;
      filter: drop-shadow(0 2px 2px rgba(0,0,0,0.08));
    }
    .pc:first-child .pc-popup::after, .pc:nth-child(2) .pc-popup::after { left: 22px; }
    .pc:last-child .pc-popup::after, .pc:nth-last-child(2) .pc-popup::after { left: auto; right: 22px; transform: none; }

    .pcp-title {
      display: flex; align-items: center; gap: 7px;
      font-size: var(--font-size-sm); font-weight: 800; margin-bottom: 10px;
    }
    .pcp-rows { display: flex; flex-direction: column; gap: 8px; }
    .pcp-row  {}
    .pcp-aud  {
      display: flex; align-items: center; gap: 5px;
      font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      margin-bottom: 5px;
    }
    .pcp-list {
      list-style: none; margin: 0; padding: 0;
      display: flex; flex-direction: column; gap: 3px;
    }
    .pcp-list li {
      display: flex; align-items: flex-start; gap: 5px;
      font-size: var(--font-size-xs); color: #374151; line-height: 1.4;
    }
    .pcp-list li .pi { font-size: var(--font-size-xs); margin-top: 2px; flex-shrink: 0; }

    /* Audience legend pills */
    .aud-legend { display: flex; gap: 8px; flex-wrap: wrap; }
    .aud-pill {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: var(--font-size-xs); font-weight: 600; padding: 4px 12px;
      border-radius: var(--radius-pill); border: 1.5px solid;
      background: white;
    }
    .aud-pill .pi { font-size: var(--font-size-xs); }

    /* Radar column */
    .radar-col { flex-shrink: 0; width: 340px; }
    .chart-lbl {
      display: flex; align-items: center; gap: 7px;
      font-size: var(--font-size-sm); font-weight: 700; color: #374151; margin-bottom: 6px;
    }
    .chart-lbl span { font-size: var(--font-size-xs); font-weight: 400; color: var(--text-muted); }
    .chart-lbl .pi { color: var(--secondary, #8b5cf6); }
    .radar-canvas { height: 320px; }

    /* ══════════ MATRIX VIEW ══════════ */
    .matrix-body { animation: fadeUp 280ms ease forwards; }
    .bar-canvas   { height: 380px; }
    .mat-legend   { margin-top: 12px; justify-content: center; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── CTA ── */
    .vm-cta {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
      gap: 14px; margin-top: 28px; padding: 20px 28px; border-radius: var(--radius-lg);
      background: linear-gradient(135deg, var(--text-heading), #1e3a5f);
    }
    .vm-cta span { font-size: var(--font-size-base); font-weight: 700; color: rgba(255,255,255,0.9); }
    .cta-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 11px 24px; border-radius: var(--radius);
      background: var(--primary); color: white;
      font-size: var(--font-size-sm); font-weight: 700; text-decoration: none; flex-shrink: 0;
      transition: all 180ms;
    }
    .cta-btn:hover { background: #2563eb; transform: translateY(-2px); box-shadow: var(--shadow-lg); }

    /* ── Responsive ── */
    @media (max-width: 1024px) {
      .flow-body    { flex-direction: column; }
      .cards-grid   { grid-template-columns: repeat(3, 1fr); }
      .radar-col    { width: 100%; }
      .radar-canvas { height: 280px; }
    }
    @media (max-width: 768px) {
      .cards-grid { grid-template-columns: repeat(2, 1fr); }
      .vm { padding: 36px 0 28px; }
      .pc-popup { display: none; } /* popups hidden on mobile; tap shows card state */
    }
    @media (max-width: 480px) {
      .cards-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class ValueMapComponent {
  i18n = inject(I18nService);
  mode = signal<'flow' | 'matrix'>('flow');
  activeIdx = signal<number | null>(null);
  hoveredIdx = signal<number | null>(null);

  get isAr(): boolean { return this.i18n.currentLang() === 'ar'; }
  setMode(m: 'flow' | 'matrix'): void { this.mode.set(m); this.activeIdx.set(null); }
  selectPillar(i: number): void { this.activeIdx.set(this.activeIdx() === i ? null : i); }
  getMatrix(pi: number, ai: number): string[] {
    const c = this.pillars[pi].matrix[ai];
    return this.isAr ? c.ar : c.en;
  }

  // ── ECharts: Radar ──────────────────────────────────────────────────────
  radarOptions = computed<EChartsOption>(() => {
    const ar = this.i18n.currentLang() === 'ar';
    const active = this.hoveredIdx() ?? this.activeIdx();
    const makeSeries = (
      name: string, nameAr: string, data: number[], color: string
    ) => ({
      value: data,
      name: ar ? nameAr : name,
      itemStyle: { color },
      areaStyle: { color: color + '22', opacity: 1 },
      lineStyle: { width: active !== null ? 1.5 : 2.5, color },
      symbol: 'circle', symbolSize: 6,
    });

    return {
      backgroundColor: 'transparent',
      animation: true, animationDuration: 1400, animationEasing: 'elasticOut',
      tooltip: { trigger: 'item' },
      legend: {
        data: ar
          ? ['قيمة الأعمال', 'الجهات الرقابية', 'السوق السعودي']
          : ['Business Value', 'Regulatory Proof', 'KSA Market Edge'],
        bottom: 0, itemGap: 18,
        textStyle: { fontSize: 11, color: '#374151' },
      },
      radar: {
        indicator: this.pillars.map((p, i) => ({
          name: ar ? p.labelAr : p.label,
          max: 100,
          color: active === i ? p.color : '#94a3b8',
        })),
        shape: 'circle', splitNumber: 3, radius: '58%', center: ['50%', '44%'],
        axisName: {
          color: '#1e293b', fontSize: 10, fontWeight: 'bold',
          formatter: (v: string) => v.length > 10 ? v.slice(0, 9) + '…' : v,
        },
        splitLine: { lineStyle: { color: 'rgba(30,41,59,0.07)' } },
        splitArea: {
          show: true,
          areaStyle: { color: ['rgba(248,250,252,0.9)', 'rgba(241,245,249,0.7)', 'rgba(226,232,240,0.4)'] },
        },
        axisLine: { lineStyle: { color: 'rgba(30,41,59,0.1)' } },
      },
      series: [{
        type: 'radar',
        emphasis: { lineStyle: { width: 3.5 } },
        data: [
          makeSeries('Business Value',   'قيمة الأعمال',    [92, 88, 95, 85, 96, 90], '#2563eb'),
          makeSeries('Regulatory Proof', 'الجهات الرقابية', [88, 82, 98, 78, 99, 95], '#059669'),
          makeSeries('KSA Market Edge',  'السوق السعودي',   [85, 80, 92, 75, 97, 88], '#d97706'),
        ],
      }],
    } as EChartsOption;
  });

  // ── ECharts: Grouped Bar ─────────────────────────────────────────────────
  barOptions = computed<EChartsOption>(() => {
    const ar = this.i18n.currentLang() === 'ar';
    const cats = this.pillars.map(p => ar ? p.labelAr : p.label);
    const mk = (name: string, nameAr: string, data: number[], color: string) => ({
      name: ar ? nameAr : name, type: 'bar' as const,
      barGap: '5%', barWidth: '20%', data,
      itemStyle: { color, borderRadius: [5, 5, 0, 0] as unknown },
      label: { show: true, position: 'top' as const, formatter: '{c}%', fontSize: 10, fontWeight: 'bold', color },
      emphasis: { itemStyle: { shadowBlur: 14, shadowColor: color + '55' } },
    });
    return {
      backgroundColor: 'transparent',
      animation: true, animationDuration: 900, animationEasing: 'cubicOut',
      animationDelay: (i: number) => i * 50,
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (p: any) =>
          `<div style="font-size: var(--font-size-sm)"><strong>${(p as unknown[])[0].axisValue}</strong><br>` +
          (p as Record<string, unknown>[]).map((s: Record<string, unknown>) =>
            `<span style="display:inline-block;width:9px;height:9px;border-radius:var(--radius-pill);background:${s.color};margin-inline-end:6px"></span>${s.seriesName}: <strong>${s.value}%</strong>`
          ).join('<br>') + '</div>',
      },
      legend: {
        data: ar ? ['قيمة الأعمال', 'الجهات الرقابية', 'السوق السعودي']
                 : ['Business Value', 'Regulatory Proof', 'KSA Market Edge'],
        top: 6, textStyle: { fontSize: 11, color: '#374151' }, itemGap: 20,
      },
      grid: { left: '8px', right: '8px', top: '48px', bottom: '20px', containLabel: true },
      xAxis: {
        type: 'category', data: cats,
        axisLabel: { fontSize: 11, fontWeight: 'bold', color: '#374151', interval: 0 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value', min: 60, max: 100,
        axisLabel: { formatter: '{value}%', fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      },
      series: [
        mk('Business Value',   'قيمة الأعمال',    [92, 88, 95, 85, 96, 90], '#3b82f6'),
        mk('Regulatory Proof', 'الجهات الرقابية', [88, 82, 98, 78, 99, 95], '#10b981'),
        mk('KSA Market Edge',  'السوق السعودي',   [85, 80, 92, 75, 97, 88], '#f59e0b'),
      ],
    } as EChartsOption;
  });

  // ── Data ────────────────────────────────────────────────────────────────
  readonly audiences = [
    { label: 'Business Value',   labelAr: 'قيمة الأعمال',   icon: 'pi pi-briefcase', color: '#2563eb' },
    { label: 'Regulatory Proof', labelAr: 'الجهات الرقابية', icon: 'pi pi-shield',    color: '#059669' },
    { label: 'KSA Market Edge',  labelAr: 'السوق السعودي',   icon: 'pi pi-globe',     color: '#d97706' },
  ];

  readonly pillars: Pillar[] = [
    {
      icon: 'pi-sitemap', color: '#3b82f6', bg: 'rgba(59,130,246,0.09)',
      label: 'Governance', labelAr: 'الحوكمة', metric: '200+ Policies',
      subs: ['Workflows', 'Approvals', 'Board'], subsAr: ['سير العمل', 'الموافقات', 'المجلس'],
      matrix: [
        { en: ['Automated policy lifecycle', 'Board-ready 1-click reports', 'Role-based approval chains'],
          ar: ['دورة حياة آلية للسياسات', 'تقارير مجلس بنقرة واحدة', 'سلاسل موافقة حسب الدور'] },
        { en: ['Full audit-trail on every decision', 'NCA-aligned governance structure', 'Evidence-attached approvals'],
          ar: ['مسار تدقيق كامل لكل قرار', 'هيكل حوكمة متوافق', 'موافقات مع أدلة مرفقة'] },
        { en: ['Arabic-first policy templates', 'KSA Labour Law alignment', 'PDPL governance workflows'],
          ar: ['قوالب سياسات عربية أولاً', 'توافق نظام العمل السعودي', 'سير عمل حوكمة PDPL'] },
      ],
    },
    {
      icon: 'pi-exclamation-triangle', color: '#f59e0b', bg: 'rgba(245,158,11,0.09)',
      label: 'Risk', labelAr: 'المخاطر', metric: '90-Day Plan',
      subs: ['Heatmap', 'Scoring', 'Escalation'], subsAr: ['الخريطة', 'التقييم', 'التصعيد'],
      matrix: [
        { en: ['Live risk heatmap dashboard', 'AI-scored risk register', 'Automated escalation nudges'],
          ar: ['لوحة خريطة مخاطر حية', 'سجل مخاطر بالذكاء الاصطناعي', 'تنبيهات تصعيد تلقائية'] },
        { en: ['Risk appetite documentation', 'Residual risk tracking', 'Inherent vs residual scoring'],
          ar: ['توثيق شهية المخاطر', 'تتبع المخاطر المتبقية', 'تقييم الكامن مقابل المتبقي'] },
        { en: ['SAMA CSF risk categories', 'NCA ECC threat mapping', 'Vision 2030 alignment'],
          ar: ['فئات مخاطر SAMA CSF', 'تعيين تهديدات NCA ECC', 'توافق رؤية 2030'] },
      ],
    },
    {
      icon: 'pi-shield', color: '#10b981', bg: 'rgba(16,185,129,0.09)',
      label: 'Compliance', labelAr: 'الامتثال', metric: '6,000+ Controls',
      subs: ['Framework', 'Audit', 'Gap'], subsAr: ['الأطر', 'التدقيق', 'الفجوات'],
      matrix: [
        { en: ['One-click audit readiness score', 'Cross-framework control mapping', 'Real-time compliance %'],
          ar: ['درجة جاهزية تدقيق بنقرة', 'ربط ضوابط عبر الأطر', 'نسبة امتثال لحظية'] },
        { en: ['60+ frameworks pre-loaded', 'Automated evidence collection', 'Deficiency remediation tracking'],
          ar: ['60+ إطار تنظيمي جاهز', 'جمع أدلة آلي', 'تتبع القصور والمعالجة'] },
        { en: ['NCA ECC v2 native', 'SAMA CSF + PDPL built-in', 'CMA & CITC pre-mapped'],
          ar: ['NCA ECC v2 أصلي', 'SAMA CSF + PDPL مدمج', 'CMA وCITC محددة'] },
      ],
    },
    {
      icon: 'pi-microchip-ai', color: '#8b5cf6', bg: 'rgba(139,92,246,0.09)',
      label: 'AI Engine', labelAr: 'محرك الذكاء', metric: '10 AI Agents',
      subs: ['Auto-Task', 'Inference', 'Nudge'], subsAr: ['مهام آلية', 'استنتاج', 'تنبيه'],
      matrix: [
        { en: ['10 specialized GRC agents', 'Proactive smart reminders', 'LLM-powered policy drafting'],
          ar: ['10 وكيل GRC متخصص', 'تذكيرات استباقية ذكية', 'صياغة سياسات بالذكاء الاصطناعي'] },
        { en: ['Human-in-the-loop controls', 'AI decision audit trail', 'Explainable recommendations'],
          ar: ['ضوابط الإشراف البشري', 'مسار تدقيق قرارات الذكاء', 'توصيات قابلة للشرح'] },
        { en: ['Arabic NLP for GRC tasks', 'KSA-specific training data', 'Bilingual agent responses'],
          ar: ['معالجة لغة عربية لـ GRC', 'بيانات تدريب للسوق السعودي', 'ردود وكيل ثنائية'] },
      ],
    },
    {
      icon: 'pi-building', color: '#ef4444', bg: 'rgba(239,68,68,0.09)',
      label: 'Regulators', labelAr: 'الجهات الرقابية', metric: '136+ Bodies',
      subs: ['NCA', 'SAMA', 'PDPL'], subsAr: ['هيئة', 'مؤسسة النقد', 'حماية البيانات'],
      matrix: [
        { en: ['Pre-mapped regulator requirements', 'Auto-generated regulatory reports', 'Regulator submission packages'],
          ar: ['متطلبات رقابية محددة مسبقاً', 'تقارير رقابية تلقائية', 'حزم تقديم للجهات الرقابية'] },
        { en: ['136 regulators across 14 sectors', 'Evidence-package per regulator', 'Submission-ready format'],
          ar: ['136 جهة رقابية / 14 قطاع', 'حزمة أدلة لكل جهة رقابية', 'تنسيق جاهز للتقديم'] },
        { en: ['All 9 KSA regulators native', 'Arabic regulatory language', 'NCSA / VAT / Zakat aligned'],
          ar: ['9 جهات رقابية سعودية أصلية', 'اللغة التنظيمية العربية', 'متوافق مع ضريبة القيمة المضافة'] },
      ],
    },
    {
      icon: 'pi-chart-bar', color: '#06b6d4', bg: 'rgba(6,182,212,0.09)',
      label: 'Reports', labelAr: 'التقارير', metric: '3 Formats',
      subs: ['PDF', 'Excel', 'HTML'], subsAr: ['PDF', 'إكسل', 'HTML'],
      matrix: [
        { en: ['One-click board reports', 'Scheduled report delivery', 'Custom report builder'],
          ar: ['تقارير مجلس بنقرة واحدة', 'تسليم تقارير مجدول', 'منشئ تقارير مخصص'] },
        { en: ['Regulator-formatted evidence packs', 'Signed PDF with audit trail', 'ISO/NCA compliant format'],
          ar: ['حزم أدلة بتنسيق رقابي', 'PDF موقع مع مسار التدقيق', 'تنسيق متوافق ISO/NCA'] },
        { en: ['Arabic + English dual reports', 'Hijri / Gregorian calendar', 'RTL-native document layout'],
          ar: ['تقارير عربية وإنجليزية', 'التقويم الهجري / الميلادي', 'تخطيط RTL أصلي'] },
      ],
    },
  ];

}
