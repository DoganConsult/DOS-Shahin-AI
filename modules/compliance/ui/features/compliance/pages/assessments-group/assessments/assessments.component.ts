import { inject, Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";
import { ButtonModule, DialogModule, DropdownModule, InputModule, ModalModule, NotificationModule, TableModule, TagModule, TooltipModule } from 'carbon-components-angular';
import { MessageService , ConfirmationService} from "@app/services/toast.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-assessments',
    imports: [CommonModule, AppDatePipe, AppNumberPipe, FormsModule, PageShellComponent, EmptyStateComponent, StatusBadgeComponent, TableModule, TagModule, ButtonModule, DialogModule, InputModule, DropdownModule, NotificationModule, TooltipModule, ModalModule],
    providers: [],
    template: `
    <app-page-shell icon="clipboard-check" [title]="i18n.translate('assessments.title')"
      [subtitle]="i18n.translate('assessments.subtitle')"
      [breadcrumbs]="[i18n.translate('assessments.breadcrumbDashboard'), i18n.translate('assessments.title')]" [loading]="loading">
      <div class="toolbar" *ngIf="!error">
        <button cdsButton [label]="i18n.translate('assessments.newAssessment')" icon="" (onClick)="showCreate = true" />
      </div>
      <app-empty-state
        *ngIf="!error && !loading && assessments.length === 0"
        variant="default"
        [title]="i18n.translate('assessments.noAssessments')"
        [description]="i18n.translate('gettingStarted.runBaselineAssessment')"
        [actionLabel]="i18n.translate('assessments.newAssessment')"
        (action)="showCreate = true" />
      <table cdsTable [attr.aria-label]="i18n.translate('assessments.ariaAssessmentsTable')" [value]="assessments" [paginator]="true" [rows]="15" styleClass="p-datatable-sm p-datatable-striped" *ngIf="!error && assessments.length > 0">
        <ng-template pTemplate="header">
          <tr><th>{{ i18n.translate('assessments.colTitle') }}</th><th>{{ i18n.translate('assessments.colFramework') }}</th><th>{{ i18n.translate('assessments.colStatus') }}</th><th>{{ i18n.translate('assessments.colScore') }}</th><th>{{ i18n.translate('assessments.colCreated') }}</th><th>{{ i18n.translate('assessments.colActions') }}</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-a>
          <tr>
            <td>{{ a.title }}</td>
            <td>{{ a.framework_id || a.frameworkId }}</td>
            <td><app-status-badge [status]="a.status" /></td>
            <td>{{ a.score != null ? (a.score | appNumber:'decimal':'1.0-1') + '%' : '—' }}</td>
            <td>{{ a.created_at | appDate:'short' }}</td>
            <td class="actions">
              <button cdsButton icon="" class=" " [cdsTooltip]="i18n.translate('assessments.viewItems')" (onClick)="viewItems(a)" />
              <button cdsButton icon="" class="  " [cdsTooltip]="i18n.translate('assessments.score')" (onClick)="scoreAssessment(a)" />
              <button cdsButton icon="" class="  " [cdsTooltip]="i18n.translate('common.delete')" (onClick)="deleteAssessment(a)" />
            </td>
          </tr>
        </ng-template>
      </table>

      <!-- Items Dialog -->
      <cds-modal [header]="i18n.translate('assessments.assessmentItems')" [(visible)]="showItems" [modal]="true" [style]="{width:'700px'}">
        <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('assessments.ariaItemsTable')" [value]="items" styleClass="p-datatable-sm">
          <ng-template pTemplate="header"><tr><th>{{ i18n.translate('assessments.colControl') }}</th><th>{{ i18n.translate('assessments.colStatus') }}</th><th>{{ i18n.translate('assessments.colActions') }}</th></tr></ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td>{{ item.control_node_id }}</td>
              <td><cds-tag [value]="item.status" [severity]="itemSeverity(item.status)" /></td>
              <td>
                <cds-dropdown [options]="statusOptions" [(ngModel)]="item.newStatus" placeholder="Change..." appendTo="body" [style]="{width:'160px'}" />
                <button cdsButton icon="" class=" " (onClick)="updateItemStatus(item)" *ngIf="item.newStatus" />
              </td>
            </tr>
          </ng-template>
        </table>
      </cds-modal>

      <!-- Create Dialog -->
      <cds-modal [header]="i18n.translate('assessments.newAssessment')" [(visible)]="showCreate" [modal]="true" [style]="{width:'450px'}">
        <div class="field"><label>{{ i18n.translate('assessments.colTitle') }}</label><input pInputText [(ngModel)]="newTitle" class="w-full" /></div>
        <div class="field"><label>{{ i18n.translate('assessments.colFramework') }}</label><input pInputText [(ngModel)]="newFrameworkId" class="w-full" /></div>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('common.cancel')" class="" (onClick)="showCreate = false" />
          <button cdsButton [label]="i18n.translate('assessments.create')" icon="" (onClick)="createAssessment()" />
        </ng-template>
      </cds-modal>

      <div *ngIf="error" class="error-state">
        <i class="" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">{{ i18n.translate('common.retry') }}</button>
      </div>
    </app-page-shell>
    <cds-notification></cds-notification>
    <cds-modal></cds-modal>
  `,
    styles: [`.toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; } .actions { display: flex; gap: 4px; } .field { margin-bottom: 16px; } .field label { display: block; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 4px; } .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}`]
})
export class AssessmentsComponent implements OnInit {
  private msg = inject(MessageService);

