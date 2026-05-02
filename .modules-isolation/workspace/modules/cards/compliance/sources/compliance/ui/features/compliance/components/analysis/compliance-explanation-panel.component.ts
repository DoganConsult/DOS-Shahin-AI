/**
 * Compliance Explanation Panel Component
 *
 * Expandable panel showing why a specific control is compliant or non-compliant.
 * Displays dimension breakdown (evidence coverage, test results, freshness,
 * exception impact), cited evidence, identified gaps, and recommendations.
 * Supports bilingual display (English / Arabic).
 */
import { Component, Input, OnInit, OnChanges, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

/** Shape returned by GET /api/compliance-assertions/:controlId/explain */
interface ExplanationData {
  controlId: string;
  controlRef: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'any';
  statusLabelEn: string;
  statusLabelAr: string;
  confidence: number;
  dimensions: {
    evidenceCoverage: number;
    testResults: number;
    freshness: number;
    exceptionImpact: number;
  };
  evidenceCited: EvidenceItem[];
  gaps: GapItem[];
  recommendations: RecommendationItem[];
}

interface EvidenceItem {
  evidenceId: string;
  title: string;
  titleAr?: string;
  type: string;
  relevanceScore: number;
}

interface GapItem {
  gapId: string;
  descriptionEn: string;
  descriptionAr?: string;
  severity: string;
}

interface RecommendationItem {
  id: string;
  textEn: string;
  textAr?: string;
  priority: string;
}

@Component({
  selector: 'app-compliance-explanation-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="explanation-panel" [class.expanded]="expanded()">
      <!-- Panel header (clickable to toggle) -->
      <div class="panel-header" (click)="toggle()">
        <div class="panel-header-left">
          <span class="expand-icon">{{ expanded() ? '[-]' : '[+]' }}</span>
          <span class="panel-title">
            Compliance Explanation / shرح الامتثال
          </span>
        </div>
        @if (data()) {
          <div class="panel-header-right">
            <span class="status-badge" [class]="'status-' + data()!.status">
              {{ currentLang() === 'ar' ? data()!.statusLabelAr : data()!.statusLabelEn }}
            </span>
            <span class="confidence-chip">{{ data()!.confidence }}%</span>
          </div>
        }
      </div>

      <!-- Expanded content -->
      @if (expanded()) {
        <div class="panel-body">
          @if (loading()) {
            <div class="loading-text">Loading explanation... / جاري التحميل...</div>
          }

          @if (!loading() && error()) {
            <div class="error-text">{{ error() }}</div>
          }

          @if (!loading() && data()) {
            <!-- Language toggle -->
            <div class="lang-toggle">
              <button class="lang-btn" [class.active]="currentLang() === 'en'"
                      (click)="setLang('en')">English</button>
              <button class="lang-btn" [class.active]="currentLang() === 'ar'"
                      (click)="setLang('ar')">العربية</button>
            </div>

            <!-- Confidence percentage -->
            <div class="confidence-section">
              <h4>{{ currentLang() === 'ar' ? 'نسبة الثقة' : 'Confidence' }}</h4>
              <div class="confidence-bar-outer">
                <div class="confidence-bar-inner" [style.width.%]="data()!.confidence"
                     [class]="confidenceClass(data()!.confidence)"></div>
              </div>
              <span class="confidence-value">{{ data()!.confidence }}%</span>
            </div>

            <!-- Dimension breakdown -->
            <div class="dimensions-section">
              <h4>{{ currentLang() === 'ar' ? 'تفاصيل الأبعاد' : 'Dimension Breakdown' }}</h4>
              <div class="dimension-row">
                <span class="dim-label">
                  {{ currentLang() === 'ar' ? 'تغطية الأدلة' : 'Evidence Coverage' }}
                </span>
                <div class="dim-bar-outer">
                  <div class="dim-bar-inner" [style.width.%]="data()!.dimensions.evidenceCoverage"
                       [class]="confidenceClass(data()!.dimensions.evidenceCoverage)"></div>
                </div>
                <span class="dim-score">{{ data()!.dimensions.evidenceCoverage }}%</span>
              </div>
              <div class="dimension-row">
                <span class="dim-label">
                  {{ currentLang() === 'ar' ? 'نتائج الاختبارات' : 'Test Results' }}
                </span>
                <div class="dim-bar-outer">
                  <div class="dim-bar-inner" [style.width.%]="data()!.dimensions.testResults"
                       [class]="confidenceClass(data()!.dimensions.testResults)"></div>
                </div>
                <span class="dim-score">{{ data()!.dimensions.testResults }}%</span>
              </div>
              <div class="dimension-row">
                <span class="dim-label">
                  {{ currentLang() === 'ar' ? 'حداثة البيانات' : 'Freshness' }}
                </span>
                <div class="dim-bar-outer">
                  <div class="dim-bar-inner" [style.width.%]="data()!.dimensions.freshness"
                       [class]="confidenceClass(data()!.dimensions.freshness)"></div>
                </div>
                <span class="dim-score">{{ data()!.dimensions.freshness }}%</span>
              </div>
              <div class="dimension-row">
                <span class="dim-label">
                  {{ currentLang() === 'ar' ? 'تأثير الاستثناءات' : 'Exception Impact' }}
                </span>
                <div class="dim-bar-outer">
                  <div class="dim-bar-inner" [style.width.%]="data()!.dimensions.exceptionImpact"
                       [class]="confidenceClass(data()!.dimensions.exceptionImpact)"></div>
                </div>
                <span class="dim-score">{{ data()!.dimensions.exceptionImpact }}%</span>
              </div>
            </div>

            <!-- Evidence cited -->
            @if (data()!.evidenceCited.length > 0) {
              <div class="list-section">
                <h4>{{ currentLang() === 'ar' ? 'الأدلة المستشهد بها' : 'Evidence Cited' }}</h4>
                <ul class="item-list">
                  @for (ev of data()!.evidenceCited; track ev.evidenceId) {
                    <li class="evidence-item">
                      <span class="ev-title">{{ currentLang() === 'ar' && ev.titleAr ? ev.titleAr : ev.title }}</span>
                      <span class="ev-type">{{ ev.type }}</span>
                      <span class="ev-relevance">{{ ev.relevanceScore }}%</span>
                    </li>
                  }
                </ul>
              </div>
            }

            <!-- Gaps found -->
            @if (data()!.gaps.length > 0) {
              <div class="list-section">
                <h4>{{ currentLang() === 'ar' ? 'الثغرات المكتشفة' : 'Gaps Found' }}</h4>
                <ul class="item-list">
                  @for (gap of data()!.gaps; track gap.gapId) {
                    <li class="gap-item">
                      <span class="gap-severity" [class]="'severity-' + gap.severity">{{ gap.severity }}</span>
                      <span>{{ currentLang() === 'ar' && gap.descriptionAr ? gap.descriptionAr : gap.descriptionEn }}</span>
                    </li>
                  }
                </ul>
              </div>
            }

            <!-- Recommendations -->
            @if (data()!.recommendations.length > 0) {
              <div class="list-section">
                <h4>{{ currentLang() === 'ar' ? 'التوصيات' : 'Recommendations' }}</h4>
                <ul class="item-list">
                  @for (rec of data()!.recommendations; track rec.id) {
                    <li class="rec-item">
                      <span class="rec-priority" [class]="'priority-' + rec.priority">{{ rec.priority }}</span>
                      <span>{{ currentLang() === 'ar' && rec.textAr ? rec.textAr : rec.textEn }}</span>
                    </li>
                  }
                </ul>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .explanation-panel { background: var(--surface-card, #1e1e2e); border: 1px solid var(--surface-border, #313244); border-radius: var(--radius); overflow: hidden; margin-bottom: 12px; }
    .explanation-panel.expanded { border-color: var(--primary-color, #89b4fa); }

    .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; user-select: none; }
    .panel-header:hover { background: rgba(var(--color-blue-300-rgb), 0.05); }
    .panel-header-left { display: flex; gap: 8px; align-items: center; }
    .panel-header-right { display: flex; gap: 8px; align-items: center; }
    .expand-icon { font-family: monospace; font-size: var(--font-size-base); color: var(--primary-color, #89b4fa); }
    .panel-title { font-size: var(--font-size-base); font-weight: 600; }

    .status-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; }
    .status-compliant { background: rgba(var(--color-green-300-rgb), 0.2); color: #a6e3a1; }
    .status-partial { background: rgba(var(--color-catppuccin-peach-light-rgb), 0.2); color: #f9e2af; }
    .status-non_compliant { background: rgba(var(--color-pink-300-rgb), 0.2); color: #f38ba8; }
    .status-any { background: rgba(var(--color-gray-500-rgb), 0.2); color: #6c7086; }
    .confidence-chip { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color, #cdd6f4); }

    .panel-body { padding: 0 16px 16px 16px; }
    .loading-text, .error-text { padding: 12px 0; font-size: var(--font-size-sm); color: var(--text-color-secondary, #a6adc8); }
    .error-text { color: #f38ba8; }

    /* Language toggle */
    .lang-toggle { display: flex; gap: 4px; margin-bottom: 16px; }
    .lang-btn { padding: 4px 12px; border: 1px solid var(--surface-border, #45475a); border-radius: var(--radius-xs); background: transparent; color: var(--text-color-secondary, #a6adc8); cursor: pointer; font-size: var(--font-size-sm); }
    .lang-btn.active { background: var(--primary-color, #89b4fa); color: var(--primary-color-text, #1e1e2e); border-color: var(--primary-color, #89b4fa); }

    /* Confidence section */
    .confidence-section { margin-bottom: 16px; }
    .confidence-section h4 { margin: 0 0 8px 0; font-size: var(--font-size-sm); color: var(--text-color-secondary, #a6adc8); }
    .confidence-bar-outer { height: 8px; background: var(--surface-ground, #11111b); border-radius: var(--radius-xs); overflow: hidden; display: inline-block; width: 200px; vertical-align: middle; }
    .confidence-bar-inner { height: 100%; border-radius: var(--radius-xs); transition: width 0.3s ease; }
    .confidence-bar-inner.bar-high { background: #a6e3a1; }
    .confidence-bar-inner.bar-medium { background: #f9e2af; }
    .confidence-bar-inner.bar-low { background: #f38ba8; }
    .confidence-value { font-size: var(--font-size-base); font-weight: 700; margin-left: 8px; }

    /* Dimensions */
    .dimensions-section { margin-bottom: 16px; }
    .dimensions-section h4 { margin: 0 0 10px 0; font-size: var(--font-size-sm); color: var(--text-color-secondary, #a6adc8); }
    .dimension-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .dim-label { font-size: var(--font-size-sm); width: 140px; flex-shrink: 0; }
    .dim-bar-outer { height: 6px; flex: 1; max-width: 200px; background: var(--surface-ground, #11111b); border-radius: 3px; overflow: hidden; }
    .dim-bar-inner { height: 100%; border-radius: 3px; }
    .dim-bar-inner.bar-high { background: #a6e3a1; }
    .dim-bar-inner.bar-medium { background: #f9e2af; }
    .dim-bar-inner.bar-low { background: #f38ba8; }
    .dim-score { font-size: var(--font-size-xs); color: var(--text-color-secondary, #a6adc8); width: 36px; text-align: right; }

    /* Lists */
    .list-section { margin-bottom: 14px; }
    .list-section h4 { margin: 0 0 8px 0; font-size: var(--font-size-sm); color: var(--text-color-secondary, #a6adc8); }
    .item-list { list-style: none; padding: 0; margin: 0; }
    .item-list li { padding: 6px 8px; border-bottom: 1px solid var(--surface-border, #313244); font-size: var(--font-size-sm); display: flex; gap: 8px; align-items: center; }
    .ev-type { font-size: var(--font-size-nano); padding: 1px 6px; background: rgba(var(--color-blue-300-rgb), 0.15); color: #89b4fa; border-radius: 3px; }
    .ev-relevance { font-size: var(--font-size-nano); color: var(--text-color-secondary, #6c7086); }
    .gap-severity, .rec-priority { font-size: var(--font-size-nano); padding: 1px 6px; border-radius: 3px; font-weight: 600; text-transform: uppercase; flex-shrink: 0; }
    .severity-critical, .priority-critical { background: rgba(var(--color-pink-300-rgb), 0.2); color: #f38ba8; }
    .severity-high, .priority-high { background: rgba(var(--color-peach-rgb), 0.2); color: #fab387; }
    .severity-medium, .priority-medium { background: rgba(var(--color-catppuccin-peach-light-rgb), 0.2); color: #f9e2af; }
    .severity-low, .priority-low { background: rgba(var(--color-green-300-rgb), 0.2); color: #a6e3a1; }
  `],
})
export class ComplianceExplanationPanelComponent implements OnInit, OnChanges {
  private http = inject(HttpClient);

  /** Control ID to explain */
  @Input() controlId = '';

  data = signal<ExplanationData | null>(null);
  loading = signal(false);
  error = signal('');
  expanded = signal(false);
  currentLang = signal<'en' | 'ar'>('en');

  ngOnInit(): void {
    if (this.controlId) this.loadExplanation();
  }

  ngOnChanges(): void {
    if (this.controlId) {
      this.data.set(null);
      this.loadExplanation();
    }
  }

  /** Toggle panel open/closed */
  toggle(): void {
    this.expanded.update(v => !v);
    if (this.expanded() && !this.data() && !this.loading()) {
      this.loadExplanation();
    }
  }

  /** Switch display language and re-fetch */
  setLang(lang: 'en' | 'ar'): void {
    this.currentLang.set(lang);
    this.loadExplanation();
  }

  /** Fetch explanation from API */
  loadExplanation(): void {
    if (!this.controlId) return;
    this.loading.set(true);
    this.error.set('');
    const lang = this.currentLang();
    this.http.get<ExplanationData>(
      `/api/compliance-assertions/${this.controlId}/explain`,
      { params: { lang } }
    ).subscribe({
      next: (res) => { this.data.set(res); this.loading.set(false); },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to load explanation');
        this.loading.set(false);
      },
    });
  }

  /** CSS class for score bars */
  confidenceClass(value: number): string {
    if (value >= 70) return 'bar-high';
    if (value >= 40) return 'bar-medium';
    return 'bar-low';
  }
}
