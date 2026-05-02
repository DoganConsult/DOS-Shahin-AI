import { Component, inject, signal, afterNextRender, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ToastService } from '@app/dos/shell/toast.service';
import { SectionHeaderComponent } from '@app/shared/widgets/section-header/section-header.component';
import { environment } from '@env/environment';
import { devError } from '../../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

interface Framework { instrument_id: string; name_en: string; name_ar: string; regulator_id: string; acronym: string; control_count: number; regulator_name_en: string; regulator_name_ar: string; }
interface Control { node_id: string; code: string; title_en: string; title_ar: string; description_en: string; description_ar: string; framework_name_en: string; framework_name_ar: string; regulator_acronym: string; priority: string; }
interface Regulator { regulator_id: string; name_en: string; name_ar: string; acronym: string; category: string; website: string; framework_count: number; }

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-explorer-section',
  standalone: true,
  imports: [CommonModule, FormsModule, SectionHeaderComponent],
  template: `
    <section class="explorer-section" id="explorer">
      <div class="explorer-container">
        <app-section-header
          badge="Live Regulatory Explorer"
          badgeAr="مستكشف الأنظمة التفاعلي"
          badgeIcon="pi pi-database"
          title="Browse 4,000+ Controls — No Login Required"
          titleAr="تصفّح أكثر من 4,000 ضابط — بدون تسجيل"
          subtitle="The only GRC platform that lets you explore the entire KSA regulatory database before you sign up. Search controls, filter by regulator, browse frameworks — all bilingual."
          subtitleAr="منصة الحوكمة الوحيدة التي تتيح لك استكشاف قاعدة بيانات الأنظمة السعودية بالكامل قبل التسجيل. ابحث في الضوابط، فلتر حسب الجهة، تصفّح الأطر — بالعربية والإنجليزية."
        />

        <!-- Tab Switcher -->
        <div class="tab-bar">
          <button class="tab-btn" [class.active]="activeTab === 'controls'" (click)="activeTab = 'controls'; searchControls()">
            <i class="pi pi-list"></i>
            {{ isAr ? 'الضوابط' : 'Controls' }}
            <span class="tab-count">{{ totalControls() | number }}</span>
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'frameworks'" (click)="activeTab = 'frameworks'; loadFrameworks()">
            <i class="pi pi-book"></i>
            {{ isAr ? 'الأطر التنظيمية' : 'Frameworks' }}
            <span class="tab-count">{{ frameworks().length }}</span>
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'regulators'" (click)="activeTab = 'regulators'; loadRegulators()">
            <i class="pi pi-building"></i>
            {{ isAr ? 'الجهات الرقابية' : 'Regulators' }}
            <span class="tab-count">{{ regulators().length }}</span>
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'calculator'" (click)="activeTab = 'calculator'">
            <i class="pi pi-calculator"></i>
            {{ isAr ? 'حاسبة الامتثال' : 'Readiness Calculator' }}
          </button>
        </div>

        <!-- CONTROLS TAB -->
        <div class="tab-content" *ngIf="activeTab === 'controls'">
          <div class="search-bar">
            <div class="search-input-wrap">
              <i class="pi pi-search"></i>
              <input type="text" [(ngModel)]="searchTerm"
                     [placeholder]="isAr ? 'ابحث في الضوابط بالعربية أو الإنجليزية...' : 'Search controls in Arabic or English...'" [attr.aria-label]="isAr ? 'ابحث في الضوابط بالعربية أو الإنجليزية...' : 'Search controls in Arabic or English...'"
                     (input)="onSearchDebounce()" />
            </div>
            <select [(ngModel)]="selectedFramework" (change)="searchControls()" class="filter-select">
              <option value="">{{ isAr ? 'جميع الأطر' : 'All Frameworks' }}</option>
              <option *ngFor="let fw of frameworks()" [value]="fw.instrument_id">{{ fw.acronym }} — {{ isAr ? fw.name_ar : fw.name_en }}</option>
            </select>
          </div>

          <div class="results-info">
            {{ isAr ? 'عرض' : 'Showing' }} {{ controls().length }} {{ isAr ? 'من' : 'of' }} {{ totalControls() | number }} {{ isAr ? 'ضابط' : 'controls' }}
            <span *ngIf="searchTerm"> — "{{ searchTerm }}"</span>
          </div>

          <div class="controls-list">
            <div *ngFor="let ctrl of controls()" class="control-card">
              <div class="ctrl-header">
                <span class="ctrl-code">{{ ctrl.code }}</span>
                <span class="ctrl-reg">{{ ctrl.regulator_acronym }}</span>
                <span class="ctrl-priority" *ngIf="ctrl.priority" [class]="'p-' + ctrl.priority">{{ ctrl.priority }}</span>
              </div>
              <div class="ctrl-title">{{ isAr ? ctrl.title_ar : ctrl.title_en }}</div>
              <div class="ctrl-title-alt">{{ isAr ? ctrl.title_en : ctrl.title_ar }}</div>
              <div class="ctrl-fw">{{ isAr ? ctrl.framework_name_ar : ctrl.framework_name_en }}</div>
            </div>
            <div *ngIf="controls().length === 0 && !loading()" class="no-results">
              {{ isAr ? 'لا توجد نتائج' : 'No results found' }}
            </div>
            <div *ngIf="loading()" class="loading-spinner"><i class="pi pi-spin pi-spinner"></i></div>
          </div>

          <div class="pagination" *ngIf="totalControls() > 50">
            <button class="page-btn" [disabled]="controlOffset === 0" (click)="controlOffset = controlOffset - 50; searchControls()">
              <i class="pi pi-chevron-left"></i> {{ isAr ? 'السابق' : 'Previous' }}
            </button>
            <span class="page-info">{{ controlOffset + 1 }}–{{ Math.min(controlOffset + 50, totalControls()) }} / {{ totalControls() | number }}</span>
            <button class="page-btn" [disabled]="controlOffset + 50 >= totalControls()" (click)="controlOffset = controlOffset + 50; searchControls()">
              {{ isAr ? 'التالي' : 'Next' }} <i class="pi pi-chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- FRAMEWORKS TAB -->
        <div class="tab-content" *ngIf="activeTab === 'frameworks'">
          <div class="fw-grid">
            <div tabindex="0" role="button" (keyup.enter)="selectedFramework = fw.instrument_id; activeTab = 'controls'; searchControls()" *ngFor="let fw of frameworks()" class="fw-card" (click)="selectedFramework = fw.instrument_id; activeTab = 'controls'; searchControls()">
              <div class="fw-acronym">{{ fw.acronym }}</div>
              <div class="fw-name">{{ isAr ? fw.name_ar : fw.name_en }}</div>
              <div class="fw-reg">{{ isAr ? fw.regulator_name_ar : fw.regulator_name_en }}</div>
              <div class="fw-count">{{ fw.control_count }} {{ isAr ? 'ضابط' : 'controls' }}</div>
            </div>
          </div>
        </div>

        <!-- REGULATORS TAB -->
        <div class="tab-content" *ngIf="activeTab === 'regulators'">
          <div class="reg-grid">
            <div tabindex="0" role="button" (keyup.enter)="filterByRegulator(reg)" *ngFor="let reg of regulators()" class="reg-card" (click)="filterByRegulator(reg)">
              <div class="reg-acronym">{{ reg.acronym || reg.regulator_id }}</div>
              <div class="reg-name">{{ isAr ? reg.name_ar : reg.name_en }}</div>
              <div class="reg-category" *ngIf="reg.category">{{ reg.category }}</div>
              <div class="reg-fw-count">{{ reg.framework_count }} {{ isAr ? 'إطار' : 'frameworks' }}</div>
            </div>
          </div>
        </div>

        <!-- CALCULATOR TAB -->
        <div class="tab-content" *ngIf="activeTab === 'calculator'">
          <div class="calc-intro">
            <h3>{{ isAr ? 'ما هي الأنظمة التي تنطبق على شركتك؟' : 'What regulations apply to your company?' }}</h3>
            <p>{{ isAr ? 'اختر قطاعك وحجم شركتك واحصل على خارطة طريق فورية مع تقدير الجهد والتكلفة.' : 'Select your sector and company size to get an instant roadmap with effort and cost estimates.' }}</p>
          </div>

          <div class="calc-form">
            <div class="calc-field">
              <label>{{ isAr ? 'القطاع' : 'Sector' }}</label>
              <select [(ngModel)]="calcSector" class="filter-select calc-select">
                <option value="">{{ isAr ? 'اختر القطاع' : 'Select sector' }}</option>
                <option *ngFor="let sec of sectors()" [value]="sec.sector_id">{{ isAr ? sec.name_ar : sec.name_en }}</option>
              </select>
            </div>
            <div class="calc-field">
              <label>{{ isAr ? 'حجم الشركة' : 'Company Size' }}</label>
              <div class="size-btns">
                <button class="size-btn" [class.active]="calcSize === 'startup'" (click)="calcSize = 'startup'">
                  {{ isAr ? 'ناشئة' : 'Startup' }}<br><small>1-50</small>
                </button>
                <button class="size-btn" [class.active]="calcSize === 'sme'" (click)="calcSize = 'sme'">
                  {{ isAr ? 'متوسطة' : 'SME' }}<br><small>50-500</small>
                </button>
                <button class="size-btn" [class.active]="calcSize === 'enterprise'" (click)="calcSize = 'enterprise'">
                  {{ isAr ? 'مؤسسة كبرى' : 'Enterprise' }}<br><small>500+</small>
                </button>
              </div>
            </div>
            <button class="calc-btn" [disabled]="!calcSector || !calcSize" (click)="runCalculator()">
              <i class="pi pi-calculator"></i>
              {{ isAr ? 'احسب خارطة الامتثال' : 'Calculate Compliance Roadmap' }}
            </button>
          </div>

          <!-- Calculator Results -->
          <div class="calc-results" *ngIf="calcResult">
            <div class="calc-kpi-row">
              <div class="calc-kpi"><div class="calc-kpi-num">{{ calcResult.totalRegulators }}</div><div class="calc-kpi-lbl">{{ isAr ? 'جهة رقابية' : 'Regulators' }}</div></div>
              <div class="calc-kpi"><div class="calc-kpi-num">{{ calcResult.totalFrameworks }}</div><div class="calc-kpi-lbl">{{ isAr ? 'إطار تنظيمي' : 'Frameworks' }}</div></div>
              <div class="calc-kpi"><div class="calc-kpi-num">{{ calcResult.totalControls | number }}</div><div class="calc-kpi-lbl">{{ isAr ? 'ضابط مطلوب' : 'Controls Required' }}</div></div>
              <div class="calc-kpi"><div class="calc-kpi-num">~{{ calcResult.estimation.estimatedMonths }}</div><div class="calc-kpi-lbl">{{ isAr ? 'شهر (تقدير)' : 'Months (est.)' }}</div></div>
            </div>

            <h4>{{ isAr ? 'خارطة طريق مقترحة' : 'Suggested Roadmap' }}</h4>
            <div class="roadmap">
              <div *ngFor="let phase of calcResult.roadmap; let i = index" class="roadmap-item">
                <div class="roadmap-num">{{ i + 1 }}</div>
                <div class="roadmap-body">
                  <div class="roadmap-fw">{{ isAr ? phase.frameworkAr : phase.frameworkEn }}</div>
                  <div class="roadmap-meta">
                    {{ phase.controls }} {{ isAr ? 'ضابط' : 'controls' }} &bull;
                    {{ isAr ? 'الشهر' : 'Month' }} {{ phase.startMonth }}–{{ phase.endMonth }} &bull;
                    <span [class]="phase.priority === 'mandatory' ? 'mandatory' : 'recommended'">{{ isAr ? (phase.priority === 'mandatory' ? 'إلزامي' : 'موصى به') : phase.priority }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="calc-savings">
              <div class="savings-badge">
                <i class="pi pi-bolt"></i>
                {{ isAr ? 'مع Shahin-AI: أسرع 3 مرات وتوفير 40-60% من الجهد عبر الربط المتقاطع' : 'With Shahin-AI: 3x faster and 40-60% effort savings via cross-framework mapping' }}
              </div>
              <a href="/register" class="calc-cta">
                {{ isAr ? 'ابدأ مجانًا الآن' : 'Start Free Now' }}
                <i class="pi pi-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .explorer-section { padding: 80px 0; background: linear-gradient(180deg, #ffffff 0%, var(--status-info-bg, #edf5ff) 50%, #ffffff 100%); }
    .explorer-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

    .tab-bar { display: flex; gap: 6px; margin-bottom: 24px; flex-wrap: wrap; justify-content: center; }
    .tab-btn {
      display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: var(--radius-lg);
      border: 1.5px solid var(--border-subtle); background: #fff; color: var(--text-muted); font-size: var(--font-size-base);
      font-weight: 600; cursor: pointer; transition: all 200ms;
    }
    .tab-btn:hover { border-color: var(--primary); color: #0369a1; }
    .tab-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .tab-count { font-size: var(--font-size-xs); background: rgba(var(--color-black-rgb), .1); padding: 2px 8px; border-radius: var(--radius-pill); }
    .tab-btn.active .tab-count { background: rgba(var(--color-white-rgb), .2); }

    .search-bar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .search-input-wrap {
      flex: 1; min-width: 280px; display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: var(--radius-lg); border: 1.5px solid #bae6fd;
      background: #fff; transition: border-color 200ms;
    }
    .search-input-wrap:focus-within { border-color: var(--primary); box-shadow: var(--shadow-glow); }
    .search-input-wrap .pi { color: var(--text-muted); }
    .search-input-wrap input { border: none; outline: none; font-size: var(--font-size-base); color: var(--text-heading); width: 100%; background: transparent; }
    .filter-select {
      padding: 12px 16px; border-radius: var(--radius-lg); border: 1.5px solid #bae6fd;
      background: #fff; color: var(--text-heading); font-size: var(--font-size-sm); font-weight: 600; min-width: 200px; cursor: pointer;
    }
    .results-info { font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 12px; }

    .controls-list { display: flex; flex-direction: column; gap: 8px; max-height: 500px; overflow-y: auto; }
    .control-card {
      padding: 16px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);
      transition: all 200ms; cursor: default;
    }
    .control-card:hover { border-color: var(--primary); box-shadow: 0 2px 12px rgba(var(--module-accent-sky-rgb), .08); }
    .ctrl-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .ctrl-code { font-size: var(--font-size-sm); font-weight: 800; color: #0369a1; background: #e0f2fe; padding: 2px 10px; border-radius: var(--radius-sm); }
    .ctrl-reg { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-muted); background: var(--surface-ice); padding: 2px 8px; border-radius: var(--radius-sm); }
    .ctrl-priority { font-size: var(--font-size-xs); font-weight: 700; padding: 2px 8px; border-radius: var(--radius-sm); text-transform: uppercase; }
    .p-critical { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .p-high { background: #fed7aa; color: #9a3412; }
    .p-medium { background: #fde68a; color: #78350f; }
    .p-low { background: #bbf7d0; color: #14532d; }
    .ctrl-title { font-size: var(--font-size-base); font-weight: 600; color: var(--text-heading); margin-bottom: 2px; }
    .ctrl-title-alt { font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 4px; }
    .ctrl-fw { font-size: var(--font-size-xs); color: var(--text-muted); }
    .no-results { text-align: center; padding: 40px; color: var(--text-muted); font-size: var(--font-size-base); }
    .loading-spinner { text-align: center; padding: 40px; font-size: var(--font-size-2xl); color: var(--primary); }

    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; }
    .page-btn {
      display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius);
      border: 1px solid var(--border-subtle); background: #fff; color: #334155; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer;
    }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
    .page-info { font-size: var(--font-size-sm); color: var(--text-muted); }

    .fw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .fw-card {
      padding: 20px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);
      cursor: pointer; transition: all 200ms;
    }
    .fw-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .fw-acronym { font-size: var(--font-size-sm); font-weight: 800; color: #0369a1; background: #e0f2fe; display: inline-block; padding: 2px 10px; border-radius: var(--radius-sm); margin-bottom: 8px; }
    .fw-name { font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading); margin-bottom: 4px; }
    .fw-reg { font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 6px; }
    .fw-count { font-size: var(--font-size-sm); font-weight: 700; color: var(--primary); }

    .reg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .reg-card { padding: 20px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); text-align: center; cursor: pointer; transition: all 200ms; }
    .reg-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .reg-category { font-size: var(--font-size-xs); color: var(--text-muted); margin-bottom: 4px; }
    .reg-acronym { font-size: var(--font-size-md); font-weight: 800; color: #0369a1; margin-bottom: 8px; }
    .reg-name { font-size: var(--font-size-sm); font-weight: 600; color: #334155; margin-bottom: 4px; }
    .reg-fw-count { font-size: var(--font-size-sm); color: var(--primary); font-weight: 700; }

    /* Calculator */
    .calc-intro { text-align: center; margin-bottom: 28px; }
    .calc-intro h3 { font-size: var(--font-size-2xl); font-weight: 800; color: #0c4a6e; margin-bottom: 8px; }
    .calc-intro p { font-size: var(--font-size-base); color: var(--text-muted); max-width: 600px; margin: 0 auto; }
    .calc-form { max-width: 600px; margin: 0 auto 28px; }
    .calc-field { margin-bottom: 20px; }
    .calc-field label { display: block; font-size: var(--font-size-sm); font-weight: 700; color: #475569; margin-bottom: 8px; }
    .calc-select { width: 100%; }
    .size-btns { display: flex; gap: 8px; }
    .size-btn {
      flex: 1; padding: 14px; border-radius: var(--radius-lg); border: 2px solid var(--border-subtle);
      background: #fff; color: #334155; font-size: var(--font-size-base); font-weight: 700;
      cursor: pointer; text-align: center; transition: all 200ms;
    }
    .size-btn small { font-size: var(--font-size-xs); color: var(--text-muted); font-weight: 500; }
    .size-btn.active { border-color: var(--primary); background: #e0f2fe; color: #0369a1; }
    .calc-btn {
      width: 100%; padding: 14px; border-radius: var(--radius-lg); border: none;
      background: linear-gradient(135deg, var(--primary), #0369a1); color: #fff;
      font-size: var(--font-size-base); font-weight: 700; cursor: pointer; display: flex;
      align-items: center; justify-content: center; gap: 8px; transition: all 250ms;
    }
    .calc-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: var(--shadow-lg); }
    .calc-btn:disabled { opacity: .5; cursor: not-allowed; }

    .calc-results { max-width: 768px; margin: 0 auto; }
    .calc-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .calc-kpi { text-align: center; padding: 16px; background: #fff; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); }
    .calc-kpi-num { font-size: var(--font-size-3xl); font-weight: 800; color: #0369a1; }
    .calc-kpi-lbl { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 4px; }
    .calc-results h4 { font-size: var(--font-size-md); font-weight: 700; color: #0c4a6e; margin-bottom: 14px; }

    .roadmap { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
    .roadmap-item { display: flex; gap: 14px; align-items: start; }
    .roadmap-num {
      width: 32px; height: 32px; border-radius: var(--radius-pill); background: var(--primary); color: #fff;
      display: flex; align-items: center; justify-content: center; font-size: var(--font-size-base); font-weight: 800; flex-shrink: 0;
    }
    .roadmap-body { flex: 1; padding: 10px 16px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
    .roadmap-fw { font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading); }
    .roadmap-meta { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    .mandatory { color: var(--error); font-weight: 700; }
    .recommended { color: #0d9488; font-weight: 600; }

    .calc-savings { text-align: center; }
    .savings-badge {
      display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px;
      background: linear-gradient(135deg, var(--success), #10b981); color: #fff;
      border-radius: var(--radius-pill); font-size: var(--font-size-sm); font-weight: 700; margin-bottom: 16px;
    }
    .calc-cta {
      display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px;
      background: linear-gradient(135deg, var(--primary), #0369a1); color: #fff;
      border-radius: var(--radius-lg); font-size: var(--font-size-base); font-weight: 700; text-decoration: none;
      transition: all 250ms; box-shadow: var(--shadow-md);
    }
    .calc-cta:hover { transform: translateY(-2px); box-shadow: var(--shadow-xl); }

    @media (max-width: 768px) {
      .tab-bar { gap: 4px; }
      .tab-btn { font-size: var(--font-size-sm); padding: 8px 12px; }
      .calc-kpi-row { grid-template-columns: repeat(2, 1fr); }
      .size-btns { flex-direction: column; }
    }
  `],
})
export class ExplorerSectionComponent {
  private http = inject(HttpClient);
  readonly i18n = inject(I18nService);
  private toast = inject(ToastService);
  private api = environment.apiUrl;
  private searchTimer: ReturnType<typeof setTimeout> | null;

