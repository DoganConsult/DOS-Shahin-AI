import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { BilingualPipe } from '../shared/bilingual.pipe';
import { OnboardingApiService, ReadinessModule, ReadinessSummary } from '../../services/onboarding-api.service';

@Component({
    selector: 'app-readiness-check',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonModule, BilingualPipe],
    template: `
    <div class="readiness-check" [class.rtl]="lang === 'ar'">
      <div class="readiness-hero">
        <div class="hero-ring" [class.all-green]="allReady()">
          <span class="hero-pct">{{ readyPct() }}%</span>
        </div>
        <h2>{{ { en: 'Readiness Check', ar: 'فحص الجاهزية' } | bilingual:lang }}</h2>
        <p class="hero-desc">
          {{ allReady()
            ? ({ en: 'Your workspace is fully configured and ready to launch.', ar: 'بيئة عملك مهيأة بالكامل وجاهزة للانطلاق.' } | bilingual:lang)
            : ({ en: 'Review your workspace readiness before launching.', ar: 'راجع جاهزية بيئة عملك قبل الانطلاق.' } | bilingual:lang) }}
        </p>
      </div>

      <div class="summary-strip" *ngIf="summary()">
        <div class="summary-card ok"><span class="sc-num">{{ summary()!.ready }}</span><span class="sc-label">{{ { en: 'Ready', ar: 'جاهز' } | bilingual:lang }}</span></div>
        <div class="summary-card warn"><span class="sc-num">{{ summary()!.needsSetup }}</span><span class="sc-label">{{ { en: 'Needs Setup', ar: 'يحتاج إعداد' } | bilingual:lang }}</span></div>
        <div class="summary-card progress"><span class="sc-num">{{ summary()!.inProgress }}</span><span class="sc-label">{{ { en: 'In Progress', ar: 'قيد التقدم' } | bilingual:lang }}</span></div>
        <div class="summary-card alert"><span class="sc-num">{{ summary()!.attentionRequired }}</span><span class="sc-label">{{ { en: 'Attention', ar: 'انتباه' } | bilingual:lang }}</span></div>
      </div>

      <div class="module-readiness-list">
        <div *ngFor="let m of modules()" class="readiness-row" [class]="'state-' + m.state">
          <div class="row-icon">
            <i class="pi" [ngClass]="stateIcon(m.state)"></i>
          </div>
          <span class="row-name">{{ m.moduleCode }}</span>
          <div class="row-bar">
            <div class="bar-fill" [style.width.%]="(m.score / m.maxScore) * 100"></div>
          </div>
          <span class="row-score">{{ m.score }}/{{ m.maxScore }}</span>
          <span class="row-state">{{ stateLabel(m.state) }}</span>
        </div>
      </div>

      <div *ngIf="loadError()" class="readiness-error">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ { en: 'Could not load readiness data.', ar: 'تعذّر تحميل بيانات الجاهزية.' } | bilingual:lang }}</span>
      </div>

      <div class="readiness-actions">
        <button pButton
          [label]="({ en: 'Refresh', ar: 'تحديث' } | bilingual:lang)"
          icon="pi pi-refresh" severity="secondary" class="p-button-sm"
          [loading]="loading()"
          (click)="loadReadiness()">
        </button>
        <button pButton *ngIf="allReady()"
          [label]="({ en: 'Launch Workspace', ar: 'انطلق' } | bilingual:lang)"
          icon="pi pi-play" class="p-button-lg p-button-success"
          (click)="launch.emit()">
        </button>
      </div>
    </div>
  `,
    styles: [`
    .readiness-check { max-width: 720px; display: flex; flex-direction: column; gap: 1.5rem; }
    .readiness-hero { text-align: center; }
    .hero-ring {
      width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 1rem;
      border: 4px solid var(--border-subtle); display: flex; align-items: center; justify-content: center;
      transition: border-color 0.5s;
    }
    .hero-ring.all-green { border-color: #059669; }
    .hero-pct { font-size: var(--font-size-2xl); font-weight: 800; color: var(--text-primary); }
    .readiness-hero h2 { font-size: 1.4rem; font-weight: 700; margin: 0 0 0.3rem; }
    .hero-desc { font-size: 0.88rem; color: var(--text-secondary); }
    .summary-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
    .summary-card { text-align: center; padding: 0.75rem; border-radius: var(--radius); }
    .summary-card.ok { background: #e8f5e9; }
    .summary-card.warn { background: #fff3e0; }
    .summary-card.progress { background: #e3f2fd; }
    .summary-card.alert { background: #fce4ec; }
    .sc-num { display: block; font-size: var(--font-size-2xl); font-weight: 800; }
    .sc-label { font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.03em; }
    .module-readiness-list { display: flex; flex-direction: column; gap: 0.4rem; }
    .readiness-row {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm); background: var(--surface-50, #f9fafb);
    }
    .row-icon i { font-size: var(--font-size-body-sm); }
    .state-ready .row-icon i { color: #059669; }
    .state-needs_setup .row-icon i { color: #ef6c00; }
    .state-in_progress .row-icon i { color: #1976d2; }
    .state-attention_required .row-icon i { color: #c62828; }
    .row-name { font-size: 0.82rem; font-weight: 600; min-width: 100px; }
    .row-bar { flex: 1; height: 6px; background: var(--border-subtle, #e5e7eb); border-radius: 3px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--primary); border-radius: 3px; transition: width 0.4s ease; }
    .row-score { font-size: var(--font-size-sm); color: var(--text-muted); min-width: 40px; text-align: right; }
    .row-state { font-size: var(--font-size-2xs); text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em; min-width: 80px; text-align: right; }
    .readiness-error { display: flex; align-items: center; gap: 0.5rem; color: #c62828; font-size: 0.88rem; }
    .readiness-actions { display: flex; justify-content: center; gap: 1rem; }
    .rtl .readiness-check { text-align: right; }
    .rtl .row-score, .rtl .row-state { text-align: left; }
    @media (max-width: 600px) { .summary-strip { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class ReadinessCheckComponent implements OnInit, OnChanges {
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() sessionId: string | null = null;
  @Output() launch = new EventEmitter<void>();

  private readonly api = inject(OnboardingApiService);

  readonly modules = signal<ReadinessModule[]>([]);
  readonly summary = signal<ReadinessSummary | null>(null);
  readonly readyPct = signal(0);
  readonly allReady = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal(false);

  ngOnInit(): void { this.loadReadiness(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sessionId'] && !changes['sessionId'].firstChange) {
      this.loadReadiness();
    }
  }

  loadReadiness(): void {
    if (!this.sessionId) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);

    this.api.getSessionReadiness(this.sessionId).subscribe({
      next: (data) => {
        this.modules.set(data.modules ?? []);
        this.summary.set(data.summary ?? null);
        const total = data.summary?.total ?? 0;
        const ready = data.summary?.ready ?? 0;
        const pct = total > 0 ? Math.round((ready / total) * 100) : 0;
        this.readyPct.set(pct);
        this.allReady.set(total > 0 && ready === total);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  stateIcon(state: string): string {
    const map: Record<string, string> = {
      ready: 'pi-check-circle',
      needs_setup: 'pi-exclamation-circle',
      in_progress: 'pi-spin pi-spinner',
      attention_required: 'pi-times-circle',
    };
    return map[state] ?? 'pi-circle';
  }

  stateLabel(state: string): string {
    const map: Record<string, string> = {
      ready: 'Ready',
      needs_setup: 'Setup',
      in_progress: 'Progress',
      attention_required: 'Alert',
    };
    return map[state] ?? state;
  }
}
