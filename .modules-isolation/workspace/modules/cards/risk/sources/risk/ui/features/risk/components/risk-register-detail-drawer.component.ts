import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { EntityDetailDrawerComponent } from '@app/shared/components/entity/entity-detail-drawer.component';
import { HasPermissionDirective } from '@app/dauth/directives/has-permission.directive';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { TabViewModule } from 'primeng/tabs';
import { RiskDetailDto } from '@app/features/risk/pages/risk-workspace/risk-workspace.models';
import { GrcRecord } from '@app/core/models/shared.types';

/** Owner profile displayed in the drawer overview tab */
export interface DrawerOwnerProfile { name: string; email: string; team?: string; department?: string; businessUnit?: string; }

/** Status history entry for the timeline */
export interface DrawerStatusHistoryEntry { historyId?: string; fromStatus: string; toStatus: string; actor: string; timestamp: string; reason?: string; }

/** Option shapes for dropdowns */
export interface DrawerUserOption { label: string; value: string; email?: string; department?: string; }
export interface DrawerTeamOption { label: string; value: string; }

/**
 * Presentational component: renders the risk detail side-drawer with
 * Overview, Controls, Evidence, Treatments, Governance, Peer Review, and Audit tabs.
 * All mutation actions emit events for the parent orchestrator to handle.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-register-detail-drawer',
    imports: [
        CommonModule, FormsModule,
        StatusBadgeComponent, EntityDetailDrawerComponent,
        InputTextModule, ButtonModule, TagModule, DropdownModule, TooltipModule,
        TabViewModule, AppDatePipe,
    ],
    template: `
    <app-entity-detail-drawer [(visible)]="visible" (visibleChange)="visibleChange.emit($event)"
      [title]="risk?.risk?.title || ''" entityType="risk" [entityId]="risk?.risk?.riskId || ''">
      <div *ngIf="risk">
        <p-tabView>
          <!-- ── Overview tab ── -->
          <p-tabPanel [header]="labels.overviewTab">
            <div class="drawer-details">
              <div class="detail-row"><span class="detail-label">{{ labels.category }}</span><span>{{ risk.risk.category }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ labels.likelihood }}</span><span>{{ risk.risk.likelihood }}/5</span></div>
              <div class="detail-row"><span class="detail-label">{{ labels.impact }}</span><span>{{ risk.risk.impact }}/5</span></div>
              <div class="detail-row"><span class="detail-label">{{ labels.inherent }}</span><span class="score-pill" [class]="scoreClass(risk.risk.inherentScore)">{{ risk.risk.inherentScore }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ labels.residual }}</span><span class="score-pill" [class]="scoreClass(risk.risk.residualScore)">{{ risk.risk.residualScore }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ labels.status }}</span><app-status-badge [status]="risk.risk.status" /></div>
              <div *ngIf="risk.risk.businessImpact" class="detail-row"><span class="detail-label">{{ labels.businessImpact }}</span><span>{{ risk.risk.businessImpact }}</span></div>
              <div *ngIf="risk.risk.threatContext" class="detail-row"><span class="detail-label">{{ labels.threatContext }}</span><span>{{ risk.risk.threatContext }}</span></div>
            </div>

            <!-- Owner Dropdown -->
            <div class="drawer-field-section">
              <label class="drawer-field-label"><i class="pi pi-user"></i> {{ labels.owner }}</label>
              <p-dropdown
                [options]="userOptions"
                [(ngModel)]="selectedOwnerId"
                [filter]="true" filterBy="label" [showClear]="true"
                [placeholder]="isAr ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0633\u0624\u0648\u0644...' : 'Select owner...'"
                styleClass="w-full"
                (onChange)="ownerChange.emit($event.value)">
              </p-dropdown>
            </div>

            <!-- Team Dropdown -->
            <div class="drawer-field-section">
              <label class="drawer-field-label"><i class="pi pi-users"></i> {{ labels.responsibleTeam }}</label>
              <p-dropdown
                [options]="teamOptions"
                [(ngModel)]="selectedTeamId"
                [filter]="true" filterBy="label" [showClear]="true"
                [placeholder]="isAr ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0631\u064a\u0642...' : 'Select team...'"
                styleClass="w-full"
                (onChange)="teamChange.emit($event.value)">
              </p-dropdown>
            </div>

            <!-- Ownership Context Card -->
            @if (ownerProfile) {
              <div class="drawer-field-section owner-context-section">
                <label class="drawer-field-label">{{ labels.ownerDetails }}</label>
                <div class="owner-card">
                  <div class="owner-row"><i class="pi pi-user"></i><span>{{ ownerProfile.name }}</span></div>
                  <div class="owner-row"><i class="pi pi-envelope"></i><span>{{ ownerProfile.email }}</span></div>
                  @if (ownerProfile.team) {
                    <div class="owner-row"><i class="pi pi-users"></i><span>{{ ownerProfile.team }}</span></div>
                  }
                  @if (ownerProfile.department) {
                    <div class="owner-row"><i class="pi pi-building"></i><span>{{ ownerProfile.department }}</span></div>
                  }
                  @if (ownerProfile.businessUnit) {
                    <div class="owner-row"><i class="pi pi-sitemap"></i><span>{{ ownerProfile.businessUnit }}</span></div>
                  }
                </div>
              </div>
            }

            <!-- Status Lifecycle Dropdown -->
            @if (availableTransitions.length > 0) {
              <div class="drawer-field-section">
                <label class="drawer-field-label"><i class="pi pi-arrows-h"></i> {{ labels.changeStatus }}</label>
                <p-dropdown
                  [options]="availableTransitions"
                  [(ngModel)]="pendingStatusChange"
                  [placeholder]="isAr ? '\u0627\u0644\u0627\u0646\u062a\u0642\u0627\u0644 \u0625\u0644\u0649...' : 'Transition to...'"
                  styleClass="w-full"
                  (onChange)="statusTransition.emit($event.value)">
                </p-dropdown>
              </div>
            }

            <!-- Status Timeline -->
            <div class="drawer-field-section">
              <label class="drawer-field-label"><i class="pi pi-clock"></i> {{ labels.statusHistory }}</label>
              @if (statusTimeline.length > 0) {
                <div class="status-timeline">
                  @for (entry of statusTimeline; track $index) {
                    <div class="timeline-entry">
                      <div class="timeline-dot" [style.background]="getStatusColor(entry.toStatus)"></div>
                      <div class="timeline-content">
                        <div class="timeline-statuses">
                          <span class="status-chip" [attr.data-status]="entry.fromStatus">{{ formatStatusLabel(entry.fromStatus) }}</span>
                          <i class="pi pi-arrow-right timeline-arrow"></i>
                          <span class="status-chip" [attr.data-status]="entry.toStatus">{{ formatStatusLabel(entry.toStatus) }}</span>
                        </div>
                        <div class="timeline-meta">{{ entry.actor }} &middot; {{ entry.timestamp | date:'medium' }}</div>
                        @if (entry.reason) {
                          <div class="timeline-reason">{{ entry.reason }}</div>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="empty-inline">{{ labels.noStatusHistory }}</p>
              }
            </div>
          </p-tabPanel>

          <!-- ── Controls tab ── -->
          <p-tabPanel [header]="labels.controlsTab + ' (' + (risk.linkedControls.length || 0) + ')'">
            <div class="link-action-bar">
              <input pInputText [(ngModel)]="linkControlId" [placeholder]="labels.controlIdPlaceholder" [attr.aria-label]="labels.controlIdPlaceholder" class="link-input" />
              <button pButton icon="pi pi-link" class="p-button-sm p-button-outlined" [label]="labels.linkControl"
                [disabled]="!linkControlId" (click)="linkControl.emit(linkControlId); linkControlId = ''"></button>
            </div>
            <div *ngIf="risk.linkedControls?.length">
              <div *ngFor="let c of risk.linkedControls" class="linked-item">
                <span tabindex="0" role="button" (keyup.enter)="navigate.emit({ path: '/compliance/controls', entityId: c.controlId })" class="cross-link-chip" (click)="navigate.emit({ path: '/compliance/controls', entityId: c.controlId })" [pTooltip]="labels.openControl">
                  <i class="pi pi-shield"></i> {{ c.title }}
                </span>
                <app-status-badge [status]="c.status" />
                <span *ngIf="c.effectiveness" class="text-xs text-muted">{{ c.effectiveness }}%</span>
              </div>
            </div>
            <div *ngIf="!risk.linkedControls?.length" class="empty-inline">{{ labels.noLinkedControls }}</div>
          </p-tabPanel>

          <!-- ── Evidence tab ── -->
          <p-tabPanel [header]="labels.evidenceTab + ' (' + (risk.linkedEvidence.length || 0) + ')'">
            <div class="link-action-bar">
              <input pInputText [(ngModel)]="linkEvidenceId" [placeholder]="labels.evidenceIdPlaceholder" [attr.aria-label]="labels.evidenceIdPlaceholder" class="link-input" />
              <button pButton icon="pi pi-link" class="p-button-sm p-button-outlined" [label]="labels.linkEvidence"
                [disabled]="!linkEvidenceId" (click)="linkEvidence.emit(linkEvidenceId); linkEvidenceId = ''"></button>
            </div>
            <div *ngIf="risk.linkedEvidence?.length">
              <div *ngFor="let e of risk.linkedEvidence" class="linked-item">
                <span tabindex="0" role="button" (keyup.enter)="navigate.emit({ path: '/evidence/catalog', entityId: e.evidenceId })" class="cross-link-chip" (click)="navigate.emit({ path: '/evidence/catalog', entityId: e.evidenceId })" [pTooltip]="labels.openEvidence">
                  <i class="pi pi-file"></i> {{ e.title }}
                </span>
                <p-tag [value]="e.type" size="small" [rounded]="true" />
                <app-status-badge [status]="e.status" />
              </div>
            </div>
            <div *ngIf="!risk.linkedEvidence?.length" class="empty-inline">{{ labels.noLinkedEvidence }}</div>
          </p-tabPanel>

          <!-- ── Treatments tab ── -->
          <p-tabPanel [header]="labels.treatmentsTab + ' (' + (risk.treatments.length || 0) + ')'">
            <div *ngIf="risk.treatments?.length">
              <div *ngFor="let t of risk.treatments" class="linked-item">
                <span tabindex="0" role="button" (keyup.enter)="navigate.emit({ path: '/risk/treatment', entityId: t.treatmentId })" class="cross-link-chip" (click)="navigate.emit({ path: '/risk/treatment', entityId: t.treatmentId })" [pTooltip]="labels.openTreatment">
                  <i class="pi pi-wrench"></i> {{ t.title || t.treatmentId }}
                </span>
                <p-tag [value]="t.strategy" size="small" [rounded]="true" />
                <app-status-badge [status]="t.status" />
                <span *ngIf="t.overdue" class="text-danger text-xs">{{ labels.overdueLabel }}</span>
              </div>
            </div>
            <div *ngIf="!risk.treatments?.length" class="empty-inline">{{ labels.noTreatments }}</div>
          </p-tabPanel>

          <!-- ── Governance tab ── -->
          <p-tabPanel [header]="labels.governanceTab">
            <div class="drawer-details" *ngIf="risk.governance">
              <div *ngIf="risk.governance.acceptanceDecision" class="detail-row">
                <span class="detail-label">{{ labels.acceptance }}</span>
                <app-status-badge [status]="risk.governance.acceptanceDecision" />
              </div>
              <div *ngIf="risk.governance.escalationHistory?.length">
                <h5 class="subsection-title">{{ labels.escalationHistory }}</h5>
                <div *ngFor="let esc of risk.governance.escalationHistory" class="linked-item">
                  <span class="text-xs">{{ esc.date | appDate:'short' }}</span>
                  <span class="font-semibold">{{ esc.escalatedTo }}</span>
                  <span class="text-xs text-muted">{{ esc.reason }}</span>
                </div>
              </div>
              <div *ngIf="!risk.governance.escalationHistory?.length" class="empty-inline">{{ labels.noEscalations }}</div>
            </div>
          </p-tabPanel>

          <!-- ── Peer Review tab ── -->
          <p-tabPanel [header]="labels.peerReviewTab + ' (' + (peerReviews.length) + ')'">
            <div *ngIf="peerReviews.length">
              <div *ngFor="let pr of peerReviews" class="peer-review-card">
                <div class="detail-row"><span class="detail-label">{{ labels.agentScore }}</span><span class="score-pill" [class]="scoreClass(pr.agentScore || 0)">{{ pr.agentScore ?? '\u2014' }}</span></div>
                <div class="detail-row"><span class="detail-label">{{ labels.humanScore }}</span><span class="score-pill" [class]="scoreClass(pr.humanScore || 0)">{{ pr.humanScore ?? '\u2014' }}</span></div>
                <div class="detail-row"><span class="detail-label">{{ labels.status }}</span><app-status-badge [status]="pr.status || 'pending'" /></div>
                <div *ngIf="pr.finalScore != null" class="detail-row"><span class="detail-label">{{ labels.finalScore }}</span><span class="font-semibold">{{ pr.finalScore }}</span></div>
                <div *ngIf="pr.dialogue?.length" class="peer-dialogue-section">
                  <h5 class="subsection-title">{{ labels.dialogue }}</h5>
                  <div *ngFor="let entry of pr.dialogue" class="dialogue-entry">
                    <span class="dialogue-from" [class.dialogue-agent]="entry.from === 'agent'" [class.dialogue-human]="entry.from === 'human'">{{ entry.from === 'agent' ? labels.agent : labels.human }}</span>
                    <span class="text-xs">{{ entry.message }}</span>
                  </div>
                </div>
                <div class="peer-review-actions" *ngIf="pr.status !== 'finalized'">
                  <p-button [label]="labels.finalize" icon="pi pi-check-circle" severity="success" [outlined]="true"
                    (onClick)="finalizePeerReview.emit(pr)" [disabled]="pr.humanScore == null" size="small" />
                </div>
              </div>
            </div>
            <div *ngIf="!peerReviews.length" class="empty-inline">{{ labels.noPeerReviews }}</div>
          </p-tabPanel>

          <!-- ── Audit tab ── -->
          <p-tabPanel [header]="labels.auditTab">
            <div class="audit-findings-section">
              <div class="section-label">{{ isAr ? '\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u062a\u062f\u0642\u064a\u0642 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629' : 'Linked Audit Findings' }}</div>
              <div *ngIf="auditFindings.length" class="linked-findings-list">
                <div *ngFor="let af of auditFindings" class="linked-finding-card" tabindex="0" role="button"
                  (keyup.enter)="navigateToAuditFinding.emit(af.finding_id)" (click)="navigateToAuditFinding.emit(af.finding_id)">
                  <div class="lf-title">{{ af.title }}</div>
                  <div class="lf-meta">
                    <app-status-badge [status]="af.severity" />
                    <app-status-badge [status]="af.status" />
                  </div>
                </div>
              </div>
              <div *ngIf="!auditFindings.length" class="empty-inline">{{ isAr ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u062a\u062f\u0642\u064a\u0642 \u0645\u0631\u062a\u0628\u0637\u0629' : 'No linked audit findings' }}</div>
            </div>
            <div style="margin-top:12px">
              <p-button [label]="labels.viewAuditLog" icon="pi pi-external-link" [outlined]="true" severity="secondary"
                (onClick)="viewAuditLog.emit(risk.risk.riskId)" />
            </div>
          </p-tabPanel>
        </p-tabView>
      </div>
    </app-entity-detail-drawer>
  `,
    styles: [`
    .w-full { width: 100%; }
    .font-semibold { font-weight: 600; }
    .text-xs { font-size: var(--font-size-sm); }
    .text-muted { color: var(--text-muted); }
    .text-danger { color: var(--error); }
    .drawer-details { display: flex; flex-direction: column; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: var(--space-xs, 4px) 0; border-bottom: 1px solid var(--border-subtle); font-size: var(--font-size-sm); }
    .detail-label { font-weight: 500; color: var(--text-muted); }
    .score-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 28px; padding: 0 8px; border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: 700; }
    .score-pill.score-danger { background: rgba(var(--module-accent-red-rgb), .12); color: var(--error); }
    .score-pill.score-warning { background: rgba(var(--module-accent-amber-rgb), .12); color: var(--warning); }
    .score-pill.score-success { background: rgba(var(--module-accent-green-rgb), .12); color: var(--success); }
    .linked-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border-subtle, var(--border-subtle)); font-size: var(--font-size-sm); flex-wrap: wrap; }
    .cross-link-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: var(--radius-lg); background: var(--primary-50, #eff6ff); color: var(--primary-700, #1d4ed8); cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); transition: all 150ms; border: 1px solid var(--primary-200, #bfdbfe); }
    .cross-link-chip:hover { background: var(--primary-100, #dbeafe); box-shadow: 0 1px 4px rgba(var(--color-black-rgb), .08); }
    .cross-link-chip i { font-size: var(--font-size-xs); }
    .empty-inline { font-size: var(--font-size-sm); color: var(--text-muted); font-style: italic; padding: 12px 0; }
    .subsection-title { font-size: var(--font-size-sm); font-weight: 600; margin: 12px 0 6px; color: var(--text); }
    .link-action-bar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
    .link-input { min-width: 160px; font-size: var(--font-size-sm); }

    /* ── Drawer field sections ── */
    .drawer-field-section { margin-top: 16px; margin-bottom: 4px; }
    .drawer-field-label { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); margin-bottom: 6px; }
    .drawer-field-label i { font-size: var(--font-size-xs); }

    /* ── Owner context card ── */
    .owner-context-section { margin-top: 12px; }
    .owner-card { background: var(--surface-50, #f9fafb); border-radius: var(--radius-sm, 6px); padding: 10px 14px; border: 1px solid var(--surface-border, #e5e7eb); }
    .owner-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: var(--font-size-sm); }
    .owner-row i { color: var(--text-muted); width: 16px; text-align: center; font-size: var(--font-size-xs); }

    /* ── Status timeline ── */
    .status-timeline { position: relative; padding-left: 20px; margin-top: 8px; }
    .timeline-entry { position: relative; padding-bottom: 14px; }
    .timeline-entry:not(:last-child)::before { content: ''; position: absolute; left: -14px; top: 12px; bottom: 0; width: 2px; background: var(--surface-300, #d1d5db); }
    .timeline-dot { position: absolute; left: -18px; top: 6px; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-500, var(--primary)); border: 2px solid var(--surface-card, #fff); flex-shrink: 0; }
    .timeline-content { font-size: var(--font-size-sm); }
    .timeline-statuses { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .timeline-arrow { font-size: var(--font-size-nano); color: var(--text-muted); }
    .timeline-meta { color: var(--text-muted); font-size: var(--font-size-xs); margin-top: 2px; }
    .timeline-reason { color: var(--text-muted); font-size: var(--font-size-xs); font-style: italic; margin-top: 2px; }

    /* ── Status chips in timeline ── */
    .status-chip { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md, 6px); font-size: var(--font-size-xs); font-weight: 600; text-transform: capitalize; background: var(--surface-200, #e5e7eb); color: var(--text); }
    .status-chip[data-status="identified"] { background: #f3f4f6; color: #6b7280; }
    .status-chip[data-status="assessed"] { background: #dbeafe; color: #1d4ed8; }
    .status-chip[data-status="mitigated"] { background: #dcfce7; color: #15803d; }
    .status-chip[data-status="under_treatment"] { background: #fef9c3; color: #a16207; }
    .status-chip[data-status="monitored"] { background: #d1fae5; color: #065f46; }
    .status-chip[data-status="accepted"] { background: #ede9fe; color: #6d28d9; }
    .status-chip[data-status="transferred"] { background: #e0e7ff; color: #3730a3; }
    .status-chip[data-status="closed"] { background: #dcfce7; color: #15803d; }
    .status-chip[data-status="escalated"] { background: #fee2e2; color: #b91c1c; }

    .audit-findings-section { margin-bottom: 12px; }
    .section-label { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading); margin-bottom: 8px; text-transform: uppercase; }
    .linked-findings-list { display: flex; flex-direction: column; gap: 6px; }
    .linked-finding-card { padding: 10px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius); cursor: pointer; transition: all .15s; }
    .linked-finding-card:hover { background: var(--surface-50, #f8fafc); border-color: var(--primary-200); }
    .lf-title { font-weight: 600; font-size: var(--font-size-sm); margin-bottom: 4px; }
    .lf-meta { display: flex; gap: 6px; }

    .peer-review-card { padding: 12px 0; border-bottom: 1px solid var(--border-subtle); }
    .peer-review-card:last-child { border-bottom: none; }
    .peer-dialogue-section { margin-top: 8px; }
    .dialogue-entry { display: flex; gap: 8px; align-items: baseline; padding: 4px 0; }
    .dialogue-from { font-weight: 600; font-size: var(--font-size-xs); min-width: 50px; padding: 2px 6px; border-radius: var(--radius-sm, 4px); text-align: center; }
    .dialogue-agent { background: rgba(var(--module-accent-indigo-rgb), .12); color: #6366f1; }
    .dialogue-human { background: rgba(var(--module-accent-green-rgb), .12); color: var(--success); }
    .peer-review-actions { margin-top: 8px; }
  `]
})
export class RiskRegisterDetailDrawerComponent {
  // ── Core data ──
  @Input() risk: RiskDetailDto | null = null;
  @Input() visible = false;
  @Input() isAr = false;

  // ── Dropdown options ──
  @Input() userOptions: DrawerUserOption[] = [];
  @Input() teamOptions: DrawerTeamOption[] = [];
  @Input() availableTransitions: { label: string; value: string }[] = [];

  // ── Selected values ──
  @Input() selectedOwnerId: string | null = null;
  @Input() selectedTeamId: string | null = null;

  // ── Enrichment data ──
  @Input() ownerProfile: DrawerOwnerProfile | null = null;
  @Input() statusTimeline: DrawerStatusHistoryEntry[] = [];
  @Input() peerReviews: GrcRecord[] = [];
  @Input() auditFindings: GrcRecord[] = [];

  // ── Localized labels ──
  @Input() labels: GrcRecord = {};

  // ── Outputs ──
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() ownerChange = new EventEmitter<string | null>();
  @Output() teamChange = new EventEmitter<string | null>();
  @Output() statusTransition = new EventEmitter<string | null>();
  @Output() linkControl = new EventEmitter<string>();
  @Output() linkEvidence = new EventEmitter<string>();
  @Output() navigate = new EventEmitter<{ path: string; entityId?: string }>();
  @Output() navigateToAuditFinding = new EventEmitter<string>();
  @Output() viewAuditLog = new EventEmitter<string>();
  @Output() finalizePeerReview = new EventEmitter<unknown>();

  /** Internal link input state */
  linkControlId = '';
  linkEvidenceId = '';
  pendingStatusChange: string | null = null;

  scoreClass(score: number): string {
    if (score >= 20) return 'score-danger';
    if (score >= 12) return 'score-warning';
    return 'score-success';
  }

  /** Human-friendly status label */
  formatStatusLabel(s: string): string {
    return s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  }

  /** Returns a colour for the status timeline dot */
  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      identified: '#6b7280', assessed: '#3b82f6', under_treatment: '#f59e0b',
      accepted: '#8b5cf6', monitored: '#10b981', closed: '#22c55e', escalated: '#ef4444',
    };
    return map[status] || '#6b7280';
  }
}
