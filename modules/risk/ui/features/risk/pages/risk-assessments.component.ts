import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { RISK_PRIMARY_TABS, RISK_TABS } from '@app/features/risk/risk.constants';
import { TableModule } from 'primeng/table';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { MessageService } from 'primeng/api';
import { RiskRegisterItemDto } from './risk-workspace/risk-workspace.models';
import { PeerReviewDto, RiskPeerReviewVM, ScoreHistoryApiRecord } from '../services/risk-api.types';
import { forkJoin } from 'rxjs';

/* ── Workflow stage type ── */
type WorkflowStage = 'unscored' | 'agent_reviewed' | 'human_pending' | 'finalized';

interface AssessmentRow {
  riskId: string;
  title: string;
  category: string;
  owner: string;
  likelihood: number;
  impact: number;
  inherentScore: number;
  residualScore: number;
  controlEffectiveness: number;
  status: string;
  lastAssessed: string;
  workflowStage: WorkflowStage;
  peerReviewId?: string;
}

interface ScoreHistoryEntry {
  date: string;
  likelihood: number;
  impact: number;
  inherentScore: number;
  residualScore: number;
  scorer?: string;
}

interface PeerDialogueEntry {
  from: 'agent' | 'human';
  message: string;
  timestamp?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risk-assessments-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent,
    TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, TextareaModule,
    SelectModule, TooltipModule, ToastModule, ChipModule, BadgeModule,
  ],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="clipboard"
      [title]="L().title"
      [subtitle]="L().subtitle"
      [breadcrumbs]="[i18n.translate('common.breadcrumbDashboard'), i18n.translate('common.breadcrumbRisk'), L().title]"
      [loading]="loading()">

      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />

      <p-toast />

      <!-- ── Methodology chip link ── -->
      <div class="methodology-chip-bar">
        <p-chip
          [label]="L().viewScoringModel"
          icon="pi pi-arrow-right"
          styleClass="methodology-chip"
          (click)="navigateToMethodology()" />
      </div>

      <div class="health-strip" *ngIf="!loading()">
        <div class="health-card">
          <div class="health-value">{{ total() }}</div>
          <div class="health-label">{{ L().totalRisks }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:var(--error)">{{ highRisk() }}</div>
          <div class="health-label">{{ L().highRisk }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:#d97706">{{ mediumRisk() }}</div>
          <div class="health-label">{{ L().mediumRisk }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:var(--success)">{{ lowRisk() }}</div>
          <div class="health-label">{{ L().lowRisk }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:#6b7280">{{ pendingAssessment() }}</div>
          <div class="health-label">{{ L().pendingAssessment }}</div>
        </div>
      </div>

      <div class="toolbar mb-3">
        <p-button [label]="L().addAssessment" icon="pi pi-plus" severity="secondary" [outlined]="true" (onClick)="openDialog()" />
        <p-button
          [label]="showDelta ? L().hideDelta : L().showDelta"
          icon="pi pi-history"
          severity="secondary"
          [text]="true"
          (onClick)="showDelta = !showDelta" />
        <app-export-button module="risk-assessments" [label]="L().export" [data]="rows()" />
      </div>

      <p-table aria-label="Data table"
        [value]="rows()"
        [rows]="20"
        [paginator]="true"
        [globalFilterFields]="['title','category','owner','status','workflowStage']"
        styleClass="p-datatable-sm p-datatable-striped"
        *ngIf="rows().length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="riskId">ID <p-sortIcon field="riskId" /></th>
            <th pSortableColumn="title">{{ L().risk }} <p-sortIcon field="title" /></th>
            <th pSortableColumn="category">{{ L().category }} <p-sortIcon field="category" /></th>
            <th pSortableColumn="owner">{{ L().owner }} <p-sortIcon field="owner" /></th>
            <th pSortableColumn="likelihood">{{ L().likelihood }} <p-sortIcon field="likelihood" /></th>
            <th pSortableColumn="impact">{{ L().impact }} <p-sortIcon field="impact" /></th>
            <th pSortableColumn="inherentScore">{{ L().inherentScore }} <p-sortIcon field="inherentScore" /></th>
            <th pSortableColumn="residualScore">{{ L().residualScore }} <p-sortIcon field="residualScore" /></th>
            <th pSortableColumn="controlEffectiveness">{{ L().controlEff }} <p-sortIcon field="controlEffectiveness" /></th>
            <th pSortableColumn="workflowStage">{{ L().workflow }} <p-sortIcon field="workflowStage" /></th>
            <th pSortableColumn="status">{{ L().status }} <p-sortIcon field="status" /></th>
            <th *ngIf="showDelta">{{ L().delta }}</th>
            <th>{{ L().actions }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-xs">{{ row.riskId }}</td>
            <td class="font-semibold">{{ row.title || '\u2014' }}</td>
            <td>{{ row.category || '\u2014' }}</td>
            <td>{{ row.owner || '\u2014' }}</td>
            <td><span class="score-badge" [class]="likelihoodClass(row.likelihood)">{{ row.likelihood }}</span></td>
            <td><span class="score-badge" [class]="impactClass(row.impact)">{{ row.impact }}</span></td>
            <td><span class="score-badge" [class]="scoreClass(row.inherentScore)">{{ row.inherentScore }}</span></td>
            <td><span class="score-badge" [class]="scoreClass(row.residualScore)">{{ row.residualScore }}</span></td>
            <td>
              <div class="eff-bar">
                <div class="eff-fill" [style.width.%]="row.controlEffectiveness" [class]="effClass(row.controlEffectiveness)"></div>
              </div>
              <span class="eff-pct">{{ row.controlEffectiveness }}%</span>
            </td>
            <td>
              <span class="workflow-badge" [class]="'wf-' + row.workflowStage">{{ workflowLabel(row.workflowStage) }}</span>
            </td>
            <td><app-status-badge [status]="row.status" /></td>
            <td *ngIf="showDelta">
              <span *ngIf="deltaMap()[row.riskId] as d" class="delta-cell" [class.delta-up]="d.delta > 0" [class.delta-down]="d.delta < 0" [class.delta-zero]="d.delta === 0">
                <i class="pi" [ngClass]="{'pi-arrow-up': d.delta > 0, 'pi-arrow-down': d.delta < 0, 'pi-minus': d.delta === 0}"></i>
                {{ d.delta > 0 ? '+' : '' }}{{ d.delta }}
                <span class="delta-sub">{{ d.prevInherent }} &rarr; {{ d.currentInherent }}</span>
              </span>
              <span *ngIf="!deltaMap()[row.riskId]" class="text-muted">&mdash;</span>
            </td>
            <td>
              <div class="row-actions">
                <button aria-label="Score risk" class="icon-btn" (click)="openPeerReviewDialog(row)" [pTooltip]="L().assess"><i class="pi pi-chart-line"></i></button>
                <button aria-label="View history" class="icon-btn" (click)="viewHistory(row)" [pTooltip]="L().viewHistory" *ngIf="showDelta"><i class="pi pi-history"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <div *ngIf="rows().length === 0 && !loading()" class="empty-section">
        <i class="pi pi-clipboard"></i>
        <p>{{ L().emptyMsg }}</p>
        <p-button [label]="L().addAssessment" icon="pi pi-plus" (onClick)="openDialog()" />
      </div>

      <!-- ══════ Legacy quick-score dialog (for "Add Assessment") ══════ -->
      <p-dialog [header]="L().assessRisk" [(visible)]="dialogVisible" [modal]="true" [style]="{width:'520px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ L().riskId }}</label>
            <p-select [(ngModel)]="form.riskId" [options]="riskOptions()" optionLabel="label" optionValue="value"
                        [placeholder]="L().riskIdPlaceholder" styleClass="w-full" appendTo="body" [filter]="true" filterBy="label" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ L().likelihood }} (1\u20135)</label>
              <p-select [(ngModel)]="form.likelihood" [options]="scaleOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
            </div>
            <div class="field">
              <label>{{ L().impact }} (1\u20135)</label>
              <p-select [(ngModel)]="form.impact" [options]="scaleOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
            </div>
          </div>
          <div class="field">
            <label>{{ L().controlEff }} (0\u2013100%)</label>
            <input pInputText type="number" [(ngModel)]="form.controlEffectiveness" class="w-full" min="0" max="100" />
          </div>
          <div class="field">
            <label>{{ L().notes }}</label>
            <textarea pTextarea [(ngModel)]="form.notes" [rows]="3" class="w-full"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="L().cancel" severity="secondary" [text]="true" (onClick)="dialogVisible=false" />
          <p-button [label]="L().submit" icon="pi pi-check" (onClick)="submitAssessment()" [disabled]="!form.riskId" />
        </ng-template>
      </p-dialog>

      <!-- ══════ Peer Review split-panel dialog ══════ -->
      <p-dialog [header]="L().peerReviewTitle" [(visible)]="peerDialogVisible" [modal]="true" [style]="{width:'960px'}" styleClass="peer-review-dialog">
        <div class="peer-split">
          <!-- LEFT: Agent Score -->
          <div class="peer-panel peer-agent">
            <div class="peer-panel-header">
              <i class="pi pi-microchip"></i>
              <span>{{ L().agentScore }}</span>
            </div>
            <div class="peer-score-display" *ngIf="activePeerReview()">
              <div class="peer-score-row">
                <span class="peer-score-label">{{ L().likelihood }}</span>
                <span class="score-badge" [class]="likelihoodClass(activePeerReview()!.agentLikelihood ?? 0)">{{ activePeerReview()!.agentLikelihood ?? '\u2014' }}</span>
              </div>
              <div class="peer-score-row">
                <span class="peer-score-label">{{ L().impact }}</span>
                <span class="score-badge" [class]="impactClass(activePeerReview()!.agentImpact ?? 0)">{{ activePeerReview()!.agentImpact ?? '\u2014' }}</span>
              </div>
              <div class="peer-score-row">
                <span class="peer-score-label">{{ L().inherentScore }}</span>
                <span class="score-badge" [class]="scoreClass(activePeerReview()!.agentScore ?? 0)">{{ activePeerReview()!.agentScore ?? '\u2014' }}</span>
              </div>
              <div class="peer-reasoning" *ngIf="activePeerReview()!.agentReasoning">
                <label>{{ L().agentReasoning }}</label>
                <p>{{ activePeerReview()!.agentReasoning }}</p>
              </div>
            </div>
            <div *ngIf="!activePeerReview()" class="peer-empty">
              <i class="pi pi-info-circle"></i>
              <p>{{ L().noAgentReview }}</p>
            </div>
          </div>

          <!-- DIVIDER -->
          <div class="peer-divider"></div>

          <!-- RIGHT: Human Assessment Form -->
          <div class="peer-panel peer-human">
            <div class="peer-panel-header">
              <i class="pi pi-user"></i>
              <span>{{ L().humanAssessment }}</span>
            </div>
            <div class="dialog-form">
              <div class="field-row">
                <div class="field">
                  <label>{{ L().likelihood }} (1\u20135)</label>
                  <p-select [(ngModel)]="peerForm.humanLikelihood" [options]="scaleOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
                </div>
                <div class="field">
                  <label>{{ L().impact }} (1\u20135)</label>
                  <p-select [(ngModel)]="peerForm.humanImpact" [options]="scaleOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
                </div>
              </div>
              <div class="field">
                <label>{{ L().controlEff }} (0\u2013100%)</label>
                <input pInputText type="number" [(ngModel)]="peerForm.humanControlEff" class="w-full" min="0" max="100" />
              </div>
              <div class="field">
                <label>{{ L().humanReasoning }}</label>
                <textarea pTextarea [(ngModel)]="peerForm.humanReasoning" [rows]="3" class="w-full"></textarea>
              </div>
              <div class="peer-computed" *ngIf="peerForm.humanLikelihood && peerForm.humanImpact">
                <span class="peer-score-label">{{ L().humanComputedScore }}</span>
                <span class="score-badge" [class]="scoreClass(peerForm.humanLikelihood * peerForm.humanImpact)">
                  {{ peerForm.humanLikelihood * peerForm.humanImpact }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Disagreement indicator + dialogue thread ── -->
        <div class="peer-disagreement" *ngIf="hasDisagreement()">
          <div class="disagreement-banner">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ L().disagreementDetected }}</span>
            <span class="disagreement-delta">
              {{ L().agentScore }}: {{ activePeerReview()?.agentScore ?? 0 }}
              &nbsp;|&nbsp;
              {{ L().humanAssessment }}: {{ peerForm.humanLikelihood * peerForm.humanImpact }}
            </span>
          </div>

          <div class="dialogue-thread" *ngIf="peerDialogueEntries().length > 0">
            <div class="dialogue-entry" *ngFor="let entry of peerDialogueEntries()" [class.dialogue-agent]="entry.from === 'agent'" [class.dialogue-human]="entry.from === 'human'">
              <div class="dialogue-from">
                <i class="pi" [ngClass]="entry.from === 'agent' ? 'pi-microchip' : 'pi-user'"></i>
                {{ entry.from === 'agent' ? L().agent : L().human }}
                <span class="dialogue-time" *ngIf="entry.timestamp">{{ entry.timestamp }}</span>
              </div>
              <div class="dialogue-msg">{{ entry.message }}</div>
            </div>
          </div>

          <div class="dialogue-input">
            <textarea pTextarea [(ngModel)]="newDialogueMessage" [rows]="2" class="w-full" [placeholder]="L().dialoguePlaceholder"></textarea>
            <p-button [label]="L().sendDialogue" icon="pi pi-send" severity="secondary" [outlined]="true" size="small"
                      (onClick)="sendDialogueMessage()" [disabled]="!newDialogueMessage" />
          </div>
        </div>

        <ng-template pTemplate="footer">
          <div class="peer-footer">
            <p-button [label]="L().cancel" severity="secondary" [text]="true" (onClick)="peerDialogVisible=false" />
            <p-button [label]="L().submitHuman" icon="pi pi-check" (onClick)="submitHumanScore()" [disabled]="!peerForm.humanLikelihood || !peerForm.humanImpact" />
            <p-button
              *ngIf="activePeerReview() && activePeerReview()!.humanScore != null"
              [label]="L().finalize"
              icon="pi pi-lock"
              severity="success"
              (onClick)="finalizeReview()"
              [disabled]="!activePeerReview()" />
          </div>
        </ng-template>
      </p-dialog>

      <!-- ══════ Score history dialog ══════ -->
      <p-dialog [header]="L().scoreHistory" [(visible)]="historyDialogVisible" [modal]="true" [style]="{width:'700px'}">
        <p-table [value]="scoreHistoryRows()" styleClass="p-datatable-sm p-datatable-striped" *ngIf="scoreHistoryRows().length > 0">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ L().date }}</th>
              <th>{{ L().likelihood }}</th>
              <th>{{ L().impact }}</th>
              <th>{{ L().inherentScore }}</th>
              <th>{{ L().residualScore }}</th>
              <th>{{ L().scorer }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-h>
            <tr>
              <td>{{ h.date }}</td>
              <td><span class="score-badge" [class]="likelihoodClass(h.likelihood)">{{ h.likelihood }}</span></td>
              <td><span class="score-badge" [class]="impactClass(h.impact)">{{ h.impact }}</span></td>
              <td><span class="score-badge" [class]="scoreClass(h.inherentScore)">{{ h.inherentScore }}</span></td>
              <td><span class="score-badge" [class]="scoreClass(h.residualScore)">{{ h.residualScore }}</span></td>
              <td>{{ h.scorer || '\u2014' }}</td>
            </tr>
          </ng-template>
        </p-table>
        <div *ngIf="scoreHistoryRows().length === 0" class="empty-section" style="padding:24px 0">
          <i class="pi pi-history"></i>
          <p>{{ L().noHistory }}</p>
        </div>
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`
    /* ── Health strip ── */
    .health-strip { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
    .health-card { flex:1; min-width:120px; text-align:center; padding:14px 8px; background:var(--surface-card,#fff); border-radius:var(--radius-md); border:1px solid var(--surface-border,var(--border-subtle)); transition:box-shadow .15s; }
    .health-card:hover { box-shadow: var(--shadow-sm); }
    .health-value { font-size: var(--font-size-2xl); font-weight:700; }
    .health-label { font-size: var(--font-size-xs); color:var(--text-muted,var(--text-muted)); text-transform:uppercase; letter-spacing:.5px; margin-top:2px; }

    /* ── Toolbar ── */
    .toolbar { display:flex; gap:var(--space-sm,8px); align-items:center; flex-wrap:wrap; }
    .mb-3 { margin-bottom:var(--space-md,12px); }

    /* ── Methodology chip ── */
    .methodology-chip-bar { display:flex; margin-bottom:16px; }
    :host ::ng-deep .methodology-chip { cursor:pointer; background:var(--primary-50,#eff6ff); color:var(--primary); border:1px solid var(--primary-200,#bfdbfe); font-weight:600; transition:all 150ms; }
    :host ::ng-deep .methodology-chip:hover { background:var(--primary-100,#dbeafe); box-shadow:var(--shadow-sm); }

    /* ── Table helpers ── */
    .font-mono { font-family:monospace; }
    .font-semibold { font-weight:600; }
    .text-xs { font-size: var(--font-size-sm); }
    .text-muted { color:var(--text-muted); }

    /* ── Score badges ── */
    .score-badge { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:var(--radius-pill); font-size: var(--font-size-sm); font-weight:700; }
    .score-badge.score-high { background:rgba(220,38,38,.12); color:var(--error); }
    .score-badge.score-medium { background:rgba(217,119,6,.12); color:var(--warning); }
    .score-badge.score-low { background:rgba(22,163,74,.12); color:var(--success); }

    /* ── Effectiveness bar ── */
    .eff-bar { width:80px; height:6px; background:var(--surface-border,var(--border-subtle)); border-radius:var(--radius-xs); overflow:hidden; display:inline-block; vertical-align:middle; margin-inline-end:6px; }
    .eff-fill { height:100%; border-radius:var(--radius-xs); transition:width .3s; }
    .eff-fill.eff-high { background:var(--success); }
    .eff-fill.eff-medium { background:var(--warning); }
    .eff-fill.eff-low { background:var(--error); }
    .eff-pct { font-size: var(--font-size-sm); color:var(--text-muted); vertical-align:middle; }

    /* ── Workflow stage badges ── */
    .workflow-badge {
      display:inline-block; padding:3px 10px; border-radius:var(--radius-pill); font-size: var(--font-size-xs); font-weight:600; text-transform:uppercase; letter-spacing:.3px; white-space:nowrap;
    }
    .wf-unscored { background:var(--surface-200,#e5e7eb); color:var(--text-muted,#6b7280); }
    .wf-agent_reviewed { background:rgba(99,102,241,.12); color:#6366f1; }
    .wf-human_pending { background:rgba(245,158,11,.12); color:#d97706; }
    .wf-finalized { background:rgba(22,163,74,.12); color:var(--success,#16a34a); }

    /* ── Delta column ── */
    .delta-cell { display:inline-flex; align-items:center; gap:4px; font-weight:600; font-size:var(--font-size-sm); }
    .delta-cell.delta-up { color:var(--error,#dc2626); }
    .delta-cell.delta-down { color:var(--success,#16a34a); }
    .delta-cell.delta-zero { color:var(--text-muted,#6b7280); }
    .delta-sub { font-weight:400; font-size:var(--font-size-xs); color:var(--text-muted); margin-inline-start:4px; }

    /* ── Row actions ── */
    .row-actions { display:flex; gap:var(--space-xs,4px); }
    .icon-btn { background:none; border:none; cursor:pointer; color:var(--text-muted); padding:4px 6px; border-radius:var(--radius-sm,4px); transition:all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background:var(--surface-ice,rgba(0,0,0,.05)); color:var(--primary); }

    /* ── Empty section ── */
    .empty-section { text-align:center; padding:var(--space-2xl,32px); }
    .empty-section i { font-size:2.5rem; color:var(--text-muted); margin-bottom:var(--space-md,12px); display:block; }
    .empty-section p { color:var(--text-muted); margin-bottom:var(--space-md,12px); }

    /* ── Dialog form ── */
    .dialog-form { display:flex; flex-direction:column; gap:var(--space-md,12px); }
    .field { display:flex; flex-direction:column; gap:var(--space-xs,4px); }
    .field label { font-size: var(--font-size-sm); font-weight:500; color:var(--text-muted); }
    .field-row { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md,12px); }
    .w-full { width:100%; }

    /* ══════ Peer Review split panel ══════ */
    .peer-split { display:grid; grid-template-columns:1fr auto 1fr; gap:0; min-height:320px; }
    .peer-panel { padding:16px; }
    .peer-divider { width:1px; background:var(--surface-border,var(--border-subtle)); margin:8px 0; }
    .peer-panel-header { display:flex; align-items:center; gap:8px; font-size:var(--font-size-base); font-weight:700; margin-bottom:16px; padding-bottom:8px; border-bottom:2px solid var(--surface-border,var(--border-subtle)); }
    .peer-agent .peer-panel-header { color:#6366f1; border-bottom-color:#6366f1; }
    .peer-human .peer-panel-header { color:var(--primary); border-bottom-color:var(--primary); }
    .peer-score-display { display:flex; flex-direction:column; gap:12px; }
    .peer-score-row { display:flex; align-items:center; justify-content:space-between; padding:4px 0; }
    .peer-score-label { font-size:var(--font-size-sm); color:var(--text-muted); font-weight:500; }
    .peer-reasoning { margin-top:8px; }
    .peer-reasoning label { display:block; font-size:var(--font-size-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; }
    .peer-reasoning p { font-size:var(--font-size-sm); color:var(--text-body,#374151); line-height:1.5; background:var(--surface-ground,#f9fafb); padding:10px 12px; border-radius:var(--radius-md); margin:0; }
    .peer-empty { text-align:center; padding:32px 16px; color:var(--text-muted); }
    .peer-empty i { font-size:1.5rem; display:block; margin-bottom:8px; }
    .peer-computed { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--surface-ground,#f9fafb); border-radius:var(--radius-md); margin-top:4px; }

    /* ── Disagreement banner + dialogue ── */
    .peer-disagreement { border-top:1px solid var(--surface-border,var(--border-subtle)); margin-top:16px; padding-top:16px; }
    .disagreement-banner { display:flex; align-items:center; gap:8px; padding:10px 14px; background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.25); border-radius:var(--radius-md); color:#92400e; font-weight:600; font-size:var(--font-size-sm); margin-bottom:12px; }
    .disagreement-banner i { color:#d97706; }
    .disagreement-delta { margin-inline-start:auto; font-weight:400; font-size:var(--font-size-xs); }

    .dialogue-thread { max-height:240px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; margin-bottom:12px; padding:4px 0; }
    .dialogue-entry { padding:8px 12px; border-radius:var(--radius-md); font-size:var(--font-size-sm); }
    .dialogue-agent { background:rgba(99,102,241,.06); border-inline-start:3px solid #6366f1; }
    .dialogue-human { background:rgba(59,130,246,.06); border-inline-start:3px solid var(--primary); }
    .dialogue-from { font-weight:600; font-size:var(--font-size-xs); margin-bottom:4px; display:flex; align-items:center; gap:6px; }
    .dialogue-from i { font-size:var(--font-size-xs); }
    .dialogue-time { margin-inline-start:auto; font-weight:400; color:var(--text-muted); }
    .dialogue-msg { color:var(--text-body,#374151); line-height:1.5; }
    .dialogue-input { display:flex; gap:8px; align-items:flex-end; }
    .dialogue-input textarea { flex:1; }

    /* ── Peer footer ── */
    .peer-footer { display:flex; gap:8px; justify-content:flex-end; width:100%; }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .peer-split { grid-template-columns:1fr; }
      .peer-divider { width:100%; height:1px; margin:0 8px; }
    }
  `],
})
export class RiskAssessmentsPageComponent implements OnInit {
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private msg = inject(MessageService);
  private router = inject(Router);
  public i18n = inject(I18nService);

