import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QiyasService } from '../../qiyas.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { QiyasAssessment, QiyasCertificationReadiness, QiyasCertificationGap } from '../../qiyas.models';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-certification',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.translate('qiyas.certification') }}</h1>
          <p class="subtitle">Certification readiness tracker</p>
        </div>
      </div>

      <!-- Assessment selector -->
      <div class="selector-row">
        <select [(ngModel)]="selectedAssessmentId" (ngModelChange)="onAssessmentChange()" class="input" aria-label="Select assessment">
          <option value="">Select a finalized assessment</option>
          <option *ngFor="let a of assessments()" [value]="a.qiyas_assessment_id">{{ a.title_en }}</option>
        </select>
      </div>

      <div class="empty" *ngIf="!selectedAssessmentId && !loading()">Select an assessment to view certification readiness</div>
      <div class="loading-msg" *ngIf="loading()">Loading readiness data...</div>

      <!-- Readiness overview -->
      <div class="readiness-overview" *ngIf="readiness() && !loading()">
        <div class="readiness-circle-wrapper">
          <div class="readiness-circle">
            <svg viewBox="0 0 120 120" class="circle-svg">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-subtle)" stroke-width="10" />
              <circle cx="60" cy="60" r="52"
                fill="none"
                [attr.stroke]="readiness()!.ready ? 'var(--success)' : 'var(--warning)'"
                stroke-width="10"
                stroke-linecap="round"
                [attr.stroke-dasharray]="circumference"
                [attr.stroke-dashoffset]="dashOffset()"
                transform="rotate(-90 60 60)" />
            </svg>
            <div class="circle-text">
              <span class="circle-value">{{ readiness()!.overall_readiness | number:'1.0-0' }}%</span>
            </div>
          </div>
          <span class="ready-badge" [class.ready]="readiness()!.ready" [class.not-ready]="!readiness()!.ready">
            {{ readiness()!.ready ? 'Ready' : 'Not Ready' }}
          </span>
        </div>

        <div class="gap-summary-cards">
          <div class="gap-card total">
            <div class="gap-card-value">{{ readiness()!.total_gaps }}</div>
            <div class="gap-card-label">Total Gaps</div>
          </div>
          <div class="gap-card open">
            <div class="gap-card-value">{{ readiness()!.open_gaps }}</div>
            <div class="gap-card-label">Open</div>
          </div>
          <div class="gap-card closed">
            <div class="gap-card-value">{{ readiness()!.closed_gaps }}</div>
            <div class="gap-card-label">Closed</div>
          </div>
        </div>
      </div>

      <!-- Domain breakdown -->
      <div class="domain-section" *ngIf="readiness() && !loading()">
        <h3>Domain Readiness</h3>
        <div class="domain-table">
          <div class="domain-header">
            <span class="col-name">Domain</span>
            <span class="col-readiness">Readiness</span>
            <span class="col-gaps">Gaps</span>
            <span class="col-status">Status</span>
          </div>
          <div *ngFor="let d of readiness()!.domain_readiness" class="domain-row" (click)="toggleDomain(d.domain_id)">
            <span class="col-name">{{ d.domain_name }}</span>
            <span class="col-readiness">
              <div class="progress-bar-track">
                <div class="progress-bar-fill"
                  [style.width.%]="d.readiness"
                  [style.background]="d.readiness >= 80 ? 'var(--success)' : d.readiness >= 50 ? 'var(--warning)' : '#dc2626'"></div>
              </div>
              <span class="readiness-pct">{{ d.readiness | number:'1.0-0' }}%</span>
            </span>
            <span class="col-gaps">{{ d.gaps }}</span>
            <span class="col-status">
              <span class="status-dot" [class.green]="d.readiness >= 80" [class.amber]="d.readiness >= 50 && d.readiness < 80" [class.red]="d.readiness < 50"></span>
            </span>
          </div>
        </div>
      </div>

      <!-- Gaps list (expandable per domain) -->
      <div class="gaps-section" *ngIf="gaps().length > 0 && expandedDomainId()">
        <h3>Gaps for {{ expandedDomainName() }}</h3>
        <div class="gaps-list">
          <div *ngFor="let g of domainGaps()" class="gap-item">
            <div class="gap-top">
              <div class="gap-requirement">{{ g.requirement }}</div>
              <span class="gap-badge" [class]="'gap-badge-' + g.status">{{ g.status }}</span>
            </div>
            <div class="gap-states">
              <span class="state-label">Current: <strong>{{ g.current_state }}</strong></span>
              <span class="state-label">Required: <strong>{{ g.required_state }}</strong></span>
            </div>

            <!-- Update form -->
            <div class="gap-update-form" *ngIf="editingGapId === g.gap_id">
              <select [(ngModel)]="editGapStatus" class="input-sm" aria-label="Gap status">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
                <option value="accepted">Accepted</option>
              </select>
              <textarea [(ngModel)]="editGapEvidence" placeholder="Evidence / notes" aria-label="Evidence" class="input-sm textarea-sm" rows="2"></textarea>
              <div class="gap-update-actions">
                <button class="btn-primary btn-xs" (click)="saveGap(g.gap_id)">Save</button>
                <button class="btn-secondary btn-xs" (click)="editingGapId = ''">Cancel</button>
              </div>
            </div>
            <button *ngIf="editingGapId !== g.gap_id" class="btn-edit" (click)="startEditGap(g)">Update Status</button>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: var(--font-size-2xl); font-weight: 700; margin: 0; }
    .subtitle { color: var(--text-muted); margin-top: 2px; font-size: var(--font-size-base); }
    .selector-row { margin-bottom: 24px; }
    .input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-base); min-width: 300px; }
    .input-sm { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-sm); width: 100%; box-sizing: border-box; }
    .textarea-sm { resize: vertical; font-size: var(--font-size-sm); margin-top: 6px; }
    .empty { color: var(--text-muted); text-align: center; padding: 32px; }
    .loading-msg { color: var(--primary); text-align: center; padding: 24px; font-weight: 500; }
    .btn-primary { padding: 10px 20px; border-radius: var(--radius); border: none; background: var(--primary); color: #fff; cursor: pointer; font-weight: 600; font-size: var(--font-size-base); }
    .btn-primary.btn-xs { padding: 4px 12px; font-size: var(--font-size-sm); }
    .btn-secondary { padding: 10px 20px; border-radius: var(--radius); border: 1px solid #cbd5e1; background: #fff; color: var(--text-heading); cursor: pointer; font-size: var(--font-size-base); }
    .btn-secondary.btn-xs { padding: 4px 12px; font-size: var(--font-size-sm); }
    .btn-edit { padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); background: #fff; color: var(--text-muted); cursor: pointer; font-size: var(--font-size-xs); margin-top: 8px; }
    .btn-edit:hover { border-color: var(--primary); color: var(--primary); }

    /* Readiness overview */
    .readiness-overview { display: flex; align-items: center; gap: 32px; margin-bottom: 32px; padding: 24px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
    .readiness-circle-wrapper { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .readiness-circle { position: relative; width: 120px; height: 120px; }
    .circle-svg { width: 100%; height: 100%; }
    .circle-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
    .circle-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-heading); }
    .ready-badge { padding: 4px 14px; border-radius: var(--radius-xs); font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; }
    .ready-badge.ready { background: #dcfce7; color: var(--success); }
    .ready-badge.not-ready { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }

    .gap-summary-cards { display: flex; gap: 16px; flex: 1; }
    .gap-card { flex: 1; text-align: center; padding: 16px; border-radius: var(--radius-md); border: 1.5px solid var(--border-subtle); background: #fff; }
    .gap-card.total { border-color: var(--primary); }
    .gap-card.open { border-color: #dc2626; }
    .gap-card.closed { border-color: var(--success); }
    .gap-card-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--text-heading); }
    .gap-card-label { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }

    /* Domain table */
    .domain-section { margin-bottom: 24px; }
    .domain-section h3 { font-size: var(--font-size-md); font-weight: 600; margin-bottom: 12px; }
    .domain-table { border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
    .domain-header { display: flex; align-items: center; padding: 10px 16px; background: var(--surface-ice); font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); }
    .domain-row { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); background: #fff; cursor: pointer; transition: background 0.15s; }
    .domain-row:last-child { border-bottom: none; }
    .domain-row:hover { background: var(--surface-ice); }
    .col-name { flex: 3; font-weight: 500; color: var(--text-heading); }
    .col-readiness { flex: 3; display: flex; align-items: center; gap: 8px; }
    .col-gaps { flex: 1; text-align: center; font-weight: 500; }
    .col-status { flex: 1; text-align: center; }
    .progress-bar-track { flex: 1; height: 8px; background: var(--border-subtle); border-radius: var(--radius-xs); overflow: hidden; }
    .progress-bar-fill { height: 100%; border-radius: var(--radius-xs); transition: width 0.3s ease; }
    .readiness-pct { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-heading); min-width: 36px; }
    .status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
    .status-dot.green { background: var(--success); }
    .status-dot.amber { background: var(--warning); }
    .status-dot.red { background: #dc2626; }

    /* Gaps section */
    .gaps-section { margin-bottom: 24px; }
    .gaps-section h3 { font-size: var(--font-size-md); font-weight: 600; margin-bottom: 12px; }
    .gaps-list { display: flex; flex-direction: column; gap: 8px; }
    .gap-item { padding: 14px 18px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
    .gap-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .gap-requirement { font-weight: 500; color: var(--text-heading); font-size: var(--font-size-base); flex: 1; }
    .gap-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .gap-badge-open { background: #fee2e2; color: #dc2626; }
    .gap-badge-in_progress { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .gap-badge-closed { background: #dcfce7; color: var(--success); }
    .gap-badge-accepted { background: #dbeafe; color: #1d4ed8; }
    .gap-states { display: flex; gap: 24px; margin-top: 8px; font-size: var(--font-size-sm); color: var(--text-muted); }
    .state-label strong { color: var(--text-heading); }
    .gap-update-form { margin-top: 10px; padding: 12px; background: var(--surface-ice); border-radius: var(--radius-sm); }
    .gap-update-actions { display: flex; gap: 8px; margin-top: 8px; }

    @media (max-width: 768px) {
      .readiness-overview { flex-direction: column; }
      .gap-summary-cards { flex-direction: column; }
    }
  `]
})
export class QiyasCertificationComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);

  assessments = signal<QiyasAssessment[]>([]);
  readiness = signal<QiyasCertificationReadiness | null>(null);
  gaps = signal<QiyasCertificationGap[]>([]);
  loading = signal(false);
  expandedDomainId = signal<string>('');

  selectedAssessmentId = '';
  editingGapId = '';
  editGapStatus = '';
  editGapEvidence = '';

  readonly circumference = 2 * Math.PI * 52;

  ngOnInit() {
    this.svc.listAssessments({ status: 'finalized' }).subscribe({
      next: (a) => this.assessments.set(a),
      error: () => this.assessments.set([]),
    });
  }

  dashOffset(): number {
    const r = this.readiness();
    if (!r) return this.circumference;
    return this.circumference * (1 - r.overall_readiness / 100);
  }

  onAssessmentChange() {
    if (!this.selectedAssessmentId) {
      this.readiness.set(null);
      this.gaps.set([]);
      return;
    }
    this.loading.set(true);
    this.expandedDomainId.set('');

    this.svc.getCertification(this.selectedAssessmentId).subscribe({
      next: (cert) => {
        this.readiness.set(cert);
        this.loadGaps();
      },
      error: () => {
        // Compute if not yet available
        this.svc.computeCertificationReadiness(this.selectedAssessmentId).subscribe({
          next: (cert) => { this.readiness.set(cert); this.loadGaps(); },
          error: () => { this.readiness.set(null); this.loading.set(false); },
        });
      },
    });
  }

  private loadGaps() {
    // Gaps are embedded in certification data via domain_readiness; also load detailed gaps
    this.svc.getCertification(this.selectedAssessmentId).subscribe({
      next: (cert: Record<string, any>) => {
        this.gaps.set(cert.gaps || []);
        this.loading.set(false);
      },
      error: () => { this.gaps.set([]); this.loading.set(false); },
    });
  }

  toggleDomain(domainId: string) {
    this.expandedDomainId.set(this.expandedDomainId() === domainId ? '' : domainId);
    this.editingGapId = '';
  }

  expandedDomainName(): string {
    const r = this.readiness();
    if (!r) return '';
    const d = r.domain_readiness.find(dr => dr.domain_id === this.expandedDomainId());
    return d?.domain_name || '';
  }

  domainGaps(): QiyasCertificationGap[] {
    return this.gaps().filter(g => g.domain_id === this.expandedDomainId());
  }

  startEditGap(gap: QiyasCertificationGap) {
    this.editingGapId = gap.gap_id;
    this.editGapStatus = gap.status;
    this.editGapEvidence = gap.evidence || '';
  }

  saveGap(gapId: string) {
    this.svc.updateCertificationGap(gapId, this.editGapStatus, this.editGapEvidence).subscribe({
      next: (updated) => {
        const current = this.gaps();
        this.gaps.set(current.map(g => g.gap_id === gapId ? updated : g));
        this.editingGapId = '';
        // Refresh readiness data
        if (this.selectedAssessmentId) {
          this.svc.getCertification(this.selectedAssessmentId).subscribe({
            next: (cert) => this.readiness.set(cert),
          });
        }
      },
    });
  }
}
