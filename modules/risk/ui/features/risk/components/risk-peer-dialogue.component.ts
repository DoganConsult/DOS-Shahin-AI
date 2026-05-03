import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

/** Peer dialogue entry model */
export interface PeerDialogueEntry {
  from: 'agent' | 'human';
  message: string;
  timestamp?: string;
}

/** Peer review form model */
export interface PeerReviewFormData {
  riskId: string;
  reviewId: string;
  humanLikelihood: number;
  humanImpact: number;
  humanControlEff: number;
  humanReasoning: string;
}

/**
 * Presentational component: Peer review split-panel dialog showing
 * agent score on the left, human assessment form on the right,
 * disagreement banner, and dialogue thread.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-peer-dialogue',
    imports: [CommonModule, FormsModule, DialogModule, InputTextModule, TextareaModule, SelectModule, ButtonModule],
    template: `
    <p-dialog [header]="labels.peerReviewTitle" [(visible)]="visible" [modal]="true" [style]="{width:'960px'}" styleClass="peer-review-dialog" (onHide)="closed.emit()">
      <div class="peer-split">
        <!-- LEFT: Agent Score -->
        <div class="peer-panel peer-agent">
          <div class="peer-panel-header">
            <i class="pi pi-microchip"></i>
            <span>{{ labels.agentScore }}</span>
          </div>
          <div class="peer-score-display" *ngIf="activePeerReview">
            <div class="peer-score-row">
              <span class="peer-score-label">{{ labels.likelihood }}</span>
              <span class="score-badge" [class]="likelihoodClass(activePeerReview.agentLikelihood ?? 0)">{{ activePeerReview.agentLikelihood ?? '\u2014' }}</span>
            </div>
            <div class="peer-score-row">
              <span class="peer-score-label">{{ labels.impact }}</span>
              <span class="score-badge" [class]="impactClass(activePeerReview.agentImpact ?? 0)">{{ activePeerReview.agentImpact ?? '\u2014' }}</span>
            </div>
            <div class="peer-score-row">
              <span class="peer-score-label">{{ labels.inherentScore }}</span>
              <span class="score-badge" [class]="scoreClass(activePeerReview.agentScore ?? 0)">{{ activePeerReview.agentScore ?? '\u2014' }}</span>
            </div>
            <div class="peer-reasoning" *ngIf="activePeerReview.agentReasoning">
              <label>{{ labels.agentReasoning }}</label>
              <p>{{ activePeerReview.agentReasoning }}</p>
            </div>
          </div>
          <div *ngIf="!activePeerReview" class="peer-empty">
            <i class="pi pi-info-circle"></i>
            <p>{{ labels.noAgentReview }}</p>
          </div>
        </div>

        <!-- DIVIDER -->
        <div class="peer-divider"></div>

        <!-- RIGHT: Human Assessment Form -->
        <div class="peer-panel peer-human">
          <div class="peer-panel-header">
            <i class="pi pi-user"></i>
            <span>{{ labels.humanAssessment }}</span>
          </div>
          <div class="dialog-form">
            <div class="field-row">
              <div class="field">
                <label>{{ labels.likelihood }} (1\u20135)</label>
                <p-select [(ngModel)]="form.humanLikelihood" [options]="scaleOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
              </div>
              <div class="field">
                <label>{{ labels.impact }} (1\u20135)</label>
                <p-select [(ngModel)]="form.humanImpact" [options]="scaleOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
              </div>
            </div>
            <div class="field">
              <label>{{ labels.controlEff }} (0\u2013100%)</label>
              <input pInputText type="number" [(ngModel)]="form.humanControlEff" class="w-full" min="0" max="100" />
            </div>
            <div class="field">
              <label>{{ labels.humanReasoning }}</label>
              <textarea pTextarea [(ngModel)]="form.humanReasoning" [rows]="3" class="w-full"></textarea>
            </div>
            <div class="peer-computed" *ngIf="form.humanLikelihood && form.humanImpact">
              <span class="peer-score-label">{{ labels.humanComputedScore }}</span>
              <span class="score-badge" [class]="scoreClass(form.humanLikelihood * form.humanImpact)">
                {{ form.humanLikelihood * form.humanImpact }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Disagreement indicator + dialogue thread -->
      <div class="peer-disagreement" *ngIf="hasDisagreement">
        <div class="disagreement-banner">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ labels.disagreementDetected }}</span>
          <span class="disagreement-delta">
            {{ labels.agentScore }}: {{ activePeerReview?.agentScore ?? 0 }}
            &nbsp;|&nbsp;
            {{ labels.humanAssessment }}: {{ form.humanLikelihood * form.humanImpact }}
          </span>
        </div>

        <div class="dialogue-thread" *ngIf="dialogueEntries.length > 0">
          <div class="dialogue-entry" *ngFor="let entry of dialogueEntries" [class.dialogue-agent]="entry.from === 'agent'" [class.dialogue-human]="entry.from === 'human'">
            <div class="dialogue-from">
              <i class="pi" [ngClass]="entry.from === 'agent' ? 'pi-microchip' : 'pi-user'"></i>
              {{ entry.from === 'agent' ? labels.agent : labels.human }}
              <span class="dialogue-time" *ngIf="entry.timestamp">{{ entry.timestamp }}</span>
            </div>
            <div class="dialogue-msg">{{ entry.message }}</div>
          </div>
        </div>

        <div class="dialogue-input">
          <textarea pTextarea [(ngModel)]="newDialogueMessage" [rows]="2" class="w-full" [placeholder]="labels.dialoguePlaceholder"></textarea>
          <p-button [label]="labels.sendDialogue" icon="pi pi-send" severity="secondary" [outlined]="true" size="small"
                    (onClick)="sendDialogue.emit(newDialogueMessage); newDialogueMessage = ''" [disabled]="!newDialogueMessage" />
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="peer-footer">
          <p-button [label]="labels.cancel" severity="secondary" [text]="true" (onClick)="closed.emit()" />
          <p-button [label]="labels.submitHuman" icon="pi pi-check" (onClick)="submitHuman.emit(form)" [disabled]="!form.humanLikelihood || !form.humanImpact" />
          <p-button
            *ngIf="activePeerReview && activePeerReview.humanScore != null"
            [label]="labels.finalize"
            icon="pi pi-lock"
            severity="success"
            (onClick)="finalize.emit()"
            [disabled]="!activePeerReview" />
        </div>
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .peer-split { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0; min-height: 320px; }
    .peer-panel { padding: 16px; }
    .peer-divider { width: 1px; background: var(--surface-border, var(--border-subtle)); margin: 8px 0; }
    .peer-panel-header { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-base); font-weight: 700; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid var(--surface-border, var(--border-subtle)); }
    .peer-agent .peer-panel-header { color: #6366f1; border-bottom-color: #6366f1; }
    .peer-human .peer-panel-header { color: var(--primary); border-bottom-color: var(--primary); }
    .peer-score-display { display: flex; flex-direction: column; gap: 12px; }
    .peer-score-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
    .peer-score-label { font-size: var(--font-size-sm); color: var(--text-muted); font-weight: 500; }
    .peer-reasoning { margin-top: 8px; }
    .peer-reasoning label { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
    .peer-reasoning p { font-size: var(--font-size-sm); color: var(--text-body, #374151); line-height: 1.5; background: var(--surface-ground, #f9fafb); padding: 10px 12px; border-radius: var(--radius-md); margin: 0; }
    .peer-empty { text-align: center; padding: 32px 16px; color: var(--text-muted); }
    .peer-empty i { font-size: var(--font-size-2xl); display: block; margin-bottom: 8px; }
    .peer-computed { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--surface-ground, #f9fafb); border-radius: var(--radius-md); margin-top: 4px; }
    .score-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-pill); font-size: var(--font-size-sm); font-weight: 700; }
    .score-badge.score-high { background: rgba(var(--color-red-600-rgb), .12); color: var(--error); }
    .score-badge.score-medium { background: rgba(var(--color-amber-600-rgb), .12); color: var(--warning); }
    .score-badge.score-low { background: rgba(var(--color-green-600-rgb), .12); color: var(--success); }
    .dialog-form { display: flex; flex-direction: column; gap: var(--space-md, 12px); }
    .field { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
    .field label { font-size: var(--font-size-sm); font-weight: 500; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md, 12px); }
    .w-full { width: 100%; }
    .peer-disagreement { border-top: 1px solid var(--surface-border, var(--border-subtle)); margin-top: 16px; padding-top: 16px; }
    .disagreement-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(var(--module-accent-amber-rgb), .08); border: 1px solid rgba(var(--module-accent-amber-rgb), .25); border-radius: var(--radius-md); color: #92400e; font-weight: 600; font-size: var(--font-size-sm); margin-bottom: 12px; }
    .disagreement-banner i { color: var(--warning, #d97706); }
    .disagreement-delta { margin-inline-start: auto; font-weight: 400; font-size: var(--font-size-xs); }
    .dialogue-thread { max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; padding: 4px 0; }
    .dialogue-entry { padding: 8px 12px; border-radius: var(--radius-md); font-size: var(--font-size-sm); }
    .dialogue-agent { background: rgba(var(--module-accent-indigo-rgb), .06); border-inline-start: 3px solid #6366f1; }
    .dialogue-human { background: rgba(var(--module-accent-blue-rgb), .06); border-inline-start: 3px solid var(--primary); }
    .dialogue-from { font-weight: 600; font-size: var(--font-size-xs); margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
    .dialogue-from i { font-size: var(--font-size-xs); }
    .dialogue-time { margin-inline-start: auto; font-weight: 400; color: var(--text-muted); }
    .dialogue-msg { color: var(--text-body, #374151); line-height: 1.5; }
    .dialogue-input { display: flex; gap: 8px; align-items: flex-end; }
    .dialogue-input textarea { flex: 1; }
    .peer-footer { display: flex; gap: 8px; justify-content: flex-end; width: 100%; }
    @media (max-width: 768px) {
      .peer-split { grid-template-columns: 1fr; }
      .peer-divider { width: 100%; height: 1px; margin: 0 8px; }
    }
  `]
})
export class RiskPeerDialogueComponent {
  public i18n = inject(I18nService);

  /** Dialog visibility */
  @Input() visible = false;

  /** Localized labels bag */
  @Input() labels: Record<string, string> = {};

  /** Active peer review data (agent side) */
  @Input() activePeerReview: Record<string, any> | null = null;

  /** Human assessment form */
  @Input() form: PeerReviewFormData = { riskId: '', reviewId: '', humanLikelihood: 3, humanImpact: 3, humanControlEff: 50, humanReasoning: '' };

  /** Whether there is a disagreement between agent and human scores */
  @Input() hasDisagreement = false;

  /** Dialogue thread entries */
  @Input() dialogueEntries: PeerDialogueEntry[] = [];

  /** New dialogue message text (two-way bound internally) */
  newDialogueMessage = '';

  /** Scale options (1-5) */
  scaleOptions = [1, 2, 3, 4, 5].map(v => ({ label: String(v), value: v }));

  /** Emitted when dialog is closed */
  @Output() closed = new EventEmitter<void>();

  /** Emitted when human score is submitted */
  @Output() submitHuman = new EventEmitter<PeerReviewFormData>();

  /** Emitted when review is finalized */
  @Output() finalize = new EventEmitter<void>();

  /** Emitted when a dialogue message is sent */
  @Output() sendDialogue = new EventEmitter<string>();

  /** Score CSS class helpers */
  scoreClass(score: number): string { return score >= 20 ? 'score-high' : score >= 12 ? 'score-medium' : 'score-low'; }
  likelihoodClass(v: number): string { return v >= 4 ? 'score-high' : v >= 2 ? 'score-medium' : 'score-low'; }
  impactClass(v: number): string { return v >= 4 ? 'score-high' : v >= 2 ? 'score-medium' : 'score-low'; }
}