  get isAr() { return this.i18n.currentLang() === 'ar'; }
  Math = Math;

  activeTab = 'controls';
  searchTerm = '';
  selectedFramework = '';
  controlOffset = 0;

  regulators = signal<Regulator[]>([]);
  frameworks = signal<Framework[]>([]);
  controls = signal<Control[]>([]);
  sectors = signal<GrcRecord[]>([]);
  totalControls = signal(0);
  loading = signal(false);

  // Calculator
  calcSector = '';
  calcSize = '';
  calcResult: Record<string, unknown> | null = null;

  constructor() {
    afterNextRender(() => {
      this.loadRegulators();
      this.loadFrameworks();
      this.searchControls();
      this.loadSectors();
    });
  }

  loadRegulators() {
    this.http.get<unknown>(`${this.api}/public/explorer/regulators`).subscribe({
      next: d => this.regulators.set(d.regulators || []),
      error: (e: unknown) => devError("[API]", e),
    });
  }

  loadFrameworks(regulatorId?: string) {
    let url = `${this.api}/public/explorer/frameworks`;
    if (regulatorId) url += `?regulator=${regulatorId}`;
    this.http.get<unknown>(url).subscribe({
      next: d => this.frameworks.set(d.frameworks || []),
      error: (e: unknown) => devError("[API]", e),
    });
  }

