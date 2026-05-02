/**
 * Report Hub Component — Centralized report management with AI analytics.
 *
 * Executive Summary Cards, Anomaly Alerts, Filterable catalog table,
 * Report detail with AI Summary, Share dialog, and WebSocket subscriptions.
 *
 * Requirements: 1.2, 2.3, 3.1, 4.1, 5.5, 10.3, 11.4, 12.5, 13.4
 */

import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ToastService } from '@app/dos/shell/toast.service';
import { SessionService } from '@app/dauth/session/session.service';
import { WebSocketService } from '@app/websocket';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { InputTextarea } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { Subscription, filter } from 'rxjs';
import { FrameworkReportCardComponent, type FrameworkCardModel } from './components/framework-report-card/framework-report-card.component';
import { devError } from '../../core/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcFormFieldComponent } from '@app/widgets';
import { ApiClientService } from "@app/core/services/api-client.service";

// ── Types ──

interface TrendResult {
  kpiName: string;
  direction: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  slope: number;
  dataPoints: number;
}

interface AnomalyAlert {
  kpiName: string;
  currentValue: number;
  expectedMean: number;
  standardDeviation: number;
  deviationMagnitude: number;
  detectedAt: string;
}

interface ReportEntry {
  reportId: string;
  title: string;
  module: string;
  generatedAt: string;
  freshness: string;
}

interface ExecutiveSummary {
  overallComplianceScore: number;
  openRisksCount: number;
  evidenceCoveragePercent: number;
  remediationClosureRate: number;
}