  loading = signal(true);
  risks = signal<RiskRegisterItemDto[]>([]);
  peerReviewsMap = signal<Record<string, RiskPeerReviewVM>>({});
  dialogVisible = false;
  peerDialogVisible = false;
  historyDialogVisible = false;
  showDelta = false;
  form = { riskId: '', likelihood: 3, impact: 3, controlEffectiveness: 50, notes: '' };
  peerForm = { riskId: '', reviewId: '', humanLikelihood: 3, humanImpact: 3, humanControlEff: 50, humanReasoning: '' };
  newDialogueMessage = '';

  activePeerReview = signal<RiskPeerReviewVM | null>(null);
  peerDialogueEntries = signal<PeerDialogueEntry[]>([]);
  scoreHistoryRows = signal<ScoreHistoryEntry[]>([]);
  deltaData = signal<Record<string, { prevInherent: number; currentInherent: number; delta: number }>>({});

  tabs = RISK_TABS;
  L = computed(() => this.i18n.isAr() ? AR : EN);

  rows = computed<AssessmentRow[]>(() => {
    const prMap = this.peerReviewsMap();
    return this.risks().map(r => {
      const pr = prMap[r.riskId];
      let workflowStage: WorkflowStage = 'unscored';
      if (pr) {
        if (pr.finalScore != null) {
          workflowStage = 'finalized';
        } else if (pr.humanScore != null) {
          workflowStage = 'human_pending'; // human scored, awaiting finalize
        } else {
          workflowStage = 'agent_reviewed';
        }
      } else if ((r.likelihood ?? 0) > 0 && (r.impact ?? 0) > 0) {
        // Has scores but no peer review — treat as agent_reviewed if there is a score
        workflowStage = 'agent_reviewed';
      }

      return {
        riskId: r.riskId,
        title: r.title,
        category: r.category || '',
        owner: r.owner || '',
        likelihood: r.likelihood ?? 0,
        impact: r.impact ?? 0,
        inherentScore: (r.likelihood ?? 0) * (r.impact ?? 0),
        residualScore: Math.round((r.likelihood ?? 0) * (r.impact ?? 0) * (1 - ((r.controlEffectiveness ?? 50) / 100))),
        controlEffectiveness: r.controlEffectiveness ?? 50,
        status: r.status || 'draft',
        lastAssessed: r.nextReviewDate || '',
        workflowStage,
        peerReviewId: pr?.reviewId,
      };
    });
  });

