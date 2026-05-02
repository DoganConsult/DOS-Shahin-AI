import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { catchError, of } from 'rxjs';
import { ApiClientService } from "@app/core/services/api-client.service";

interface CollectorRow {
  id: string;
  name: string;
  sourceType: string;
  schedule: string;
  lastRun: string;
  lastStatus: string;
  evidenceCount: number;
  linkedControls: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-automated-collection',
    imports: [
        CommonModule, FormsModule, RouterLink, PageShellComponent, StatusBadgeComponent,
        TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, DropdownModule,
        TooltipModule, ToastModule, CardModule, AppDatePipe,
    ],
    providers: [MessageService],
    template: `
    <app-page-shell
      icon="bolt"
      [title]="L().title"
      [subtitle]="L().subtitle"
      [breadcrumbs]="[i18n.translate('evidenceAutoCollection.dashboard'), i18n.translate('evidenceAutoCollection.evidence'), L().title]"
      [loading]="loading()">

      <p-toast />

      <div class="health-strip" *ngIf="!loading()">
        <div class="health-card">
          <div class="health-value">{{ totalCollectors() }}</div>
          <div class="health-label">{{ L().totalCollectors }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:var(--success)">{{ activeCollectors() }}</div>
          <div class="health-label">{{ L().active }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:var(--error)">{{ failedCollectors() }}</div>
          <div class="health-label">{{ L().failed }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:var(--primary)">{{ totalCollected() }}</div>
          <div class="health-label">{{ L().totalCollected }}</div>
        </div>
      </div>

      <div class="info-banner" *ngIf="!loading()">
        <i class="pi pi-info-circle"></i>
        <span>{{ L().connectorInfo }}&nbsp;</span>
        <a routerLink="/connector-hub" class="banner-link">{{ L().goToConnectors }}</a>
      </div>

      <div class="toolbar mb-3">
        <p-button [label]="L().addCollector" icon="pi pi-plus" severity="secondary" [outlined]="true" (onClick)="openDialog()" />
        <p-button [label]="L().runAll" icon="pi pi-refresh" severity="secondary" [outlined]="true" (onClick)="runAll()" />
      </div>

      <p-table aria-label="Data table"
        [value]="collectors()"
        [rows]="20"
        [paginator]="true"
        styleClass="p-datatable-sm p-datatable-striped"
        *ngIf="collectors().length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">{{ L().name }} <p-sortIcon field="name" /></th>
            <th pSortableColumn="sourceType">{{ L().sourceType }} <p-sortIcon field="sourceType" /></th>
            <th pSortableColumn="schedule">{{ L().schedule }} <p-sortIcon field="schedule" /></th>
            <th pSortableColumn="lastRun">{{ L().lastRun }} <p-sortIcon field="lastRun" /></th>
            <th pSortableColumn="lastStatus">{{ L().status }} <p-sortIcon field="lastStatus" /></th>
            <th pSortableColumn="evidenceCount">{{ L().collected }} <p-sortIcon field="evidenceCount" /></th>
            <th pSortableColumn="linkedControls">{{ L().linkedControls }} <p-sortIcon field="linkedControls" /></th>
            <th>{{ L().actions }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-col>
          <tr>
            <td class="font-semibold">{{ col.name }}</td>
            <td><p-tag [value]="col.sourceType" [rounded]="true" /></td>
            <td>{{ col.schedule || '—' }}</td>
            <td>{{ col.lastRun ? (col.lastRun | appDate:'medium') : '—' }}</td>
            <td><app-status-badge [status]="col.lastStatus" /></td>
            <td class="text-center font-semibold">{{ col.evidenceCount }}</td>
            <td class="text-center">{{ col.linkedControls }}</td>
            <td>
              <div class="row-actions">
                <button aria-label="Play" class="icon-btn" (click)="runCollector(col)" [pTooltip]="L().run"><i class="pi pi-play"></i></button>
                <button aria-label="Edit" class="icon-btn" (click)="editCollector(col)" [pTooltip]="L().edit"><i class="pi pi-pencil"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <div *ngIf="collectors().length === 0 && !loading()" class="empty-section">
        <i class="pi pi-bolt"></i>
        <p>{{ L().emptyMsg }}</p>
        <p-button [label]="L().addCollector" icon="pi pi-plus" (onClick)="openDialog()" styleClass="me-2" />
        <a routerLink="/connector-hub">
          <p-button [label]="L().configureConnectors" icon="pi pi-link" severity="secondary" [outlined]="true" />
        </a>
      </div>

      <p-dialog [header]="editMode ? L().editCollector : L().addCollector" [(visible)]="dialogVisible" [modal]="true" [style]="{width:'540px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ L().name }}</label>
            <input pInputText [(ngModel)]="form.name" class="w-full" [placeholder]="L().namePlaceholder" [attr.aria-label]="L().namePlaceholder" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ L().sourceType }}</label>
              <p-dropdown [(ngModel)]="form.sourceType" [options]="sourceTypeOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
            </div>
            <div class="field">
              <label>{{ L().schedule }}</label>
              <p-dropdown [(ngModel)]="form.schedule" [options]="scheduleOptions" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
            </div>
          </div>
          <div class="field">
            <label>{{ L().endpointUrl }}</label>
            <input pInputText [(ngModel)]="form.endpointUrl" class="w-full" placeholder="https://…" aria-label="https://…" />
          </div>
          <div class="field">
            <label>{{ L().linkedControls }}</label>
            <input pInputText [(ngModel)]="form.linkedControls" class="w-full" [placeholder]="L().linkedControlsPlaceholder" [attr.aria-label]="L().linkedControlsPlaceholder" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="L().cancel" severity="secondary" [text]="true" (onClick)="dialogVisible=false" />
          <p-button [label]="L().save" icon="pi pi-check" (onClick)="saveCollector()" [disabled]="!form.name" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
    styles: [`
    .health-strip { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
    .health-card { flex:1; min-width:120px; text-align:center; padding:14px 8px; background:var(--surface-card,#fff); border-radius:var(--radius-md); border:1px solid var(--surface-border,var(--border-subtle)); transition:box-shadow .15s; }
    .health-card:hover { box-shadow: var(--shadow-sm); }
    .health-value { font-size: var(--font-size-2xl); font-weight:700; }
    .health-label { font-size: var(--font-size-xs); color:var(--text-muted,var(--text-muted)); text-transform:uppercase; letter-spacing:.5px; margin-top:2px; }
    .info-banner { display:flex; align-items:center; gap:8px; padding:10px 14px; background:rgba(var(--color-blue-600-rgb), .06); border:1px solid rgba(var(--color-blue-600-rgb), .18); border-radius:var(--radius); font-size: var(--font-size-sm); color:var(--text-body); margin-bottom:14px; }
    .info-banner .pi { color:var(--primary); flex-shrink:0; }
    .banner-link { color:var(--primary); text-decoration:underline; cursor:pointer; font-weight:500; }
    .toolbar { display:flex; gap:var(--space-sm,8px); align-items:center; flex-wrap:wrap; }
    .mb-3 { margin-bottom:var(--space-md,12px); }
    .me-2 { margin-inline-end:var(--space-sm,8px); }
    .font-semibold { font-weight:600; }
    .text-center { text-align:center; }
    .row-actions { display:flex; gap:var(--space-xs,4px); }
    .icon-btn { background:none; border:none; cursor:pointer; color:var(--text-muted); padding:4px 6px; border-radius:var(--radius-sm,4px); transition:all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background:var(--surface-ice,rgba(var(--color-black-rgb), .05)); color:var(--primary); }
    .empty-section { text-align:center; padding:var(--space-2xl,32px); }
    .empty-section i { font-size:2.5rem; color:var(--text-muted); margin-bottom:var(--space-md,12px); display:block; }
    .empty-section p { color:var(--text-muted); margin-bottom:var(--space-md,12px); }
    .dialog-form { display:flex; flex-direction:column; gap:var(--space-md,12px); }
    .field { display:flex; flex-direction:column; gap:var(--space-xs,4px); }
    .field label { font-size: var(--font-size-sm); font-weight:500; color:var(--text-muted); }
    .field-row { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md,12px); }
    .w-full { width:100%; }
  `]
})
export class EvidenceAutomatedCollectionComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  private msg = inject(MessageService);
  public i18n = inject(I18nService);

  loading = signal(true);
  collectors = signal<CollectorRow[]>([]);
  dialogVisible = false;
  editMode = false;
  editingId = '';
  form = { name: '', sourceType: 'api', schedule: 'daily', endpointUrl: '', linkedControls: '' };
  L = computed(() => this.i18n.currentLang() === 'ar' ? AR : EN);

  totalCollectors = computed(() => this.collectors().length);
  activeCollectors = computed(() => this.collectors().filter(c => c.lastStatus === 'success' || c.lastStatus === 'active').length);
  failedCollectors = computed(() => this.collectors().filter(c => c.lastStatus === 'failed' || c.lastStatus === 'error').length);
  totalCollected = computed(() => this.collectors().reduce((sum, c) => sum + (c.evidenceCount || 0), 0));

  sourceTypeOptions = [
    { label: 'API / REST', value: 'api' },
    { label: 'File Share / SFTP', value: 'sftp' },
    { label: 'SharePoint', value: 'sharepoint' },
    { label: 'Azure Storage', value: 'azure_storage' },
    { label: 'Database Query', value: 'database' },
    { label: 'Email Inbox', value: 'email' },
    { label: 'Manual Upload', value: 'manual' },
  ];

  scheduleOptions = [
    { label: 'Hourly', value: 'hourly' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'On Demand', value: 'on_demand' },
  ];

  ngOnInit(): void {
    this.apiclientSvc.get('/evidence/collectors').pipe(
      catchError(() => of({ collectors: [] }))
    ).subscribe((d) => {
      this.collectors.set(d?.collectors || []);
      this.loading.set(false);
    });
  }

  openDialog(): void {
    this.editMode = false;
    this.editingId = '';
    this.form = { name: '', sourceType: 'api', schedule: 'daily', endpointUrl: '', linkedControls: '' };
    this.dialogVisible = true;
  }

  editCollector(col: CollectorRow): void {
    this.editMode = true;
    this.editingId = col.id;
    this.form = { name: col.name, sourceType: col.sourceType, schedule: col.schedule, endpointUrl: '', linkedControls: String(col.linkedControls) };
    this.dialogVisible = true;
  }

  saveCollector(): void {
    if (!this.form.name) return;
    const obs = this.editMode && this.editingId
      ? this.apiclientSvc.patch(`/evidence/collectors/${this.editingId}`, this.form)
      : this.apiclientSvc.post('/evidence/collectors', this.form);
    obs.pipe(catchError(() => of(null))).subscribe(res => {
      if (res !== null) {
        this.dialogVisible = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.L().savedMsg, life: 3000 });
        this.ngOnInit();
      } else {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.L().saveFailed, life: 3000 });
      }
    });
  }

  runCollector(col: CollectorRow): void {
    this.apiclientSvc.post(`/evidence/collectors/${col.id}/run`, {}).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res !== null) {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.L().runTriggered, life: 3000 });
      } else {
        this.msg.add({ severity: 'warn', summary: this.i18n.translate('common.warning'), detail: this.L().runFailed, life: 3000 });
      }
    });
  }

  runAll(): void {
    this.apiclientSvc.post('/evidence/collectors/run-all', {}).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.msg.add({ severity: 'info', summary: this.i18n.translate('common.info'), detail: this.L().runAllTriggered, life: 3000 });
    });
  }
}

const EN = {
  title: 'Automated Collection',
  subtitle: 'Configure connectors to automatically pull evidence from systems — API, SFTP, SharePoint, Azure Storage, and more',
  totalCollectors: 'Collectors', active: 'Active', failed: 'Failed', totalCollected: 'Evidence Collected',
  name: 'Collector Name', sourceType: 'Source Type', schedule: 'Schedule',
  lastRun: 'Last Run', status: 'Status', collected: 'Collected', linkedControls: 'Linked Controls',
  actions: 'Actions', run: 'Run Now', edit: 'Edit',
  addCollector: 'Add Collector', editCollector: 'Edit Collector', runAll: 'Run All Now',
  namePlaceholder: 'e.g. SharePoint Controls Collector',
  endpointUrl: 'Endpoint / Connection URL',
  linkedControlsPlaceholder: 'e.g. CTRL-001, CTRL-002',
  connectorInfo: 'Automated collection requires active connectors.',
  goToConnectors: 'Manage Connectors →',
  configureConnectors: 'Go to Connector Hub',
  save: 'Save', cancel: 'Cancel',
  savedMsg: 'Collector saved successfully.', saveFailed: 'Failed to save collector.',
  runTriggered: 'Collection run triggered.', runFailed: 'Failed to trigger collection.',
  runAllTriggered: 'All collectors triggered.',
  emptyMsg: 'No automated collectors configured. Add a collector or configure connectors first.',
};

const AR: typeof EN = {
  title: 'التجميع التلقائي',
  subtitle: 'تكوين الموصلات لسحب الأدلة تلقائياً من الأنظمة — API وSFTP وSharePoint وAzure Storage والمزيد',
  totalCollectors: 'المجمّعات', active: 'نشط', failed: 'فاشل', totalCollected: 'الأدلة المجمّعة',
  name: 'اسم المجمّع', sourceType: 'نوع المصدر', schedule: 'الجدول الزمني',
  lastRun: 'آخر تشغيل', status: 'الحالة', collected: 'المجمّع', linkedControls: 'الضوابط المرتبطة',
  actions: 'الإجراءات', run: 'تشغيل الآن', edit: 'تعديل',
  addCollector: 'إضافة مجمّع', editCollector: 'تعديل المجمّع', runAll: 'تشغيل الكل الآن',
  namePlaceholder: 'مثال: مجمّع ضوابط SharePoint',
  endpointUrl: 'رابط النقطة الطرفية / الاتصال',
  linkedControlsPlaceholder: 'مثال: CTRL-001, CTRL-002',
  connectorInfo: 'يتطلب التجميع التلقائي موصلات نشطة.',
  goToConnectors: 'إدارة الموصلات ←',
  configureConnectors: 'الانتقال إلى مركز الموصلات',
  save: 'حفظ', cancel: 'إلغاء',
  savedMsg: 'تم حفظ المجمّع بنجاح.', saveFailed: 'فشل حفظ المجمّع.',
  runTriggered: 'تم تشغيل التجميع.', runFailed: 'فشل تشغيل التجميع.',
  runAllTriggered: 'تم تشغيل جميع المجمّعات.',
  emptyMsg: 'لا توجد مجمّعات تلقائية. أضف مجمّعاً أو كوّن الموصلات أولاً.',
};
