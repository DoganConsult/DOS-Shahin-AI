import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabs';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ModuleCrudApiService, CrudCapability, type ActivityEntry, type EntityLink } from '@app/core/modules/module-crud-api.service';
import { MODULE_SHELL_REGISTRY } from '../../../contracts/module-shell-registry';
import { RecordSummaryHeaderComponent } from '../record-summary-header.component';
import { ActivityTimelinePanelComponent, type ActivityTimelineEvent } from '../../messaging/activity-timeline-panel.component';
import { DataFreshnessBadgeComponent } from '../../status-indicators/badges/data-freshness-badge.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-generic-module-detail',
    imports: [CommonModule, ButtonModule, TagModule, TabViewModule, SkeletonModule, ConfirmDialogModule, RecordSummaryHeaderComponent, ActivityTimelinePanelComponent, DataFreshnessBadgeComponent],
    providers: [ConfirmationService],
    template: `
    <div class="gmd-page" [attr.dir]="isAr ? 'rtl' : 'ltr'">
      @if (loading()) {
        <div class="gmd-skeleton">
          <p-skeleton width="100%" height="72px" />
          <div class="gmd-skeleton-body">
            <p-skeleton width="100%" height="200px" />
            <p-skeleton width="100%" height="200px" />
          </div>
        </div>
      } @else if (errorMsg()) {
        <div class="gmd-error-state">
          <i class="pi pi-exclamation-circle"></i>
          <h3>{{ isAr ? 'خطأ في تحميل السجل' : 'Error loading record' }}</h3>
          <p>{{ errorMsg() }}</p>
          <button pButton [label]="isAr ? 'إعادة المحاولة' : 'Retry'" icon="pi pi-refresh" (click)="loadRecord()"></button>
        </div>
      } @else {
        <app-record-summary-header
          [title]="recordTitle()"
          [recordCode]="recordCode()"
          [icon]="moduleIcon"
          [accentColor]="accentColor"
          [accentBg]="accentBg"
          [status]="recordStatus()"
          [owner]="recordOwner()"
          [dueDate]="recordDueDate()"
          [isOverdue]="isOverdue()"
          (aiAction)="onAiAction()"
          (moreActions)="onMoreActions()" />

        <div class="gmd-meta-bar">
          <app-data-freshness-badge [isoTimestamp]="recordUpdatedAt()" />
          @if (capability()?.canUpdate) {
            <button pButton icon="pi pi-pencil" [label]="isAr ? 'تعديل' : 'Edit'" size="small" severity="secondary" [outlined]="true" (click)="onEdit()"></button>
          }
          @if (capability()?.canDelete) {
            <button pButton icon="pi pi-trash" [label]="isAr ? 'حذف' : 'Delete'" size="small" severity="danger" [outlined]="true" (click)="onDelete()"></button>
          }
        </div>

        <div class="gmd-body">
          <div class="gmd-main">
            <p-tabView>
              <p-tabPanel [header]="isAr ? 'نظرة عامة' : 'Overview'">
                <div class="gmd-overview">
                  <div class="gmd-section">
                    <h3>{{ isAr ? 'تفاصيل السجل' : 'Record Details' }}</h3>
                    <div class="gmd-detail-grid">
                      @for (field of detailFields(); track field.key) {
                        <div class="gmd-detail-row">
                          <span class="gmd-detail-label">{{ field.label }}</span>
                          <span class="gmd-detail-value">{{ field.value || '—' }}</span>
                        </div>
                      }
                    </div>
                  </div>
                  <div class="gmd-section">
                    <h3>{{ isAr ? 'الكيانات المرتبطة' : 'Related Entities' }}</h3>
                    @if (relatedLinks().length > 0) {
                      <div class="gmd-related-tags">
                        @for (link of relatedLinks(); track link.id) {
                          <span class="gmd-rel-tag" (click)="navigateToLink(link)">
                            <i class="pi pi-link"></i>
                            <span>{{ link.targetType }}</span>
                            <span class="gmd-rel-id">{{ link.targetId | slice:0:8 }}</span>
                          </span>
                        }
                      </div>
                    } @else {
                      <div class="gmd-related-tags">
                        @for (rel of relatedObjectTypes; track rel) {
                          <span class="gmd-rel-tag">
                            <i class="pi pi-link"></i> {{ rel }}
                            @if (linkCounts()[rel]) {
                              <span class="gmd-rel-count">{{ linkCounts()[rel] }}</span>
                            }
                          </span>
                        }
                      </div>
                    }
                  </div>
                </div>
              </p-tabPanel>
              @for (tab of moduleTabs; track tab.id) {
                <p-tabPanel [header]="isAr ? tab.labelAr : tab.labelEn">
                  <div class="gmd-tab-content">
                    <i [class]="'pi ' + (tab.icon || 'pi-file')"></i>
                    <p>{{ isAr ? tab.labelAr : tab.labelEn }}</p>
                  </div>
                </p-tabPanel>
              }
              <p-tabPanel [header]="isAr ? 'سجل النشاط' : 'Activity Log'">
                <app-activity-timeline-panel [entries]="activityEntries()" />
              </p-tabPanel>
            </p-tabView>
          </div>
        </div>
      }
      <p-confirmDialog />
    </div>
  `,
    styles: [`
    .gmd-page { min-height: 100%; background: var(--surface-ground); }
    .gmd-skeleton { padding: 24px; }
    .gmd-skeleton-body { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .gmd-error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 24px; color: var(--text-muted); text-align: center; }
    .gmd-error-state i { font-size: var(--font-size-6xl); color: var(--red-400); margin-bottom: 16px; }
    .gmd-error-state h3 { margin: 0 0 8px; font-size: var(--font-size-lg); color: var(--text-heading); }
    .gmd-error-state p { margin: 0 0 16px; font-size: var(--font-size-base); }
    .gmd-meta-bar { display: flex; align-items: center; gap: 12px; padding: 8px 24px; background: var(--surface-card); border-bottom: 1px solid var(--surface-border); }
    .gmd-body { display: flex; gap: 0; min-height: calc(100vh - 200px); }
    .gmd-main { flex: 1; min-width: 0; }
    .gmd-overview { padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .gmd-section h3 { margin: 0 0 12px; font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading); }
    .gmd-detail-grid { display: flex; flex-direction: column; }
    .gmd-detail-row { display: flex; justify-content: space-between; align-items: baseline; padding: 10px 0; border-bottom: 1px solid var(--surface-border, #e5e7eb); font-size: var(--font-size-base); }
    .gmd-detail-label { font-weight: 600; color: var(--text-muted); min-width: 140px; }
    .gmd-detail-value { text-align: end; max-width: 60%; word-break: break-word; }
    .gmd-related-tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .gmd-rel-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: var(--radius-sm); background: var(--surface-100); font-size: var(--font-size-sm); font-weight: 600; text-transform: capitalize; cursor: pointer; transition: background 0.15s; }
    .gmd-rel-tag:hover { background: var(--surface-200); }
    .gmd-rel-id { font-family: monospace; font-size: var(--font-size-2xs); color: var(--text-muted); }
    .gmd-rel-count { background: var(--primary-color); color: #fff; border-radius: var(--radius-pill); padding: 0 6px; font-size: 0.625rem; min-width: 18px; text-align: center; }
    .gmd-tab-content { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px; color: var(--text-muted); }
    .gmd-tab-content i { font-size: var(--font-size-4xl); margin-bottom: 12px; }
    @media (max-width: 768px) { .gmd-overview { grid-template-columns: 1fr; } .gmd-body { flex-direction: column; } .gmd-skeleton-body { grid-template-columns: 1fr; } }
  `]
})
export class GenericModuleDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private i18n = inject(I18nService);
  private crudApi = inject(ModuleCrudApiService);
  private confirmSvc = inject(ConfirmationService);

  loading = signal(true);
  errorMsg = signal('');
  recordTitle = signal('');
  recordCode = signal('');
  recordStatus = signal('draft');
  recordOwner = signal('');
  recordDueDate = signal('');
  recordUpdatedAt = signal<string | null>(null);
  isOverdue = signal(false);
  detailFields = signal<Array<{ key: string; label: string; value: string }>>([]);
  activityEntries = signal<ActivityTimelineEvent[]>([]);
  relatedLinks = signal<EntityLink[]>([]);
  linkCounts = signal<Record<string, number>>({});
  capability = signal<CrudCapability | null>(null);

  get moduleCode(): string {
    return this.route.snapshot.data?.['moduleCode'] ?? this.route.parent?.snapshot.data?.['moduleCode'] ?? '';
  }

  private get moduleDef() { return MODULE_SHELL_REGISTRY[this.moduleCode]; }
  get moduleIcon(): string { return this.moduleDef?.moduleIcon ?? 'pi-box'; }
  get accentColor(): string { return `var(--module-accent-${this.moduleDef?.moduleAccentToken ?? 'gray'})`; }
  get accentBg(): string { return `rgba(var(--module-accent-${this.moduleDef?.moduleAccentToken ?? 'gray'}-rgb, 111,111,111), 0.08)`; }
  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }
  get relatedObjectTypes(): string[] { return this.moduleDef?.relatedObjectTypes ?? []; }
  get moduleTabs() { return (this.moduleDef?.defaultRecordTabs ?? []).filter(t => !t.default).slice(0, 5); }

  private get recordId(): string { return this.route.snapshot.paramMap.get('id') ?? ''; }

  ngOnInit(): void {
    this.crudApi.getModuleCapability(this.moduleCode).subscribe(cap => {
      if (cap) this.capability.set(cap);
      this.loadRecord();
    });
  }

  loadRecord(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    const cap = this.capability();
    const apiBase = cap?.apiBase;

    if (apiBase && this.recordId) {
      this.crudApi.getRecord(apiBase, this.recordId).subscribe({
        next: (record) => {
          if (record) {
            this.populateFromRecord(record);
            this.loadRelatedData();
          } else {
            this.populateFallback();
          }
          this.loading.set(false);
        },
        error: (err) => {
          this.populateFallback();
          this.loading.set(false);
        },
      });
    } else {
      this.populateFallback();
      this.loadRelatedData();
      this.loading.set(false);
    }
  }

  private populateFromRecord(record: Record<string, unknown>): void {
    const id = (record['id'] ?? this.recordId) as string;
    const prefix = (this.moduleCode || 'REC').toUpperCase().slice(0, 3);
    this.recordCode.set((record['code'] as string) ?? `${prefix}-${id}`);
    this.recordTitle.set((record['title'] ?? record['name'] ?? `${this.moduleDef?.moduleName?.en ?? this.moduleCode} ${id}`) as string);
    this.recordStatus.set((record['status'] ?? 'draft') as string);
    this.recordOwner.set((record['owner'] ?? record['assignee'] ?? record['created_by'] ?? '') as string);
    this.recordDueDate.set((record['due_date'] ?? record['dueDate'] ?? record['expiry_date'] ?? '') as string);
    this.recordUpdatedAt.set((record['updated_at'] ?? record['updatedAt'] ?? record['created_at'] ?? null) as string | null);

    if (this.recordDueDate()) {
      const due = new Date(this.recordDueDate());
      this.isOverdue.set(due.getTime() < Date.now() && !['closed', 'resolved', 'approved', 'archived'].includes(this.recordStatus()));
    }

    const cap = this.capability();
    const fields: Array<{ key: string; label: string; value: string }> = [];
    const skipKeys = new Set(['id', 'tenant_id', 'tenantId', 'created_by', 'updated_by', 'deleted_at', 'password', 'token']);

    if (cap?.fields?.length) {
      for (const f of cap.fields) {
        if (skipKeys.has(f.key)) continue;
        const val = record[f.key] ?? record[this.snakeToCamel(f.key)];
        fields.push({ key: f.key, label: this.isAr ? f.labelAr : f.labelEn, value: this.formatValue(val) });
      }
    } else {
      for (const [key, val] of Object.entries(record)) {
        if (skipKeys.has(key) || key.startsWith('_')) continue;
        fields.push({ key, label: this.formatLabel(key), value: this.formatValue(val) });
      }
    }
    this.detailFields.set(fields.slice(0, 20));
  }

  private populateFallback(): void {
    const prefix = (this.moduleCode || 'REC').toUpperCase().slice(0, 3);
    this.recordCode.set(`${prefix}-${this.recordId}`);
    this.recordTitle.set(`${this.moduleDef?.moduleName?.en ?? this.moduleCode} Record ${this.recordId}`);
    this.detailFields.set([
      { key: 'id', label: 'ID', value: this.recordId },
      { key: 'module', label: this.isAr ? 'القسم' : 'Module', value: this.moduleDef?.moduleName?.en ?? this.moduleCode },
      { key: 'status', label: this.isAr ? 'الحالة' : 'Status', value: 'Draft' },
      { key: 'created', label: this.isAr ? 'تاريخ الإنشاء' : 'Created', value: new Date().toLocaleDateString() },
    ]);
  }

  private loadRelatedData(): void {
    const entityType = this.moduleCode.replace(/-/g, '_');
    if (this.recordId) {
      this.crudApi.getActivityFeed(this.moduleCode, this.recordId, 30).subscribe(activities => {
        this.activityEntries.set(activities.map(a => ({
          id: a.activityId,
          timestamp: a.createdAt ? new Date(a.createdAt).toLocaleString() : '',
          actor: a.userName || a.userId || 'System',
          action: a.action,
          entityType: a.entityType,
          entityId: a.entityId,
          detail: a.entityTitle,
          aiGenerated: a.metadata?.['aiGenerated'] === true,
        })));
      });

      this.crudApi.getEntityLinks(entityType, this.recordId).subscribe(links => {
        this.relatedLinks.set(links);
      });

      this.crudApi.getEntityLinkCounts(entityType, this.recordId).subscribe(counts => {
        this.linkCounts.set(counts);
      });
    }
  }

  private snakeToCamel(s: string): string {
    return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  private formatLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

  private formatValue(val: unknown): string {
    if (val === null || val === undefined) return '';
    if (val instanceof Date) return val.toLocaleDateString();
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  onEdit(): void {
    this.router.navigate(['../', 'create'], { relativeTo: this.route, queryParams: { edit: this.recordId } });
  }

  onDelete(): void {
    this.confirmSvc.confirm({
      message: this.isAr ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?',
      header: this.isAr ? 'تأكيد الحذف' : 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const cap = this.capability();
        if (cap?.apiBase) {
          this.crudApi.deleteRecord(cap.apiBase, this.recordId).subscribe(ok => {
            if (ok) this.router.navigate(['../'], { relativeTo: this.route });
          });
        }
      },
    });
  }

  navigateToLink(link: EntityLink): void {
    const targetModule = link.targetType.replace(/_/g, '-');
    this.router.navigate(['/', targetModule, link.targetId]);
  }

  onAiAction(): void {}
  onMoreActions(): void {}
}