const PAGE_SIZE = 8;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-report-hub',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PageShellComponent,
    GrcFormFieldComponent,
    ButtonModule,
    CardModule,
    InputTextModule,
    DialogModule,
    InputTextarea,
    CheckboxModule,
    FrameworkReportCardComponent,
  ],
  templateUrl: './report-hub.component.html',
  styleUrls: [],
})
export class ReportHubComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  auth = inject(SessionService);
  private wsService = inject(WebSocketService);
  private toast = inject(ToastService);
  private subs: Subscription[] = [];

  summary = signal<ExecutiveSummary | null>(null);
  trends = signal<TrendResult[]>([]);
  anomalies = signal<AnomalyAlert[]>([]);
  reports = signal<ReportEntry[]>([]);
  selectedReport = signal<ReportEntry | null>(null);
  aiSummary = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);

  // Framework cards (Report Hub grid)
  frameworkCards = signal<FrameworkCardModel[]>([]);
  categoryFilter = signal<string>('');
  searchFilter = signal<string>('');
  currentPage = signal(1);
  readonly pageSize = PAGE_SIZE;

  categories = computed(() => {
    const cards = this.frameworkCards();
    const set = new Set(cards.map(c => c.category || 'compliance'));
    return Array.from(set).sort();
  });

  filteredCards = computed(() => {
    const cards = this.frameworkCards();
    const cat = this.categoryFilter();
    const search = (this.searchFilter() || '').trim().toLowerCase();
    let list = cards;
    if (cat) list = list.filter(c => (c.category || 'compliance') === cat);
    if (search) list = list.filter(c => (c.frameworkName || '').toLowerCase().includes(search));
    return list;
  });

  totalPages = computed(() => {
    const len = this.filteredCards().length;
    return len <= 0 ? 1 : Math.ceil(len / this.pageSize);
  });

  paginatedCards = computed(() => {
    const list = this.filteredCards();
    const page = this.currentPage();
    const start = (page - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  filterModule = '';
  filterSearch = '';
  filterSharedWithMe = false;

  showEmailDialog = signal(false);
  emailTo = '';
  emailSubject = '';
  emailMessage = '';
  emailAttachPdf = false;
  emailSending = signal(false);
  emailError = signal<string | null>(null);

  ngOnInit() {
    this.loadSummary();
    this.loadTrends();
    this.loadAnomalies();
    this.loadCatalog();
    this.loadFrameworkCards();
    this.subscribeToWebSocket();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadFrameworkCards() {
    this.subs.push(
      this.apiclientSvc.get('/report-hub/framework-cards').subscribe({
        next: (cards: Record<string, unknown>) => {
          this.frameworkCards.set(Array.isArray(cards) ? (cards as FrameworkCardModel[]) : []);
          this.error.set(null);
        },
        error: () => {
          this.frameworkCards.set([]);
          this.error.set(this.i18n.translate('reportHub.loadError') || 'Failed to load framework cards');
        },
      }),
    );
  }

  setCategory(value: string) {
    this.categoryFilter.set(value);
    this.currentPage.set(1);
  }

  setSearch(value: string) {
    this.searchFilter.set(value);
    this.currentPage.set(1);
  }

  goToPage(page: number) {
    const total = this.totalPages();
    if (page >= 1 && page <= total) this.currentPage.set(page);
  }

  private subscribeToWebSocket() {
    // Listen for report_generated events — refresh catalog
    this.subs.push(
      this.wsService.dataUpdates$.pipe(
        filter(e => e.data?.event === 'report_generated'),
        takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadCatalog()),
    );
    // Listen for anomaly_alert events — refresh anomalies and summary
    this.subs.push(
      this.wsService.dataUpdates$.pipe(
        filter(e => e.data?.event === 'anomaly_alert'),
        takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.loadAnomalies();
        this.loadSummary();
      }),
    );
    // Listen for kpi_update events — refresh summary and trends
    this.subs.push(
      this.wsService.dataUpdates$.pipe(
        filter(e => e.data?.event === 'kpi_update'),
        takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.loadSummary();
        this.loadTrends();
      }),
    );
  }

  retry() {
    this.error.set(null);
    this.loadSummary();
    this.loadTrends();
    this.loadAnomalies();
    this.loadCatalog();
    this.loadFrameworkCards();
  }

  private loadSummary() {
    this.subs.push(
      this.apiclientSvc.get('/report-hub/summary').subscribe({
        next: s => { this.summary.set(s); this.error.set(null); },
        error: () => this.error.set(this.i18n.translate('reportHub.loadError') || 'Failed to load summary'),
      }),
    );
  }

  private loadTrends() {
    this.subs.push(
      this.apiclientSvc.get('/report-hub/trends').subscribe({
        next: res => this.trends.set(res.trends ?? []),
        error: (e: unknown) => devError("[API]", e),
      }),
    );
  }

  private loadAnomalies() {
    this.subs.push(
      this.apiclientSvc.get('/report-hub/anomalies').subscribe({
        next: res => this.anomalies.set(res.anomalies ?? []),
        error: (e: unknown) => devError("[API]", e),
      }),
    );
  }

  loadCatalog() {
    this.loading.set(true);
    this.error.set(null);
    const q = new URLSearchParams();
    if (this.filterModule) q.set('module', this.filterModule);
    if (this.filterSearch) q.set('search', this.filterSearch);
    if (this.filterSharedWithMe) q.set('sharedWithMe', 'true');
    const query = q.toString();
    const path = query ? `/report-hub/catalog?${query}` : '/report-hub/catalog';

    this.subs.push(
      this.apiclientSvc.get(path).subscribe({
        next: res => { this.reports.set(res.entries ?? []); this.loading.set(false); },
        error: () => { this.loading.set(false); this.error.set(this.i18n.translate('reportHub.loadError') || 'Failed to load catalog'); },
      }),
    );
  }

  selectReport(report: ReportEntry) {
    this.selectedReport.set(report);
    this.aiSummary.set('');
    const lang = this.i18n.currentLang();
    const path = `/report-hub/${report.reportId}${lang ? `?lang=${encodeURIComponent(lang)}` : ''}`;
    this.subs.push(
      this.apiclientSvc.get(path).subscribe({
        next: detail => {
          if (detail.aiSummary?.summaryText) {
            this.aiSummary.set(detail.aiSummary.summaryText);
          }
        },
      }),
    );
  }

  getTrendClass(kpiName: string): string {
    const trend = this.trends().find(t => t.kpiName === kpiName);
    return trend?.direction ?? 'stable';
  }

  getTrendIcon(kpiName: string): string {
    const trend = this.trends().find(t => t.kpiName === kpiName);
    if (!trend) return '→';
    return trend.direction === 'improving' ? '↑' : trend.direction === 'declining' ? '↓' : '→';
  }

  getTrendLabel(kpiName: string): string {
    const trend = this.trends().find(t => t.kpiName === kpiName);
    if (!trend) return '';
    return this.i18n.translate(`reportHub.trend.${trend.direction}`);
  }

  downloadPDF() {
    const r = this.selectedReport();
    if (!r) return;
    window.open(`${environment.apiUrl}/report-hub/${r.reportId}/pdf`, '_blank');
  }

  downloadExcel() {
    const r = this.selectedReport();
    if (!r) return;
    window.open(`${environment.apiUrl}/report-hub/${r.reportId}/xls`, '_blank');
  }

  showShareDialog = signal(false);
  shareRecipients = '';

  openShareDialog() {
    const r = this.selectedReport();
    if (!r) return;
    this.shareRecipients = '';
    this.showShareDialog.set(true);
  }

  submitShare() {
    const r = this.selectedReport();
    if (!r) return;
    const recipientIds = this.shareRecipients.split(',').map(s => s.trim()).filter(Boolean);
    if (recipientIds.length === 0) return;
    this.showShareDialog.set(false);
    this.subs.push(
      this.apiclientSvc.post(`/report-hub/${r.reportId}/share`, { recipientIds, recipientType: 'user' }).subscribe({
        next: () => this.shareRecipients = '',
        error: (e: unknown) => devError('[API]', e),
      }),
    );
  }

  openEmailDialog() {
    const r = this.selectedReport();
    if (!r) return;
    this.emailTo = '';
    this.emailSubject = this.i18n.translate('reportHub.report') ? `${this.i18n.translate('reportHub.report')}: ${r.title}` : `Report: ${r.title}`;
    this.emailMessage = '';
    this.emailAttachPdf = false;
    this.emailError.set(null);
    this.showEmailDialog.set(true);
  }

  closeEmailDialog() {
    this.showEmailDialog.set(false);
    this.emailError.set(null);
  }

  sendEmailReport() {
    const r = this.selectedReport();
    if (!r) return;
    const toList = (this.emailTo || '')
      .split(/[\s,;]+/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);
    if (toList.length === 0) {
      this.emailError.set(this.i18n.translate('reportHub.enterEmails') || 'Enter at least one email address.');
      return;
    }
    this.emailSending.set(true);
    this.emailError.set(null);
    this.subs.push(
      this.apiclientSvc.post(`/report-hub/${r.reportId}/email`, {
        to: toList,
        subject: this.emailSubject || undefined,
        message: this.emailMessage || undefined,
        attachPdf: this.emailAttachPdf,
      }).subscribe({
        next: () => {
          this.emailSending.set(false);
          this.closeEmailDialog();
          this.toast.success(this.i18n.translate('reportHub.emailSent') || 'Email sent.');
        },
        error: (err) => {
          this.emailSending.set(false);
          this.emailError.set(err?.error?.error || err?.message || this.i18n.translate('reportHub.emailError') || 'Failed to send email.');
        },
      }),
    );
  }
}
