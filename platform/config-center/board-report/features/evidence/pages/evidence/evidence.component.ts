import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { EvidenceConnectorsWidgetComponent } from './connectors-widget.component';
import { EvidenceDashboardWidgetComponent } from './evidence-dashboard-widget.component';
import { EvidenceAutomationWidgetComponent } from './evidence-automation-widget.component';
import { EvidenceReviewWidgetComponent } from './evidence-review-widget.component';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { devError } from '@app/runtime/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';
import { EvidenceTableComponent, EvidenceTableItem } from './components/evidence-table.component';
import { EvidenceDetailDrawerComponent } from './components/evidence-detail-drawer.component';
import { EvidenceUploadDialogComponent } from './components/evidence-upload-dialog.component';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface EvidenceRequirement {
  id: string; control_id: string; framework_code: string; control_number: string;
  evidence_type_code: string; is_mandatory: boolean; requirement_description_en: string;
  expected_content_en: string; collection_frequency: string; retention_period_months: number;
  control_code: string; control_title_en: string; domain_name_en: string;
  evidence_name_en: string; file_extensions: string;
}

interface EvidenceSchedule {
  schedule_id: string; control_id: string; cron_expression: string;
  reminder_text: string; assigned_to: string; enabled: boolean;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence',
    imports: [
        CommonModule, FormsModule, RouterModule, UpperCasePipe, PageShellComponent,
        ToolbarModule, InputTextModule, DropdownModule, ButtonModule, TagModule,
        DialogModule, TooltipModule, TableModule,
        EvidenceConnectorsWidgetComponent, EvidenceDashboardWidgetComponent, EvidenceAutomationWidgetComponent, EvidenceReviewWidgetComponent,
        AiPanelComponent,
        EvidenceTableComponent, EvidenceDetailDrawerComponent, EvidenceUploadDialogComponent,
    ],
    template: `
    <div class="widget-row">
      <evidence-connectors-widget [connectors]="connectors" (collectRequested)="triggerCollect($event)" (refreshRequested)="loadConnectors()" />
      <evidence-dashboard-widget [coverage]="dashboard.coverage" [freshness]="dashboard.freshness" [slaStatus]="dashboard.slaStatus" [pending]="dashboard.pending" [overdue]="dashboard.overdue" />
      <evidence-automation-widget [lastRun]="automation.lastRun" [error]="automation.error" [aiScore]="automation.aiScore" (autoCollectRequested)="triggerCollectAll()" />
      <evidence-review-widget [evidence]="pendingEvidence" (approveRequested)="onReviewAction($event, 'approve')" (rejectRequested)="onReviewAction($event, 'reject')" />
    </div>
    <app-page-shell icon="folder-open" [title]="i18n.translate('evidence.title')" [subtitle]="i18n.translate('evidence.subtitle')" [breadcrumbs]="['Dashboard', 'Evidence']" [loading]="loading">
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button [label]="i18n.translate('evidence.submit')" icon="pi pi-upload" (onClick)="openSubmitDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm" [placeholder]="i18n.translate('evidence.searchEvidence')" [attr.aria-label]="i18n.translate('evidence.searchEvidence')" (input)="applyFilter()" class="search-input" />
          </span>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button label="Schedules" icon="pi pi-calendar" [outlined]="true" (onClick)="showSchedules = true" class="me-2" />
          <p-button [label]="i18n.translate('evidence.verify')" icon="pi pi-verified" [outlined]="true" (onClick)="verifyChain()" [loading]="verifying" />
          <p-dropdown [options]="typeOptions" [(ngModel)]="selectedType" optionLabel="label" optionValue="value"
            [placeholder]="i18n.translate('evidence.allTypes')" (onChange)="applyFilter()" [showClear]="true"
            [style]="{minWidth:'160px', marginInlineStart:'8px'}" />
        </ng-template>
      </p-toolbar>

      <!-- Verify banner -->
      <div class="verify-banner" *ngIf="verifyResult !== null" [class.verify-ok]="verifyResult" [class.verify-fail]="!verifyResult">
        <i class="pi" [ngClass]="verifyResult ? 'pi-check-circle' : 'pi-times-circle'"></i>
        <span>{{ verifyResult ? i18n.translate('evidence.chainValid') : i18n.translate('evidence.chainBroken') }}</span>
        <span *ngIf="chainLength > 0" class="chain-info">Chain length: {{ chainLength }}</span>
        <button aria-label="Close" class="close-btn" (click)="verifyResult = null"><i class="pi pi-times"></i></button>
      </div>

      <!-- Stats row -->
      <div class="stats-row" *ngIf="items.length > 0 || expiringItems.length > 0">
        <div class="stat-chip"><span class="stat-count">{{ items.length }}</span><span class="stat-label">{{ i18n.translate('evidence.totalEvidence') }}</span></div>
        <div class="stat-chip expiring" *ngIf="expiringItems.length > 0"><span class="stat-count">{{ expiringItems.length }}</span><span class="stat-label">{{ i18n.translate('evidence.expiringSoon') }}</span></div>
        <div class="stat-chip" *ngIf="schedules.length > 0"><span class="stat-count">{{ schedules.length }}</span><span class="stat-label">Schedules</span></div>
        <div class="stat-chip" *ngIf="connectors.length > 0"><span class="stat-count">{{ connectors.length }}</span><span class="stat-label">Connectors</span></div>
      </div>

      <!-- Requirements section -->
      <div class="requirements-section" *ngIf="requirementsSummary.length > 0">
        <h3 class="section-title">Evidence Requirements by Framework</h3>
        <div class="fw-chips">
          <button *ngFor="let fw of requirementsSummary" class="fw-chip" [class.active]="selectedFramework === fw.framework_code" (click)="loadFrameworkRequirements(fw.framework_code)">
            <span class="fw-chip-code">{{fw.framework_code | uppercase}}</span>
            <span class="fw-chip-count">{{fw.requirement_count}} req</span>
          </button>
        </div>
      </div>

      <!-- Requirements table -->
      <div class="requirements-table" *ngIf="requirements.length > 0">
        <h4 class="req-table-title">
          {{selectedFramework | uppercase}} -- {{requirements.length}} Evidence Requirements
          <button aria-label="Close" class="close-btn" (click)="requirements = []; selectedFramework = ''"><i class="pi pi-times"></i></button>
        </h4>
        <p-table aria-label="Requirements table" [value]="requirements" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10,25,50]"
          [globalFilterFields]="['evidence_type_code','control_code','requirement_description_en']"
          styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template pTemplate="header">
            <tr><th class="col-narrow">Control</th><th class="col-narrow">Type</th><th>Description</th><th class="col-narrow">Frequency</th><th class="col-xs">Mandatory</th><th class="col-medium">Extensions</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-req>
            <tr tabindex="0" role="button" (keyup.enter)="showRequirementDetail(req)" (click)="showRequirementDetail(req)" class="clickable-row">
              <td><code>{{req.control_code}}</code></td>
              <td><p-tag [value]="req.evidence_name_en || req.evidence_type_code" [severity]="getTypeSeverity(req.evidence_type_code)" /></td>
              <td class="desc-cell">{{req.requirement_description_en | slice:0:120}}{{(req.requirement_description_en || '').length > 120 ? '...' : ''}}</td>
              <td>{{req.collection_frequency || '\u2014'}}</td>
              <td><i class="pi" [ngClass]="req.is_mandatory ? 'pi-check-circle text-green' : 'pi-minus-circle text-muted'"></i></td>
              <td><span class="ext-tag">{{req.file_extensions || '\u2014'}}</span></td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="text-center text-muted">No requirements found</td></tr></ng-template>
        </p-table>
      </div>

      <!-- Evidence Table (child component) -->
      <app-evidence-table [items]="filtered"
        (viewDetail)="viewDetail($event)" (uploadFile)="openUploadDialog($event)"
        (downloadFile)="downloadFile($event)" (newVersion)="openVersionDialog($event)" />

      <div *ngIf="!loading && filtered.length === 0 && requirements.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p class="text-muted mt-2">{{ i18n.translate('common.noData') }}</p>
      </div>

      <!-- Cross-Module Links -->
      <div class="cross-links-section">
        <h3 class="section-title">{{ i18n.currentLang() === 'ar' ? '\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u0645\u0646\u0635\u0629' : 'Cross-Module Links' }}</h3>
        <div class="cross-links-grid">
          <a class="cross-link-card" routerLink="/compliance/controls"><i class="pi pi-lock"></i><span>{{ i18n.currentLang() === 'ar' ? '\u0627\u0644\u0636\u0648\u0627\u0628\u0637' : 'Controls' }}</span><small>{{ i18n.currentLang() === 'ar' ? '\u0623\u062F\u0644\u0629 \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0627\u0644\u0636\u0648\u0627\u0628\u0637' : 'Evidence linked to controls' }}</small></a>
          <a class="cross-link-card" routerLink="/governance/policies"><i class="pi pi-file"></i><span>{{ i18n.currentLang() === 'ar' ? '\u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A' : 'Policies' }}</span><small>{{ i18n.currentLang() === 'ar' ? '\u0623\u062F\u0644\u0629 \u062F\u0639\u0645 \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A' : 'Policy supporting evidence' }}</small></a>
          <a class="cross-link-card" routerLink="/audit"><i class="pi pi-search"></i><span>{{ i18n.currentLang() === 'ar' ? '\u0627\u0644\u062A\u062F\u0642\u064A\u0642' : 'Audit' }}</span><small>{{ i18n.currentLang() === 'ar' ? '\u0623\u062F\u0644\u0629 \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0648\u0627\u0644\u0646\u062A\u0627\u0626\u062C' : 'Audit findings evidence' }}</small></a>
          <a class="cross-link-card" routerLink="/risk"><i class="pi pi-shield"></i><span>{{ i18n.currentLang() === 'ar' ? '\u0627\u0644\u0645\u062E\u0627\u0637\u0631' : 'Risk Register' }}</span><small>{{ i18n.currentLang() === 'ar' ? '\u0623\u062F\u0644\u0629 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u062E\u0627\u0637\u0631' : 'Risk treatment evidence' }}</small></a>
          <a class="cross-link-card" routerLink="/compliance/findings"><i class="pi pi-flag"></i><span>{{ i18n.currentLang() === 'ar' ? '\u0627\u0644\u0646\u062A\u0627\u0626\u062C' : 'Findings' }}</span><small>{{ i18n.currentLang() === 'ar' ? '\u0623\u062F\u0644\u0629 \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0646\u062A\u0627\u0626\u062C' : 'Finding closure evidence' }}</small></a>
          <a class="cross-link-card" routerLink="/incidents"><i class="pi pi-bell"></i><span>{{ i18n.currentLang() === 'ar' ? '\u0627\u0644\u062D\u0648\u0627\u062F\u062B' : 'Incidents' }}</span><small>{{ i18n.currentLang() === 'ar' ? '\u0623\u062F\u0644\u0629 \u0627\u0644\u062A\u062D\u0642\u064A\u0642' : 'Investigation evidence' }}</small></a>
        </div>
      </div>

      <!-- Detail Drawer (child component) -->
      <app-evidence-detail-drawer [visible]="showDetailDialog" [item]="detailItem" [files]="detailFiles" (visibleChange)="showDetailDialog = $event" />

      <!-- Upload/Submit/Version Dialogs (child component) -->
      <app-evidence-upload-dialog
        [submitVisible]="showDialog" [form]="form"
        [versionVisible]="showVersionDialog" [versionTarget]="versionTarget" [versionForm]="versionForm"
        [uploadVisible]="showUploadDialog" [uploadTarget]="uploadTarget" [uploading]="uploading"
        (submitVisibleChange)="showDialog = $event" (submitEvidence)="submitEvidence($event)"
        (versionVisibleChange)="showVersionDialog = $event" (submitVersion)="submitVersion($event)"
        (uploadVisibleChange)="showUploadDialog = $event" (uploadFile)="uploadFile($event)" />

      <!-- Requirement Detail Dialog -->
      <p-dialog header="Evidence Requirement Detail" [(visible)]="showReqDetail" [modal]="true" [style]="{width:'640px'}" [dismissableMask]="true">
        <div class="req-detail" *ngIf="selectedRequirement">
          <div class="req-detail-header">
            <p-tag [value]="selectedRequirement.evidence_type_code" [severity]="getTypeSeverity(selectedRequirement.evidence_type_code)" />
            <p-tag [value]="selectedRequirement.is_mandatory ? 'Mandatory' : 'Optional'" [severity]="selectedRequirement.is_mandatory ? 'danger' : 'secondary'" />
            <code>{{selectedRequirement.control_code}}</code>
          </div>
          <h4>{{selectedRequirement.control_title_en}}</h4>
          <p class="req-domain">Domain: {{selectedRequirement.domain_name_en}}</p>
          <div class="req-section"><h5>What to Upload</h5><p>{{selectedRequirement.requirement_description_en}}</p></div>
          <div class="req-section" *ngIf="selectedRequirement.expected_content_en"><h5>Expected Content</h5><p class="expected-content">{{selectedRequirement.expected_content_en}}</p></div>
          <div class="req-meta-grid">
            <div><strong>Frequency:</strong> {{selectedRequirement.collection_frequency || '\u2014'}}</div>
            <div><strong>Retention:</strong> {{selectedRequirement.retention_period_months ? selectedRequirement.retention_period_months + ' months' : '\u2014'}}</div>
            <div><strong>File Types:</strong> {{selectedRequirement.file_extensions || '\u2014'}}</div>
          </div>
        </div>
      </p-dialog>

      <!-- Schedules Dialog -->
      <p-dialog header="Evidence Collection Schedules" [(visible)]="showSchedules" [modal]="true" [style]="{width:'700px'}" [dismissableMask]="true">
        <div class="mb-3"><p-button label="Add Schedule" icon="pi pi-plus" size="small" (onClick)="showAddSchedule = true" /></div>
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Schedules table" [value]="schedules" styleClass="p-datatable-sm" *ngIf="schedules.length > 0">
          <ng-template pTemplate="header"><tr><th>Control</th><th>Cron</th><th>Reminder</th><th>Assigned To</th><th>Enabled</th><th>Actions</th></tr></ng-template>
          <ng-template pTemplate="body" let-s>
            <tr>
              <td><code>{{ s.control_id | slice:0:8 }}</code></td><td><code>{{ s.cron_expression }}</code></td><td>{{ s.reminder_text || '\u2014' }}</td><td>{{ s.assigned_to || '\u2014' }}</td>
              <td><p-tag [value]="s.enabled ? 'Active' : 'Disabled'" [severity]="s.enabled ? 'success' : 'secondary'" /></td>
              <td><p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteSchedule(s.schedule_id)" /></td>
            </tr>
          </ng-template>
        </p-table>
        <div *ngIf="schedules.length === 0" class="text-center text-muted p-4">No schedules configured</div>
        <div *ngIf="showAddSchedule" class="mt-3 p-3 bordered-box">
          <h5>New Schedule</h5>
          <div class="dialog-form">
            <label>Control ID</label><input pInputText [(ngModel)]="scheduleForm.controlId" class="w-full" placeholder="Control UUID" aria-label="Control UUID" />
            <label>Cron Expression</label><input pInputText [(ngModel)]="scheduleForm.cronExpression" class="w-full" placeholder="0 0 1 * *" aria-label="0 0 1 * *" />
            <label>Reminder Text</label><input pInputText [(ngModel)]="scheduleForm.reminderText" class="w-full" />
            <label>Assigned To</label><input pInputText [(ngModel)]="scheduleForm.assignedTo" class="w-full" />
          </div>
          <div class="flex gap-2 mt-2">
            <p-button label="Cancel" [text]="true" (onClick)="showAddSchedule = false" />
            <p-button label="Create" icon="pi pi-check" (onClick)="createSchedule()" [disabled]="!scheduleForm.controlId || !scheduleForm.cronExpression" />
          </div>
        </div>
      </p-dialog>
    </app-page-shell>
    <app-ai-panel module="evidence" />
  `,
    styles: [`
    .widget-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .col-narrow { width: 100px; } .col-xs { width: 80px; } .col-medium { width: 120px; }
    .empty-icon { font-size: var(--font-size-4xl); color: var(--text-muted); }
    .bordered-box { border: 1px solid var(--surface-border); border-radius: var(--radius); }
    .search-input { min-width: 220px; }
    .ms-3 { margin-inline-start: 12px; } .me-2 { margin-inline-end: 8px; }
    .w-full { width: 100%; } .mt-2 { margin-top: 8px; } .mt-3 { margin-top: 12px; }
    .mb-3 { margin-bottom: 12px; } .p-3 { padding: 12px; } .p-4 { padding: 16px; }
    .flex { display: flex; } .gap-2 { gap: 8px; }
    .verify-banner { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: var(--radius-sm); margin-bottom: 16px; font-size: var(--font-size-sm); font-weight: 600; }
    .verify-ok { background: var(--status-success-bg, #defbe6); border: 1px solid #bbf7d0; color: #15803d; }
    .verify-fail { background: var(--status-danger-bg, #fff1f1); border: 1px solid var(--status-danger-bg, #fff1f1); color: var(--error); }
    .verify-banner .pi { font-size: var(--font-size-lg); }
    .chain-info { font-weight: 400; font-size: var(--font-size-sm); color: var(--text-muted); }
    .close-btn { background: none; border: none; cursor: pointer; margin-inline-start: auto; color: inherit; opacity: 0.6; }
    .close-btn:hover { opacity: 1; }
    .stats-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .stat-chip { display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: var(--surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-pill); font-size: var(--font-size-sm); }
    .stat-count { font-weight: 800; color: var(--text-heading); } .stat-label { color: var(--text-muted); }
    .stat-chip.expiring { border-color: #fed7aa; background: var(--status-warning-bg, #fcf4d6); }
    .stat-chip.expiring .stat-count { color: var(--warning); }
    .requirements-section { margin-bottom: 16px; }
    .section-title { font-size: var(--font-size-base); font-weight: 700; margin: 0 0 10px; color: var(--text-heading); }
    .fw-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .fw-chip { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 16px; border: 1px solid var(--border-subtle); border-radius: var(--radius); background: var(--surface-ground, #fff); cursor: pointer; transition: all 200ms; }
    .fw-chip:hover { border-color: var(--primary); background: #eff6ff; }
    .fw-chip.active { border-color: var(--primary); background: #dbeafe; }
    .fw-chip-code { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; }
    .fw-chip-count { font-size: var(--font-size-xs); color: var(--text-muted); }
    .requirements-table { margin-bottom: 20px; }
    .req-table-title { font-size: var(--font-size-base); font-weight: 600; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
    .clickable-row { cursor: pointer; } .clickable-row:hover { background: var(--surface-hover, var(--surface-ice)); }
    .desc-cell { font-size: var(--font-size-sm); line-height: 1.4; }
    .ext-tag { font-size: var(--font-size-xs); font-family: monospace; background: var(--surface-ground); padding: 2px 6px; border-radius: var(--radius-xs); }
    .text-green { color: var(--success); } .text-muted { color: var(--text-muted, #9ca3af); } .text-center { text-align: center; }
    .empty-state { text-align: center; padding: 40px; }
    .dialog-form { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
    .dialog-form label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); }
    .req-detail-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .req-domain { font-size: var(--font-size-sm); color: var(--text-muted); margin: 4px 0 12px; }
    .req-section { margin-bottom: 12px; } .req-section h5 { font-size: var(--font-size-sm); font-weight: 700; margin: 0 0 4px; }
    .req-section p { font-size: var(--font-size-sm); line-height: 1.5; }
    .expected-content { white-space: pre-line; background: var(--surface-ground, #f9fafb); padding: 8px 12px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .req-meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: var(--font-size-sm); }
    .cross-links-section { margin-top: 24px; }
    .cross-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; padding: 8px 0; }
    .cross-link-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); background: var(--surface-card, #fff); text-decoration: none; color: inherit; transition: all 0.15s; cursor: pointer; }
    .cross-link-card:hover { box-shadow: var(--shadow-md); border-color: var(--primary-500, var(--primary)); transform: translateY(-2px); }
    .cross-link-card i { font-size: var(--font-size-xl); color: var(--primary-500, var(--primary)); margin-bottom: 4px; }
    .cross-link-card span { font-size: var(--font-size-base); font-weight: 600; }
    .cross-link-card small { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); }
  `]
})
export class EvidenceComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private complianceSvc = inject(GrcComplianceService);
  private destroyRef = inject(DestroyRef);
  private live = inject(GrcLiveService);
  private cdr = inject(ChangeDetectorRef);
  i18n = inject(I18nService);

  loading = true;
  items: EvidenceTableItem[] = [];
  filtered: EvidenceTableItem[] = [];
  expiringItems: EvidenceTableItem[] = [];
  connectors: Record<string, any>[] = [];
  schedules: EvidenceSchedule[] = [];
  pendingEvidence: EvidenceTableItem[] = [];

  searchTerm = ''; selectedType: string | null = null;
  verifying = false; verifyResult: boolean | null = null; chainLength = 0;
  dashboard = { coverage: 0, freshness: 0, slaStatus: 'On Time', pending: 0, overdue: 0 };
  automation = { lastRun: '', error: '', aiScore: 0 };

  requirementsSummary: Record<string, any>[] = [];
  requirements: EvidenceRequirement[] = [];
  selectedFramework = '';
  showReqDetail = false;
  selectedRequirement: EvidenceRequirement | null = null;

  showDialog = false;
  form: Record<string, any> = { controlId: '', title: '', description: '', content: '', expiryDate: '' };

  showVersionDialog = false;
  versionTarget: EvidenceTableItem | null = null;
  versionForm: Record<string, any> = { title: '', description: '', expiryDate: '' };

  showUploadDialog = false;
  uploadTarget: EvidenceTableItem | null = null;
  uploading = false;

  showDetailDialog = false;
  detailItem: EvidenceTableItem | null = null;
  detailFiles: Record<string, any>[] = [];

  showSchedules = false;
  showAddSchedule = false;
  scheduleForm: Record<string, any> = { controlId: '', cronExpression: '', reminderText: '', assignedTo: '' };

  typeOptions = [
    { label: 'Document', value: 'document' }, { label: 'Screenshot', value: 'screenshot' },
    { label: 'Log', value: 'log' }, { label: 'Configuration', value: 'configuration' },
    { label: 'Report', value: 'report' }, { label: 'Attestation', value: 'attestation' },
  ];

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadAll());
    this.loadAll(); this.loadRequirementsSummary();
  }


  private loadAll(): void {
    this.loading = true;
    forkJoin({
      evidence: this.complianceSvc.getEvidence().pipe(catchError(() => of([]))),
      expiring: this.complianceSvc.getExpiringEvidence().pipe(catchError(() => of([]))),
      connectors: this.complianceSvc.getEvidenceConnectors().pipe(catchError(() => of([]))),
      schedules: this.complianceSvc.getEvidenceSchedules().pipe(catchError(() => of([]))),
      status: this.complianceSvc.getEvidenceStatus().pipe(catchError(() => of([]))),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.items = Array.isArray(res.evidence) ? res.evidence : (res.evidence as GrcRecord)?.evidence || [];
        this.expiringItems = Array.isArray(res.expiring) ? res.expiring : [];
        this.connectors = Array.isArray(res.connectors) ? res.connectors : [];
        this.schedules = Array.isArray(res.schedules) ? res.schedules : [];
        const statusList = Array.isArray(res.status) ? res.status : [];
        const okCount = statusList.filter((s: Record<string, any>) => s.status === 'ok').length;
        this.pendingEvidence = this.items.filter(e => e.status === 'pending' || e.status === 'submitted');
        const total = Math.max(this.items.length, 20);
        this.dashboard = { coverage: Math.round((this.items.length / total) * 100), freshness: this.items.length > 0 ? Math.round((Date.now() - new Date(this.items[this.items.length - 1]?.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0, slaStatus: this.expiringItems.length > 3 ? 'At Risk' : 'On Time', pending: this.pendingEvidence.length, overdue: this.expiringItems.length };
        this.automation = { lastRun: statusList.find((s: Record<string, any>) => s.lastRun)?.lastRun ? new Date(statusList.find((s: Record<string, any>) => s.lastRun).lastRun).toISOString().split('T')[0] : '\u2014', error: '', aiScore: okCount > 0 ? Math.round((okCount / Math.max(statusList.length, 1)) * 100) : 0 };
        this.applyFilter(); this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  loadConnectors(): void { this.complianceSvc.getEvidenceConnectors().pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe(c => { this.connectors = Array.isArray(c) ? c : []; }); }
  private loadRequirementsSummary(): void { this.complianceSvc.getEvidenceRequirementsSummary().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (res: Record<string, any>) => { this.requirementsSummary = res.frameworks || []; }, error: () => { this.requirementsSummary = []; } }); }

  loadFrameworkRequirements(frameworkCode: string): void {
    if (this.selectedFramework === frameworkCode) { this.selectedFramework = ''; this.requirements = []; return; }
    this.selectedFramework = frameworkCode;
    this.complianceSvc.getEvidenceRequirements({ framework: frameworkCode }).subscribe({ next: (res: Record<string, any>) => { this.requirements = res.requirements || []; }, error: () => { this.requirements = []; } });
  }

  showRequirementDetail(req: EvidenceRequirement): void { this.selectedRequirement = req; this.showReqDetail = true; }

  getTypeSeverity(code: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
      POLICY: 'info', PROCEDURE: 'info', LOG: 'warning', CONFIG: 'secondary', SCREENSHOT: 'secondary', REPORT: 'success', AUDIT_REPORT: 'success',
      RISK_ASSESSMENT: 'danger', TRAINING_RECORD: 'info', CERTIFICATE: 'success', CONTRACT: 'info', MEETING_MINUTES: 'secondary', TEST_RESULT: 'warning',
      ARCHITECTURE_DIAGRAM: 'info', INVENTORY: 'secondary', REVIEW_RECORD: 'info', ATTESTATION: 'danger', COMMUNICATION: 'secondary',
    };
    return map[code] || 'info';
  }

  applyFilter(): void {
    let result = [...this.items];
    if (this.searchTerm) { const term = this.searchTerm.toLowerCase(); result = result.filter(i => (i.title || '').toLowerCase().includes(term) || (i.control_id || '').toLowerCase().includes(term) || (i.submitted_by || '').toLowerCase().includes(term)); }
    if (this.selectedType) result = result.filter(i => (i.type || i.title || '').toLowerCase().includes(this.selectedType!.toLowerCase()));
    this.filtered = result;
  }

  openSubmitDialog(): void { this.form = { controlId: '', title: '', description: '', content: '', expiryDate: '' }; this.showDialog = true; }

  submitEvidence(formData: Record<string, any>): void {
    this.complianceSvc.submitEvidence({ controlId: formData.controlId, title: formData.title, type: formData.type || 'document', description: formData.description } as any).subscribe({
      next: () => { this.showDialog = false; this.loadAll(); }, error: (e: unknown) => devError("[API]", e),
    });
  }

  openVersionDialog(item: EvidenceTableItem): void { this.versionTarget = item; this.versionForm = { title: item.title, description: '', expiryDate: '' }; this.showVersionDialog = true; }

  submitVersion(formData: Record<string, any>): void {
    if (!this.versionTarget) return;
    this.complianceSvc.submitEvidenceVersion(this.versionTarget.evidence_id, { title: formData.title, description: formData.description, type: formData.type || 'document' } as any).subscribe({
      next: () => { this.showVersionDialog = false; this.loadAll(); }, error: (e: unknown) => devError("[API]", e),
    });
  }

  openUploadDialog(item: EvidenceTableItem): void { this.uploadTarget = item; this.showUploadDialog = true; }

  uploadFile(file: File | null): void {
    if (!this.uploadTarget || !file) return;
    this.uploading = true;
    this.complianceSvc.uploadEvidenceFile(this.uploadTarget.evidence_id, file).subscribe({
      next: () => { this.uploading = false; this.showUploadDialog = false; this.loadAll(); },
      error: () => { this.uploading = false; },
    });
  }

  downloadFile(item: EvidenceTableItem): void {
    this.complianceSvc.downloadEvidenceFile(item.evidence_id).subscribe({
      next: (blob) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = item.file_path || 'evidence-file'; a.click(); URL.revokeObjectURL(url); },
    });
  }

  viewDetail(item: EvidenceTableItem): void {
    this.detailItem = item; this.detailFiles = []; this.showDetailDialog = true;
    this.complianceSvc.listEvidenceFiles(item.evidence_id).pipe(catchError(() => of({ files: [] })), takeUntilDestroyed(this.destroyRef)).subscribe({ next: (res: Record<string, any>) => { this.detailFiles = res.files || []; } });
  }

  verifyChain(): void {
    this.verifying = true; this.verifyResult = null;
    this.complianceSvc.verifyHashChain().subscribe({
      next: (res: Record<string, any>) => { this.verifyResult = res.intact !== false; this.chainLength = res.chainLength || 0; this.verifying = false; },
      error: () => { this.verifyResult = false; this.verifying = false; },
    });
  }

  triggerCollect(connectorId: string): void { this.complianceSvc.collectEvidence(connectorId).subscribe({ next: () => this.loadAll() }); }
  triggerCollectAll(): void { this.complianceSvc.collectEvidence('all').subscribe({ next: () => this.loadAll() }); }

  onReviewAction(item: Record<string, any>, action: 'approve' | 'reject'): void {
    const endpoint = action === 'approve' ? `/evidence-tasks/${item.evidence_id || item.task_id}/approve` : `/evidence-tasks/${item.evidence_id || item.task_id}/reject`;
    this.apiclientSvc.post(endpoint, {}).subscribe({ next: () => this.loadAll() });
  }

  createSchedule(): void {
    this.complianceSvc.createEvidenceSchedule({ controlId: this.scheduleForm.controlId, frequency: (this.scheduleForm as any).cronExpression || 'monthly', enabled: true } as any).subscribe({ next: () => { this.showAddSchedule = false; this.scheduleForm = { controlId: '', cronExpression: '', reminderText: '', assignedTo: '' }; this.loadAll(); } });
  }

  deleteSchedule(id: string): void { this.complianceSvc.deleteEvidenceSchedule(id).subscribe({ next: () => this.loadAll() }); }
}
