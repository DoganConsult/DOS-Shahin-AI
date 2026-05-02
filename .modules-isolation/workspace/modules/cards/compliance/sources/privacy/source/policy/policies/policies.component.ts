import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { FoundationDataService } from '@app/grc';
import { Policy } from '@app/core/models/grc.models';
import { computed } from '@angular/core';
import { HtmlSanitizerService } from '@app/core/services/ui-infra/error-handling/html-sanitizer.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { getModuleTabs } from '@app/shared/contracts/module-tab-registry';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { TabViewModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { devError } from '../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';
import { GrcOperationsService } from '@app/api';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-policies',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent,
    TableModule, TagModule, ButtonModule, DialogModule,
    InputTextModule, InputTextarea, DropdownModule, TooltipModule,
    AiPanelComponent, ExportButtonComponent, TabViewModule, ToastModule, RouterModule,
    ConfirmDialogModule, AppDatePipe, RaciPanelComponent],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Policies" titleAr="السياسات"
        subtitleEn="Manage governance and compliance policies — lifecycle, owners, review cycles"
        subtitleAr="إدارة سياسات الحوكمة والامتثال — الدورة والملاك وجداول المراجعة"
        icon="file"
        [breadcrumbs]="[i18n.translate('policies.dashboard'), i18n.translate('policies.governance'), i18n.translate('policies.policies')]"
        [actions]="headerActions" [isAr]="isAr()" [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="isAr()" />
      <app-raci-panel entityType="policy" [entityId]="selectedPolicy?.policy_id || ''" [canEdit]="true" />
      <div class="gov-body">
      <p-toast />

      <div class="health-strip" *ngIf="loaded">
        <div tabindex="0" role="button" (keyup.enter)="clearFilters()" class="hs-card" (click)="clearFilters()"><div class="hs-value">{{ policies.length }}</div><div class="hs-label">{{ i18n.translate('policies.total') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('published')" class="hs-card" (click)="applyHealthFilter('published')"><div class="hs-value" style="color:var(--success)">{{ publishedPct }}%</div><div class="hs-label">{{ i18n.translate('policies.published') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('missing_owner')" class="hs-card" (click)="applyHealthFilter('missing_owner')"><div class="hs-value" style="color:#d97706">{{ missingOwnerCount }}</div><div class="hs-label">{{ i18n.translate('policies.noOwner') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('missing_review')" class="hs-card" (click)="applyHealthFilter('missing_review')"><div class="hs-value" style="color:var(--warning)">{{ missingReviewCount }}</div><div class="hs-label">{{ i18n.translate('policies.noReviewDate') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('due_soon')" class="hs-card" (click)="applyHealthFilter('due_soon')"><div class="hs-value" style="color:#7c3aed">{{ dueSoonCount }}</div><div class="hs-label">{{ i18n.translate('policies.dueSoon') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('overdue')" class="hs-card" (click)="applyHealthFilter('overdue')"><div class="hs-value" style="color:var(--error)">{{ overdueCount }}</div><div class="hs-label">{{ i18n.translate('policies.overdue') }}</div></div>
      </div>

      <!-- Page Toolbar -->
      <div class="page-toolbar">
        <div class="toolbar-primary">
          <p-button [label]="i18n.translate('policies.addPolicy')" icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('policies.searchPolicies')" [attr.aria-label]="i18n.translate('policies.searchPolicies')"
                   (input)="filterPolicies()" class="search-input" />
          </div>
        </div>
        <div class="toolbar-secondary">
          <p-dropdown [options]="statusFilterOptions" [(ngModel)]="statusFilter" optionLabel="label" optionValue="value"
                      [placeholder]="i18n.translate('common.status')" (onChange)="filterPolicies()" [style]="{minWidth:'140px'}" />
          <p-button [label]="i18n.translate('policies.export')" icon="pi pi-download" severity="secondary" [outlined]="true"
                    (onClick)="exportCSV()" [pTooltip]="i18n.translate('policies.exportCsv')" />
          <app-export-button module="policies" [label]="i18n.translate('policies.export')" [data]="filteredPolicies" />
        </div>
      </div>

      <!-- Bulk Action Bar -->
      <div class="bulk-bar" *ngIf="selectedPolicies.length > 0">
        <span class="bulk-count">{{ selectedPolicies.length }} {{ i18n.translate('policies.selected') }}</span>
        <p-button [label]="i18n.translate('policies.bulkApprove')" icon="pi pi-check-circle" size="small" severity="success" (onClick)="bulkApprove()" />
        <p-button [label]="i18n.translate('policies.bulkArchive')" icon="pi pi-inbox" size="small" severity="secondary" (onClick)="bulkArchive()" />
        <p-button icon="pi pi-times" size="small" [text]="true" (onClick)="selectedPolicies = []" [pTooltip]="i18n.translate('policies.clearSelection')" />
      </div>

      <!-- Table with forced LTR column layout (Actions stays far-right), RTL text via CSS -->
      <div class="table-shell" *ngIf="filteredPolicies.length > 0">
        <p-table aria-label="Filtered Policies table" [value]="filteredPolicies" [paginator]="filteredPolicies.length > 10" [rows]="10"
                 styleClass="p-datatable-striped p-datatable-sm"
                 [(selection)]="selectedPolicies" dataKey="policy_id">
          <ng-template pTemplate="header">
            <tr>
              <th class="col-check"><p-tableHeaderCheckbox /></th>
              <th class="col-title" pSortableColumn="title">{{ i18n.translate('policies.policy') }} <p-sortIcon field="title" /></th>
              <th class="col-cat">{{ i18n.translate('policies.category') }}</th>
              <th class="col-status">{{ i18n.translate('common.status') }}</th>
              <th class="col-ver" pSortableColumn="version">{{ i18n.translate('policies.version') }}</th>
              <th class="col-owner">{{ i18n.translate('policies.owner') }}</th>
              <th class="col-date">{{ i18n.translate('policies.reviewDate') }}</th>
              <th class="col-actions">{{ i18n.translate('common.actions') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-p>
            <tr [class.row-selected]="selectedPolicies.includes(p)">
              <td tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="col-check" (click)="$event.stopPropagation()"><p-tableCheckbox [value]="p" /></td>
              <td tabindex="0" role="button" (keyup.enter)="openDetail(p)" class="col-title policy-title-cell" (click)="openDetail(p)">
                <strong class="policy-name">{{ p.title }}</strong>
                <span *ngIf="p.owner" class="policy-owner-hint">{{ p.owner }}</span>
              </td>
              <td class="col-cat">{{ p.category || '—' }}</td>
              <td class="col-status"><app-status-badge [status]="p.status" /></td>
              <td class="col-ver">v{{ p.version }}</td>
              <td class="col-owner">{{ p.owner || '—' }}</td>
              <td class="col-date">
                <span *ngIf="p.next_review_date">{{ p.next_review_date | date:'dd MMM yyyy' }}</span>
                <span *ngIf="!p.next_review_date" class="text-muted">—</span>
                <span *ngIf="isReviewOverdue(p)" class="badge-overdue">{{ i18n.translate('policies.overdue') }}</span>
                <span *ngIf="isReviewDueSoon(p) && !isReviewOverdue(p)" class="badge-due">{{ i18n.translate('policies.dueSoon') }}</span>
              </td>
              <td tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="col-actions" (click)="$event.stopPropagation()">
                <div class="action-btns">
                  <button aria-label="Code" class="icon-btn rules" (click)="openRulesDialog(p)"
                          [pTooltip]="i18n.translate('policies.policyRules')" tooltipPosition="top"><i class="pi pi-code"></i></button>
                  <button aria-label="Edit" class="icon-btn" (click)="openEditDialog(p)"
                          [pTooltip]="i18n.translate('common.edit')" tooltipPosition="top"><i class="pi pi-pencil"></i></button>
                  <button aria-label="Confirm" class="icon-btn approve" (click)="approve(p)"
                          [pTooltip]="i18n.translate('policies.approve')" tooltipPosition="top"
                          *ngIf="p.status === 'draft'"><i class="pi pi-check-circle"></i></button>
                  <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(p)"
                          [pTooltip]="i18n.translate('common.delete')" tooltipPosition="top"><i class="pi pi-trash"></i></button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="8" class="empty-msg">{{ i18n.translate('policies.noPolicies') }}</td></tr>
          </ng-template>
        </p-table>
      </div>

      <div *ngIf="loaded && filteredPolicies.length === 0" class="empty-state">
        <i class="pi pi-file empty-icon"></i>
        <p>{{ i18n.translate('policies.noPolicies') }}</p>
        <p class="empty-hint">{{ i18n.translate('gettingStarted.createFirstPolicy') }}</p>
        <p-button [label]="i18n.translate('policies.addPolicy')" icon="pi pi-plus" (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <!-- Policy Detail Drawer -->
      <div tabindex="0" role="button" (keyup.enter)="drawerVisible = false" class="drawer-overlay" *ngIf="drawerVisible" (click)="drawerVisible = false"></div>
      <div class="drawer" [class.open]="drawerVisible">
        <div class="drawer-header">
          <h3>{{ selectedPolicy?.title }}</h3>
          <button aria-label="Close" pButton icon="pi pi-times" class="p-button-text p-button-rounded" (click)="drawerVisible = false"></button>
        </div>
        <p-tabView *ngIf="selectedPolicy">
          <p-tabPanel [header]="i18n.translate('policies.overview')">
            <div class="detail-grid">
              <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.id') }}</span><span>{{ selectedPolicy.policy_id }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.category') }}</span><span>{{ selectedPolicy.category || '—' }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.owner') }}</span><span>{{ selectedPolicy.owner || '—' }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.departmentBU') }}</span><span>{{ selectedPolicy.department || selectedPolicy.business_unit || '—' }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ i18n.translate('common.status') }}</span><app-status-badge [status]="selectedPolicy.status" /></div>
              <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.version') }}</span><span>v{{ selectedPolicy.version || 1 }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.effectiveDate') }}</span><span>{{ selectedPolicy.effective_date | appDate:'medium' }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.reviewDate') }}</span>
                <span>{{ selectedPolicy.next_review_date | appDate:'medium' }}
                  <span *ngIf="isReviewOverdue(selectedPolicy)" class="overdue-badge">{{ i18n.translate('policies.overdue') }}</span>
                  <span *ngIf="isReviewDueSoon(selectedPolicy) && !isReviewOverdue(selectedPolicy)" class="due-badge">{{ i18n.translate('policies.dueSoon') }}</span>
                </span>
              </div>
              <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.frameworks') }}</span>
                <span><p-tag *ngFor="let fw of selectedPolicy.frameworks?.slice(0,5)" [value]="fw" severity="info" styleClass="me-1" /></span>
              </div>
              <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.created') }}</span><span>{{ selectedPolicy.created_at | appDate:'medium' }}</span></div>
              <div class="detail-row"><span class="detail-label">{{ i18n.translate('policies.updated') }}</span><span>{{ selectedPolicy.updated_at | appDate:'medium' }}</span></div>
            </div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.translate('policies.content')">
            <div class="content-view" [innerHTML]="sanitizeHtml(selectedPolicy.content)"></div>
            <div *ngIf="linkedProcedures.length > 0" class="linked-section">
              <h4>{{ i18n.translate('policies.linkedProcedures') }}</h4>
              <div *ngFor="let proc of linkedProcedures" class="linked-item">
                <i class="pi pi-list"></i> {{ proc.title }} <app-status-badge [status]="proc.status || proc.approval_status" />
              </div>
            </div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.translate('policies.versions')">
            <div *ngIf="versionsLoading" style="text-align:center;padding:24px"><i class="pi pi-spin pi-spinner" style="font-size: var(--font-size-xl)"></i></div>
            <div *ngIf="!versionsLoading && policyVersions.length === 0" class="empty-mini">{{ i18n.translate('policies.noVersions') }}</div>
            <div class="version-list" *ngIf="!versionsLoading && policyVersions.length > 0">
              <div *ngFor="let v of policyVersions" class="version-card" [class.active]="v.version === selectedPolicy.version">
                <div class="ver-header">
                  <strong>v{{ v.version }}</strong>
                  <app-status-badge [status]="v.status" />
                </div>
                <div class="ver-meta">{{ v.changed_by || v.author || '—' }} · {{ v.updated_at || v.created_at | appDate:'medium' }}</div>
                <div class="ver-summary" *ngIf="v.change_summary">{{ v.change_summary }}</div>
                <p-button [label]="i18n.translate('policies.viewVersion')" icon="pi pi-eye" [text]="true" size="small" (onClick)="viewVersion(v)" styleClass="mt-1" />
              </div>
            </div>
            <p-button [label]="i18n.translate('policies.createNewVersion')" icon="pi pi-plus" [outlined]="true"
                      (onClick)="createNewVersion()" styleClass="mt-3" />
          </p-tabPanel>
          <p-tabPanel [header]="i18n.translate('policies.approvals')">
            <div *ngIf="approvalsLoading" style="text-align:center;padding:24px"><i class="pi pi-spin pi-spinner" style="font-size: var(--font-size-xl)"></i></div>
            <div *ngIf="!approvalsLoading && approvalRequests.length === 0" class="empty-mini">
              {{ i18n.translate('policies.noApprovalRequests') }}
            </div>
            <div class="approval-list" *ngIf="!approvalsLoading && approvalRequests.length > 0">
              <div *ngFor="let a of approvalRequests" class="approval-card">
                <div class="approval-header">
                  <app-status-badge [status]="a.status" />
                  <span class="approval-action">{{ a.action }}</span>
                  <span class="approval-date">{{ a.createdAt || a.created_at | appDate:'medium' }}</span>
                </div>
                <div class="approval-chain" *ngIf="a.approverChain?.length">
                  <span *ngFor="let step of a.approverChain; let i = index" class="chain-step">
                    {{ step.userId || step.role }} <span *ngIf="i < a.approverChain.length - 1"> → </span>
                  </span>
                </div>
              </div>
            </div>
            <div class="approval-actions mt-3">
              <p-button *ngIf="selectedPolicy.status === 'draft'" [label]="i18n.translate('policies.submitForApproval')"
                        icon="pi pi-send" (onClick)="submitForApproval()" />
              <p-button *ngIf="selectedPolicy.status === 'draft' || selectedPolicy.status === 'review' || selectedPolicy.approval_status === 'draft'"
                        [label]="i18n.translate('policies.approve')" icon="pi pi-check" severity="success" (onClick)="approve(selectedPolicy)" styleClass="ms-2" />
              <p-button *ngIf="selectedPolicy.status === 'draft' || selectedPolicy.status === 'review'"
                        [label]="i18n.translate('policies.reject')" icon="pi pi-times" severity="danger" [outlined]="true" (onClick)="showRejectPolicyDialog = true" styleClass="ms-2" />
              <p-button *ngIf="selectedPolicy.status === 'approved'"
                        [label]="i18n.translate('policies.publish')" icon="pi pi-globe" severity="info" (onClick)="publishPolicy()" styleClass="ms-2" />
            </div>
          </p-tabPanel>
          <p-tabPanel [header]="i18n.translate('policies.audit')">
            <div class="audit-link-box">
              <i class="pi pi-history"></i>
              <a [routerLink]="['/foundation/audit']" [queryParams]="{entityType:'policy', entityId: selectedPolicy.policy_id}">
                {{ i18n.translate('policies.viewAuditTrail') }}
              </a>
            </div>
          </p-tabPanel>
        </p-tabView>
      </div>

      <!-- Create / Edit Dialog -->
      <p-dialog [header]="editMode ? i18n.translate('policies.editPolicy') : i18n.translate('policies.addPolicy')"
                [(visible)]="showDialog" [modal]="true" [style]="{width:'600px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('policies.titleLabel') }}</label>
            <input pInputText [(ngModel)]="form.title" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('policies.content') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.content" [rows]="5" class="w-full"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('policies.owner') }}</label>
              <input pInputText [(ngModel)]="form.owner" class="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('common.status') }}</label>
              <p-dropdown [(ngModel)]="form.status" [options]="statusOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('policies.category') }}</label>
            <p-dropdown [options]="policyCatOptions()" [(ngModel)]="form.category"
                        optionLabel="label" optionValue="value" styleClass="w-full"
                        [placeholder]="i18n.translate('policies.selectCategory')"
                        [showClear]="true" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('policies.frameworksCommaSeparated') }}</label>
            <input pInputText [(ngModel)]="form.frameworksStr" class="w-full" placeholder="ISO 27001, NCA ECC" aria-label="ISO 27001, NCA ECC" />
          </div>
          <div class="field ra-toggle">
            <label class="ra-label">
              <input type="checkbox" [(ngModel)]="form.requiresAcknowledgement" />
              <span>{{ i18n.translate('policies.requireAcknowledge') }}</span>
            </label>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="showDialog=false" />
          <p-button [label]="i18n.translate('common.save')" icon="pi pi-check" (onClick)="savePolicy()" [disabled]="!form.title || !form.content" />
        </ng-template>
      </p-dialog>

      <!-- Policy Rules Dialog -->
      <p-dialog [header]="i18n.translate('policies.policyRules')"
                [(visible)]="showRulesDialog" [modal]="true" [style]="{width:'700px'}">
        <div *ngIf="rulesLoading" style="text-align:center; padding:24px;"><i class="pi pi-spin pi-spinner" style="font-size: var(--font-size-2xl);"></i></div>
        <div *ngIf="!rulesLoading && policyRules.length === 0" class="empty-state" style="padding:24px;">No rules defined for this policy</div>
        <div *ngIf="!rulesLoading && policyRules.length > 0" class="rules-list">
          <div *ngFor="let rule of policyRules; let idx = index" class="rule-card">
            <div class="rule-header">
              <span class="rule-idx">#{{ idx + 1 }}</span>
              <span class="rule-field">{{ rule.field }}</span>
              <span class="rule-op">{{ rule.operator }}</span>
              <span class="rule-val">{{ rule.value }}</span>
              <span class="rule-severity" [class]="'sev-' + rule.severity">{{ rule.severity }}</span>
            </div>
            <p class="rule-message" *ngIf="rule.message">{{ rule.message }}</p>
          </div>
        </div>
        <div *ngIf="executeResult" class="execute-result">
          <strong>{{ i18n.translate('policies.executionResult') }}</strong>
          <pre>{{ executeResult | json }}</pre>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('policies.executeRules')" icon="pi pi-play"
                    (onClick)="executeRules()" [disabled]="policyRules.length === 0" />
          <p-button [label]="i18n.translate('policies.close')" icon="pi pi-times" [text]="true" (onClick)="showRulesDialog=false" />
        </ng-template>
      </p-dialog>

      <!-- Reject Policy Dialog -->
      <p-dialog [header]="i18n.translate('policies.rejectPolicy')" [(visible)]="showRejectPolicyDialog" [modal]="true" [style]="{width:'440px'}">
        <div class="dialog-form">
          <div class="field"><label>{{ i18n.translate('policies.rejectionReason') }}</label>
            <textarea pInputTextarea [(ngModel)]="rejectPolicyReason" [rows]="3" class="w-full" [placeholder]="i18n.translate('policies.enterRejectionReason')" [attr.aria-label]="i18n.translate('policies.enterRejectionReason')"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="showRejectPolicyDialog = false" />
          <p-button [label]="i18n.translate('policies.reject')" icon="pi pi-times" severity="danger" (onClick)="rejectPolicy()" [disabled]="!rejectPolicyReason" />
        </ng-template>
      </p-dialog>

      <!-- Delete Confirmation -->
      <p-dialog [header]="i18n.translate('policies.confirmDelete')" [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('policies.deleteConfirm') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="showDeleteDialog=false" />
          <p-button [label]="i18n.translate('common.delete')" icon="pi pi-trash" severity="danger" (onClick)="deletePolicy()" />
        </ng-template>
      </p-dialog>
      </div>
    </div>
    <app-ai-panel module="policies" />
    <p-confirmDialog />
  `,
  styles: [`
    /* ─── Page shell ─── */
    :host { display: flex; flex-direction: column; min-height: 100%; }
    .gov-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ice, var(--surface-ice)); }
    .gov-body  { flex: 1; padding: 16px 24px 32px; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
    @media (max-width: 768px) { .gov-body { padding: 12px; gap: 10px; } }

    /* ─── KPI health strip ─── */
    .health-strip { display: flex; gap: 10px; flex-wrap: wrap; }
    .hs-card {
      flex: 1; min-width: 90px; text-align: center; padding: 10px 6px;
      background: var(--surface-card, #fff); border-radius: var(--radius-md);
      border: 1px solid var(--surface-border, var(--border-subtle)); cursor: pointer; transition: box-shadow .15s;
    }
    .hs-card:hover { box-shadow: var(--shadow-card); }
    .hs-value { font-size: var(--font-size-lg); font-weight: 700; color: var(--text-heading, #111); }
    .hs-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }

    /* ─── Page toolbar ─── */
    .page-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; flex-wrap: wrap;
      background: var(--surface-card, #fff);
      border: 1px solid var(--surface-border, var(--border-subtle));
      border-radius: var(--radius-md); padding: 10px 14px;
    }
    .toolbar-primary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .toolbar-secondary { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .search-wrap { position: relative; display: inline-flex; align-items: center; }
    .search-icon { position: absolute; inset-inline-start: 10px; color: var(--text-muted, #9ca3af); font-size: var(--font-size-sm); z-index: var(--z-base); pointer-events: none; }
    .search-input { min-width: 200px; padding-inline-start: 32px; }
    @media (max-width: 768px) {
      .page-toolbar { flex-direction: column; align-items: stretch; }
      .toolbar-primary, .toolbar-secondary { width: 100%; justify-content: space-between; }
      .search-input { min-width: 0; flex: 1; }
    }

    /* ─── Bulk action bar ─── */
    .bulk-bar {
      display: flex; align-items: center; gap: 10px; padding: 8px 12px;
      background: var(--primary-50, #eff6ff); border: 1px solid var(--primary-200, #bfdbfe);
      border-radius: var(--radius); flex-wrap: wrap;
    }
    .bulk-count { font-size: var(--font-size-sm); font-weight: 700; color: var(--primary-700, #1d4ed8); flex: 1; }

    /* ─── Table shell — LTR forced column order, RTL text per cell ─── */
    .table-shell {
      background: var(--surface-card, #fff);
      border: 1px solid var(--surface-border, var(--border-subtle));
      border-radius: var(--radius-md); overflow: hidden;
      direction: ltr;        /* force column order: Actions stays far-right */
    }
    /* Keep centered check column in all directions */

    /* Column sizing */
    .col-check   { width: 40px; text-align: center; }
    .col-title   { min-width: 200px; }
    .col-cat     { width: 130px; }
    .col-status  { width: 110px; }
    .col-ver     { width: 70px; }
    .col-owner   { width: 140px; font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .col-date    { width: 150px; }
    .col-actions { width: 130px; }

    /* Policy title cell */
    .policy-title-cell { cursor: pointer; }
    .policy-title-cell:hover .policy-name { color: var(--primary-600, #2563eb); }
    .policy-name { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading, var(--text-heading)); display: block; }
    .policy-owner-hint { font-size: var(--font-size-xs); color: var(--text-muted, #9ca3af); display: none; }

    /* Review date badges */
    .badge-overdue { display: inline-block; font-size: var(--font-size-xs); font-weight: 600; color: var(--error); background: #fee2e2; padding: 1px 6px; border-radius: var(--radius-xs); margin-inline-start: 6px; }
    .badge-due     { display: inline-block; font-size: var(--font-size-xs); font-weight: 600; color: #7c3aed; background: #ede9fe; padding: 1px 6px; border-radius: var(--radius-xs); margin-inline-start: 6px; }
    .text-muted    { color: var(--text-muted, #9ca3af); font-size: var(--font-size-sm); }

    /* ─── Action buttons — 32×32 min hit area ─── */
    .action-btns { display: flex; gap: 4px; align-items: center; }
    .icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 32px; min-height: 32px;
      background: none; border: 1px solid transparent; cursor: pointer;
      color: var(--text-muted, var(--text-muted)); border-radius: var(--radius-sm);
      transition: all 150ms; font-size: var(--font-size-base);
    }
    .icon-btn:hover        { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .icon-btn.approve      { color: var(--success); }
    .icon-btn.approve:hover{ background: #ecfdf5; border-color: #6ee7b7; }
    .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); border-color: #fca5a5; }
    .icon-btn.rules:hover  { background: var(--purple-50, #f5f3ff); color: #7c3aed; border-color: #ddd6fe; }

    /* ─── Row states ─── */
    .row-selected { background: var(--primary-50, #eff6ff); }

    /* ─── Empty & messages ─── */
    .empty-msg   { text-align: center; color: var(--text-muted, var(--text-muted)); padding: 32px; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted, var(--text-muted)); }
    .empty-state .empty-hint { font-size: var(--font-size-sm, 0.875rem); margin: 8px 0 16px; opacity: 0.9; }
    .empty-icon  { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; color: var(--text-muted, #9ca3af); }

    /* ─── Detail drawer ─── */
    .drawer-overlay { position: fixed; inset: 0; background: rgba(var(--color-black-rgb), 0.3); z-index: var(--z-modal-backdrop); }
    .drawer { position: fixed; top: 0; inset-inline-end: -520px; width: 520px; height: 100vh; background: var(--surface-card); z-index: var(--z-modal); box-shadow: -4px 0 20px rgba(var(--color-black-rgb), 0.15); transition: inset-inline-end 300ms ease; overflow-y: auto; padding: 16px; }
    .drawer.open { inset-inline-end: 0; }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .drawer-header h3 { margin: 0; font-size: var(--font-size-lg); }
    .detail-grid { display: flex; flex-direction: column; gap: 10px; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--surface-border, #f0f0f0); font-size: var(--font-size-sm); }
    .detail-label { font-weight: 600; color: var(--text-muted, var(--text-muted)); min-width: 120px; }
    .overdue-badge { display: inline-block; font-size: var(--font-size-xs); font-weight: 600; color: var(--error); background: #fee2e2; padding: 1px 6px; border-radius: var(--radius-xs); margin-inline-start: 6px; }
    .due-badge     { display: inline-block; font-size: var(--font-size-xs); font-weight: 600; color: #7c3aed; background: #ede9fe; padding: 1px 6px; border-radius: var(--radius-xs); margin-inline-start: 6px; }
    .content-view  { padding: 12px 0; font-size: var(--font-size-base); line-height: 1.6; white-space: pre-wrap; }
    .linked-section { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--surface-border); }
    .linked-section h4 { font-size: var(--font-size-base); font-weight: 600; margin: 0 0 8px; }
    .linked-item { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); padding: 4px 0; }
    .version-list { display: flex; flex-direction: column; gap: 8px; }
    .version-card { padding: 10px 14px; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .version-card.active { border-color: var(--primary-500, var(--primary)); background: var(--primary-50, #eff6ff); }
    .ver-header { display: flex; align-items: center; gap: 8px; }
    .ver-meta   { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); margin-top: 4px; }
    .ver-summary{ font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-top: 2px; font-style: italic; }
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
    .mt-3 { margin-top: 12px; }
    .me-1 { margin-inline-end: 4px; }

    /* ─── Dialog form ─── */
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted, var(--text-muted)); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .w-full { width: 100%; }
    .ra-toggle { padding: 8px 0; }
    .ra-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; }
    .ra-label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary-500, var(--primary)); }

    /* ─── Policy rules dialog ─── */
    .rules-list { display: flex; flex-direction: column; gap: 8px; }
    .rule-card { padding: 10px 14px; background: var(--surface-sunken, var(--surface-ice)); border-radius: var(--radius); border: 1px solid var(--border-subtle, var(--border-subtle)); }
    .rule-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: var(--font-size-sm); }
    .rule-idx { font-weight: 800; color: var(--text-muted, var(--text-muted)); font-size: var(--font-size-xs); }
    .rule-field { font-weight: 700; color: var(--text-heading, var(--text-heading)); font-family: monospace; }
    .rule-op  { padding: 1px 6px; border-radius: var(--radius-xs); background: #eff6ff; color: var(--primary); font-size: var(--font-size-xs); font-weight: 600; }
    .rule-val { font-family: monospace; color: var(--success); font-weight: 600; }
    .rule-severity { padding: 1px 8px; border-radius: var(--radius-pill); font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; }
    .sev-critical { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .sev-high    { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .sev-medium  { background: #fefce8; color: #a16207; }
    .sev-low     { background: var(--status-success-bg, #defbe6); color: #15803d; }
    .rule-message { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); margin: 4px 0 0; }
    .execute-result { margin-top: 12px; padding: 10px; background: var(--status-info-bg, #edf5ff); border: 1px solid #bae6fd; border-radius: var(--radius); font-size: var(--font-size-sm); }
    .execute-result pre { margin: 4px 0 0; font-size: var(--font-size-xs); white-space: pre-wrap; max-height: 200px; overflow: auto; }
  `],
})
export class PoliciesComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private complianceSvc = inject(GrcComplianceService);
    private operationsSvc = inject(GrcOperationsService);
  policies: Policy[] = [];
  filteredPolicies: Policy[] = [];
  selectedPolicies: GrcRecord[] = [];
  loaded = false;
  searchTerm = '';
  statusFilter = '';
  healthFilter = '';

  showDialog = false;
  showDeleteDialog = false;
  editMode = false;
  editingPolicyId: string | null = null;
  deleteTarget: Policy | null = null;

  form = { title: '', content: '', owner: '', status: 'draft', frameworksStr: '', category: '', requiresAcknowledgement: false };

  readonly tabs = getModuleTabs('governance');
  readonly headerActions: PageHeaderAction[] = [
    { id: 'add',    labelEn: 'Add Policy', labelAr: 'إضافة سياسة', icon: 'plus', primary: true },
    { id: 'export', labelEn: 'Export',     labelAr: 'تصدير',        icon: 'download' },
  ];
  isAr  = computed(() => this.i18n.currentLang() === 'ar');
  dir   = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  onHeaderAction(id: string): void {
    if (id === 'add') this.openCreateDialog();
  }

  publishedPct = 0;
  missingOwnerCount = 0;
  missingReviewCount = 0;
  dueSoonCount = 0;
  overdueCount = 0;

  drawerVisible = false;
  selectedPolicy: GrcRecord | null = null;
  policyVersions: GrcRecord[] = [];
  versionsLoading = false;
  linkedProcedures: GrcRecord[] = [];
  approvalRequests: GrcRecord[] = [];
  approvalsLoading = false;
  showRejectPolicyDialog = false;
  rejectPolicyReason = '';

  statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Archived', value: 'archived' },
  ];

  statusFilterOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Approved', value: 'approved' },
    { label: 'Archived', value: 'archived' },
  ];

  private live = inject(GrcLiveService);
  private confirmSvc = inject(ConfirmationService);
  private destroyRef = inject(DestroyRef);
  private msgService = inject(MessageService);
  private route = inject(ActivatedRoute);
  private foundationData = inject(FoundationDataService);
  private htmlSanitizer = inject(HtmlSanitizerService);

  readonly policyCatOptions = computed(() => this.foundationData.policyCatOptions());

  constructor(public i18n: I18nService, private governanceSvc: GrcGovernanceService) {}

  sanitizeHtml(html: string): string {
    return this.htmlSanitizer.sanitize(html || '');
  }

  ngOnInit(): void {
    this.foundationData.load();
    this.route.queryParams.subscribe(params => {
      if (params['dueReview'] === '1') this.healthFilter = 'due_soon';
      if (params['status']) this.statusFilter = params['status'];
      if (params['openCreate'] === '1') setTimeout(() => this.openCreateDialog(), 100);
    });
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadPolicies());
    this.loadPolicies();
  }

  loadPolicies(): void {
    this.governanceSvc.getGovernancePolicies().subscribe((res) => {
      this.policies = (res as any).policies || res || [];
      this.computeHealth();
      this.filterPolicies();
      this.loaded = true;
    });
  }

  computeHealth(): void {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const total = this.policies.length;
    const published = this.policies.filter((p) => p.status === 'published' || p.status === 'approved').length;
    this.publishedPct = total ? Math.round((published / total) * 100) : 0;
    this.missingOwnerCount = this.policies.filter((p) => !p.owner).length;
    this.missingReviewCount = this.policies.filter((p) => !p.next_review_date).length;
    this.dueSoonCount = this.policies.filter((p) => p.next_review_date && new Date(p.next_review_date) <= in30 && new Date(p.next_review_date) >= now).length;
    this.overdueCount = this.policies.filter((p) => p.next_review_date && new Date(p.next_review_date) < now).length;
  }

  applyHealthFilter(filter: string): void {
    this.healthFilter = filter;
    this.statusFilter = '';
    this.searchTerm = '';
    this.filterPolicies();
  }

  clearFilters(): void {
    this.healthFilter = '';
    this.statusFilter = '';
    this.searchTerm = '';
    this.filterPolicies();
  }

  filterPolicies(): void {
    let result = [...this.policies];
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    if (this.healthFilter === 'published') result = result.filter((p) => p.status === 'published' || p.status === 'approved');
    else if (this.healthFilter === 'missing_owner') result = result.filter((p) => !p.owner);
    else if (this.healthFilter === 'missing_review') result = result.filter((p) => !p.next_review_date);
    else if (this.healthFilter === 'due_soon') result = result.filter((p) => p.next_review_date && new Date(p.next_review_date) <= in30 && new Date(p.next_review_date) >= now);
    else if (this.healthFilter === 'overdue') result = result.filter((p) => p.next_review_date && new Date(p.next_review_date) < now);
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter((p) => p.title?.toLowerCase().includes(term) || p.content?.toLowerCase().includes(term) || p.owner?.toLowerCase().includes(term));
    }
    if (this.statusFilter) result = result.filter((p) => p.status === this.statusFilter);
    this.filteredPolicies = result;
  }

  isReviewOverdue(p: GrcRecord): boolean { return p.next_review_date && new Date(p.next_review_date) < new Date(); }
  isReviewDueSoon(p: GrcRecord): boolean { const d = new Date(); return p.next_review_date && new Date(p.next_review_date) <= new Date(d.getTime() + 30 * 86400000); }

  openDetail(policy: GrcRecord): void {
    this.selectedPolicy = policy;
    this.drawerVisible = true;
    this.policyVersions = [];
    this.linkedProcedures = [];
    this.approvalRequests = [];
    this.versionsLoading = true;
    this.approvalsLoading = true;
    const id = policy.policyId || policy.policy_id;
    this.governanceSvc.getPolicyVersions(id).subscribe({
      next: (res: any) => { this.policyVersions = res.versions || []; this.versionsLoading = false; },
      error: () => { this.versionsLoading = false; },
    });
    this.operationsSvc.getApprovalRequests('policy', id).subscribe({
      next: (res: any) => { this.approvalRequests = res.requests || res || []; this.approvalsLoading = false; },
      error: () => { this.approvalsLoading = false; },
    });
    if (id) {
      this.governanceSvc.getPolicyProcedures(id).subscribe({
        next: (res) => { this.linkedProcedures = res.procedures || []; },
        error: (e) => devError("[API]", e),
      });
    }
  }

  createNewVersion(): void {
    if (!this.selectedPolicy) return;
    const id = this.selectedPolicy.policyId || this.selectedPolicy.policy_id;
    this.governanceSvc.updatePolicy(id, { content: this.selectedPolicy.content, change_summary: this.i18n.translate('common.newVersionCreated') } as any).subscribe({
      next: () => { this.loadPolicies(); this.openDetail(this.selectedPolicy); this.msgService.add({ severity: 'success', summary: this.i18n.translate('common.versionCreated'), life: 3000 }); },
      error: () => { this.msgService.add({ severity: 'error', summary: this.i18n.translate('common.failedToCreateVersion'), life: 4000 }); },
    });
  }

  submitForApproval(): void {
    if (!this.selectedPolicy) return;
    const id = this.selectedPolicy.policyId || this.selectedPolicy.policy_id;
    this.operationsSvc.initiateApprovalRequest({ entityType: 'policy', entityId: id, action: 'publish', routeId: 'policy-approval' }).subscribe({
      next: () => { this.msgService.add({ severity: 'success', summary: this.i18n.translate('common.submittedForApproval'), life: 3000 }); this.openDetail(this.selectedPolicy); },
      error: () => { this.msgService.add({ severity: 'error', summary: this.i18n.translate('common.submissionFailed'), life: 4000 }); },
    });
  }

  openCreateDialog(): void {
    this.editMode = false;
    this.editingPolicyId = null;
    this.form = { title: '', content: '', owner: '', status: 'draft', frameworksStr: '', category: '', requiresAcknowledgement: false };
    this.showDialog = true;
  }

  openEditDialog(policy: GrcRecord): void {
    this.editMode = true;
    this.editingPolicyId = policy.policyId || policy.policy_id;
    this.form = {
      title: policy.title,
      content: policy.content || '',
      owner: policy.owner || '',
      status: policy.status || 'draft',
      frameworksStr: (policy.frameworks || []).join(', '),
      category: policy.category || '',
      requiresAcknowledgement: policy.requiresAcknowledgement ?? policy.requires_acknowledgement ?? false,
    };
    this.showDialog = true;
  }

  savePolicy(): void {
    if (!this.form.title || !this.form.content) return;
    const payload: GrcRecord = {
      title: this.form.title,
      content: this.form.content,
      owner: this.form.owner,
      status: this.form.status,
      frameworks: this.form.frameworksStr.split(',').map(s => s.trim()).filter(Boolean),
    };
    if (this.editMode && this.editingPolicyId) {
      this.governanceSvc.updatePolicy(this.editingPolicyId, payload).subscribe(() => { this.showDialog = false; this.loadPolicies(); });
    } else {
      this.governanceSvc.createPolicy(payload as any).subscribe(() => { this.showDialog = false; this.loadPolicies(); });
    }
  }

  approve(policy: GrcRecord): void {
    const id = policy.policyId || policy.policy_id;
    this.governanceSvc.approvePolicy(id).subscribe(() => this.loadPolicies());
  }

  confirmDelete(policy: Policy): void {
    this.deleteTarget = policy;
    this.showDeleteDialog = true;
  }

  deletePolicy(): void {
    if (!this.deleteTarget) return;
    const id = (this.deleteTarget as GrcRecord).policyId || (this.deleteTarget as GrcRecord).policy_id;
    this.governanceSvc.deletePolicy(id).subscribe(() => { this.showDeleteDialog = false; this.deleteTarget = null; this.loadPolicies(); });
  }

  // Policy-as-Code
  showRulesDialog = false;
  rulesLoading = false;
  policyRules: GrcRecord[] = [];
  rulesPolicyId: string | null = null;
  executeResult: GrcRecord | null = null;

  openRulesDialog(policy: GrcRecord): void {
    const id = policy.policyId || policy.policy_id;
    this.rulesPolicyId = id;
    this.policyRules = [];
    this.executeResult = null;
    this.rulesLoading = true;
    this.showRulesDialog = true;
    this.complianceSvc.getPolicyRules(id).subscribe({
      next: (res: any) => { this.policyRules = res.rules || []; this.rulesLoading = false; },
      error: () => { this.rulesLoading = false; },
    });
  }

  executeRules(): void {
    if (!this.rulesPolicyId) return;
    this.complianceSvc.executePolicyRules(this.rulesPolicyId, {}).subscribe({
      next: (res) => { this.executeResult = res; },
      error: (e) => devError("[API]", e),
    });
  }

  exportCSV(): void {
    const rows = this.filteredPolicies.map((p) => ({
      Title: p.title, Status: p.status, Version: p.version,
      Owner: p.owner || '', Frameworks: (p.frameworks || []).join('; '),
    }));
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String((r as GrcRecord)[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'policies-export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  rejectPolicy(): void {
    if (!this.selectedPolicy || !this.rejectPolicyReason) return;
    this.governanceSvc.rejectPolicy(this.selectedPolicy.policy_id, this.rejectPolicyReason).subscribe({
      next: () => {
        this.showRejectPolicyDialog = false;
        this.rejectPolicyReason = '';
        this.selectedPolicy = { ...this.selectedPolicy, status: 'rejected' };
        this.loadPolicies();
        this.msgService.add({ severity: 'success', summary: this.i18n.translate('common.policyRejected'), life: 3000 });
      },
      error: () => { this.msgService.add({ severity: 'error', summary: this.i18n.translate('common.rejectFailed'), life: 4000 }); },
    });
  }

  publishPolicy(): void {
    if (!this.selectedPolicy) return;
    this.governanceSvc.publishPolicy(this.selectedPolicy.policy_id).subscribe({
      next: () => {
        this.selectedPolicy = { ...this.selectedPolicy, status: 'published' };
        this.loadPolicies();
        this.msgService.add({ severity: 'success', summary: this.i18n.translate('common.policyPublished'), life: 3000 });
      },
      error: (err) => { this.msgService.add({ severity: 'error', summary: err?.error?.error || this.i18n.translate('common.operationFailed'), life: 4000 }); },
    });
  }

  viewVersion(v: GrcRecord): void {
    this.msgService.add({ severity: 'info', summary: `Viewing v${v.version}`, detail: v.change_summary || v.content?.substring(0, 100) || 'No details', life: 5000 });
  }

  bulkApprove(): void {
    if (!this.selectedPolicies.length) return;
    const calls = this.selectedPolicies.map(p => this.governanceSvc.approvePolicy(p.policy_id));
    let done = 0;
    calls.forEach(obs => obs.subscribe({
      next: () => { done++; if (done === calls.length) { this.selectedPolicies = []; this.loadPolicies(); this.msgService.add({ severity: 'success', summary: this.i18n.translate('common.policiesApproved', { count: String(done) }), life: 3000 }); } },
      error: () => this.msgService.add({ severity: 'error', summary: this.i18n.translate('common.someApprovalsFailed'), life: 4000 }),
    }));
  }

  bulkArchive(): void {
    if (!this.selectedPolicies.length) return;
    this.confirmSvc.confirm({
      message: `Archive ${this.selectedPolicies.length} policies?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const calls = this.selectedPolicies.map(p => this.apiclientSvc.put(`/policies/${p.policy_id}`, { status: 'archived' }));
        let done = 0;
        calls.forEach(obs => obs.subscribe({
          next: () => { done++; if (done === calls.length) { this.selectedPolicies = []; this.loadPolicies(); this.msgService.add({ severity: 'info', summary: this.i18n.translate('common.policiesArchived', { count: String(done) }), life: 3000 }); } },
          error: () => this.msgService.add({ severity: 'error', summary: this.i18n.translate('common.someArchivesFailed'), life: 4000 }),
        }));
      }
    });
  }

}