  riskOptions = computed(() => this.risks().map(r => ({ label: `${r.riskId} \u2014 ${r.title}`, value: r.riskId })));

  deltaMap = computed(() => this.deltaData());

  total = computed(() => this.rows().length);
  highRisk = computed(() => this.rows().filter(r => r.inherentScore >= 20).length);
  mediumRisk = computed(() => this.rows().filter(r => r.inherentScore >= 12 && r.inherentScore < 20).length);
  lowRisk = computed(() => this.rows().filter(r => r.inherentScore < 12 && r.inherentScore > 0).length);
  pendingAssessment = computed(() => this.rows().filter(r => r.likelihood === 0 || r.impact === 0).length);

  scaleOptions = [1, 2, 3, 4, 5].map(v => ({ label: String(v), value: v }));

  ngOnInit(): void {
    this.loadData();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadData());
  }

  private loadData(): void {
    forkJoin({
      register: this.api.getRegister(),
      peerReviews: this.api.getPeerReviews(),
    }).subscribe({
      next: ({ register, peerReviews }) => {
        this.risks.set(register.risks || []);

        // Index peer reviews by riskId for quick lookup
        const prMap: Record<string, RiskPeerReviewVM> = {};
        for (const pr of (peerReviews.reviews || [])) {
          prMap[pr.riskId] = pr;
        }
        this.peerReviewsMap.set(prMap);

        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Load score-history delta data for the toggle column */
  loadDeltaData(): void {
    const riskIds = this.risks().map(r => r.riskId);
    if (riskIds.length === 0) return;

    const deltas: Record<string, { prevInherent: number; currentInherent: number; delta: number }> = {};
    let completed = 0;

    for (const riskId of riskIds) {
      this.api.getRiskScoreHistory(riskId).subscribe({
        next: (res) => {
          const hist = res.history || [];
          if (hist.length >= 2) {
            const current = hist[0];
            const prev = hist[1];
            const currentInherent = (current.likelihood ?? 0) * (current.impact ?? 0);
            const prevInherent = (prev.likelihood ?? 0) * (prev.impact ?? 0);
            deltas[riskId] = { prevInherent, currentInherent, delta: currentInherent - prevInherent };
          } else if (hist.length === 1) {
            const currentInherent = (hist[0].likelihood ?? 0) * (hist[0].impact ?? 0);
            deltas[riskId] = { prevInherent: 0, currentInherent, delta: 0 };
          }
          completed++;
          if (completed === riskIds.length) {
            this.deltaData.set({ ...deltas });
          }
        },
        error: () => {
          completed++;
          if (completed === riskIds.length) {
            this.deltaData.set({ ...deltas });
          }
        },
      });
    }
  }

  /* ── Navigation ── */

  navigateToMethodology(): void {
    this.router.navigate(['/risk/scoring']);
  }

  /* ── Legacy quick-score dialog ── */

  openDialog(): void {
    this.form = { riskId: '', likelihood: 3, impact: 3, controlEffectiveness: 50, notes: '' };
    this.dialogVisible = true;
  }

  assess(row: AssessmentRow): void {
    this.form = { riskId: row.riskId, likelihood: row.likelihood || 3, impact: row.impact || 3, controlEffectiveness: row.controlEffectiveness || 50, notes: '' };
    this.dialogVisible = true;
  }

  submitAssessment(): void {
    if (!this.form.riskId) return;
    this.api.assessRisk(this.form.riskId, {
      likelihood: this.form.likelihood,
      impact: this.form.impact,
      controlEffectiveness: this.form.controlEffectiveness,
    }).subscribe({
      next: () => {
        this.dialogVisible = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.L().assessedSuccess, life: 3000 });
        this.loadData();
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.L().assessedError, life: 3000 }),
    });
  }

  /* ── Peer Review dialog ── */

  openPeerReviewDialog(row: AssessmentRow): void {
    this.peerForm = {
      riskId: row.riskId,
      reviewId: row.peerReviewId || '',
      humanLikelihood: row.likelihood || 3,
      humanImpact: row.impact || 3,
      humanControlEff: row.controlEffectiveness || 50,
      humanReasoning: '',
    };
    this.peerDialogueEntries.set([]);
    this.newDialogueMessage = '';

    const prMap = this.peerReviewsMap();
    const existingReview = prMap[row.riskId];

    if (existingReview) {
      this.activePeerReview.set(existingReview);
      this.peerForm.reviewId = existingReview.reviewId || '';
      // Load existing dialogue entries
      if (existingReview.dialogue && Array.isArray(existingReview.dialogue)) {
        this.peerDialogueEntries.set(existingReview.dialogue);
      }
      this.peerDialogVisible = true;
    } else {
      // Create a new peer review with the current scores as agent scores
      const agentScore = row.inherentScore;
      this.api.createPeerReview({
        riskId: row.riskId,
        agentScore,
        agentReasoning: `Auto-scored: likelihood=${row.likelihood}, impact=${row.impact}`,
      }).subscribe({
        next: (review) => {
          this.activePeerReview.set(review);
          this.peerForm.reviewId = review.reviewId || '';
          // Refresh the map
          const updated = { ...this.peerReviewsMap() };
          updated[row.riskId] = review;
          this.peerReviewsMap.set(updated);
          this.peerDialogVisible = true;
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.L().peerCreateError, life: 3000 });
        },
      });
    }
  }

  submitHumanScore(): void {
    if (!this.peerForm.reviewId) return;
    const humanScore = this.peerForm.humanLikelihood * this.peerForm.humanImpact;
    this.api.submitHumanAssessment(this.peerForm.reviewId, {
      humanScore,
      humanReasoning: this.peerForm.humanReasoning || undefined,
    }).subscribe({
      next: (review) => {
        this.activePeerReview.set(review);
        // Update map
        const updated = { ...this.peerReviewsMap() };
        updated[this.peerForm.riskId] = review;
        this.peerReviewsMap.set(updated);

        // Also submit the actual risk assessment
        this.api.assessRisk(this.peerForm.riskId, {
          likelihood: this.peerForm.humanLikelihood,
          impact: this.peerForm.humanImpact,
          controlEffectiveness: this.peerForm.humanControlEff,
        }).subscribe();

        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.L().humanSubmitted, life: 3000 });
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.L().humanSubmitError, life: 3000 }),
    });
  }

  sendDialogueMessage(): void {
    if (!this.peerForm.reviewId || !this.newDialogueMessage) return;
    this.api.addPeerDialogue(this.peerForm.reviewId, {
      from: 'human',
      message: this.newDialogueMessage,
    }).subscribe({
      next: (res) => {
        const entries = [...this.peerDialogueEntries(), { from: 'human' as const, message: this.newDialogueMessage, timestamp: new Date().toLocaleString() }];
        // If server returns updated dialogue array, use that
        if (res?.dialogue && Array.isArray(res.dialogue)) {
          this.peerDialogueEntries.set(res.dialogue);
        } else {
          this.peerDialogueEntries.set(entries);
        }
        this.newDialogueMessage = '';
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.L().dialogueSendError, life: 3000 }),
    });
  }

  finalizeReview(): void {
    if (!this.peerForm.reviewId) return;
    const pr = this.activePeerReview();
    const humanScore = pr?.humanScore ?? (this.peerForm.humanLikelihood * this.peerForm.humanImpact);
    const agentScore = pr?.agentScore ?? 0;
    const agreed = humanScore === agentScore;
    const finalScore = humanScore; // human decision takes priority
    const finalMethod = agreed ? 'consensus' : 'human_override';

    this.api.finalizePeerReview(this.peerForm.reviewId, { finalScore, finalMethod }).subscribe({
      next: (review) => {
        this.activePeerReview.set(review);
        const updated = { ...this.peerReviewsMap() };
        updated[this.peerForm.riskId] = review;
        this.peerReviewsMap.set(updated);
        this.peerDialogVisible = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.L().finalized, life: 3000 });
        this.loadData();
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.L().finalizeError, life: 3000 }),
    });
  }

  hasDisagreement = computed(() => {
    const pr = this.activePeerReview();
    if (!pr || pr.agentScore == null) return false;
    const humanScore = this.peerForm.humanLikelihood * this.peerForm.humanImpact;
    return humanScore !== pr.agentScore;
  });

  /* ── Score history ── */

  viewHistory(row: AssessmentRow): void {
    this.scoreHistoryRows.set([]);
    this.historyDialogVisible = true;
    this.api.getRiskScoreHistory(row.riskId).subscribe({
      next: (res) => {
        this.scoreHistoryRows.set((res.history || []).map((h: ScoreHistoryApiRecord) => ({
          date: h.date || h.assessedAt || h.createdAt || '',
          likelihood: h.likelihood ?? 0,
          impact: h.impact ?? 0,
          inherentScore: (h.likelihood ?? 0) * (h.impact ?? 0),
          residualScore: h.residualScore ?? Math.round((h.likelihood ?? 0) * (h.impact ?? 0) * (1 - ((h.controlEffectiveness ?? 50) / 100))),
          scorer: h.scorer || h.assessedBy || '',
        })));
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.L().historyError, life: 3000 }),
    });
  }

  /* ── Styling helpers ── */

  scoreClass(score: number): string {
    if (score >= 20) return 'score-high';
    if (score >= 12) return 'score-medium';
    return 'score-low';
  }

  likelihoodClass(v: number): string { return v >= 4 ? 'score-high' : v >= 2 ? 'score-medium' : 'score-low'; }
  impactClass(v: number): string { return v >= 4 ? 'score-high' : v >= 2 ? 'score-medium' : 'score-low'; }
  effClass(pct: number): string { return pct >= 70 ? 'eff-high' : pct >= 40 ? 'eff-medium' : 'eff-low'; }

  workflowLabel(stage: WorkflowStage): string {
    const labels = this.i18n.isAr() ? WORKFLOW_LABELS_AR : WORKFLOW_LABELS_EN;
    return labels[stage] || stage;
  }
}

