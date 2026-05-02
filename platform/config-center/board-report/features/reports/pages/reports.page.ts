import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import {  UpperCasePipe } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import {
  ReportsApiService,
  ReportTemplate,
  ExecutiveSummary,
  Anomaly,
  REPORT_TEMPLATES,
} from '../reports-api.service';
import { AppHeaderComponent } from '../../../../shared/layout/app-header.component';
import { AppDatePipe } from '../../../../shared/pipes';

@Component({
    selector: 'app-reports-page',
    imports: [UpperCasePipe, AppHeaderComponent, AppDatePipe],
    templateUrl: './reports.page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up { animation: slide-up .25s ease-out; }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class ReportsPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(ReportsApiService);
  private readonly destroy$ = new Subject<void>();

  /* ─── State ─── */
  lang = signal<'en' | 'ar'>('en');
  category = signal<string>('all');
  search = signal('');
  summary = signal<ExecutiveSummary | null>(null);
  anomalies = signal<Anomaly[]>([]);
  downloading = signal(false);
  downloadingLabel = signal('');

  readonly skeletonItems = [1, 2, 3, 4, 5, 6];

  /* ─── Templates ─── */
  readonly allTemplates = REPORT_TEMPLATES;

  readonly filteredTemplates = computed(() => {
    let list = this.allTemplates;
    const cat = this.category();
    if (cat !== 'all') {
      list = list.filter(t => t.category === cat);
    }
    const q = this.search().toLowerCase().trim();
    if (q) {
      list = list.filter(t =>
        t.titleEn.toLowerCase().includes(q) ||
        t.titleAr.includes(q) ||
        t.descriptionEn.toLowerCase().includes(q) ||
        t.category.includes(q)
      );
    }
    return list;
  });

  /* ─── Sample Reports ─── */
  readonly sampleReports = [
    { key: 'nca-ecc', icon: '🏛️', titleEn: 'NCA-ECC', titleAr: 'NCA-ECC' },
    { key: 'heatmap', icon: '🗺️', titleEn: 'Heatmap', titleAr: 'خريطة حرارية' },
    { key: 'cross-map', icon: '🔗', titleEn: 'Cross Map', titleAr: 'خريطة متقاطعة' },
    { key: 'dpia', icon: '🔒', titleEn: 'DPIA', titleAr: 'تقييم الأثر' },
    { key: 'executive-grc', icon: '📊', titleEn: 'Executive', titleAr: 'تنفيذي' },
  ];

  /* ─── Lifecycle ─── */
  ngOnInit(): void {
    this.loadSummary();
    this.loadAnomalies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ─── Data Loading ─── */
  private loadSummary(): void {
    this.api.getSummary().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.summary.set({
        overallComplianceScore: 0, openRisksCount: 0, pendingRemediationsCount: 0,
        controlsTestedCount: 0, frameworksCovered: 0, evidenceFreshPercent: 0,
      }),
    });
  }

  private loadAnomalies(): void {
    this.api.getAnomalies().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => this.anomalies.set(r.anomalies || []),
      error: () => this.anomalies.set([]),
    });
  }

  /* ─── Actions ─── */
  setLang(l: 'en' | 'ar'): void { this.lang.set(l); }
  setCategory(c: string): void { this.category.set(c); }
  setSearch(q: string): void { this.search.set(q); }

  onExportFormatChange(ev: Event, tpl: ReportTemplate): void {
    const value = (ev.target as HTMLSelectElement).value as 'pdf' | 'html' | 'excel';
    if (value) {
      this.download(tpl, value);
      (ev.target as HTMLSelectElement).value = '';
    }
  }

  download(tpl: ReportTemplate, format: 'pdf' | 'html' | 'excel'): void {
    this.downloading.set(true);
    this.downloadingLabel.set(`${tpl.titleEn} — ${format.toUpperCase()}`);

    this.api.generateReport(tpl.key, format, this.lang()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        this.triggerDownload(blob, `${tpl.key}-report`, format);
        this.downloading.set(false);
      },
      error: () => {
        this.downloading.set(false);
      },
    });
  }

  downloadBoard(format: 'html' | 'pdf'): void {
    this.downloading.set(true);
    this.downloadingLabel.set(`Board Report — ${format.toUpperCase()}`);

    this.api.downloadBoardHtml(this.lang()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        this.triggerDownload(blob, 'board-report', format);
        this.downloading.set(false);
      },
      error: () => {
        this.downloading.set(false);
      },
    });
  }

  openSample(key: string): void {
    this.downloading.set(true);
    this.downloadingLabel.set(`Sample: ${key}`);

    this.api.getSampleReport(key).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        // Open sample in new tab
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.downloading.set(false);
      },
      error: () => {
        this.downloading.set(false);
      },
    });
  }

  /* ─── File Download Helper ─── */
  private triggerDownload(blob: Blob, name: string, format: string): void {
    const ext = format === 'excel' ? 'xlsx' : format;
    const mime = format === 'pdf' ? 'application/pdf'
      : format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/html';

    const file = new Blob([blob], { type: mime });
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  evidenceFreshClass(): string {
    const pct = this.summary()?.evidenceFreshPercent ?? 0;
    return pct >= 75 ? 'text-[var(--success)]' : 'text-[var(--warning)]';
  }

  /* ─── UI Helpers ─── */
  categoryGradient(cat: string): string {
    const map: Record<string, string> = {
      executive: 'from-[#0f62fe] to-[#06b6d4]',
      risk: 'from-[var(--danger)] to-[var(--warning)]',
      compliance: 'from-[var(--success)] to-[#06b6d4]',
      audit: 'from-[var(--warning)] to-[#0f62fe]',
      vendor: 'from-[#0f62fe] to-[var(--danger)]',
      governance: 'from-[#06b6d4] to-[#0f62fe]',
    };
    return map[cat] || 'from-[#0f62fe] to-[#06b6d4]';
  }

  categoryBadge(cat: string): string {
    const map: Record<string, string> = {
      executive: 'bg-[var(--primary)]/15 text-[var(--primary)]',
      risk: 'bg-[var(--danger)]/15 text-[var(--danger)]',
      compliance: 'bg-[var(--success)]/15 text-[var(--success)]',
      audit: 'bg-[var(--warning)]/15 text-[var(--warning)]',
      vendor: 'bg-[#a855f7]/15 text-[#a855f7]',
      governance: 'bg-[var(--info)]/15 text-[var(--info)]',
    };
    return map[cat] || 'bg-[var(--bg-2)] text-[var(--text-1)]';
  }

  formatButtonClass(fmt: string): string {
    const map: Record<string, string> = {
      pdf: 'bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 border border-[var(--danger)]/20',
      html: 'bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 border border-[var(--primary)]/20',
      excel: 'bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 border border-[var(--success)]/20',
    };
    return map[fmt] || '';
  }

  formatIcon(fmt: string): string {
    const map: Record<string, string> = { pdf: '📕', html: '🌐', excel: '📗' };
    return map[fmt] || '📄';
  }

  anomalyBorder(sev: string): string {
    const map: Record<string, string> = {
      critical: 'border-l-[var(--danger)]',
      high: 'border-l-[#f97316]',
      medium: 'border-l-[var(--warning)]',
      low: 'border-l-[#06b6d4]',
    };
    return map[sev] || 'border-l-[var(--border)]';
  }

  anomalyIcon(sev: string): string {
    const map: Record<string, string> = {
      critical: '🔴', high: '🟠', medium: '🟡', low: '🔵',
    };
    return map[sev] || '⚪';
  }

  severityBadge(sev: string): string {
    const map: Record<string, string> = {
      critical: 'bg-[var(--danger)]/15 text-[var(--danger)]',
      high: 'bg-[#f97316]/15 text-[#f97316]',
      medium: 'bg-[var(--warning)]/15 text-[var(--warning)]',
      low: 'bg-[var(--info)]/15 text-[var(--info)]',
    };
    return map[sev] || 'bg-[var(--bg-2)] text-[var(--text-1)]';
  }
}
