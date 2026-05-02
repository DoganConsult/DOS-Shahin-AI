import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { StorageService } from '@app/infrastructure';
import { Store } from '@ngrx/store';
import { RiskActions } from '../../../../core/ngrx/risk/risk.actions';
import { ComplianceActions } from '@compliance-module/ui/state/compliance.actions';
import { IncidentActions } from '../../../../core/ngrx/incident/incident.actions';
import { AuditActions } from '../../../../core/ngrx/audit/audit.actions';
import { PrivacyActions } from '../../../../core/ngrx/privacy/privacy.actions';
import { TrainingActions } from '../../../../core/ngrx/training/training.actions';
import { GrcRecord } from '@app/core/models/shared.types';

interface CockpitSnapshot {
  personaCode: string;
  persona: { label_en: string; label_ar: string; description_en: string; description_ar: string };
  liveMetrics: {
    openTasks: number; overdueTasks: number; pendingApprovals: number;
    openFindings: number; evidenceGaps: number; activeRisks: number; startupProgress: number;
  };
  nextBestActions: {
    rule_code: string; action_type: string; title_en: string; title_ar: string;
    description_en: string; description_ar: string; link_template: string | null;
    priority: number; category: string; count: number;
  }[];
  recommendations: GrcRecord[];
  startupChecklist: GrcRecord[];
}

