import { Component, OnInit, computed, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
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
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-acknowledgements',
    imports: [CommonModule, AppDatePipe, FormsModule, PageHeaderComponent, ModuleTabsBarComponent, ExportButtonComponent, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, DropdownModule, TooltipModule, ToastModule],
    providers: [MessageService],
    template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header titleEn="Acknowledgements" titleAr="الإقرارات" subtitleEn="Track policy acknowledgement campaigns and compliance" subtitleAr="تتبع حملات إقرار السياسات والامتثال" icon="clipboard-check"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('Acknowledgements')]" [actions]="headerActions" [isAr]="i18n.currentLang() === 'ar'" [dir]="dir()" (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.currentLang() === 'ar'" />
      <div class="gov-body">
        <p-toast />
        <div class="health-strip">
          <div class="health-card"><div class="health-value">{{ campaigns.length }}</div><div class="health-label">{{ i18n.translate('Campaigns') }}</div></div>
          <div class="health-card"><div class="health-value">{{ items.length }}</div><div class="health-label">{{ i18n.translate('Acknowledgements') }}</div></div>
          <div class="health-card"><div class="health-value" style="color:#d97706">{{ pendingItems.length }}</div><div class="health-label">{{ i18n.translate('Pending') }}</div></div>
        </div>
        <div class="page-toolbar">
          <div class="toolbar-primary">
            <p-button [label]="i18n.translate('New Campaign')" icon="pi pi-plus" (onClick)="openCreateCampaign()" />
            <p-button [label]="i18n.translate('My Pending')" icon="pi pi-bell" styleClass="p-button-outlined" (onClick)="loadPending()" />
          </div>
          <div class="toolbar-secondary"><app-export-button module="governance-acks" [data]="items" /></div>
        </div>
        <div class="table-shell" *ngIf="items.length > 0">
          <p-table aria-label="Items table" [value]="items" [paginator]="items.length > 10" [rows]="10" styleClass="p-datatable-striped p-datatable-sm">
            <ng-template pTemplate="header"><tr>
              <th>{{ i18n.translate('Policy') }}</th>
              <th>{{ i18n.translate('User') }}</th>
              <th>{{ i18n.translate('Version') }}</th>
              <th>{{ i18n.translate('Date') }}</th>
            </tr></ng-template>
            <ng-template pTemplate="body" let-item><tr>
              <td>{{ item.policy_id }}</td>
              <td>{{ item.user_id }}</td>
              <td>{{ item.version_acknowledged || '—' }}</td>
              <td>{{ item.acknowledged_at | appDate:'medium' }}</td>
            </tr></ng-template>
          </p-table>
        </div>
        <div class="empty-state" *ngIf="!loading && items.length === 0"><i class="pi pi-inbox empty-icon"></i><p>{{ i18n.translate('No acknowledgements found') }}</p></div>
      </div>
    <!-- Cross-Module Links -->
    <div class="cross-links">
      <button class="cross-link-btn" (click)="navigateTo('/governance/policies')"><i class="pi pi-file"></i> Policies</button>
      <button class="cross-link-btn" (click)="navigateTo('/governance/decisions')"><i class="pi pi-check-square"></i> Decisions</button>
      <button class="cross-link-btn" (click)="navigateTo('/compliance/overview')"><i class="pi pi-verified"></i> Compliance</button>
      <button class="cross-link-btn" (click)="navigateTo('/foundation/audit')"><i class="pi pi-history"></i> Audit Trail</button>
    </div>
    </div>
    <p-dialog [header]="i18n.translate('New Campaign')" [(visible)]="showCampaignDialog" [modal]="true" [style]="{width:'460px'}" [dismissableMask]="true">
      <div class="dialog-form">
        <div class="field"><label>Policy ID</label><input pInputText [(ngModel)]="campaignForm.policy_id" class="w-full" /></div>
        <div class="field"><label>Title</label><input pInputText [(ngModel)]="campaignForm.title" class="w-full" /></div>
        <div class="field"><label>Due Date</label><input pInputText type="date" [(ngModel)]="campaignForm.due_date" class="w-full" /></div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-text" (onClick)="showCampaignDialog=false" />
        <p-button label="Create" icon="pi pi-check" (onClick)="saveCampaign()" />
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .gov-page { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .gov-body { flex: 1; padding: 16px 24px 32px; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
    .health-strip { display: flex; gap: 10px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 100px; text-align: center; padding: 10px 6px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .health-value { font-size: var(--font-size-lg); font-weight: 700; } .health-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); padding: 10px 14px; }
    .toolbar-primary { display: flex; align-items: center; gap: 10px; } .toolbar-secondary { display: flex; align-items: center; gap: 8px; }
    .table-shell { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted); } .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; } .field { display: flex; flex-direction: column; gap: 4px; } .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); } .w-full { width: 100%; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class GovernanceAcknowledgementsComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
 private msg = inject(MessageService); private router = inject(Router);
  readonly dir = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [{ id: 'add', labelEn: 'New Campaign', labelAr: 'حملة جديدة', icon: 'plus', primary: true }];
  onHeaderAction(id: string): void { if (id === 'add') this.openCreateCampaign(); }
  loading = true; items: Record<string, unknown>[] = []; campaigns: Record<string, unknown>[] = []; pendingItems: Record<string, unknown>[] = [];
  showCampaignDialog = false; campaignForm: Record<string, unknown> = {};

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.apiclientSvc.get('/governance/acknowledgements').subscribe({ next: res => { this.items = res.acknowledgements || []; this.loading = false; }, error: () => { this.loading = false; } });
    this.apiclientSvc.get('/governance/acknowledgements/campaigns').subscribe({ next: res => { this.campaigns = res.campaigns || []; } });
    this.loadPending();
  }
  loadPending(): void {
    this.apiclientSvc.get('/governance/acknowledgements/pending').subscribe({ next: res => { this.pendingItems = res.pending || []; } });
  }
  openCreateCampaign(): void { this.campaignForm = { policy_id: '', title: '', due_date: '' }; this.showCampaignDialog = true; }
  saveCampaign(): void {
    this.apiclientSvc.post('/governance/acknowledgements/campaigns', this.campaignForm).subscribe({
      next: () => { this.showCampaignDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.campaignCreated') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') })
    });
  }
  navigateTo(path: string) { this.router.navigate([path]); }
}