/* ══════ Workflow stage labels ══════ */

const WORKFLOW_LABELS_EN: Record<WorkflowStage, string> = {
  unscored: 'Unscored',
  agent_reviewed: 'Agent Reviewed',
  human_pending: 'Human Pending',
  finalized: 'Finalized',
};

const WORKFLOW_LABELS_AR: Record<WorkflowStage, string> = {
  unscored: '\u063A\u064A\u0631 \u0645\u0642\u064A\u0651\u0645',
  agent_reviewed: '\u0631\u0627\u062C\u0639\u0647 \u0627\u0644\u0648\u0643\u064A\u0644',
  human_pending: '\u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0645\u0631\u0627\u062C\u0639',
  finalized: '\u0645\u0639\u062A\u0645\u062F',
};

/* ══════ EN / AR translations ══════ */

const EN = {
  title: 'Risk Assessments',
  subtitle: 'Score likelihood, impact, and control effectiveness for each risk \u2014 track inherent vs residual exposure',
  totalRisks: 'Total Risks', highRisk: 'High', mediumRisk: 'Medium', lowRisk: 'Low', pendingAssessment: 'Unscored',
  risk: 'Risk', category: 'Category', owner: 'Owner', likelihood: 'Likelihood', impact: 'Impact',
  inherentScore: 'Inherent', residualScore: 'Residual', controlEff: 'Control Eff.', status: 'Status', actions: 'Actions',
  workflow: 'Workflow',
  addAssessment: 'Score Risk', assess: 'Score', export: 'Export',
  riskId: 'Risk ID', riskIdPlaceholder: 'Enter Risk ID', notes: 'Notes',
  submit: 'Submit Score', cancel: 'Cancel',
  assessRisk: 'Risk Assessment',
  assessedSuccess: 'Assessment submitted successfully.',
  assessedError: 'Failed to submit assessment.',
  emptyMsg: 'No risks found. Add risks via the Risk Register first.',

  // Methodology link
  viewScoringModel: 'View Scoring Model \u2192',

  // Score delta
  showDelta: 'Show Score Delta', hideDelta: 'Hide Score Delta', delta: 'Delta',
  date: 'Date', scorer: 'Scored By',
  scoreHistory: 'Score History', viewHistory: 'View History',
  noHistory: 'No score history available.',
  historyError: 'Failed to load score history.',

  // Peer review
  peerReviewTitle: 'Peer Review \u2014 Agent vs Human',
  agentScore: 'Agent Score', humanAssessment: 'Human Assessment',
  agentReasoning: 'Agent Reasoning', humanReasoning: 'Human Reasoning',
  humanComputedScore: 'Computed Score',
  noAgentReview: 'No agent review available yet. Creating one...',
  submitHuman: 'Submit Human Score', finalize: 'Finalize Review',
  humanSubmitted: 'Human assessment submitted.',
  humanSubmitError: 'Failed to submit human assessment.',
  finalized: 'Peer review finalized successfully.',
  finalizeError: 'Failed to finalize peer review.',
  peerCreateError: 'Failed to create peer review.',

  // Disagreement dialogue
  disagreementDetected: 'Score disagreement detected',
  agent: 'Agent', human: 'Human',
  dialoguePlaceholder: 'Add a comment to the peer review dialogue...',
  sendDialogue: 'Send',
  dialogueSendError: 'Failed to send dialogue message.',
};

