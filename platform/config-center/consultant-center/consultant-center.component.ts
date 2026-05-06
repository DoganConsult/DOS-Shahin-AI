// ============================================
// Shahin GRC — Consultant Command Center Component
// External portal for consultant admins to manage
// multiple client engagements: portfolio overview,
// client deep-dive, benchmarks, findings, timeline.
//
// Route: /consultant-center (no standard auth guard —
// external users authenticate with scoped JWT)
//
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
// ============================================

import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '@app/infrastructure';
import {
  ConsultantCenterService,
  Client,
  PortfolioHealth,
  Finding,
  FindingInput,
  Benchmark,
  TimelineEvent,
} from '@app/core/services/portals/consultant-center.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcFormFieldComponent } from '@app/widgets';

type Tab = 'portfolio' | 'client-detail' | 'benchmarks' | 'findings' | 'timeline';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-consultant-center',
    imports: [CommonModule, AppDatePipe, FormsModule, GrcFormFieldComponent],
    templateUrl: './consultant-center.component.html',
    styleUrls: ['./consultant-center.component.scss']
})
export class ConsultantCenterComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private svc = inject(ConsultantCenterService);
  private router = inject(Router);
  private _storage = inject(StorageService);
  private cdr = inject(ChangeDetectorRef);

  // ── State ─────────────────────────────────────────────────────────────────

  tabs: { id: Tab; label: string }[] = [
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'client-detail', label: 'Client Detail' },
    { id: 'benchmarks', label: 'Benchmarks' },
    { id: 'findings', label: 'Findings' },
    { id: 'timeline', label: 'Timeline' },
  ];
  activeTab: Tab = 'portfolio';

  loading = true;
  error = '';

  clients: Client[] = [];
  selectedClient: Client | null = null;
  portfolioHealth: PortfolioHealth | null = null;

  // Client detail
  clientFindings: Finding[] = [];
  switchingContext = false;

  // Benchmarks
  benchmarks: Benchmark[] = [];

  // Findings
  newFinding: FindingInput = { clientId: '', title: '', description: '', severity: 'medium', frameworkRef: '', recommendation: '' };
  publishingFinding = false;

  // Timeline
  timelineEvents: TimelineEvent[] = [];

  // Report
  downloadingReport = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const consultantId = this.svc.getConsultantId();
    if (!consultantId) {
      this.router.navigate(['/invitations/accept']);
      return;
    }
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';

    this.svc.getClients().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.clients = Array.isArray(r) ? r : (r as any).clients || [];
        this.loading = false; this.cdr.markForCheck();
      },
      error: (e) => this.handleLoadError(e),
    });

    this.svc.getPortfolioHealth().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (h) => { this.portfolioHealth = Array.isArray(h) ? h[0] : h; },
      error: () => { /* non-critical */ },
    });

    this.svc.getBenchmarks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.benchmarks = Array.isArray(r) ? r : (r as any).benchmarks || []; },
      error: () => { this.benchmarks = []; },
    });

    this.svc.getEngagementTimeline(this.selectedClient?.id || '').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.timelineEvents = Array.isArray(r) ? r : (r as any).events || []; },
      error: () => { this.timelineEvents = []; },
    });
  }

  private handleLoadError(err: any): void {
    this.loading = false; this.cdr.markForCheck();
    if (((err as GrcRecord).status) === 401 || ((err as GrcRecord).status) === 403) {
      this.error = 'Session expired. Please sign in again.';
    } else {
      this.error = ((err as GrcRecord).error)?.error || 'Failed to load portal data.';
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  switchTab(tab: Tab): void {
    if ((tab === 'client-detail' || tab === 'findings') && !this.selectedClient) {
      this.activeTab = 'portfolio';
      return;
    }
    this.activeTab = tab;
  }

  selectClient(client: Client): void {
    this.selectedClient = client;
    this.newFinding.clientId = client.tenantId ?? '';
    this.activeTab = 'client-detail';
    this.loadClientFindings(client.tenantId);
  }

  backToPortfolio(): void {
    this.selectedClient = null;
    this.activeTab = 'portfolio';
    this.clientFindings = [];
  }

  // ── Client detail ─────────────────────────────────────────────────────────

  private loadClientFindings(clientId: string): void {
    this.svc.getClientFindings(clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.clientFindings = Array.isArray(r) ? r : (r as any).findings || []; },
      error: () => { this.clientFindings = []; },
    });
  }

  switchToClientContext(): void {
    if (!this.selectedClient) return;
    this.switchingContext = true;
    this.svc.getClientContext(this.selectedClient.tenantId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        // Store the client-scoped JWT and navigate to the internal dashboard
        this._storage.set('scopedJwt', r.scopedJwt);
        this.switchingContext = false;
        // Landing route is owned by dos.tenant_landing_config (UI-OS
        // resolver). No frontend invention: outer landing guard owns the
        // post-context-switch redirect.
      },
      error: () => { this.switchingContext = false; },
    });
  }

  // ── Findings ──────────────────────────────────────────────────────────────

  submitFinding(): void {
    if (!this.selectedClient) return;
    this.publishingFinding = true;
    this.svc.publishFinding(this.selectedClient.tenantId, this.newFinding).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (f) => {
        this.clientFindings = [f, ...this.clientFindings];
        this.newFinding = { clientId: this.selectedClient.tenantId, title: '', description: '', severity: 'medium', frameworkRef: '', recommendation: '' };
        this.publishingFinding = false;
      },
      error: () => { this.publishingFinding = false; },
    });
  }

  // ── Report ────────────────────────────────────────────────────────────────

  downloadReport(): void {
    this.downloadingReport = true;
    this.svc.getPortfolioReport().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'portfolio-report.pdf';
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingReport = false;
      },
      error: () => { this.downloadingReport = false; },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  scoreClass(score: number): string {
    if (score >= 70) return 'stat-value score-green';
    if (score >= 40) return 'stat-value score-yellow';
    return 'stat-value score-red';
  }

  engagementClass(score: number): string {
    if (score >= 70) return 'stat-value score-green';
    if (score >= 40) return 'stat-value score-yellow';
    return 'stat-value score-red';
  }

  barClass(value: number): string {
    if (value >= 70) return 'bar-fill bar-green';
    if (value >= 40) return 'bar-fill bar-yellow';
    return 'bar-fill bar-red';
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  logout(): void {
    this._storage.remove('scopedJwt');
    this._storage.remove('externalUserId');
    this.router.navigate(['/login']);
  }

}