@Component({
    selector: 'app-operating-cockpit-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    template: `
    <div class="cockpit-container" [class.rtl]="lang() === 'ar'">
      <div class="cockpit-header">
        <h1>{{ lang() === 'ar' ? snapshot()?.persona?.label_ar : snapshot()?.persona?.label_en }}</h1>
        <p class="subtitle">{{ lang() === 'ar' ? snapshot()?.persona?.description_ar : snapshot()?.persona?.description_en }}</p>
      </div>

      <div class="metrics-grid" *ngIf="snapshot()">
        <div class="metric-card">
          <span class="metric-value">{{ snapshot()!.liveMetrics.openTasks }}</span>
          <span class="metric-label">{{ lang() === 'ar' ? 'مهام مفتوحة' : 'Open Tasks' }}</span>
        </div>
        <div class="metric-card warn" *ngIf="snapshot()!.liveMetrics.overdueTasks > 0">
          <span class="metric-value">{{ snapshot()!.liveMetrics.overdueTasks }}</span>
          <span class="metric-label">{{ lang() === 'ar' ? 'مهام متأخرة' : 'Overdue' }}</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">{{ snapshot()!.liveMetrics.pendingApprovals }}</span>
          <span class="metric-label">{{ lang() === 'ar' ? 'موافقات معلقة' : 'Pending Approvals' }}</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">{{ snapshot()!.liveMetrics.openFindings }}</span>
          <span class="metric-label">{{ lang() === 'ar' ? 'نتائج مفتوحة' : 'Open Findings' }}</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">{{ snapshot()!.liveMetrics.evidenceGaps }}</span>
          <span class="metric-label">{{ lang() === 'ar' ? 'فجوات أدلة' : 'Evidence Gaps' }}</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">{{ snapshot()!.liveMetrics.activeRisks }}</span>
          <span class="metric-label">{{ lang() === 'ar' ? 'مخاطر نشطة' : 'Active Risks' }}</span>
        </div>
        <div class="metric-card progress">
          <span class="metric-value">{{ snapshot()!.liveMetrics.startupProgress }}%</span>
          <span class="metric-label">{{ lang() === 'ar' ? 'تقدم البدء' : 'Startup Progress' }}</span>
        </div>
      </div>

      <div class="actions-section" *ngIf="snapshot()?.nextBestActions?.length">
        <h2>{{ lang() === 'ar' ? 'الإجراءات التالية الأفضل' : 'Next Best Actions' }}</h2>
        <div class="action-card" *ngFor="let action of snapshot()!.nextBestActions">
          <div class="action-header">
            <span class="action-title">{{ lang() === 'ar' ? action.title_ar : action.title_en }}</span>
            <span class="action-count">{{ action.count }}</span>
          </div>
          <p class="action-desc">{{ lang() === 'ar' ? action.description_ar : action.description_en }}</p>
          <button class="action-btn" *ngIf="action.link_template" (click)="navigateTo(action.link_template)">
            {{ lang() === 'ar' ? 'اذهب' : 'Go' }}
          </button>
        </div>
      </div>

      <div class="cockpit-footer">
        <button class="btn-primary" (click)="goToDashboard()">
          {{ lang() === 'ar' ? 'انتقل إلى لوحة التحكم' : 'Go to Dashboard' }}
        </button>
      </div>

      <div class="loading-state" *ngIf="loading()">
        {{ lang() === 'ar' ? 'جارٍ التحميل...' : 'Loading cockpit...' }}
      </div>
    </div>
  `,
    styles: [`
    .cockpit-container { max-width: 960px; margin: 40px auto; padding: 32px; }
    .cockpit-header { text-align: center; margin-bottom: 32px; }
    .cockpit-header h1 { font-size: var(--font-size-3xl); font-weight: 700; color: var(--text-heading, #111827); }
    .subtitle { color: var(--text-muted, #6b7280); margin-top: 4px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .metric-card { padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle, #e5e7eb); background: white; text-align: center; }
    .metric-card.warn { border-color: #fbbf24; background: #fffbeb; }
    .metric-card.progress { border-color: #3b82f6; background: #eff6ff; }
    .metric-value { display: block; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-heading, #111827); }
    .metric-label { display: block; font-size: var(--font-size-xs-plus); color: var(--text-muted, #6b7280); margin-top: 4px; }
    .actions-section h2 { font-size: var(--font-size-lg); font-weight: 600; margin-bottom: 16px; }
    .action-card { padding: 16px 20px; border: 1px solid var(--border-subtle, #e5e7eb); border-radius: var(--radius-md); margin-bottom: 10px; background: white; }
    .action-header { display: flex; justify-content: space-between; align-items: center; }
    .action-title { font-weight: 600; color: var(--text-heading, #111827); }
    .action-count { background: var(--primary, #3b82f6); color: white; padding: 2px 10px; border-radius: var(--radius-lg); font-size: var(--font-size-xs-plus); font-weight: 600; }
    .action-desc { color: var(--text-muted, #6b7280); font-size: var(--font-size-base); margin: 6px 0 10px; }
    .action-btn { padding: 6px 16px; border: 1px solid var(--primary, #3b82f6); color: var(--primary, #3b82f6); background: transparent; border-radius: var(--radius-sm); cursor: pointer; font-weight: 500; }
    .cockpit-footer { text-align: center; margin-top: 32px; }
    .btn-primary { padding: 12px 32px; border: none; background: var(--primary, #3b82f6); color: white; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: var(--font-size-md); }
    .loading-state { text-align: center; padding: 64px; color: var(--text-muted, #6b7280); }
    .rtl { direction: rtl; text-align: right; }
  `]
})
export class OperatingCockpitPageComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private _storage = inject(StorageService);

  private readonly store = inject(Store);

  snapshot = signal<CockpitSnapshot | null>(null);
  loading = signal(true);
  lang = signal<'en' | 'ar'>('en');

  constructor() {
    this.lang.set(this.getInitialLang());
  }

  private getInitialLang(): 'en' | 'ar' {
    const storedLang = typeof localStorage !== 'undefined' ? this._storage.get('grc_lang') : null;
    return storedLang === 'ar' ? 'ar' : 'en';
  }

  ngOnInit(): void {
    const tid = this._storage.get('grc_tenantId') || '';
    this._storage.set(`grc_cockpit_shown_${tid}`, 'true');
    const role = this._storage.get('grc_role') || undefined;
    const params = role ? `?role=${role}` : '';
    this.http.get<CockpitSnapshot>(`${environment.apiUrl}/ai-os/operating-cockpit${params}`)
      .subscribe({
        next: (s) => { this.snapshot.set(s); this.loading.set(false); },
        error: () => { this.loading.set(false); },
      });

    this.store.dispatch(ComplianceActions.loadOverview());
    this.store.dispatch(RiskActions.loadOverview());
    this.store.dispatch(IncidentActions.loadIncidents());
    this.store.dispatch(AuditActions.loadOverview());
    this.store.dispatch(PrivacyActions.loadDashboard());
    this.store.dispatch(TrainingActions.loadSnapshot());
  }

  navigateTo(link: string): void {
    this.router.navigateByUrl(link);
  }

  goToDashboard(): void {
    this.router.navigateByUrl('/workspace-home');
  }
}
