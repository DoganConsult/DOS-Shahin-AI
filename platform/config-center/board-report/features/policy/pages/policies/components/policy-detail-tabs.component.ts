import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TabViewModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { GrcRecord } from '@app/core/models/shared.types';
import { PolicyApiService } from '../../../services/policy-api.service';

/**
 * Presentational component: policy detail drawer with tabbed view
 * (Overview, Content, Versions, Approvals, Audit).
 */
@Component({
    selector: 'app-policy-detail-tabs',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [CommonModule, RouterModule, AppDatePipe, StatusBadgeComponent, TabViewModule, TagModule, ButtonModule, ProgressBarModule],
    template: `
    <div tabindex="0" role="button" (keyup.enter)="closed.emit()" class="drawer-overlay" *ngIf="visible" (click)="closed.emit()"></div>
    <div class="drawer" [class.open]="visible">
      <div class="drawer-header">
        <h3>{{ policy?.title }}</h3>
        <button aria-label="Close" pButton icon="pi pi-times" class="p-button-text p-button-rounded" (click)="closed.emit()"></button>
      </div>
      <p-tabView *ngIf="policy">
        <!-- Overview Tab -->
        <p-tabPanel [header]="i18n.translate('policies.overview')">
          <div class="detail-grid">
            <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.id') }}</span><span>{{ policy.policy_id }}</span></div>
            <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.category') }}</span><span>{{ policy.category || '\u2014' }}</span></div>
            <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.owner') }}</span><span>{{ policy.owner || '\u2014' }}</span></div>
            <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.departmentBU') }}</span><span>{{ policy.department || policy.business_unit || '\u2014' }}</span></div>
            <div class="detail-row"><span class="detail-label">{{ i18n.translate('common.status') }}</span><app-status-badge [status]="policy.status" /></div>
            <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.version') }}</span><span>v{{ policy.version || 1 }}</span></div>
            <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.effectiveDate') }}</span><span>{{ policy.effective_date | appDate:'medium' }}</span></div>
            <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.reviewDate') }}</span>
              <span>{{ policy.next_review_date | appDate:'medium' }}
                <span *ngIf="isReviewOverdue(policy)" class="overdue-badge">{{ i18n.translate('policies.overdue') }}</span>
                <span *ngIf="isReviewDueSoon(policy) && !isReviewOverdue(policy)" class="due-badge">{{ i18n.translate('policies.dueSoon') }}</span>
              </span>
            </div>
            <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.frameworks') }}</span>
              <span><p-tag *ngFor="let fw of policy.frameworks?.slice(0,5)" [value]="fw" severity="info" styleClass="me-1" /></span>
            </div>
            <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.created') }}</span><span>{{ policy.created_at | appDate:'medium' }}</span></div>
            <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.updated') }}</span><span>{{ policy.updated_at | appDate:'medium' }}</span></div>
          </div>
        </p-tabPanel>

        <!-- Content Tab -->
        <p-tabPanel [header]="i18n.translate('policies.content')">
          <div class="content-view" [innerHTML]="sanitizedContent"></div>
          <div *ngIf="linkedProcedures.length > 0" class="linked-section">
            <h4>{{ i18n.translate('policies.linkedProcedures') }}</h4>
            <div *ngFor="let proc of linkedProcedures" class="linked-item">
              <i class="pi pi-list"></i> {{ proc.title }} <app-status-badge [status]="proc.status || proc.approval_status" />
            </div>
          </div>
        </p-tabPanel>

        <!-- Versions Tab -->
        <p-tabPanel [header]="i18n.translate('policies.versions')">
          <div *ngIf="versionsLoading" style="text-align:center;padding:24px"><i class="pi pi-spin pi-spinner" style="font-size: var(--font-size-xl)"></i></div>
          <div *ngIf="!versionsLoading && versions.length === 0" class="empty-mini">{{ i18n.translate('policies.noVersions') }}</div>
          <div class="version-list" *ngIf="!versionsLoading && versions.length > 0">
            <div *ngFor="let v of versions" class="version-card" [class.active]="v.version === policy.version">
              <div class="ver-header"><strong>v{{ v.version }}</strong> <app-status-badge [status]="v.status" /></div>
              <div class="ver-meta">{{ v.changed_by || v.author || '\u2014' }} &middot; {{ v.updated_at || v.created_at | appDate:'medium' }}</div>
              <div class="ver-summary" *ngIf="v.change_summary">{{ v.change_summary }}</div>
              <p-button [label]="i18n.translate('policies.viewVersion')" icon="pi pi-eye" [text]="true" size="small" (onClick)="viewVersion.emit(v)" styleClass="mt-1" />
            </div>
          </div>
          <p-button [label]="i18n.translate('policies.createNewVersion')" icon="pi pi-plus" [outlined]="true" (onClick)="createNewVersion.emit()" styleClass="mt-3" />
        </p-tabPanel>

        <!-- Approvals Tab -->
        <p-tabPanel [header]="i18n.translate('policies.approvals')">
          <div *ngIf="approvalsLoading" style="text-align:center;padding:24px"><i class="pi pi-spin pi-spinner" style="font-size: var(--font-size-xl)"></i></div>
          <div *ngIf="!approvalsLoading && approvalRequests.length === 0" class="empty-mini">{{ i18n.translate('policies.noApprovalRequests') }}</div>
          <div class="approval-list" *ngIf="!approvalsLoading && approvalRequests.length > 0">
            <div *ngFor="let a of approvalRequests" class="approval-card">
              <div class="approval-header">
                <app-status-badge [status]="a.status" />
                <span class="approval-action">{{ a.action }}</span>
                <span class="approval-date">{{ a.createdAt || a.created_at | appDate:'medium' }}</span>
              </div>
              <div class="approval-chain" *ngIf="a.approverChain?.length">
                <span *ngFor="let step of a.approverChain; let i = index" class="chain-step">
                  {{ step.userId || step.role }} <span *ngIf="i < a.approverChain.length - 1"> &rarr; </span>
                </span>
              </div>
            </div>
          </div>
          <div class="approval-actions mt-3">
            <p-button *ngIf="policy.status === 'draft'" [label]="i18n.translate('policies.submitForApproval')" icon="pi pi-send" (onClick)="submitForApproval.emit()" />
            <p-button *ngIf="policy.status === 'draft' || policy.status === 'review' || policy.approval_status === 'draft'"
              [label]="i18n.translate('policies.approve')" icon="pi pi-check" severity="success" (onClick)="approvePolicy.emit(policy)" styleClass="ms-2" />
            <p-button *ngIf="policy.status === 'draft' || policy.status === 'review'"
              [label]="i18n.translate('policies.reject')" icon="pi pi-times" severity="danger" [outlined]="true" (onClick)="rejectPolicy.emit()" styleClass="ms-2" />
            <p-button *ngIf="policy.status === 'approved'"
              [label]="i18n.translate('policies.publish')" icon="pi pi-globe" severity="info" (onClick)="publishPolicy.emit()" styleClass="ms-2" />
          </div>
        </p-tabPanel>

        <!-- Audience & Publication Tab -->
        <p-tabPanel header="Audience & Publication">
          <div *ngIf="publicationsLoading" style="text-align:center;padding:24px"><i class="pi pi-spin pi-spinner" style="font-size: var(--font-size-xl)"></i></div>
          <div *ngIf="!publicationsLoading && publications.length === 0" class="empty-mini">No publications for this policy yet.</div>
          <div *ngIf="!publicationsLoading && publications.length > 0" class="pub-list">
            <div *ngFor="let pub of publications" class="pub-card">
              <div class="pub-header">
                <strong>{{ pub.campaign_name }}</strong>
                <app-status-badge [status]="pub.status" />
                <span class="pub-channel"><i class="pi pi-send"></i> {{ pub.publish_channel }}</span>
              </div>
              <div class="pub-meta">Published: {{ pub.published_at | appDate:'medium' }} &middot; Audiences: {{ pub.audience_count || 0 }}</div>
              <div *ngIf="pub.delivery_stats" class="pub-delivery">
                <span>Delivered: {{ pub.delivery_stats.delivered || 0 }}</span>
                <span>Viewed: {{ pub.delivery_stats.viewed || 0 }}</span>
                <span>Acknowledged: {{ pub.delivery_stats.acknowledged || 0 }}</span>
                <p-progressBar [value]="pub.delivery_stats.completionRate || 0" [showValue]="true" styleClass="mt-1" />
              </div>
            </div>
          </div>
          <div class="pub-scope mt-3" *ngIf="policy">
            <div class="detail-row"><span class="detail-label">Audience Scope</span><span>{{ policy.audience_scope || 'all' }}</span></div>
            <div class="detail-row"><span class="detail-label">Publication State</span><app-status-badge [status]="policy.publication_state || 'unpublished'" /></div>
          </div>
        </p-tabPanel>

        <!-- Acknowledgments Tab -->
        <p-tabPanel header="Acknowledgments">
          <div *ngIf="ackLoading" style="text-align:center;padding:24px"><i class="pi pi-spin pi-spinner" style="font-size: var(--font-size-xl)"></i></div>
          <div *ngIf="!ackLoading && ackCampaigns.length === 0" class="empty-mini">No acknowledgment campaigns for this policy.</div>
          <div *ngIf="!ackLoading && ackCampaigns.length > 0" class="ack-list">
            <div *ngFor="let c of ackCampaigns" class="ack-card">
              <div class="ack-header">
                <strong>{{ c.name }}</strong>
                <app-status-badge [status]="c.status" />
                <span class="ack-due">Due: {{ c.due_date | appDate:'medium' }}</span>
              </div>
              <div class="ack-stats">
                <span class="ack-stat"><i class="pi pi-check-circle" style="color:var(--success)"></i> {{ c.attested || 0 }}</span>
                <span class="ack-stat"><i class="pi pi-clock" style="color:var(--warning)"></i> {{ c.pending || 0 }}</span>
                <span class="ack-stat"><i class="pi pi-times-circle" style="color:var(--error)"></i> {{ c.declined || 0 }}</span>
                <span class="ack-stat">{{ c.completionRate || 0 }}% complete</span>
              </div>
              <p-progressBar [value]="c.completionRate || 0" [showValue]="false" styleClass="mt-1" />
            </div>
          </div>
        </p-tabPanel>

        <!-- Exceptions Tab -->
        <p-tabPanel header="Exceptions">
          <div *ngIf="exceptionsLoading" style="text-align:center;padding:24px"><i class="pi pi-spin pi-spinner" style="font-size: var(--font-size-xl)"></i></div>
          <div *ngIf="!exceptionsLoading && exceptions.length === 0" class="empty-mini">No exceptions for this policy.</div>
          <div *ngIf="!exceptionsLoading && exceptions.length > 0" class="exc-list">
            <div *ngFor="let exc of exceptions" class="exc-card">
              <div class="exc-header">
                <app-status-badge [status]="exc.status" />
                <span class="exc-priority" [class]="'priority-' + exc.priority">{{ exc.priority }}</span>
                <span class="exc-date">{{ exc.created_at | appDate:'medium' }}</span>
              </div>
              <div class="exc-reason">{{ exc.reason }}</div>
              <div *ngIf="exc.compensating_controls" class="exc-controls">
                <strong>Compensating Controls:</strong> {{ exc.compensating_controls }}
              </div>
              <div *ngIf="exc.expiry_date" class="exc-expiry">
                <i class="pi pi-calendar"></i> Expires: {{ exc.expiry_date | appDate:'medium' }}
              </div>
            </div>
          </div>
        </p-tabPanel>

        <!-- Coverage & Linkage Tab -->
        <p-tabPanel header="Coverage & Linkage">
          <div *ngIf="linksLoading" style="text-align:center;padding:24px"><i class="pi pi-spin pi-spinner" style="font-size: var(--font-size-xl)"></i></div>
          <div *ngIf="!linksLoading" class="links-section">
            <h4>Linked Obligations ({{ policyLinks?.obligations?.length || 0 }})</h4>
            <div *ngIf="!policyLinks?.obligations?.length" class="empty-mini">No obligations linked.</div>
            <div *ngFor="let o of policyLinks?.obligations" class="link-item">
              <i class="pi pi-book"></i> {{ o.title || o.obligation_id }} <p-tag [value]="o.link_type" severity="info" styleClass="ms-2" />
            </div>

            <h4 class="mt-3">Linked Controls ({{ policyLinks?.controls?.length || 0 }})</h4>
            <div *ngIf="!policyLinks?.controls?.length" class="empty-mini">No controls linked.</div>
            <div *ngFor="let c of policyLinks?.controls" class="link-item">
              <i class="pi pi-shield"></i> {{ c.title || c.control_id }} <p-tag [value]="c.link_type" severity="success" styleClass="ms-2" />
            </div>

            <h4 class="mt-3">Linked Risks ({{ policyLinks?.risks?.length || 0 }})</h4>
            <div *ngIf="!policyLinks?.risks?.length" class="empty-mini">No risks linked.</div>
            <div *ngFor="let r of policyLinks?.risks" class="link-item">
              <i class="pi pi-exclamation-triangle"></i> {{ r.title || r.risk_id }} <p-tag [value]="r.link_type" severity="warning" styleClass="ms-2" />
            </div>

            <h4 class="mt-3">Linked Issues ({{ policyLinks?.issues?.length || 0 }})</h4>
            <div *ngIf="!policyLinks?.issues?.length" class="empty-mini">No issues linked.</div>
            <div *ngFor="let iss of policyLinks?.issues" class="link-item">
              <i class="pi pi-flag"></i> {{ iss.title || iss.issue_id }} <p-tag [value]="iss.link_type" severity="danger" styleClass="ms-2" />
            </div>
          </div>
        </p-tabPanel>

        <!-- Audit Tab -->
        <p-tabPanel [header]="i18n.translate('policies.audit')">
          <div class="audit-link-box">
            <i class="pi pi-history"></i>
            <a [routerLink]="['/foundation/audit']" [queryParams]="{entityType:'policy', entityId: policy.policy_id}">
              {{ i18n.translate('policies.viewAuditTrail') }}
            </a>
          </div>
        </p-tabPanel>
      </p-tabView>
    </div>
  `,
    styles: [`
    .drawer-overlay { position: fixed; inset: 0; background: rgba(var(--color-black-rgb), 0.3); z-index: var(--z-modal-backdrop); }
    .drawer { position: fixed; top: 0; inset-inline-end: -520px; width: 520px; height: 100vh; background: var(--surface-card); z-index: var(--z-modal); box-shadow: -4px 0 20px rgba(var(--color-black-rgb), 0.15); transition: inset-inline-end 300ms ease; overflow-y: auto; padding: 16px; }
    .drawer.open { inset-inline-end: 0; }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .drawer-header h3 { margin: 0; font-size: var(--font-size-lg); }
    .detail-grid { display: flex; flex-direction: column; gap: 10px; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--surface-border, #f0f0f0); font-size: var(--font-size-sm); }
    .detail-label { font-weight: 600; color: var(--text-muted, var(--text-muted)); min-width: 120px; }
    .overdue-badge { display: inline-block; font-size: var(--font-size-xs); font-weight: 600; color: var(--error); background: #fee2e2; padding: 1px 6px; border-radius: var(--radius-xs); margin-inline-start: 6px; }
    .due-badge { display: inline-block; font-size: var(--font-size-xs); font-weight: 600; color: #7c3aed; background: #ede9fe; padding: 1px 6px; border-radius: var(--radius-xs); margin-inline-start: 6px; }
    .content-view { padding: 12px 0; font-size: var(--font-size-base); line-height: 1.6; white-space: pre-wrap; }
    .linked-section { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--surface-border); }
    .linked-section h4 { font-size: var(--font-size-base); font-weight: 600; margin: 0 0 8px; }
    .linked-item { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); padding: 4px 0; }
    .version-list { display: flex; flex-direction: column; gap: 8px; }
    .version-card { padding: 10px 14px; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .version-card.active { border-color: var(--primary-500, var(--primary)); background: var(--primary-50, #eff6ff); }
    .ver-header { display: flex; align-items: center; gap: 8px; }
    .ver-meta { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); margin-top: 4px; }
    .ver-summary { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-top: 2px; font-style: italic; }
    .empty-mini { text-align: center; padding: 24px; color: var(--text-muted, #9ca3af); font-size: var(--font-size-sm); }
    .approval-list { display: flex; flex-direction: column; gap: 8px; }
    .approval-card { padding: 10px 14px; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .approval-header { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); }
    .approval-action { font-weight: 600; }
    .approval-date { font-size: var(--font-size-xs); color: var(--text-muted); margin-inline-start: auto; }
    .approval-chain { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    .chain-step { font-weight: 500; }
    .approval-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .audit-link-box { display: flex; align-items: center; gap: 12px; padding: 24px; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius-md); border: 1px solid var(--surface-border); }
    .audit-link-box a { color: var(--primary-500, var(--primary)); text-decoration: none; font-weight: 600; }
    .audit-link-box a:hover { text-decoration: underline; }
    .pub-list, .ack-list, .exc-list { display: flex; flex-direction: column; gap: 8px; }
    .pub-card, .ack-card, .exc-card { padding: 10px 14px; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .pub-header, .ack-header, .exc-header { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); }
    .pub-channel { font-size: var(--font-size-xs); color: var(--text-muted); margin-inline-start: auto; }
    .pub-meta { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 4px; }
    .pub-delivery { display: flex; gap: 12px; font-size: var(--font-size-xs); margin-top: 6px; flex-wrap: wrap; }
    .pub-scope { padding-top: 12px; border-top: 1px solid var(--surface-border); }
    .ack-due { font-size: var(--font-size-xs); color: var(--text-muted); margin-inline-start: auto; }
    .ack-stats { display: flex; gap: 12px; font-size: var(--font-size-sm); margin-top: 6px; }
    .ack-stat { display: flex; align-items: center; gap: 4px; }
    .exc-reason { font-size: var(--font-size-sm); margin-top: 4px; }
    .exc-controls { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 4px; }
    .exc-expiry { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
    .exc-priority { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; }
    .priority-critical { color: var(--severity-critical, var(--error)); }
    .priority-high { color: var(--severity-high, #f97316); }
    .priority-medium { color: var(--severity-medium, var(--warning)); }
    .priority-low { color: var(--severity-low, var(--success)); }
    .exc-date { font-size: var(--font-size-xs); color: var(--text-muted); margin-inline-start: auto; }
    .links-section h4 { font-size: var(--font-size-base); font-weight: 600; margin: 0 0 8px; }
    .link-item { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); padding: 4px 0; }
    .mt-1 { margin-top: 4px; }
    .mt-3 { margin-top: 12px; }
    .ms-2 { margin-inline-start: 8px; }
    .me-1 { margin-inline-end: 4px; }
  `]
})
export class PolicyDetailTabsComponent {
  @Input() visible = false;
  @Input() policy: GrcRecord | null = null;
  @Input() sanitizedContent = '';
  @Input() versions: GrcRecord[] = [];
  @Input() versionsLoading = false;
  @Input() linkedProcedures: GrcRecord[] = [];
  @Input() approvalRequests: GrcRecord[] = [];
  @Input() approvalsLoading = false;
  @Input() publications: any[] = [];
  @Input() publicationsLoading = false;
  @Input() ackCampaigns: any[] = [];
  @Input() ackLoading = false;
  @Input() exceptions: any[] = [];
  @Input() exceptionsLoading = false;
  @Input() policyLinks: any = null;
  @Input() linksLoading = false;

  @Output() closed = new EventEmitter<void>();
  @Output() viewVersion = new EventEmitter<GrcRecord>();
  @Output() createNewVersion = new EventEmitter<void>();
  @Output() submitForApproval = new EventEmitter<void>();
  @Output() approvePolicy = new EventEmitter<GrcRecord>();
  @Output() rejectPolicy = new EventEmitter<void>();
  @Output() publishPolicy = new EventEmitter<void>();

  constructor(public i18n: I18nService) {}

  isReviewOverdue(p: GrcRecord): boolean {
    return p.next_review_date && new Date(p.next_review_date) < new Date();
  }

  isReviewDueSoon(p: GrcRecord): boolean {
    const d = new Date();
    return p.next_review_date && new Date(p.next_review_date) <= new Date(d.getTime() + 30 * 86400000);
  }
}