const AR: typeof EN = {
  title: '\u062A\u0642\u064A\u064A\u0645\u0627\u062A \u0627\u0644\u0645\u062E\u0627\u0637\u0631',
  subtitle: '\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0627\u062D\u062A\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u0623\u062B\u0631 \u0648\u0641\u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u0636\u0648\u0627\u0628\u0637 \u0644\u0643\u0644 \u062E\u0637\u0631 \u2014 \u062A\u062A\u0628\u0639 \u0627\u0644\u062A\u0639\u0631\u0636 \u0627\u0644\u062C\u0648\u0647\u0631\u064A \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u0645\u062A\u0628\u0642\u064A',
  totalRisks: '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u062E\u0627\u0637\u0631', highRisk: '\u0639\u0627\u0644\u064A\u0629', mediumRisk: '\u0645\u062A\u0648\u0633\u0637\u0629', lowRisk: '\u0645\u0646\u062E\u0641\u0636\u0629', pendingAssessment: '\u063A\u064A\u0631 \u0645\u0642\u064A\u0651\u0645\u0629',
  risk: '\u0627\u0644\u062E\u0637\u0631', category: '\u0627\u0644\u0641\u0626\u0629', owner: '\u0627\u0644\u0645\u0633\u0624\u0648\u0644', likelihood: '\u0627\u0644\u0627\u062D\u062A\u0645\u0627\u0644\u064A\u0629', impact: '\u0627\u0644\u0623\u062B\u0631',
  inherentScore: '\u0627\u0644\u062C\u0648\u0647\u0631\u064A', residualScore: '\u0627\u0644\u0645\u062A\u0628\u0642\u064A', controlEff: '\u0641\u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u0636\u0627\u0628\u0637', status: '\u0627\u0644\u062D\u0627\u0644\u0629', actions: '\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A',
  workflow: '\u0633\u064A\u0631 \u0627\u0644\u0639\u0645\u0644',
  addAssessment: '\u062A\u0642\u064A\u064A\u0645 \u062E\u0637\u0631', assess: '\u062A\u0642\u064A\u064A\u0645', export: '\u062A\u0635\u062F\u064A\u0631',
  riskId: '\u0645\u0639\u0631\u0641 \u0627\u0644\u062E\u0637\u0631', riskIdPlaceholder: '\u0623\u062F\u062E\u0644 \u0645\u0639\u0631\u0641 \u0627\u0644\u062E\u0637\u0631', notes: '\u0645\u0644\u0627\u062D\u0638\u0627\u062A',
  submit: '\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u0642\u064A\u064A\u0645', cancel: '\u0625\u0644\u063A\u0627\u0621',
  assessRisk: '\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u062E\u0637\u0631',
  assessedSuccess: '\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0628\u0646\u062C\u0627\u062D.',
  assessedError: '\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u0642\u064A\u064A\u0645.',
  emptyMsg: '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062E\u0627\u0637\u0631. \u0623\u0636\u0641 \u0645\u062E\u0627\u0637\u0631 \u0639\u0628\u0631 \u0633\u062C\u0644 \u0627\u0644\u0645\u062E\u0627\u0637\u0631 \u0623\u0648\u0644\u0627\u064B.',

  // Methodology link
  viewScoringModel: '\u0639\u0631\u0636 \u0646\u0645\u0648\u0630\u062C \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u2190',

  // Score delta
  showDelta: '\u0625\u0638\u0647\u0627\u0631 \u0641\u0631\u0642 \u0627\u0644\u062A\u0642\u064A\u064A\u0645', hideDelta: '\u0625\u062E\u0641\u0627\u0621 \u0641\u0631\u0642 \u0627\u0644\u062A\u0642\u064A\u064A\u0645', delta: '\u0627\u0644\u0641\u0631\u0642',
  date: '\u0627\u0644\u062A\u0627\u0631\u064A\u062E', scorer: '\u0627\u0644\u0645\u0642\u064A\u0651\u0645',
  scoreHistory: '\u0633\u062C\u0644 \u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A', viewHistory: '\u0639\u0631\u0636 \u0627\u0644\u0633\u062C\u0644',
  noHistory: '\u0644\u0627 \u064A\u0648\u062C\u062F \u0633\u062C\u0644 \u062A\u0642\u064A\u064A\u0645\u0627\u062A.',
  historyError: '\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0633\u062C\u0644 \u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A.',

  // Peer review
  peerReviewTitle: '\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0623\u0642\u0631\u0627\u0646 \u2014 \u0627\u0644\u0648\u0643\u064A\u0644 \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u0625\u0646\u0633\u0627\u0646',
  agentScore: '\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0648\u0643\u064A\u0644', humanAssessment: '\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0628\u0634\u0631\u064A',
  agentReasoning: '\u062A\u0628\u0631\u064A\u0631 \u0627\u0644\u0648\u0643\u064A\u0644', humanReasoning: '\u062A\u0628\u0631\u064A\u0631 \u0627\u0644\u0645\u0631\u0627\u062C\u0639',
  humanComputedScore: '\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0645\u062D\u0633\u0648\u0628',
  noAgentReview: '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0643\u064A\u0644 \u0628\u0639\u062F. \u062C\u0627\u0631\u064D \u0627\u0644\u0625\u0646\u0634\u0627\u0621...',
  submitHuman: '\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0628\u0634\u0631\u064A', finalize: '\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629',
  humanSubmitted: '\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0628\u0634\u0631\u064A.',
  humanSubmitError: '\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0628\u0634\u0631\u064A.',
  finalized: '\u062A\u0645 \u0627\u0639\u062A\u0645\u0627\u062F \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0623\u0642\u0631\u0627\u0646 \u0628\u0646\u062C\u0627\u062D.',
  finalizeError: '\u0641\u0634\u0644 \u0627\u0639\u062A\u0645\u0627\u062F \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0623\u0642\u0631\u0627\u0646.',
  peerCreateError: '\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0623\u0642\u0631\u0627\u0646.',

  // Disagreement dialogue
  disagreementDetected: '\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 \u062E\u0644\u0627\u0641 \u0641\u064A \u0627\u0644\u062A\u0642\u064A\u064A\u0645',
  agent: '\u0627\u0644\u0648\u0643\u064A\u0644', human: '\u0627\u0644\u0625\u0646\u0633\u0627\u0646',
  dialoguePlaceholder: '\u0623\u0636\u0641 \u062A\u0639\u0644\u064A\u0642\u0627\u064B \u0639\u0644\u0649 \u062D\u0648\u0627\u0631 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0623\u0642\u0631\u0627\u0646...',
  sendDialogue: '\u0625\u0631\u0633\u0627\u0644',
  dialogueSendError: '\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062D\u0648\u0627\u0631.',
};