  private confirmSvc = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  error = '';
  assessments: GrcRecord[] = [];
  items: GrcRecord[] = [];
  showItems = false;
  showCreate = false;
  newTitle = '';
  newFrameworkId = '';
  selectedAssessment: GrcRecord | null = null;
  statusOptions = [
    { label: 'Compliant', value: 'compliant' },
    { label: 'Partially Compliant', value: 'partially_compliant' },
    { label: 'Non-Compliant', value: 'non_compliant' },
    { label: 'Not Applicable', value: 'not_applicable' },
  ];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.apiclientSvc.get('/assessments').subscribe({
      next: (d) => { this.assessments = d || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  createAssessment() {
    if (!this.newTitle || !this.newFrameworkId) return;
    this.apiclientSvc.post('/assessments', { title: this.newTitle, frameworkId: this.newFrameworkId }).subscribe({
      next: () => { this.showCreate = false; this.newTitle = ''; this.newFrameworkId = ''; this.msg.add({ severity: 'success', summary: this.i18n.translate('common.assessmentCreated') }); this.load(); },
      error: (e) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e.error?.error }); }
    });
  }

  viewItems(a: GrcRecord) {
    this.selectedAssessment = a;
    this.apiclientSvc.get(`/assessments/${a.assessment_id}/items`).subscribe({
      next: (d) => { this.items = (d || []).map((i) => ({ ...i, newStatus: '' })); this.showItems = true; }
    });
  }

  updateItemStatus(item: GrcRecord) {
    this.apiclientSvc.put(`/assessments/items/${item.item_id}`, { status: item.newStatus }).subscribe({
      next: () => { item.status = item.newStatus; item.newStatus = ''; this.msg.add({ severity: 'success', summary: this.i18n.translate('common.itemUpdated') }); }
    });
  }

  scoreAssessment(a: GrcRecord) {
    this.apiclientSvc.get(`/assessments/${a.assessment_id}/score`).subscribe({
      next: (d) => { a.score = d.score; this.msg.add({ severity: 'info', summary: this.i18n.translate('common.score'), detail: `${d.score}%` }); }
    });
  }

  deleteAssessment(a: GrcRecord) {
    this.confirmSvc.confirm({
      message: `Delete assessment "${a.title}"?`,
      header: 'Confirm',
      icon: '',
      acceptButtonStyleClass: '',
      accept: () => {
        this.apiclientSvc.del(`/assessments/${a.assessment_id}`).subscribe({
          next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted') }); this.load(); }
        });
      }
    });
  }

  itemSeverity(s: string): string {
    if (s === 'compliant') return 'success';
    if (s === 'non_compliant') return 'danger';
    if (s === 'partially_compliant') return 'warning';
    return 'info';
  }
}
