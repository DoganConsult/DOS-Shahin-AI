import { Component, OnInit, inject, DestroyRef, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe, AppNumberPipe } from '@app/shared/pipes';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '../../core/interceptors/grc-live.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '../../shared/ai-panel/ai-panel.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exceptions',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, AiPanelComponent, RaciPanelComponent,
    TableModule, TagModule, ButtonModule, DialogModule,
    InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule, RouterModule, AppDatePipe, AppNumberPipe,],
  providers: [MessageService],
  template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Exceptions & Waivers" titleAr="الاستثناءات والإعفاءات"
        subtitleEn="Manage control exceptions, compensating measures, risk acceptance and expiry tracking"
        subtitleAr="إدارة استثناءات الضوابط والتدابير التعويضية وقبول المخاطر وتتبع الانتهاء"
        icon="exclamation-triangle"
        [breadcrumbs]="[i18n.translate('exceptions.dashboard'), i18n.translate('exceptions.governance'), i18n.translate('exceptions.exceptions')]"
        [actions]="headerActions" [isAr]="isAr()" [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="isAr()" />
      <div class="gov-body">

      <p-toast />

      <div class="health-strip" *ngIf="loaded">
        <div tabindex="0" role="button" (keyup.enter)="clearHealthFilter()" class="hs-card" (click)="clearHealthFilter()"><div class="hs-value">{{ items.length | appNumber }}</div><div class="hs-label">{{ i18n.translate('exceptions.total') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('pending')" class="hs-card" (click)="applyHealthFilter('pending')"><div class="hs-value" style="color:#d97706">{{ pendingCount }}</div><div class="hs-label">{{ i18n.translate('exceptions.pending') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('approved')" class="hs-card" (click)="applyHealthFilter('approved')"><div class="hs-value" style="color:var(--success)">{{ approvedCount }}</div><div class="hs-label">{{ i18n.translate('exceptions.approved') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('expiring')" class="hs-card" (click)="applyHealthFilter('expiring')"><div class="hs-value" style="color:var(--warning)">{{ expiringSoonCount }}</div><div class="hs-label">{{ i18n.translate('exceptions.expiringSoon') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('expired')" class="hs-card" (click)="applyHealthFilter('expired')"><div class="hs-value" style="color:var(--error)">{{ expiredCount }}</div><div class="hs-label">{{ i18n.translate('exceptions.expired') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('no_controls')" class="hs-card" (click)="applyHealthFilter('no_controls')"><div class="hs-value" style="color:#7c3aed">{{ missingControlsCount }}</div><div class="hs-label">{{ i18n.translate('exceptions.noControls') }}</div></div>
      </div>

      <div class="page-toolbar">
        <div class="toolbar-primary">
          <p-button [label]="i18n.translate('exceptions.add')" icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('exceptions.searchExceptions')" [attr.aria-label]="i18n.translate('exceptions.searchExceptions')"
                   (input)="filterItems()" class="search-input" />
          </div>
        </div>
        <div class="toolbar-secondary">
          <p-dropdown [options]="statusFilterOptions" [(ngModel)]="statusFilter" optionLabel="label" optionValue="value"
                      [placeholder]="i18n.translate('exceptions.status')" (onChange)="filterItems()" [style]="{minWidth:'140px'}" />
          <p-button [label]="i18n.translate('exceptions.export')" icon="pi pi-download" severity="secondary"
                    [outlined]="true" (onClick)="exportCSV()" [pTooltip]="i18n.translate('exceptions.exportToCsv')" />
        </div>
      </div>

      <app-raci-panel entityType="control" [entityId]="selectedItem?.control_id || ''" [canEdit]="true" />

      <div class="table-shell" *ngIf="filteredItems.length > 0">
      <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10"
               [rows]="10" styleClass="p-datatable-striped p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('exceptions.title') }}</th>
            <th>{{ i18n.translate('exceptions.control') }}</th>
            <th>{{ i18n.translate('exceptions.requester') }}</th>
            <th>{{ i18n.translate('exceptions.approver') }}</th>
            <th>{{ i18n.translate('exceptions.riskLevel') }}</th>
            <th>{{ i18n.translate('exceptions.status') }}</th>
            <th>{{ i18n.translate('exceptions.expiry') }}</th>
            <th style="width:160px">{{ i18n.translate('exceptions.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr tabindex="0" role="button" (keyup.enter)="openDetail(item)" [class.expiring-row]="isExpiringSoon(item)" [class.expired-row]="isExpired(item)" class="clickable-row" (click)="openDetail(item)">
            <td><strong>{{ item.title ?? item.name }}</strong></td>
            <td>{{ item.control_id }}</td>
            <td>{{ item.requester || item.created_by || '—' }}</td>
            <td>{{ item.approver || item.approved_by || '—' }}</td>
            <td>
              <p-tag [value]="item.risk_level" [severity]="item.risk_level === 'critical' ? 'danger' : item.risk_level === 'high' ? 'danger' : item.risk_level === 'medium' ? 'warning' : 'info'" />
            </td>
            <td>
              <app-status-badge [status]="item.status ?? 'pending'" />
              <span *ngIf="isExpired(item)" class="expiry-badge expired">{{ i18n.translate('exceptions.expired') }}</span>
              <span *ngIf="isExpiringSoon(item) && !isExpired(item)" class="expiry-badge soon">{{ i18n.translate('exceptions.expiring') }}</span>
            </td>
            <td>{{ item.expiry_date | appDate:'medium' }}</td>
            <td tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" (click)="$event.stopPropagation()">
              <div class="action-btns">
                <button aria-label="Approve" class="icon-btn approve" (click)="approveException(item)" pTooltip="Approve" *ngIf="item.status === 'pending'"><i class="pi pi-check-circle"></i></button>
                <button aria-label="Reject" class="icon-btn reject" (click)="rejectException(item)" pTooltip="Reject" *ngIf="item.status === 'pending'"><i class="pi pi-times-circle"></i></button>
                <button aria-label="Renew" class="icon-btn renew" (click)="openRenewDialog(item)" pTooltip="Renew" *ngIf="isExpired(item) || isExpiringSoon(item)"><i class="pi pi-refresh"></i></button>
                <button aria-label="Edit" class="icon-btn" (click)="openEditDialog(item)" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
                <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(item)" pTooltip="Delete"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="empty-msg">{{ i18n.translate('exceptions.noDataFound') }}</td></tr>
        </ng-template>
      </p-table>
      </div>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('exceptions.noDataFound') }}</p>
        <p-button [label]="i18n.translate('exceptions.add')" icon="pi pi-plus"
                  (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <p-dialog
        [header]="editMode ? (i18n.translate('exceptions.editException')) : (i18n.translate('exceptions.addNewException'))"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('exceptions.title') }}</label>
            <input pInputText [(ngModel)]="form.title" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('exceptions.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('exceptions.controlId') }}</label>
              <input pInputText [(ngModel)]="form.control_id" class="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('exceptions.riskLevel') }}</label>
              <p-dropdown [(ngModel)]="form.risk_level" [options]="riskLevelOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('exceptions.expiryDate') }}</label>
              <input type="date" pInputText [(ngModel)]="form.expiry_date" class="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('exceptions.status') }}</label>
              <p-dropdown [(ngModel)]="form.status" [options]="statusOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('exceptions.compensatingControls') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.compensating_controls" [rows]="2" class="w-full"
                      [placeholder]="i18n.translate('exceptions.describeCompensatingControls')" [attr.aria-label]="i18n.translate('exceptions.describeCompensatingControls')"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('exceptions.cancel')" icon="pi pi-times"
                    severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="i18n.translate('exceptions.save')" icon="pi pi-check"
                    (onClick)="saveItem()" [disabled]="!form.title" />
        </ng-template>
      </p-dialog>

      <p-dialog [header]="i18n.translate('exceptions.rejectionReason')"
                [(visible)]="showRejectDialog" [modal]="true" [style]="{width:'400px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('exceptions.reason') }}</label>
            <textarea pInputTextarea [(ngModel)]="rejectReason" [rows]="3" class="w-full"
                      [placeholder]="i18n.translate('exceptions.enterRejectionReason')" [attr.aria-label]="i18n.translate('exceptions.enterRejectionReason')"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('exceptions.cancel')" severity="secondary" [text]="true"
                    (onClick)="showRejectDialog = false" />
          <p-button [label]="i18n.translate('exceptions.reject')" icon="pi pi-times" severity="danger"
                    (onClick)="confirmReject()" [disabled]="!rejectReason" />
        </ng-template>
      </p-dialog>

      <p-dialog [header]="i18n.translate('exceptions.confirmDelete')"
                [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('exceptions.areYouSureYouWantToDeleteThisRecord') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('exceptions.cancel')" severity="secondary" [text]="true"
                    (onClick)="showDeleteDialog = false" />
          <p-button [label]="i18n.translate('exceptions.delete')" icon="pi pi-trash"
                    severity="danger" (onClick)="deleteItem()" />
        </ng-template>
      </p-dialog>

      <!-- Exception Detail Drawer -->
      <div tabindex="0" role="button" (keyup.enter)="drawerVisible = false" class="drawer-overlay" *ngIf="drawerVisible" (click)="drawerVisible = false"></div>
      <div class="drawer" [class.open]="drawerVisible">
        <div class="drawer-header">
          <h3>{{ selectedItem?.title ?? selectedItem?.name }}</h3>
          <button aria-label="Close" pButton icon="pi pi-times" class="p-button-text p-button-rounded" (click)="drawerVisible = false"></button>
        </div>
        <div class="detail-grid" *ngIf="selectedItem">
          <div class="detail-row"><span class="detail-label">{{ i18n.translate('exceptions.status') }}</span><app-status-badge [status]="selectedItem.status ?? 'pending'" /></div>
          <div class="detail-row"><span class="detail-label">{{ i18n.translate('exceptions.riskLevel') }}</span><p-tag [value]="selectedItem.risk_level" [severity]="selectedItem.risk_level === 'critical' || selectedItem.risk_level === 'high' ? 'danger' : selectedItem.risk_level === 'medium' ? 'warning' : 'info'" /></div>
          <div class="detail-row"><span class="detail-label">{{ i18n.translate('exceptions.control') }}</span><span>{{ selectedItem.control_id || '—' }}</span></div>
          <div class="detail-row"><span class="detail-label">{{ i18n.translate('exceptions.expiry') }}</span><span>{{ selectedItem.expiry_date | appDate:'medium' }}</span></div>
          <div class="detail-row"><span class="detail-label">{{ i18n.translate('exceptions.created') }}</span><span>{{ selectedItem.created_at | appDate:'medium' }}</span></div>
        </div>
        <div class="detail-section" *ngIf="selectedItem?.description">
          <h4>{{ i18n.translate('exceptions.justification') }}</h4>
          <p class="detail-text">{{ selectedItem.description }}</p>
        </div>
        <div class="detail-section" *ngIf="selectedItem?.compensating_controls">
          <h4>{{ i18n.translate('exceptions.compensatingControls') }}</h4>
          <p class="detail-text">{{ selectedItem.compensating_controls }}</p>
        </div>
        <div class="detail-section" *ngIf="selectedItem?.linked_policy_id || selectedItem?.linked_control_id || selectedItem?.linked_risk_id">
          <h4>{{ i18n.translate('exceptions.linkedObjects') }}</h4>
          <div *ngIf="selectedItem.linked_policy_id" class="linked-item"><i class="pi pi-file"></i> Policy: {{ selectedItem.linked_policy_id }}</div>
          <div *ngIf="selectedItem.linked_control_id" class="linked-item"><i class="pi pi-shield"></i> Control: {{ selectedItem.linked_control_id }}</div>
          <div *ngIf="selectedItem.linked_risk_id" class="linked-item"><i class="pi pi-exclamation-triangle"></i> Risk: {{ selectedItem.linked_risk_id }}</div>
        </div>
        <div class="detail-section" *ngIf="renewalHistory.length > 0">
          <h4>{{ i18n.translate('exceptions.renewalHistory') }}</h4>
          <div *ngFor="let rh of renewalHistory" class="renewal-entry">
            <span class="renewal-date">{{ rh.renewed_at || rh.created_at | appDate:'medium' }}</span>
            <span>{{ i18n.translate('exceptions.from') }} {{ rh.old_expiry | appDate:'medium' }} {{ i18n.translate('exceptions.to') }} {{ rh.new_expiry | appDate:'medium' }}</span>
          </div>
        </div>
        <div class="audit-link-box mt-3" *ngIf="selectedItem">
          <i class="pi pi-history"></i>
          <a [routerLink]="['/foundation/audit']" [queryParams]="{entityType:'exception', entityId: selectedItem.exception_id || selectedItem.id}">
            {{ i18n.translate('exceptions.viewAuditTrailForThisException') }}
          </a>
        </div>
      </div>

      <!-- Renew Dialog -->
      <p-dialog [header]="i18n.translate('exceptions.renewException')"
                [(visible)]="showRenewDialog" [modal]="true" [style]="{width:'440px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('exceptions.newExpiryDate') }}</label>
            <input type="date" pInputText [(ngModel)]="renewExpiry" class="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('exceptions.cancel')" severity="secondary" [text]="true" (onClick)="showRenewDialog = false" />
          <p-button [label]="i18n.translate('exceptions.renew')" icon="pi pi-refresh" (onClick)="confirmRenew()" [disabled]="!renewExpiry" />
        </ng-template>
      </p-dialog>

      </div>
    </div>
    <app-ai-panel module="exceptions" />
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100%; }
    .gov-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ice, var(--surface-ice)); }
    .gov-body { flex: 1; padding: 16px 24px 32px; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
    @media (max-width: 768px) { .gov-body { padding: 12px; gap: 10px; } }
    .health-strip { display: flex; gap: 10px; flex-wrap: wrap; }
    .hs-card { flex: 1; min-width: 90px; text-align: center; padding: 10px 6px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); cursor: pointer; transition: box-shadow .15s; }
    .hs-card:hover { box-shadow: var(--shadow-card); }
    .hs-value { font-size: var(--font-size-lg); font-weight: 700; color: var(--text-heading, #111); }
    .hs-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); padding: 10px 14px; }
    .toolbar-primary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .toolbar-secondary { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .search-wrap { position: relative; display: inline-flex; align-items: center; }
    .search-icon { position: absolute; inset-inline-start: 10px; color: var(--text-muted, #9ca3af); font-size: var(--font-size-sm); z-index: var(--z-base); pointer-events: none; }
    .search-input { min-width: 200px; padding-inline-start: 32px; }
    @media (max-width: 768px) { .page-toolbar { flex-direction: column; align-items: stretch; } .toolbar-primary, .toolbar-secondary { width: 100%; justify-content: space-between; } .search-input { min-width: 0; flex: 1; } }
    .table-shell { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; direction: ltr; }
    .empty-msg { text-align: center; padding: 32px; color: var(--text-muted, var(--text-muted)); }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted, var(--text-muted)); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; color: var(--text-muted, #9ca3af); }
    .action-btns { display: flex; gap: 4px; align-items: center; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted, var(--text-muted)); border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .icon-btn.approve { color: var(--success); } .icon-btn.approve:hover { background: #ecfdf5; border-color: #6ee7b7; }
    .icon-btn.reject { color: var(--error); } .icon-btn.reject:hover { background: var(--status-danger-bg, #fff1f1); border-color: #fca5a5; }
    .icon-btn.renew { color: #0891b2; } .icon-btn.renew:hover { background: #ecfeff; border-color: #a5f3fc; }
    .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); border-color: #fca5a5; }
    .expiry-badge { display: inline-block; font-size: var(--font-size-xs); font-weight: 600; padding: 1px 6px; border-radius: var(--radius-xs); margin-inline-start: 6px; }
    .expiry-badge.expired { color: var(--error); background: #fee2e2; }
    .expiry-badge.soon { color: var(--warning); background: #ffedd5; }
    .expiring-row { background: rgba(var(--color-orange-600-rgb), .04); }
    .expired-row { background: rgba(var(--color-red-600-rgb), .04); }
    .clickable-row { cursor: pointer; } .clickable-row:hover { background: var(--surface-100, var(--surface-ice)); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .w-full { width: 100%; }
    .drawer-overlay { position: fixed; inset: 0; background: rgba(var(--color-black-rgb), 0.3); z-index: var(--z-modal-backdrop); }
    .drawer { position: fixed; top: 0; inset-inline-end: -520px; width: 520px; height: 100vh; background: var(--surface-card); z-index: var(--z-modal); box-shadow: -4px 0 20px rgba(var(--color-black-rgb), 0.15); transition: inset-inline-end 300ms ease; overflow-y: auto; padding: 16px; }
    .drawer.open { inset-inline-end: 0; }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .drawer-header h3 { margin: 0; font-size: var(--font-size-lg); }
    .detail-grid { display: flex; flex-direction: column; gap: 10px; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--surface-border, #f0f0f0); font-size: var(--font-size-sm); }
    .detail-label { font-weight: 600; color: var(--text-muted, var(--text-muted)); min-width: 120px; }
    .detail-section { margin-top: 16px; }
    .detail-section h4 { font-size: var(--font-size-base); font-weight: 600; margin: 0 0 6px; color: var(--text-heading, #111); }
    .detail-text { font-size: var(--font-size-sm); line-height: 1.6; color: var(--text-color, #374151); white-space: pre-wrap; }
    .linked-item { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); padding: 4px 0; }
    .mt-3 { margin-top: 12px; }
    .audit-link-box { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius-md); border: 1px solid var(--surface-border); }
    .audit-link-box a { color: var(--primary-500, var(--primary)); text-decoration: none; font-weight: 600; font-size: var(--font-size-sm); }
    .audit-link-box a:hover { text-decoration: underline; }
  `]
})
export class ExceptionsComponent implements OnInit {
    private complianceSvc = inject(GrcComplianceService);
  items: GrcRecord[] = [];
  filteredItems: GrcRecord[] = [];
  loaded = false;
  searchTerm = '';
  statusFilter = '';
  healthFilter = '';
  isComplianceScoped = false;
  showDialog = false;
  showDeleteDialog = false;
  showRejectDialog = false;
  editMode = false;
  editingId: string | null = null;
  deleteTarget: GrcRecord | null = null;
  rejectTarget: GrcRecord | null = null;
  rejectReason = '';
  form: GrcRecord = { title: '', description: '', control_id: '', risk_level: 'medium', expiry_date: '', status: 'pending', compensating_controls: '' };
  drawerVisible = false;
  selectedItem: GrcRecord | null = null;
  showRenewDialog = false;
  renewTarget: GrcRecord | null = null;
  renewExpiry = '';

  readonly tabs: GrcRecord[] = [];
  readonly headerActions: PageHeaderAction[] = [
    { id: 'add', labelEn: 'New Exception', labelAr: 'استثناء جديد', icon: 'plus', primary: true },
    { id: 'export', labelEn: 'Export', labelAr: 'تصدير', icon: 'download' },
  ];
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  onHeaderAction(id: string): void { if (id === 'add') this.openCreateDialog(); }

  pendingCount = 0;
  approvedCount = 0;
  expiringSoonCount = 0;
  expiredCount = 0;
  missingControlsCount = 0;
  renewalHistory: GrcRecord[] = [];

  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Expired', value: 'expired' },
    { label: 'Rejected', value: 'rejected' },
  ];

  statusFilterOptions = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Expired', value: 'expired' },
    { label: 'Rejected', value: 'rejected' },
  ];

  riskLevelOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
  ];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);

  constructor(
    public i18n: I18nService,
    private msg: MessageService, private apiclientSvc: ApiClientService
  ) {}

  ngOnInit(): void {
    this.isComplianceScoped = this.route.snapshot.data?.['complianceScoped'] === true;
    this.route.queryParams.subscribe(params => {
      if (params['expiringSoon'] === '1') this.healthFilter = 'expiring';
      if (params['status']) this.statusFilter = params['status'];
      if (params['openCreate'] === '1') setTimeout(() => this.openCreateDialog(), 100);
    });
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.apiclientSvc.get('/exceptions').subscribe({
      next: (res) => {
        let data = Array.isArray(res) ? res : (res.data?.exceptions ?? res.exceptions ?? (Array.isArray(res.data) ? res.data : []));
        if (this.isComplianceScoped) {
          data = data.filter((e) => e.control_id && e.control_id.trim() !== '');
        }
        this.items = data;
        this.computeHealth();
        this.filterItems();
        this.loaded = true;
      },
      error: () => { this.loaded = true; }
    });
  }

  computeHealth(): void {
    const now = new Date();
    const in14 = new Date(now.getTime() + 14 * 86400000);
    this.pendingCount = this.items.filter(e => e.status === 'pending').length;
    this.approvedCount = this.items.filter(e => e.status === 'approved' || e.status === 'active').length;
    this.expiringSoonCount = this.items.filter(e => e.expiry_date && new Date(e.expiry_date) <= in14 && new Date(e.expiry_date) >= now && e.status !== 'expired').length;
    this.expiredCount = this.items.filter(e => (e.status === 'expired') || (e.expiry_date && new Date(e.expiry_date) < now && e.status !== 'rejected')).length;
    this.missingControlsCount = this.items.filter(e => !e.compensating_controls || e.compensating_controls.trim() === '').length;
  }

  isExpired(item: GrcRecord): boolean {
    return item.status === 'expired' || (item.expiry_date && new Date(item.expiry_date) < new Date());
  }

  isExpiringSoon(item: GrcRecord): boolean {
    if (!item.expiry_date || this.isExpired(item)) return false;
    const in14 = new Date(new Date().getTime() + 14 * 86400000);
    return new Date(item.expiry_date) <= in14;
  }

  applyHealthFilter(filter: string): void {
    this.healthFilter = filter;
    this.statusFilter = '';
    this.filterItems();
  }

  clearHealthFilter(): void {
    this.healthFilter = '';
    this.statusFilter = '';
    this.filterItems();
  }

  filterItems(): void {
    let r = this.items;
    if (this.healthFilter === 'pending') r = r.filter(e => e.status === 'pending');
    else if (this.healthFilter === 'approved') r = r.filter(e => e.status === 'approved' || e.status === 'active');
    else if (this.healthFilter === 'expiring') r = r.filter(e => this.isExpiringSoon(e));
    else if (this.healthFilter === 'expired') r = r.filter(e => this.isExpired(e));
    else if (this.healthFilter === 'no_controls') r = r.filter(e => !e.compensating_controls || e.compensating_controls.trim() === '');
    if (this.statusFilter) r = r.filter(e => e.status === this.statusFilter);
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter(i => (i.title ?? i.name ?? '').toLowerCase().includes(t) || (i.description ?? '').toLowerCase().includes(t));
    }
    this.filteredItems = r;
  }

  openCreateDialog(): void {
    this.editMode = false; this.editingId = null;
    this.form = { title: '', description: '', control_id: '', risk_level: 'medium', expiry_date: '', status: 'pending', compensating_controls: '' };
    this.showDialog = true;
  }

  openEditDialog(item: GrcRecord): void {
    this.editMode = true; this.editingId = item.exception_id ?? item.id;
    this.form = {
      title: item.title ?? item.name,
      description: item.description ?? '',
      control_id: item.control_id ?? '',
      risk_level: item.risk_level ?? 'medium',
      expiry_date: item.expiry_date ?? '',
      status: item.status ?? 'pending',
      compensating_controls: item.compensating_controls ?? '',
    };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.title) return;
    const obs = this.editMode && this.editingId
      ? this.complianceSvc.updateException(this.editingId, this.form)
      : this.complianceSvc.createException(this.form as any);
    obs.subscribe({
      next: () => { this.showDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.editMode ? this.i18n.translate('common.updated') : this.i18n.translate('common.created'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.operationFailed'), life: 4000 }); }
    });
  }

  approveException(item: GrcRecord): void {
    const id = item.exception_id ?? item.id;
    this.apiclientSvc.put(`/exceptions/${id}`, { status: 'approved' }).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.approved'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.approvalFailed'), life: 4000 }); },
    });
  }

  rejectException(item: GrcRecord): void {
    this.rejectTarget = item;
    this.rejectReason = '';
    this.showRejectDialog = true;
  }

  confirmReject(): void {
    if (!this.rejectTarget || !this.rejectReason) return;
    const id = this.rejectTarget.exception_id ?? this.rejectTarget.id;
    this.apiclientSvc.put(`/exceptions/${id}`, { status: 'rejected', reject_reason: this.rejectReason }).subscribe({
      next: () => { this.showRejectDialog = false; this.rejectTarget = null; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.rejected'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.rejectionFailed'), life: 4000 }); },
    });
  }

  confirmDelete(item: GrcRecord): void { this.deleteTarget = item; this.showDeleteDialog = true; }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.exception_id ?? this.deleteTarget.id;
    this.complianceSvc.deleteException(id).subscribe({
      next: () => { this.showDeleteDialog = false; this.deleteTarget = null; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted'), detail: this.i18n.translate('common.recordRemoved'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.deleteFailed'), life: 4000 }); }
    });
  }

  openDetail(item: GrcRecord): void {
    this.selectedItem = item;
    this.renewalHistory = item.renewal_history || item.renewalHistory || [];
    this.drawerVisible = true;
  }

  openRenewDialog(item: GrcRecord): void {
    this.renewTarget = item;
    this.renewExpiry = '';
    this.showRenewDialog = true;
  }

  confirmRenew(): void {
    if (!this.renewTarget || !this.renewExpiry) return;
    const id = this.renewTarget.exception_id ?? this.renewTarget.id;
    this.apiclientSvc.put(`/exceptions/${id}`, { status: 'approved', expiry_date: this.renewExpiry }).subscribe({
      next: () => { this.showRenewDialog = false; this.renewTarget = null; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.renewed'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.renewFailed'), life: 4000 }); },
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'exceptions.csv'; a.click();
    this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('exceptions.exported') || 'Export downloaded', life: 3000 });
  }

}
