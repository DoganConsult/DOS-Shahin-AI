import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { EvidenceConnectorsWidgetComponent } from './connectors-widget.component';
import { EvidenceDashboardWidgetComponent } from './evidence-dashboard-widget.component';
import { EvidenceAutomationWidgetComponent } from './evidence-automation-widget.component';
import { EvidenceReviewWidgetComponent } from './evidence-review-widget.component';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { TableModule } from 'primeng/table';
import { FileUploadModule } from 'primeng/fileupload';
import { devError } from '../../core/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface EvidenceItem {
  evidence_id: string; control_id: string; title: string;
  description: string | null; content_hash: string | null; previous_hash: string | null;
  submitted_by: string; version: number; chain_position: number;
  file_path: string | null; file_size_bytes: number | null;
  expiry_date: string | null; created_at: string;
  status: string; type?: string;
}

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
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, PageShellComponent, StatusBadgeComponent,
    CardModule, ToolbarModule, InputTextModule, InputTextarea,
    DropdownModule, ButtonModule, TagModule, DialogModule, TooltipModule,
    ProgressBarModule, AiPanelComponent, TableModule, FileUploadModule,
    EvidenceConnectorsWidgetComponent, EvidenceDashboardWidgetComponent, EvidenceAutomationWidgetComponent, EvidenceReviewWidgetComponent, AppDatePipe, AppNumberPipe,
    RaciPanelComponent,],
  template: `
    <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px;">
      <evidence-connectors-widget [connectors]="connectors" (collectRequested)="triggerCollect($event)" (refreshRequested)="loadConnectors()" />
      <evidence-dashboard-widget [coverage]="dashboard.coverage" [freshness]="dashboard.freshness" [slaStatus]="dashboard.slaStatus" [pending]="dashboard.pending" [overdue]="dashboard.overdue" />
      <evidence-automation-widget [lastRun]="automation.lastRun" [error]="automation.error" [aiScore]="automation.aiScore" (autoCollectRequested)="triggerCollectAll()" />
      <evidence-review-widget [evidence]="pendingEvidence" (approveRequested)="onReviewAction($event, 'approve')" (rejectRequested)="onReviewAction($event, 'reject')" />
    </div>
    <app-page-shell
      icon="folder-open"
      [title]="i18n.translate('evidence.title')"
      [subtitle]="i18n.translate('evidence.subtitle')"
      [breadcrumbs]="['Dashboard', 'Evidence']"
      [loading]="loading">

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button [label]="i18n.translate('evidence.submit')" icon="pi pi-upload" (onClick)="openSubmitDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('evidence.searchEvidence')" [attr.aria-label]="i18n.translate('evidence.searchEvidence')" (input)="applyFilter()" class="search-input" />
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

      <div class="verify-banner" *ngIf="verifyResult !== null" [class.verify-ok]="verifyResult" [class.verify-fail]="!verifyResult">
        <i class="pi" [ngClass]="verifyResult ? 'pi-check-circle' : 'pi-times-circle'"></i>
        <span>{{ verifyResult ? i18n.translate('evidence.chainValid') : i18n.translate('evidence.chainBroken') }}</span>
        <span *ngIf="chainLength > 0" class="chain-info">Chain length: {{ chainLength }}</span>
        <button aria-label="Close" class="close-btn" (click)="verifyResult = null"><i class="pi pi-times"></i></button>
      </div>

      <div class="stats-row" *ngIf="items.length > 0 || expiringItems.length > 0">
        <div class="stat-chip">
          <span class="stat-count">{{ items.length }}</span>
          <span class="stat-label">{{ i18n.translate('evidence.totalEvidence') }}</span>
        </div>
        <div class="stat-chip expiring" *ngIf="expiringItems.length > 0">
          <span class="stat-count">{{ expiringItems.length }}</span>
          <span class="stat-label">{{ i18n.translate('evidence.expiringSoon') }}</span>
        </div>
        <div class="stat-chip" *ngIf="schedules.length > 0">
          <span class="stat-count">{{ schedules.length }}</span>
          <span class="stat-label">Schedules</span>
        </div>
        <div class="stat-chip" *ngIf="connectors.length > 0">
          <span class="stat-count">{{ connectors.length }}</span>
          <span class="stat-label">Connectors</span>
        </div>
      </div>

      <div class="requirements-section" *ngIf="requirementsSummary.length > 0">
        <h3 class="section-title">Evidence Requirements by Framework</h3>
        <div class="fw-chips">
          <button *ngFor="let fw of requirementsSummary"
                  class="fw-chip" [class.active]="selectedFramework === fw.framework_code"
                  (click)="loadFrameworkRequirements(fw.framework_code)">
            <span class="fw-chip-code">{{fw.framework_code | uppercase}}</span>
            <span class="fw-chip-count">{{fw.requirement_count}} req</span>
          </button>
        </div>
      </div>

      <div class="requirements-table" *ngIf="requirements.length > 0">
        <h4 class="req-table-title">
          {{selectedFramework | uppercase}} — {{requirements.length}} Evidence Requirements
          <button aria-label="Close" class="close-btn" (click)="requirements = []; selectedFramework = ''"><i class="pi pi-times"></i></button>
        </h4>
        <p-table aria-label="Requirements table" [value]="requirements" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10,25,50]"
                 [globalFilterFields]="['evidence_type_code','control_code','requirement_description_en']"
                 styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template pTemplate="header">
            <tr>
              <th style="width:100px">Control</th>
              <th style="width:100px">Type</th>
              <th>Description</th>
              <th style="width:100px">Frequency</th>
              <th style="width:80px">Mandatory</th>
              <th style="width:120px">Extensions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-req>
            <tr tabindex="0" role="button" (keyup.enter)="showRequirementDetail(req)" (click)="showRequirementDetail(req)" class="clickable-row">
              <td><code>{{req.control_code}}</code></td>
              <td>
                <p-tag [value]="req.evidence_name_en || req.evidence_type_code" [severity]="getTypeSeverity(req.evidence_type_code)" />
              </td>
              <td class="desc-cell">{{req.requirement_description_en | slice:0:120}}{{(req.requirement_description_en || '').length > 120 ? '...' : ''}}</td>
              <td>{{req.collection_frequency || '—'}}</td>
              <td>
                <i class="pi" [ngClass]="req.is_mandatory ? 'pi-check-circle text-green' : 'pi-minus-circle text-muted'"></i>
              </td>
              <td><span class="ext-tag">{{req.file_extensions || '—'}}</span></td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="6" class="text-center text-muted">No requirements found</td></tr>
          </ng-template>
        </p-table>
      </div>

      <p-table aria-label="Filtered table" [value]="filtered" [paginator]="true" [rows]="15" [rowsPerPageOptions]="[15,30,50]"
               styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true"
               *ngIf="filtered.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="title">Title <p-sortIcon field="title" /></th>
            <th style="width:120px">Control</th>
            <th pSortableColumn="version" style="width:80px">Version <p-sortIcon field="version" /></th>
            <th style="width:100px">Status</th>
            <th style="width:100px">Hash</th>
            <th pSortableColumn="submitted_by" style="width:120px">Submitted By <p-sortIcon field="submitted_by" /></th>
            <th pSortableColumn="created_at" style="width:130px">Date <p-sortIcon field="created_at" /></th>
            <th style="width:100px">Expiry</th>
            <th style="width:160px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td>
              <span class="item-title-cell">{{ item.title }}</span>
              <span *ngIf="item.file_path" class="file-indicator"><i class="pi pi-paperclip"></i></span>
            </td>
            <td><code>{{ item.control_id | slice:0:8 }}</code></td>
            <td><p-tag [value]="'v' + item.version" severity="info" [rounded]="true" /></td>
            <td><app-status-badge [status]="item.status ?? 'pending'" /></td>
            <td><code class="hash-cell" *ngIf="item.content_hash">{{ item.content_hash | slice:0:10 }}…</code></td>
            <td>{{ item.submitted_by | slice:0:12 }}</td>
            <td>{{ item.created_at | appDate:'medium' }}</td>
            <td>
              <p-tag *ngIf="isExpiringSoon(item)" value="Expiring" severity="warning" [rounded]="true" />
              <span *ngIf="item.expiry_date && !isExpiringSoon(item)">{{ item.expiry_date | appDate:'medium' }}</span>
            </td>
            <td class="flex gap-1">
              <p-button icon="pi pi-eye" [text]="true" severity="info" pTooltip="View Details" (onClick)="viewDetail(item)" />
              <p-button icon="pi pi-upload" [text]="true" severity="secondary" pTooltip="Upload File" (onClick)="openUploadDialog(item)" />
              <p-button icon="pi pi-download" [text]="true" severity="secondary" pTooltip="Download" (onClick)="downloadFile(item)" *ngIf="item.file_path" />
              <p-button icon="pi pi-plus" [text]="true" severity="success" pTooltip="New Version" (onClick)="openVersionDialog(item)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="9" class="text-center text-muted">No evidence found</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="!loading && filtered.length === 0 && requirements.length === 0" class="empty-state">
        <i class="pi pi-inbox" style="font-size: var(--font-size-4xl); color: var(--text-muted);"></i>
        <p class="text-muted mt-2">{{ i18n.translate('common.noData') }}</p>
      </div>

      <div class="cross-links-section">
        <h3 class="section-title">{{ i18n.currentLang() === 'ar' ? 'روابط المنصة' : 'Cross-Module Links' }}</h3>
        <div class="cross-links-grid">
          <a class="cross-link-card" routerLink="/compliance/controls">
            <i class="pi pi-lock"></i>
            <span>{{ i18n.currentLang() === 'ar' ? 'الضوابط' : 'Controls' }}</span>
            <small>{{ i18n.currentLang() === 'ar' ? 'أدلة مرتبطة بالضوابط' : 'Evidence linked to controls' }}</small>
          </a>
          <a class="cross-link-card" routerLink="/governance/policies">
            <i class="pi pi-file"></i>
            <span>{{ i18n.currentLang() === 'ar' ? 'السياسات' : 'Policies' }}</span>
            <small>{{ i18n.currentLang() === 'ar' ? 'أدلة دعم السياسات' : 'Policy supporting evidence' }}</small>
          </a>
          <a class="cross-link-card" routerLink="/audit">
            <i class="pi pi-search"></i>
            <span>{{ i18n.currentLang() === 'ar' ? 'التدقيق' : 'Audit' }}</span>
            <small>{{ i18n.currentLang() === 'ar' ? 'أدلة التدقيق والنتائج' : 'Audit findings evidence' }}</small>
          </a>
          <a class="cross-link-card" routerLink="/risk">
            <i class="pi pi-shield"></i>
            <span>{{ i18n.currentLang() === 'ar' ? 'المخاطر' : 'Risk Register' }}</span>
            <small>{{ i18n.currentLang() === 'ar' ? 'أدلة معالجة المخاطر' : 'Risk treatment evidence' }}</small>
          </a>
          <a class="cross-link-card" routerLink="/compliance/findings">
            <i class="pi pi-flag"></i>
            <span>{{ i18n.currentLang() === 'ar' ? 'النتائج' : 'Findings' }}</span>
            <small>{{ i18n.currentLang() === 'ar' ? 'أدلة إغلاق النتائج' : 'Finding closure evidence' }}</small>
          </a>
          <a class="cross-link-card" routerLink="/incidents">
            <i class="pi pi-bell"></i>
            <span>{{ i18n.currentLang() === 'ar' ? 'الحوادث' : 'Incidents' }}</span>
            <small>{{ i18n.currentLang() === 'ar' ? 'أدلة التحقيق' : 'Investigation evidence' }}</small>
          </a>
        </div>
      </div>

      <!-- Submit Evidence Dialog -->
      <p-dialog [header]="i18n.translate('evidence.submit')"
                [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <label>{{ i18n.translate('evidence.controlId') }}</label>
          <input pInputText [(ngModel)]="form.controlId" class="w-full" placeholder="Control UUID" aria-label="Control UUID" />
          <label>Title</label>
          <input pInputText [(ngModel)]="form.title" class="w-full" placeholder="Evidence title" aria-label="Evidence title" />
          <label>Description</label>
          <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full" placeholder="Evidence description" aria-label="Evidence description"></textarea>
          <label>Content / URL</label>
          <textarea pInputTextarea [(ngModel)]="form.content" [rows]="3" class="w-full" placeholder="Evidence content, URL, or reference" aria-label="Evidence content, URL, or reference"></textarea>
          <label>Expiry Date (optional)</label>
          <input pInputText [(ngModel)]="form.expiryDate" class="w-full" placeholder="YYYY-MM-DD" aria-label="YYYY-MM-DD" />
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="i18n.translate('evidence.submit')" icon="pi pi-upload" (onClick)="submitEvidence()" [disabled]="!form.controlId || !form.title" />
        </ng-template>
      </p-dialog>

      <!-- Version Dialog -->
      <p-dialog header="Submit New Version"
                [(visible)]="showVersionDialog" [modal]="true" [style]="{width:'520px'}">
        <div class="dialog-form" *ngIf="versionTarget">
          <p class="text-muted">Creating new version for: <strong>{{ versionTarget.title }}</strong></p>
          <label>Title</label>
          <input pInputText [(ngModel)]="versionForm.title" class="w-full" />
          <label>Description</label>
          <textarea pInputTextarea [(ngModel)]="versionForm.description" [rows]="3" class="w-full"></textarea>
          <label>Expiry Date (optional)</label>
          <input pInputText [(ngModel)]="versionForm.expiryDate" class="w-full" placeholder="YYYY-MM-DD" aria-label="YYYY-MM-DD" />
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" icon="pi pi-times" [text]="true" (onClick)="showVersionDialog = false" />
          <p-button label="Submit Version" icon="pi pi-plus" (onClick)="submitVersion()" [disabled]="!versionForm.title" />
        </ng-template>
      </p-dialog>

      <!-- Upload File Dialog -->
      <p-dialog header="Upload Evidence File"
                [(visible)]="showUploadDialog" [modal]="true" [style]="{width:'520px'}">
        <div *ngIf="uploadTarget" class="upload-dialog-body">
          <div class="upload-target-info">
            <i class="pi pi-file-edit"></i>
            <div>
              <span class="upload-target-label">Attach a file to:</span>
              <strong class="upload-target-name">{{ uploadTarget.title }}</strong>
            </div>
          </div>
          <div class="upload-dropzone" [class.has-file]="selectedFile">
            <input type="file" (change)="onFileSelect($event)" class="upload-file-input" id="evidenceFileInput" />
            <label for="evidenceFileInput" class="upload-dropzone-label">
              <i class="pi" [ngClass]="selectedFile ? 'pi-check-circle' : 'pi-cloud-upload'"></i>
              <span *ngIf="!selectedFile">Click to select a file</span>
              <span *ngIf="selectedFile" class="upload-file-name">{{ selectedFile.name }}</span>
              <small *ngIf="selectedFile">{{ (selectedFile.size / 1024) | appNumber:'decimal':'1.0-0' }} KB</small>
            </label>
          </div>
          <div *ngIf="uploading" class="upload-progress">
            <div class="upload-progress-bar"><div class="upload-progress-fill"></div></div>
            <small>Uploading…</small>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" icon="pi pi-times" [text]="true" (onClick)="showUploadDialog = false" />
          <p-button label="Upload" icon="pi pi-upload" (onClick)="uploadFile()" [disabled]="!selectedFile" [loading]="uploading" />
        </ng-template>
      </p-dialog>

      <!-- Detail Dialog -->
      <p-dialog header="Evidence Detail"
                [(visible)]="showDetailDialog" [modal]="true" [style]="{width:'640px'}" [dismissableMask]="true">
        <div *ngIf="detailItem" class="detail-content">
          <app-raci-panel entityType="evidence" [entityId]="detailItem.evidence_id || ''" [canEdit]="true" />
          <div class="detail-row"><strong>Title:</strong> {{ detailItem.title }}</div>
          <div class="detail-row"><strong>Control:</strong> {{ detailItem.control_id }}</div>
          <div class="detail-row"><strong>Version:</strong> {{ detailItem.version }}</div>
          <div class="detail-row"><strong>Chain Position:</strong> {{ detailItem.chain_position }}</div>
          <div class="detail-row"><strong>Content Hash:</strong> <code>{{ detailItem.content_hash }}</code></div>
          <div class="detail-row"><strong>Previous Hash:</strong> <code>{{ detailItem.previous_hash || 'genesis' }}</code></div>
          <div class="detail-row"><strong>Submitted By:</strong> {{ detailItem.submitted_by }}</div>
          <div class="detail-row"><strong>Created:</strong> {{ detailItem.created_at | appDate:'medium' }}</div>
          <div class="detail-row" *ngIf="detailItem.expiry_date"><strong>Expires:</strong> {{ detailItem.expiry_date | appDate:'medium' }}</div>
          <div class="detail-row" *ngIf="detailItem.file_path"><strong>File:</strong> {{ detailItem.file_path }}</div>
          <div class="detail-row" *ngIf="detailItem.file_size_bytes"><strong>Size:</strong> {{ (detailItem.file_size_bytes / 1024) | appNumber:'decimal':'1.0-0' }} KB</div>
          <div class="detail-row" *ngIf="detailItem.description"><strong>Description:</strong> {{ detailItem.description }}</div>
          <div class="detail-files" *ngIf="detailFiles.length > 0">
            <h5>Attached Files ({{ detailFiles.length }})</h5>
            <div *ngFor="let f of detailFiles" class="file-row">
              <i class="pi pi-file"></i> {{ f.originalFilename || f.filename }} ({{ (f.fileSizeBytes / 1024) | appNumber:'decimal':'1.0-0' }} KB)
            </div>
          </div>
        </div>
      </p-dialog>

      <!-- Requirement Detail Dialog -->
      <p-dialog header="Evidence Requirement Detail"
                [(visible)]="showReqDetail" [modal]="true" [style]="{width:'640px'}" [dismissableMask]="true">
        <div class="req-detail" *ngIf="selectedRequirement">
          <div class="req-detail-header">
            <p-tag [value]="selectedRequirement.evidence_type_code" [severity]="getTypeSeverity(selectedRequirement.evidence_type_code)" />
            <p-tag [value]="selectedRequirement.is_mandatory ? 'Mandatory' : 'Optional'" [severity]="selectedRequirement.is_mandatory ? 'danger' : 'secondary'" />
            <code>{{selectedRequirement.control_code}}</code>
          </div>
          <h4>{{selectedRequirement.control_title_en}}</h4>
          <p class="req-domain">Domain: {{selectedRequirement.domain_name_en}}</p>
          <div class="req-section">
            <h5>What to Upload</h5>
            <p>{{selectedRequirement.requirement_description_en}}</p>
          </div>
          <div class="req-section" *ngIf="selectedRequirement.expected_content_en">
            <h5>Expected Content</h5>
            <p class="expected-content">{{selectedRequirement.expected_content_en}}</p>
          </div>
          <div class="req-meta-grid">
            <div><strong>Frequency:</strong> {{selectedRequirement.collection_frequency || '—'}}</div>
            <div><strong>Retention:</strong> {{selectedRequirement.retention_period_months ? selectedRequirement.retention_period_months + ' months' : '—'}}</div>
            <div><strong>File Types:</strong> {{selectedRequirement.file_extensions || '—'}}</div>
          </div>
        </div>
      </p-dialog>

      <!-- Schedules Dialog -->
      <p-dialog header="Evidence Collection Schedules"
                [(visible)]="showSchedules" [modal]="true" [style]="{width:'700px'}" [dismissableMask]="true">
        <div class="mb-3">
          <p-button label="Add Schedule" icon="pi pi-plus" size="small" (onClick)="showAddSchedule = true" />
        </div>
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Schedules table" [value]="schedules" styleClass="p-datatable-sm" *ngIf="schedules.length > 0">
          <ng-template pTemplate="header">
            <tr><th>Control</th><th>Cron</th><th>Reminder</th><th>Assigned To</th><th>Enabled</th><th>Actions</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-s>
            <tr>
              <td><code>{{ s.control_id | slice:0:8 }}</code></td>
              <td><code>{{ s.cron_expression }}</code></td>
              <td>{{ s.reminder_text || '—' }}</td>
              <td>{{ s.assigned_to || '—' }}</td>
              <td><p-tag [value]="s.enabled ? 'Active' : 'Disabled'" [severity]="s.enabled ? 'success' : 'secondary'" /></td>
              <td>
                <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteSchedule(s.schedule_id)" />
              </td>
            </tr>
          </ng-template>
        </p-table>
        <div *ngIf="schedules.length === 0" class="text-center text-muted p-4">No schedules configured</div>

        <div *ngIf="showAddSchedule" class="mt-3 p-3" style="border: 1px solid var(--surface-border); border-radius: var(--radius);">
          <h5>New Schedule</h5>
          <div class="dialog-form">
            <label>Control ID</label>
            <input pInputText [(ngModel)]="scheduleForm.controlId" class="w-full" placeholder="Control UUID" aria-label="Control UUID" />
            <label>Cron Expression</label>
            <input pInputText [(ngModel)]="scheduleForm.cronExpression" class="w-full" placeholder="0 0 1 * *" aria-label="0 0 1 * *" />
            <label>Reminder Text</label>
            <input pInputText [(ngModel)]="scheduleForm.reminderText" class="w-full" />
            <label>Assigned To</label>
            <input pInputText [(ngModel)]="scheduleForm.assignedTo" class="w-full" />
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
    .search-input { min-width: 220px; }
    .ms-3 { margin-inline-start: 12px; }
    .me-2 { margin-inline-end: 8px; }
    .w-full { width: 100%; }
    .mt-2 { margin-top: 8px; }
    .mt-3 { margin-top: 12px; }
    .mb-3 { margin-bottom: 12px; }
    .p-3 { padding: 12px; }
    .p-4 { padding: 16px; }

    .verify-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; border-radius: var(--radius-sm);
      margin-bottom: 16px; font-size: var(--font-size-sm); font-weight: 600;
    }
    .verify-ok { background: var(--status-success-bg, #defbe6); border: 1px solid #bbf7d0; color: #15803d; }
    .verify-fail { background: var(--status-danger-bg, #fff1f1); border: 1px solid var(--status-danger-bg, #fff1f1); color: var(--error); }
    .verify-banner .pi { font-size: var(--font-size-lg); }
    .chain-info { font-weight: 400; font-size: var(--font-size-sm); color: var(--text-muted); }
    .close-btn { background: none; border: none; cursor: pointer; margin-inline-start: auto; color: inherit; opacity: 0.6; }
    .close-btn:hover { opacity: 1; }

    .stats-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .stat-chip {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; background: var(--surface); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-pill); font-size: var(--font-size-sm);
    }
    .stat-count { font-weight: 800; color: var(--text-heading); }
    .stat-label { color: var(--text-muted); }
    .stat-chip.expiring { border-color: #fed7aa; background: var(--status-warning-bg, #fcf4d6); }
    .stat-chip.expiring .stat-count { color: var(--warning); }

    .requirements-section { margin-bottom: 16px; }
    .section-title { font-size: var(--font-size-base); font-weight: 700; margin: 0 0 10px; color: var(--text-heading); }
    .fw-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .fw-chip {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 8px 16px; border: 1px solid var(--border-subtle, var(--border-subtle)); border-radius: var(--radius);
      background: var(--surface-ground, #fff); cursor: pointer; transition: all 200ms;
    }
    .fw-chip:hover { border-color: var(--primary); background: #eff6ff; }
    .fw-chip.active { border-color: var(--primary); background: #dbeafe; }
    .fw-chip-code { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; }
    .fw-chip-count { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }

    .requirements-table { margin-bottom: 20px; }
    .req-table-title { font-size: var(--font-size-base); font-weight: 600; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: var(--surface-hover, var(--surface-ice)); }
    .desc-cell { font-size: var(--font-size-sm); line-height: 1.4; }
    .ext-tag { font-size: var(--font-size-xs); font-family: monospace; background: var(--surface-ground, var(--surface-ice)); padding: 2px 6px; border-radius: var(--radius-xs); }
    .text-green { color: var(--success); }
    .text-muted { color: var(--text-muted, #9ca3af); }
    .text-center { text-align: center; }

    .item-title-cell { font-weight: 600; }
    .file-indicator { margin-inline-start: 6px; color: var(--primary); font-size: var(--font-size-sm); }
    .hash-cell { font-size: var(--font-size-xs); color: var(--text-muted); }

    .dialog-form { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
    .dialog-form label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); }

    .empty-state { text-align: center; padding: 40px; }

    .detail-content { display: flex; flex-direction: column; gap: 8px; }
    .detail-row { font-size: var(--font-size-sm); }
    .detail-row strong { color: var(--text-heading); }
    .detail-row code { font-size: var(--font-size-xs); word-break: break-all; }
    .detail-files { margin-top: 12px; border-top: 1px solid var(--surface-border); padding-top: 8px; }
    .detail-files h5 { margin: 0 0 6px; font-size: var(--font-size-sm); }
    .file-row { font-size: var(--font-size-sm); padding: 3px 0; display: flex; align-items: center; gap: 6px; }

    .req-detail-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .req-domain { font-size: var(--font-size-sm); color: var(--text-muted); margin: 4px 0 12px; }
    .req-section { margin-bottom: 12px; }
    .req-section h5 { font-size: var(--font-size-sm); font-weight: 700; margin: 0 0 4px; }
    .req-section p { font-size: var(--font-size-sm); line-height: 1.5; }
    .expected-content { white-space: pre-line; background: var(--surface-ground, #f9fafb); padding: 8px 12px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .req-meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: var(--font-size-sm); }

    .cross-links-section { margin-top: 24px; }
    .cross-links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
      padding: 8px 0;
    }
    .cross-link-card {
      display: flex; flex-direction: column; gap: 4px; padding: 16px;
      border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md);
      background: var(--surface-card, #fff); text-decoration: none; color: inherit;
      transition: all 0.15s; cursor: pointer;
    }
    .cross-link-card:hover {
      box-shadow: var(--shadow-md);
      border-color: var(--primary-500, var(--primary));
      transform: translateY(-2px);
    }
    .cross-link-card i { font-size: var(--font-size-xl); color: var(--primary-500, var(--primary)); margin-bottom: 4px; }
    .cross-link-card span { font-size: var(--font-size-base); font-weight: 600; }
    .cross-link-card small { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); }

    .upload-dialog-body { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
    .upload-target-info { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--status-info-bg, #edf5ff); border: 1px solid #bae6fd; border-radius: var(--radius-md); }
    .upload-target-info i { font-size: var(--font-size-2xl); color: #0284c7; }
    .upload-target-label { display: block; font-size: var(--font-size-sm); color: var(--text-muted); }
    .upload-target-name { display: block; font-size: var(--font-size-base); color: var(--text-heading); }
    .upload-dropzone { position: relative; border: 2px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 24px; text-align: center; transition: all 0.2s; cursor: pointer; }
    .upload-dropzone:hover { border-color: var(--primary); background: #faf5ff; }
    .upload-dropzone.has-file { border-color: var(--success); background: var(--status-success-bg, #defbe6); }
    .upload-file-input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
    .upload-dropzone-label { display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; }
    .upload-dropzone-label i { font-size: var(--font-size-3xl); color: var(--text-muted); }
    .upload-dropzone.has-file .upload-dropzone-label i { color: var(--success); }
    .upload-file-name { font-weight: 600; color: var(--text-heading); font-size: var(--font-size-base); }
    .upload-dropzone-label small { font-size: var(--font-size-sm); color: var(--text-muted); }
    .upload-progress { text-align: center; }
    .upload-progress small { font-size: var(--font-size-sm); color: var(--primary); }
    .upload-progress-bar { width: 100%; height: 6px; background: var(--border-subtle); border-radius: var(--radius-xs); overflow: hidden; margin-bottom: 4px; }
    .upload-progress-fill { width: 100%; height: 100%; background: linear-gradient(90deg, var(--primary), #818cf8); border-radius: var(--radius-xs); animation: progressPulse 1.5s ease-in-out infinite; }
    @keyframes progressPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  `]
})
export class EvidenceComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
    private complianceSvc = inject(GrcComplianceService);
  private destroyRef = inject(DestroyRef);
  private subs: Subscription[] = [];
  private live = inject(GrcLiveService);
  private cdr = inject(ChangeDetectorRef);
  i18n = inject(I18nService);

  loading = true;
  items: EvidenceItem[] = [];
  filtered: EvidenceItem[] = [];
  expiringItems: EvidenceItem[] = [];
  connectors: Record<string, unknown>[] = [];
  schedules: EvidenceSchedule[] = [];
  pendingEvidence: EvidenceItem[] = [];

  searchTerm = '';
  selectedType: string | null = null;
  verifying = false;
  verifyResult: boolean | null = null;
  chainLength = 0;

  dashboard = { coverage: 0, freshness: 0, slaStatus: 'On Time', pending: 0, overdue: 0 };
  automation = { lastRun: '', error: '', aiScore: 0 };

  requirementsSummary: Record<string, unknown>[] = [];
  requirements: EvidenceRequirement[] = [];
  selectedFramework = '';
  showReqDetail = false;
  selectedRequirement: EvidenceRequirement | null = null;

  showDialog = false;
  form: Record<string, unknown> = { controlId: '', title: '', description: '', content: '', expiryDate: '' };

  showVersionDialog = false;
  versionTarget: EvidenceItem | null = null;
  versionForm: Record<string, unknown> = { title: '', description: '', expiryDate: '' };

  showUploadDialog = false;
  uploadTarget: EvidenceItem | null = null;
  selectedFile: File | null = null;
  uploading = false;

  showDetailDialog = false;
  detailItem: EvidenceItem | null = null;
  detailFiles: Record<string, unknown>[] = [];

  showSchedules = false;
  showAddSchedule = false;
  scheduleForm: Record<string, unknown> = { controlId: '', cronExpression: '', reminderText: '', assignedTo: '' };

  typeOptions = [
    { label: 'Document', value: 'document' }, { label: 'Screenshot', value: 'screenshot' },
    { label: 'Log', value: 'log' }, { label: 'Configuration', value: 'configuration' },
    { label: 'Report', value: 'report' }, { label: 'Attestation', value: 'attestation' },
  ];

  ngOnInit(): void {
    this.subs.push(this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadAll()));
    this.loadAll();
    this.loadRequirementsSummary();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
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
        const okCount = statusList.filter((s: Record<string, unknown>) => s.status === 'ok').length;
        const lastRun = statusList.find((s: Record<string, unknown>) => s.lastRun)?.lastRun || '';

        this.pendingEvidence = this.items.filter(e => e.status === 'pending' || e.status === 'submitted');

        const total = Math.max(this.items.length, 20);
        this.dashboard = {
          coverage: Math.round((this.items.length / total) * 100),
          freshness: this.items.length > 0 ? Math.round((Date.now() - new Date(this.items[this.items.length - 1]?.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
          slaStatus: this.expiringItems.length > 3 ? 'At Risk' : 'On Time',
          pending: this.pendingEvidence.length,
          overdue: this.expiringItems.length,
        };
        this.automation = {
          lastRun: lastRun ? new Date(lastRun).toISOString().split('T')[0] : '—',
          error: '',
          aiScore: okCount > 0 ? Math.round((okCount / Math.max(statusList.length, 1)) * 100) : 0,
        };

        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  loadConnectors(): void {
    this.complianceSvc.getEvidenceConnectors().pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe(c => {
      this.connectors = Array.isArray(c) ? c : [];
    });
  }

  private loadRequirementsSummary(): void {
    this.complianceSvc.getEvidenceRequirementsSummary().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: Record<string, unknown>) => { this.requirementsSummary = res.frameworks || []; },
      error: () => { this.requirementsSummary = []; }
    });
  }

  loadFrameworkRequirements(frameworkCode: string): void {
    if (this.selectedFramework === frameworkCode) {
      this.selectedFramework = '';
      this.requirements = [];
      return;
    }
    this.selectedFramework = frameworkCode;
    this.complianceSvc.getEvidenceRequirements({ framework: frameworkCode }).subscribe({
      next: (res: Record<string, unknown>) => { this.requirements = res.requirements || []; },
      error: () => { this.requirements = []; }
    });
  }

  showRequirementDetail(req: EvidenceRequirement): void {
    this.selectedRequirement = req;
    this.showReqDetail = true;
  }

  getTypeSeverity(code: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
      POLICY: 'info', PROCEDURE: 'info', LOG: 'warning', CONFIG: 'secondary',
      SCREENSHOT: 'secondary', REPORT: 'success', AUDIT_REPORT: 'success',
      RISK_ASSESSMENT: 'danger', TRAINING_RECORD: 'info', CERTIFICATE: 'success',
      CONTRACT: 'info', MEETING_MINUTES: 'secondary', TEST_RESULT: 'warning',
      ARCHITECTURE_DIAGRAM: 'info', INVENTORY: 'secondary', REVIEW_RECORD: 'info',
      ATTESTATION: 'danger', COMMUNICATION: 'secondary',
    };
    return map[code] || 'info';
  }

  applyFilter(): void {
    let result = [...this.items];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(i =>
        (i.title || '').toLowerCase().includes(term) ||
        (i.control_id || '').toLowerCase().includes(term) ||
        (i.submitted_by || '').toLowerCase().includes(term)
      );
    }
    if (this.selectedType) result = result.filter(i => (i.type || i.title || '').toLowerCase().includes(this.selectedType!.toLowerCase()));
    this.filtered = result;
  }

  isExpiringSoon(item: EvidenceItem): boolean {
    if (!item.expiry_date) return false;
    const diff = new Date(item.expiry_date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  }

  openSubmitDialog(): void {
    this.form = { controlId: '', title: '', description: '', content: '', expiryDate: '' };
    this.showDialog = true;
  }

  submitEvidence(): void {
    this.complianceSvc.submitEvidence({
      controlId: this.form.controlId,
      title: this.form.title,
      description: this.form.description,
      content: this.form.content,
      submittedBy: 'current-user',
      expiryDate: this.form.expiryDate || undefined,
    } as any).subscribe({
      next: () => { this.showDialog = false; this.loadAll(); },
      error: (e: unknown) => devError("[API]", e),
    });
  }

  openVersionDialog(item: EvidenceItem): void {
    this.versionTarget = item;
    this.versionForm = { title: item.title, description: '', expiryDate: '' };
    this.showVersionDialog = true;
  }

  submitVersion(): void {
    if (!this.versionTarget) return;
    this.complianceSvc.submitEvidenceVersion(this.versionTarget.evidence_id, {
      title: this.versionForm.title,
      description: this.versionForm.description,
      submittedBy: 'current-user',
      expiryDate: this.versionForm.expiryDate || undefined,
    } as any).subscribe({
      next: () => { this.showVersionDialog = false; this.loadAll(); },
      error: (e: unknown) => devError("[API]", e),
    });
  }

  openUploadDialog(item: EvidenceItem): void {
    this.uploadTarget = item;
    this.selectedFile = null;
    this.showUploadDialog = true;
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
  }

  uploadFile(): void {
    if (!this.uploadTarget || !this.selectedFile) return;
    this.uploading = true;
    this.complianceSvc.uploadEvidenceFile(this.uploadTarget.evidence_id, this.selectedFile).subscribe({
      next: () => { this.uploading = false; this.showUploadDialog = false; this.loadAll(); },
      error: () => { this.uploading = false; },
    });
  }

  downloadFile(item: EvidenceItem): void {
    this.complianceSvc.downloadEvidenceFile(item.evidence_id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.file_path || 'evidence-file';
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  viewDetail(item: EvidenceItem): void {
    this.detailItem = item;
    this.detailFiles = [];
    this.showDetailDialog = true;
    this.complianceSvc.listEvidenceFiles(item.evidence_id).pipe(catchError(() => of({ files: [] })), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: Record<string, unknown>) => { this.detailFiles = res.files || []; }
    });
  }

  verifyChain(): void {
    this.verifying = true;
    this.verifyResult = null;
    this.complianceSvc.verifyHashChain().subscribe({
      next: (res: Record<string, unknown>) => {
        this.verifyResult = res.intact !== false;
        this.chainLength = res.chainLength || 0;
        this.verifying = false;
      },
      error: () => { this.verifyResult = false; this.verifying = false; },
    });
  }

  triggerCollect(connectorId: string): void {
    this.complianceSvc.collectEvidence(connectorId).subscribe({ next: () => this.loadAll() });
  }

  triggerCollectAll(): void {
    this.complianceSvc.collectEvidence('all').subscribe({ next: () => this.loadAll() });
  }

  onReviewAction(item: Record<string, unknown>, action: 'approve' | 'reject'): void {
    const endpoint = action === 'approve'
      ? `/evidence-tasks/${item.evidence_id || item.task_id}/approve`
      : `/evidence-tasks/${item.evidence_id || item.task_id}/reject`;
    this.apiclientSvc.post(endpoint, {}).subscribe({ next: () => this.loadAll() });
  }

  createSchedule(): void {
    this.complianceSvc.createEvidenceSchedule(this.scheduleForm as any).subscribe({
      next: () => {
        this.showAddSchedule = false;
        this.scheduleForm = { controlId: '', cronExpression: '', reminderText: '', assignedTo: '' };
        this.loadAll();
      }
    });
  }

  deleteSchedule(id: string): void {
    this.complianceSvc.deleteEvidenceSchedule(id).subscribe({ next: () => this.loadAll() });
  }

}
