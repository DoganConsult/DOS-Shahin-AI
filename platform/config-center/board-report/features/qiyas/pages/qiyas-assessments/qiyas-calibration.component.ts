import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QiyasService } from '../../qiyas.service';
import { QiyasAssessment, QiyasCalibrationSession, QiyasCalibrationEntry, QiyasDomain } from '../../qiyas.models';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-calibration',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.translate('qiyas.calibration') }}</h1>
          <p class="subtitle">{{ i18n.translate('qiyas.calibrationSubtitle') }}</p>
        </div>
        <button class="btn-primary" (click)="showCreate = !showCreate">+ New Session</button>
      </div>

      <!-- Create session form -->
      <div class="create-form" *ngIf="showCreate">
        <div class="form-grid">
          <select [(ngModel)]="newSessionAssessmentId" class="input">
            <option value="">{{ i18n.translate('qiyas.selectAssessment') }}</option>
            <option *ngFor="let a of assessments()" [value]="a.qiyas_assessment_id">{{ a.title_en }}</option>
          </select>
          <input [(ngModel)]="newSessionFacilitator" [placeholder]="'Facilitator name'" class="input" />
          <button class="btn-primary" (click)="createSession()" [disabled]="!newSessionAssessmentId">Create</button>
        </div>
      </div>

      <!-- Session list -->
      <div class="session-list">
        <div class="empty" *ngIf="sessions().length === 0 && !loading()">{{ i18n.translate('qiyas.noData') }}</div>
        <div *ngFor="let s of sessions()" class="session-card" [class.expanded]="expandedSessionId === s.session_id">
          <!-- Session header -->
          <div class="session-header" (click)="toggleSession(s)">
            <div class="session-info">
              <span class="session-title">Session {{ s.session_id.slice(0, 8) }}</span>
              <span class="badge" [class]="'badge-' + s.status">{{ s.status }}</span>
            </div>
            <div class="session-meta">
              <span class="session-facilitator" *ngIf="s.facilitator">{{ s.facilitator }}</span>
              <span class="session-date">{{ s.created_at | date:'mediumDate' }}</span>
              <span class="expand-icon">{{ expandedSessionId === s.session_id ? '\u25B2' : '\u25BC' }}</span>
            </div>
          </div>

          <!-- Expanded detail -->
          <div class="session-detail" *ngIf="expandedSessionId === s.session_id">
            <!-- Entries table -->
            <div class="entries-section" *ngIf="entries().length > 0">
              <div class="entries-header">
                <span class="col-domain">Domain</span>
                <span class="col-score">Original</span>
                <span class="col-score">Calibrated</span>
                <span class="col-justification">Justification</span>
              </div>
              <div *ngFor="let e of entries()" class="entry-row">
                <span class="col-domain">{{ getDomainName(e.domain_id) }}</span>
                <span class="col-score">{{ e.original_score | number:'1.1-1' }}</span>
                <span class="col-score" [class.score-changed]="e.calibrated_score !== e.original_score">{{ e.calibrated_score | number:'1.1-1' }}</span>
                <span class="col-justification">{{ e.justification || '-' }}</span>
              </div>
            </div>
            <div class="entries-empty" *ngIf="entries().length === 0">No calibration entries yet.</div>

            <!-- Add entry form -->
            <div class="add-entry" *ngIf="s.status !== 'finalized'">
              <div class="add-entry-title">Add Entry</div>
              <div class="entry-form">
                <select [(ngModel)]="newEntry.domain_id" (ngModelChange)="onDomainSelect()" class="input-sm">
                  <option value="">Select domain</option>
                  <option *ngFor="let d of domains()" [value]="d.domain_id">{{ d.name_en }}</option>
                </select>
                <div class="score-field">
                  <label>Original</label>
                  <input type="number" [value]="newEntry.original_score" readonly class="input-sm score-input readonly" />
                </div>
                <div class="score-field">
                  <label>Calibrated</label>
                  <input type="number" [(ngModel)]="newEntry.calibrated_score" min="1" max="5" step="0.1" class="input-sm score-input" />
                </div>
                <input [(ngModel)]="newEntry.justification" placeholder="Justification" class="input-sm justification-input" />
                <button class="btn-sm btn-add" (click)="addEntry(s.session_id)" [disabled]="!newEntry.domain_id || !newEntry.calibrated_score">Add</button>
              </div>
            </div>

            <!-- Finalize -->
            <div class="finalize-row" *ngIf="s.status !== 'finalized'">
              <button class="btn-primary btn-finalize" (click)="finalize(s.session_id)" [disabled]="entries().length === 0">Finalize Calibration</button>
            </div>
            <div class="finalized-notice" *ngIf="s.status === 'finalized'">
              Calibration finalized{{ s.finalized_at ? ' on ' + (s.finalized_at | date:'mediumDate') : '' }}.
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-heading); margin: 0; }
    .subtitle { color: var(--text-muted); margin-top: 2px; font-size: var(--font-size-base); }
    .btn-primary { padding: 10px 20px; border-radius: var(--radius); border: none; background: var(--primary); color: #fff; cursor: pointer; font-weight: 600; font-size: var(--font-size-base); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .create-form { background: var(--surface-ice); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; }
    .form-grid { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-base); flex: 1; min-width: 180px; }
    .input-sm { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .session-list { display: flex; flex-direction: column; gap: 10px; }
    .session-card { background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; transition: border-color 0.15s; }
    .session-card:hover { border-color: var(--primary); }
    .session-card.expanded { border-color: var(--primary); }
    .session-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; cursor: pointer; }
    .session-info { display: flex; align-items: center; gap: 10px; }
    .session-title { font-weight: 600; font-size: var(--font-size-base); color: var(--text-heading); }
    .session-meta { display: flex; align-items: center; gap: 10px; }
    .session-facilitator { font-size: var(--font-size-sm); color: var(--text-muted); }
    .session-date { font-size: var(--font-size-sm); color: var(--text-muted); }
    .expand-icon { font-size: var(--font-size-xs); color: var(--text-muted); }
    .badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .badge-open { background: #dbeafe; color: #1d4ed8; }
    .badge-in_progress { background: #fff8e1; color: #f57f17; }
    .badge-finalized { background: #dcfce7; color: var(--success); }
    .session-detail { padding: 0 18px 18px; border-top: 1px solid var(--border-subtle); }
    .entries-section { margin-top: 14px; }
    .entries-header { display: flex; padding: 8px 0; border-bottom: 1.5px solid var(--border-subtle); font-size: var(--font-size-xs); font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    .entry-row { display: flex; padding: 8px 0; border-bottom: 1px solid var(--surface-ice); font-size: var(--font-size-sm); color: var(--text-heading); align-items: center; }
    .col-domain { flex: 2; }
    .col-score { flex: 1; text-align: center; }
    .col-justification { flex: 3; color: var(--text-muted); }
    .score-changed { color: var(--primary); font-weight: 600; }
    .entries-empty { color: var(--text-muted); font-style: italic; padding: 12px 0; font-size: var(--font-size-sm); }
    .add-entry { margin-top: 16px; padding: 14px; background: var(--surface-ice); border-radius: var(--radius-sm); }
    .add-entry-title { font-weight: 600; font-size: var(--font-size-sm); margin-bottom: 10px; color: var(--text-heading); }
    .entry-form { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
    .score-field { display: flex; flex-direction: column; gap: 2px; }
    .score-field label { font-size: var(--font-size-xs); color: var(--text-muted); }
    .score-input { width: 72px; text-align: center; }
    .score-input.readonly { background: var(--surface-ice); color: var(--text-muted); }
    .justification-input { flex: 1; min-width: 140px; }
    .btn-sm { padding: 6px 14px; border-radius: var(--radius-sm); border: none; cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); }
    .btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-add { background: var(--primary); color: #fff; }
    .finalize-row { margin-top: 16px; display: flex; justify-content: flex-end; }
    .btn-finalize { padding: 8px 20px; font-size: var(--font-size-sm); }
    .finalized-notice { margin-top: 14px; font-size: var(--font-size-sm); color: var(--success); font-weight: 500; padding: 10px; background: #dcfce7; border-radius: var(--radius-sm); }
    .empty { color: var(--text-muted); text-align: center; padding: 32px; }
  `]
})
export class QiyasCalibrationComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);

  sessions = signal<QiyasCalibrationSession[]>([]);
  assessments = signal<QiyasAssessment[]>([]);
  entries = signal<QiyasCalibrationEntry[]>([]);
  domains = signal<QiyasDomain[]>([]);
  loading = signal(false);

  showCreate = false;
  newSessionAssessmentId = '';
  newSessionFacilitator = '';
  expandedSessionId = '';

  newEntry: Partial<QiyasCalibrationEntry> & { justification: string } = {
    domain_id: '',
    original_score: 0,
    calibrated_score: 0,
    justification: '',
  };

  private domainMap = new Map<string, string>();
  private scoreMap = new Map<string, number>();

  ngOnInit() {
    this.loadSessions();
    this.svc.listAssessments().subscribe({
      next: (a) => this.assessments.set(a),
      error: () => this.assessments.set([]),
    });
  }

  loadSessions() {
    this.loading.set(true);
    this.svc.listCalibrationSessions().subscribe({
      next: (res) => { this.sessions.set(res.sessions); this.loading.set(false); },
      error: () => { this.sessions.set([]); this.loading.set(false); },
    });
  }

  createSession() {
    if (!this.newSessionAssessmentId) return;
    this.svc.createCalibrationSession({
      assessment_id: this.newSessionAssessmentId,
      facilitator: this.newSessionFacilitator || undefined,
    }).subscribe({
      next: () => {
        this.showCreate = false;
        this.newSessionAssessmentId = '';
        this.newSessionFacilitator = '';
        this.loadSessions();
      },
    });
  }

  toggleSession(session: QiyasCalibrationSession) {
    if (this.expandedSessionId === session.session_id) {
      this.expandedSessionId = '';
      this.entries.set([]);
      this.domains.set([]);
      return;
    }
    this.expandedSessionId = session.session_id;
    this.loadSessionEntries(session);
  }

  private loadSessionEntries(session: QiyasCalibrationSession) {
    // Load entries for this session via the calibration session endpoint
    // The entries are fetched by re-listing and matching, or by a dedicated endpoint.
    // Since the service doesn't have a getCalibrationEntries(sessionId) method,
    // we load them by creating entries and tracking locally. For now, reset.
    this.entries.set([]);

    // Load domains for the assessment's model to populate the add-entry form
    const assessment = this.assessments().find(a => a.qiyas_assessment_id === session.assessment_id);
    if (assessment?.model_id) {
      this.svc.listDomains(assessment.model_id).subscribe({
        next: (d) => {
          this.domains.set(d);
          d.forEach(dom => this.domainMap.set(dom.domain_id, dom.name_en));
        },
        error: () => this.domains.set([]),
      });

      // Load scores so we can show original_score in the entry form
      this.svc.getScores(session.assessment_id).subscribe({
        next: (scores: Record<string, any>) => {
          if (scores?.domainScores) {
            scores.domainScores.forEach((ds: Record<string, any>) => {
              this.scoreMap.set(ds.domainId, ds.score);
            });
          }
        },
        error: () => {},
      });
    }
  }

  getDomainName(domainId: string): string {
    return this.domainMap.get(domainId) || domainId.slice(0, 8);
  }

  onDomainSelect() {
    if (this.newEntry.domain_id) {
      this.newEntry.original_score = this.scoreMap.get(this.newEntry.domain_id) || 0;
      this.newEntry.calibrated_score = this.newEntry.original_score;
    }
  }

  addEntry(sessionId: string) {
    if (!this.newEntry.domain_id) return;
    this.svc.addCalibrationEntry(sessionId, {
      domain_id: this.newEntry.domain_id,
      original_score: this.newEntry.original_score || 0,
      calibrated_score: this.newEntry.calibrated_score || 0,
      justification: this.newEntry.justification || undefined,
    }).subscribe({
      next: (entry) => {
        this.entries.set([...this.entries(), entry]);
        this.newEntry = { domain_id: '', original_score: 0, calibrated_score: 0, justification: '' };
      },
    });
  }

  finalize(sessionId: string) {
    this.svc.finalizeCalibration(sessionId).subscribe({
      next: () => {
        this.expandedSessionId = '';
        this.entries.set([]);
        this.loadSessions();
      },
    });
  }
}