  onSearchDebounce() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.controlOffset = 0; this.searchControls(); }, 300);
  }

  searchControls() {
    this.loading.set(true);
    let url = `${this.api}/public/explorer/controls?limit=50&offset=${this.controlOffset}`;
    if (this.selectedFramework) url += `&framework=${this.selectedFramework}`;
    if (this.searchTerm) url += `&search=${encodeURIComponent(this.searchTerm)}`;
    this.http.get<unknown>(url).subscribe({
      next: d => { this.controls.set(d.controls || []); this.totalControls.set(d.total || 0); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  loadSectors() {
    this.http.get<unknown>(`${this.api}/public/explorer/sectors`).subscribe({
      next: d => this.sectors.set(d.sectors || []),
      error: (e: unknown) => devError("[API]", e),
    });
  }

  filterByRegulator(reg: Regulator) {
    this.activeTab = 'frameworks';
    this.loadFrameworks(reg.regulator_id);
  }

  runCalculator() {
    if (!this.calcSector || !this.calcSize) return;
    this.http.post<unknown>(`${this.api}/public/explorer/readiness`, {
      sectorIds: [this.calcSector],
      companySize: this.calcSize,
    }).subscribe({
      next: d => this.calcResult = d,
      error: () => this.toast.error('Calculator error. Please try again.'),
    });
  }

}
