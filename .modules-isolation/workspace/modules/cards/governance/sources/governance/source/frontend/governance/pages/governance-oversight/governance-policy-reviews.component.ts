import { Component, OnInit, inject, computed, ChangeDetectionStrategy} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppDatePipe} from '@app/shared/pipes';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { GOVERNANCE_TABS } from '../../governance.constants';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { TabViewModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-policy-reviews',
    imports: [
        CommonModule, FormsModule,
        PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent,
        TableModule, TagModule, ButtonModule, DialogModule,
        InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule, TabViewModule, AppDatePipe,
    ],
    providers: [MessageService],
    template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Policy Reviews" titleAr="مراجعات السياسات"
        subtitleEn="Track policy review cycles, pending reviews, and outcomes"
        subtitleAr="تتبع دورات مراجعة السياسات والمراجعات المعلقة والنتائج"
        icon="eye"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('Reviews')]"
        [actions]="headerActions" [isAr]="i18n.currentLang() === 'ar'" [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.currentLang() === 'ar'" />
      <div class="gov-body">
      <p-toast />

      <div class="health-strip">
        <div class="health-card"><div class="health-value">{{ reviewCount }}</div><div class="health-label">{{ i18n.translate('Reviews') }}</div></div>
        <div class="health-card"><div class="health-value" style="color:#d97706">{{ pendingCount }}</div><div class="health-label">{{ i18n.translate('Pending') }}</div></div>
        <div class="health-card"><div class="health-value" style="color:var(--error)">{{ overdueQueueCount }}</div><div class="health-label">{{ i18n.translate('Overdue') }}</div></div>
        <div class="health-card"><div class="health-value" style="color:var(--success)">{{ completedCount }}</div><div class="health-label">{{ i18n.translate('Completed') }}</div></div>
      </div>

      <p-tabView>
        <p-tabPanel [header]="i18n.translate('Reviews')">
          <div class="page-toolbar">
            <div class="toolbar-primary">
              <p-button [label]="i18n.translate('Create Review')" icon="pi pi-plus" (onClick)="openCreate()" />
              <div class="search-wrap">
                <i class="pi pi-search search-icon"></i>
                <input type="text" pInputText [(ngModel)]="searchTerm" [placeholder]="i18n.translate('Search...')" [attr.aria-label]="i18n.translate('Search...')" (input)="filterList()" class="search-input" />
              </div>
            </div>
            <div class="toolbar-secondary">
              <p-dropdown [options]="outcomeOptions" [(ngModel)]="outcomeFilter" optionLabel="label" optionValue="value" [placeholder]="i18n.translate('Outcome')" (onChange)="filterList()" [style]="{minWidth:'140px'}" />
              <app-export-button module="policy-reviews" [data]="filteredReviews" />
            </div>
          </div>
          <div class="table-shell" *ngIf="filteredReviews.length > 0">
          <p-table aria-label="Filtered Reviews table" [value]="filteredReviews" [paginator]="filteredReviews.length > 10" [rows]="10" styleClass="p-datatable-striped p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('Policy') }}</th>
                <th>{{ i18n.translate('Reviewer') }}</th>
                <th>{{ i18n.translate('Type') }}</th>
                <th>{{ i18n.translate('Outcome') }}</th>
                <th>{{ i18n.translate('Date') }}</th>
                <th style="width:160px">{{ i18n.translate('Actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td><strong>{{ item.policy_title || item.policy_id }}</strong></td>
                <td>{{ item.reviewer_id || '—' }}</td>
                <td><p-tag [value]="item.review_type || 'periodic'" severity="info" /></td>
                <td><app-status-badge [status]="item.outcome" /></td>
                <td>{{ item.created_at | appDate:'medium' }}</td>
                <td>
                  <div class="action-btns">
                    <button aria-label="Edit" class="icon-btn" (click)="openEdit(item)" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
                    <button aria-label="Complete" class="icon-btn complete" *ngIf="item.outcome === 'pending'" (click)="openComplete(item)" pTooltip="Complete"><i class="pi pi-check-circle"></i></button>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
          </div>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.translate('Review Queue')">
          <div class="table-shell" *ngIf="queue.length > 0">
          <p-table aria-label="Queue table" [value]="queue" [paginator]="queue.length > 10" [rows]="10" styleClass="p-datatable-striped p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('Policy') }}</th>
                <th>{{ i18n.translate('Owner') }}</th>
                <th>{{ i18n.translate('Next Review') }}</th>
                <th>{{ i18n.translate('Overdue') }}</th>
                <th>{{ i18n.translate('Days') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr [class.overdue-row]="item.overdue">
                <td><strong>{{ item.title }}</strong></td>
                <td>{{ item.owner || '—' }}</td>
                <td>{{ item.next_review_date | appDate:'medium' }}</td>
                <td><p-tag [value]="item.overdue ? (i18n.translate('Overdue')) : (i18n.translate('Upcoming'))" [severity]="item.overdue ? 'danger' : 'warning'" /></td>
                <td>{{ item.overdue ? item.days_overdue + (i18n.translate('days')) : '—' }}</td>
              </tr>
            </ng-template>
          </p-table>
          </div>
          <div *ngIf="queue.length === 0" class="empty-state">
            <i class="pi pi-check-circle empty-icon" style="color:var(--success)"></i>
            <p>{{ i18n.translate('No pending reviews') }}</p>
          </div>
        </p-tabPanel>
      </p-tabView>

      <!-- Complete Dialog -->
      <p-dialog [header]="i18n.translate('Complete Review')" [(visible)]="showCompleteDialog" [modal]="true" [style]="{width:'500px'}">
        <div class="dialog-form">
          <div class="field"><label>{{ i18n.translate('Outcome') }}</label>
            <p-dropdown [options]="completeOutcomeOptions" [(ngModel)]="completeForm.outcome" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('Comments') }}</label><textarea pInputTextarea [(ngModel)]="completeForm.comments" [rows]="3" class="w-full"></textarea></div>
          <div class="field"><label>{{ i18n.translate('Next Review Date') }}</label><input type="date" pInputText [(ngModel)]="completeForm.next_review_date" class="w-full" /></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('Cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="showCompleteDialog = false" />
          <p-button [label]="i18n.translate('Complete')" icon="pi pi-check" severity="success" (onClick)="submitComplete()" [disabled]="!completeForm.outcome" />
        </ng-template>
      </p-dialog>

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editMode ? (i18n.translate('Edit Review')) : (i18n.translate('Create Review'))"
                [(visible)]="showDialog" [modal]="true" [style]="{width:'500px'}">
        <div class="dialog-form">
          <div class="field"><label>{{ i18n.translate('Policy ID') }}</label><input pInputText [(ngModel)]="form.policy_id" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('Reviewer ID') }}</label><input pInputText [(ngModel)]="form.reviewer_id" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('Review Type') }}</label>
            <p-dropdown [options]="typeOptions" [(ngModel)]="form.review_type" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('Comments') }}</label><textarea pInputTextarea [(ngModel)]="form.comments" [rows]="3" class="w-full"></textarea></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('Cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="editMode ? (i18n.translate('Save')) : (i18n.translate('Create'))" icon="pi pi-check" (onClick)="save()" [disabled]="!form.policy_id || !form.reviewer_id" />
        </ng-template>
      </p-dialog>
      <!-- Cross-Module Links -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="navigateTo('/governance/policies')"><i class="pi pi-file"></i> Policies</button>
        <button class="cross-link-btn" (click)="navigateTo('/governance/reviews')"><i class="pi pi-search"></i> Reviews</button>
        <button class="cross-link-btn" (click)="navigateTo('/governance/health')"><i class="pi pi-heart"></i> Health Score</button>
        <button class="cross-link-btn" (click)="navigateTo('/foundation/audit')"><i class="pi pi-history"></i> Audit Trail</button>
      </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display: flex; flex-direction: column; min-height: 100%; }
    .gov-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ice, var(--surface-ice)); }
    .gov-body { flex: 1; padding: 16px 24px 32px; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
    .health-strip { display: flex; gap: 10px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 100px; text-align: center; padding: 10px 6px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .health-value { font-size: var(--font-size-lg); font-weight: 700; color: var(--text-heading, #111); }
    .health-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 10px; }
    .toolbar-primary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .toolbar-secondary { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .search-wrap { position: relative; display: inline-flex; align-items: center; }
    .search-icon { position: absolute; inset-inline-start: 10px; color: var(--text-muted); font-size: var(--font-size-sm); z-index: var(--z-base); pointer-events: none; }
    .search-input { min-width: 200px; padding-inline-start: 32px; }
    .table-shell { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; }
    .overdue-row { background: rgba(var(--color-red-600-rgb), .04); }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; }
    .action-btns { display: flex; gap: 4px; align-items: center; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted, var(--text-muted)); border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .icon-btn.complete { color: var(--success); } .icon-btn.complete:hover { background: #ecfdf5; border-color: #6ee7b7; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .w-full { width: 100%; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class GovernancePolicyReviewsComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly router = inject(Router);
  readonly dir  = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [
    { id: 'add', labelEn: 'Create Review', labelAr: 'إنشاء مراجعة', icon: 'plus', primary: true },
  ];
  onHeaderAction(id: string): void { if (id === 'add') this.openCreate(); }

  outcomeOptions = [{ label: 'All', value: '' }, { label: 'Pending', value: 'pending' }, { label: 'Approved', value: 'approved' }, { label: 'Rejected', value: 'rejected' }];
  typeOptions = [{ label: 'Periodic', value: 'periodic' }, { label: 'Triggered', value: 'triggered' }, { label: 'Ad-hoc', value: 'adhoc' }];
  completeOutcomeOptions = [{ label: 'Approved', value: 'approved' }, { label: 'Approved with conditions', value: 'approved_with_conditions' }, { label: 'Rejected', value: 'rejected' }, { label: 'Deferred', value: 'deferred' }];

  reviews: Record<string, any>[] = []; filteredReviews: Record<string, any>[] = []; queue: Record<string, any>[] = [];
  searchTerm = ''; outcomeFilter = '';
  showDialog = false; editMode = false; editId = '';
  form: Record<string, any> = {}; showCompleteDialog = false; completeForm: Record<string, any> = {}; completeTarget: Record<string, any> | null = null;
  reviewCount = 0; pendingCount = 0; overdueQueueCount = 0; completedCount = 0;

  ngOnInit(): void { this.loadReviews(); this.loadQueue(); }

  loadReviews(): void {
    this.apiclientSvc.get('/governance/policy-reviews').subscribe({
      next: (data: any) => {
        this.reviews = data?.reviews || [];
        this.reviewCount = this.reviews.length;
        this.pendingCount = this.reviews.filter((r: Record<string, any>) => r.outcome === 'pending').length;
        this.completedCount = this.reviews.filter((r: Record<string, any>) => r.outcome && r.outcome !== 'pending').length;
        this.filterList();
      },
      error: () => { this.reviews = []; this.filteredReviews = []; },
    });
  }

  loadQueue(): void {
    this.apiclientSvc.get('/governance/policy-reviews/queue').subscribe({
      next: (data: any) => {
        this.queue = data?.queue || [];
        this.overdueQueueCount = this.queue.filter((q: Record<string, any>) => q.overdue).length;
      },
      error: () => { this.queue = []; },
    });
  }

  filterList(): void {
    let list = [...this.reviews];
    if (this.searchTerm) { const t = this.searchTerm.toLowerCase(); list = list.filter((i: Record<string, any>) => (i.policy_title || '').toLowerCase().includes(t)); }
    if (this.outcomeFilter) list = list.filter((i: Record<string, any>) => i.outcome === this.outcomeFilter);
    this.filteredReviews = list;
  }

  openCreate(): void {
    this.editMode = false; this.editId = '';
    this.form = { policy_id: '', reviewer_id: '', review_type: 'periodic', comments: '' };
    this.showDialog = true;
  }

  openEdit(item: Record<string, any>): void {
    this.editMode = true; this.editId = item.review_id;
    this.form = { policy_id: item.policy_id, reviewer_id: item.reviewer_id, review_type: item.review_type || 'periodic', comments: item.comments || '' };
    this.showDialog = true;
  }

  save(): void {
    if (!this.form.policy_id || !this.form.reviewer_id) return;
    const obs = this.editMode
      ? this.apiclientSvc.put(`/governance/policy-reviews/${this.editId}`, this.form)
      : this.apiclientSvc.post('/governance/policy-reviews', this.form);
    obs.subscribe({
      next: () => { this.showDialog = false; this.loadReviews(); this.msg.add({ severity: 'success', summary: this.i18n.translate(this.editMode ? 'common.updated' : 'common.created'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), life: 4000 }); },
    });
  }

  openComplete(item: Record<string, any>): void {
    this.completeTarget = item;
    this.completeForm = { outcome: '', comments: '', next_review_date: '' };
    this.showCompleteDialog = true;
  }

  submitComplete(): void {
    if (!this.completeTarget || !this.completeForm.outcome) return;
    this.apiclientSvc.post(`/governance/policy-reviews/${this.completeTarget.review_id}/complete`, this.completeForm).subscribe({
      next: () => { this.showCompleteDialog = false; this.loadReviews(); this.loadQueue(); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.reviewCompleted'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), life: 4000 }); },
    });
  }

  navigateTo(path: string) { this.router.navigate([path]); }
}
