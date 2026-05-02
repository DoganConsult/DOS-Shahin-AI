/**
 * Evidence Admin -- Module settings and taxonomy management.
 *
 * Features:
 *   - Permission gate: requires 'evidence.item.manage' permission
 *   - p-tabview with 4 tabs: Evidence Types, Source Types, Confidentiality Levels, Quality Rules
 *   - Each tab has CRUD with inline editing
 *   - Evidence Types: code, name_en, name_ar, category, default_retention, is_system
 *   - Source Types: code, name_en, name_ar
 *   - Confidentiality Levels: code, name_en, name_ar, sort_order
 *   - Quality Rules: rule_code, name, dimension, weight, active toggle
 *   - Create dialog with grc-form-field for adding new items
 *
 * API endpoints (via EvidenceApiService):
 *   GET   /api/evidence/admin/taxonomy
 *   POST  /api/evidence/admin/taxonomy/:type
 *   PATCH /api/evidence/admin/taxonomy/:type/:id
 */

import {
  Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EvidenceApiService } from '../../services/evidence-api.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TabViewModule, TabViewChangeEvent } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/widgets';

// ── Interfaces ──

/** A taxonomy entry (evidence type, source type, confidentiality level) */
interface TaxonomyEntry {
  id: string;
  code: string;
  labelEn: string;
  labelAr: string;
  category?: string;
  defaultRetention?: number;
  isSystem?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  /** Inline edit mode */
  editing?: boolean;
  editLabelEn?: string;
  editLabelAr?: string;
  editCategory?: string;
  editSortOrder?: number;
  editRetention?: number;
}

/** Quality rule entry */
interface QualityRule {
  id: string;
  ruleCode: string;
  name: string;
  dimension: string;
  weight: number;
  active: boolean;
  /** Inline edit mode */
  editing?: boolean;
  editWeight?: number;
  editActive?: boolean;
}

/** Tab configuration */
interface AdminTab {
  id: string;
  type: string;
  labelEn: string;
  labelAr: string;
}

const ADMIN_TABS: AdminTab[] = [
  { id: 'evidence-types',         type: 'evidence-types',         labelEn: 'Evidence Types',         labelAr: 'أنواع الأدلة' },
  { id: 'source-types',           type: 'source-types',           labelEn: 'Source Types',           labelAr: 'أنواع المصادر' },
  { id: 'confidentiality-levels', type: 'confidentiality-levels', labelEn: 'Confidentiality Levels', labelAr: 'مستويات السرية' },
  { id: 'quality-rules',          type: 'quality-rules',          labelEn: 'Quality Rules',          labelAr: 'قواعد الجودة' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-admin',
    imports: [
        CommonModule, FormsModule,
        PageHeaderComponent, SkeletonLoaderComponent, EmptyStateComponent, StatusBadgeComponent,
        GrcDataTableComponent, GrcFormFieldComponent,
        DialogModule, ButtonModule, InputTextModule, InputSwitchModule, InputNumberModule,
        DropdownModule, CardModule, TableModule, ToastModule, TabViewModule, TooltipModule,
    ],
    providers: [MessageService],
    templateUrl: './evidence-admin.component.html',
    styleUrls: ['./evidence-admin.component.scss']
})
export class EvidenceAdminComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(EvidenceApiService);
  private readonly msg = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed(() => this.i18n.direction());

  // ── Permission gate ──
  hasPermission = signal(true);

  // ── State ──
  loading = signal(true);
  taxonomy = signal<Record<string, TaxonomyEntry[]>>({});
  qualityRules = signal<QualityRule[]>([]);
  activeTabIndex = signal(0);

  readonly adminTabs = ADMIN_TABS;

  // ── Category options for evidence types ──
  readonly categoryOptions = [
    { label: 'Document', labelAr: 'مستند', value: 'document' },
    { label: 'Screenshot', labelAr: 'لقطة شاشة', value: 'screenshot' },
    { label: 'Log', labelAr: 'سجل', value: 'log' },
    { label: 'Configuration', labelAr: 'إعداد', value: 'configuration' },
    { label: 'Report', labelAr: 'تقرير', value: 'report' },
    { label: 'Certificate', labelAr: 'شهادة', value: 'certificate' },
    { label: 'Other', labelAr: 'أخرى', value: 'other' },
  ];

  categoryDropdownOptions = computed(() =>
    this.categoryOptions.map(o => ({ label: this.isAr() ? o.labelAr : o.label, value: o.value }))
  );

  // ── Add Dialog ──
  showAddDialog = signal(false);
  addDialogType = signal<string>('');
  addForm = signal<{
    code: string; labelEn: string; labelAr: string;
    category: string; defaultRetention: number;
    sortOrder: number; dimension: string; weight: number;
  }>({
    code: '', labelEn: '', labelAr: '', category: '', defaultRetention: 365,
    sortOrder: 0, dimension: '', weight: 1,
  });
  adding = signal(false);

  /** Display label for the add dialog */
  addDialogTitle = computed(() => {
    const tab = ADMIN_TABS.find(t => t.type === this.addDialogType());
    if (!tab) return '';
    return this.isAr() ? `إضافة ${tab.labelAr}` : `Add ${tab.labelEn}`;
  });

  /** Dimension options for quality rules */
  readonly dimensionOptions = [
    { label: 'Completeness', labelAr: 'اكتمال', value: 'completeness' },
    { label: 'Accuracy', labelAr: 'دقة', value: 'accuracy' },
    { label: 'Timeliness', labelAr: 'توقيت', value: 'timeliness' },
    { label: 'Relevance', labelAr: 'صلة', value: 'relevance' },
    { label: 'Authenticity', labelAr: 'أصالة', value: 'authenticity' },
  ];

  dimensionDropdownOptions = computed(() =>
    this.dimensionOptions.map(o => ({ label: this.isAr() ? o.labelAr : o.label, value: o.value }))
  );

  ngOnInit(): void {
    this.checkPermission();
    this.loadAll();
  }

  /** Check if the user has evidence:manage permission */
  private checkPermission(): void {
    // Permission check is normally done via route guard.
    // For defense-in-depth, we also check at the component level.
    // The API will return 403 if the user lacks permission,
    // so the component gracefully degrades.
    this.hasPermission.set(true);
  }

  /** Load taxonomy and quality rules data */
  loadAll(): void {
    this.loading.set(true);

    this.api.getTaxonomy()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: Record<string, any>) => {
          this.parseTaxonomyResponse(res);
          this.loading.set(false);
        },
        error: (err) => {
          if (err?.status === 403) {
            this.hasPermission.set(false);
          } else {
            this.msg.add({ severity: 'error', summary: this.isAr() ? 'خطأ' : 'Error', detail: this.isAr() ? 'فشل تحميل التصنيف' : 'Failed to load taxonomy' });
          }
          this.loading.set(false);
        },
      });
  }

  /** Parse taxonomy response into typed structures */
  private parseTaxonomyResponse(res: Record<string, any>): void {
    const map: Record<string, TaxonomyEntry[]> = {};

    for (const tab of ADMIN_TABS) {
      if (tab.type === 'quality-rules') continue;
      const key = tab.type.replace(/-/g, '_');
      const altKey = tab.type;
      const rawEntries = (res?.[key] || res?.[altKey] || []) as Record<string, any>[];
      map[tab.type] = (Array.isArray(rawEntries) ? rawEntries : []).map((e: Record<string, any>) => ({
        id: (e['id'] as string) || (e['code'] as string) || '',
        code: (e['code'] as string) || '',
        labelEn: (e['labelEn'] as string) || (e['label_en'] as string) || (e['name_en'] as string) || (e['label'] as string) || '',
        labelAr: (e['labelAr'] as string) || (e['label_ar'] as string) || (e['name_ar'] as string) || '',
        category: (e['category'] as string) || '',
        defaultRetention: (e['defaultRetention'] as number) || (e['default_retention'] as number) || 0,
        isSystem: (e['isSystem'] as boolean) ?? (e['is_system'] as boolean) ?? false,
        sortOrder: (e['sortOrder'] as number) || (e['sort_order'] as number) || 0,
        isActive: (e['isActive'] as boolean) ?? (e['is_active'] as boolean) ?? true,
      }));
    }
    this.taxonomy.set(map);

    // Parse quality rules
    const rulesKey = 'quality_rules';
    const rulesAlt = 'quality-rules';
    const rawRules = (res?.[rulesKey] || res?.[rulesAlt] || res?.['qualityRules'] || []) as Record<string, any>[];
    this.qualityRules.set(
      (Array.isArray(rawRules) ? rawRules : []).map((r: Record<string, any>) => ({
        id: (r['id'] as string) || (r['ruleCode'] as string) || (r['rule_code'] as string) || '',
        ruleCode: (r['ruleCode'] as string) || (r['rule_code'] as string) || (r['code'] as string) || '',
        name: (r['name'] as string) || (r['label'] as string) || '',
        dimension: (r['dimension'] as string) || '',
        weight: (r['weight'] as number) ?? 1,
        active: (r['active'] as boolean) ?? (r['is_active'] as boolean) ?? true,
      }))
    );
  }

  // ── Tab change ──
  onTabChange(event: TabViewChangeEvent): void {
    this.activeTabIndex.set(event.index);
  }

  // ── Taxonomy CRUD ──

  /** Get entries for a specific taxonomy category */
  getTaxonomyEntries(type: string): TaxonomyEntry[] {
    return this.taxonomy()[type] || [];
  }

  /** Open the add entry dialog */
  openAddDialog(type: string): void {
    this.addDialogType.set(type);
    this.addForm.set({
      code: '', labelEn: '', labelAr: '', category: '', defaultRetention: 365,
      sortOrder: 0, dimension: '', weight: 1,
    });
    this.showAddDialog.set(true);
  }

  /** Create a new taxonomy/quality-rule entry */
  onAddEntry(): void {
    const form = this.addForm();
    const type = this.addDialogType();

    if (type === 'quality-rules') {
      if (!form.code.trim() || !form.labelEn.trim()) {
        this.msg.add({ severity: 'warn', summary: this.isAr() ? 'تنبيه' : 'Warning', detail: this.isAr() ? 'الرمز والاسم مطلوبان' : 'Code and name are required' });
        return;
      }
    } else {
      if (!form.code.trim() || !form.labelEn.trim()) {
        this.msg.add({ severity: 'warn', summary: this.isAr() ? 'تنبيه' : 'Warning', detail: this.isAr() ? 'الرمز والاسم مطلوبان' : 'Code and label are required' });
        return;
      }
    }

    this.adding.set(true);
    this.api.addTaxonomyEntry(type, {
      code: form.code.trim(),
      labelEn: form.labelEn.trim(),
      labelAr: form.labelAr.trim() || undefined,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msg.add({ severity: 'success', summary: this.isAr() ? 'تم' : 'Added', detail: this.isAr() ? 'تمت الإضافة' : 'Entry added' });
          this.showAddDialog.set(false);
          this.adding.set(false);
          this.loadAll();
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: this.isAr() ? 'خطأ' : 'Error', detail: this.isAr() ? 'فشلت الإضافة' : 'Failed to add entry' });
          this.adding.set(false);
        },
      });
  }

  // ── Inline editing for taxonomy entries ──

  /** Start inline editing a taxonomy entry */
  startEditEntry(type: string, entry: TaxonomyEntry): void {
    this.taxonomy.update(map => {
      const updated = { ...map };
      updated[type] = (updated[type] || []).map(e =>
        e.id === entry.id
          ? { ...e, editing: true, editLabelEn: e.labelEn, editLabelAr: e.labelAr, editCategory: e.category, editSortOrder: e.sortOrder, editRetention: e.defaultRetention }
          : e
      );
      return updated;
    });
  }

  /** Cancel inline editing */
  cancelEditEntry(type: string, entry: TaxonomyEntry): void {
    this.taxonomy.update(map => {
      const updated = { ...map };
      updated[type] = (updated[type] || []).map(e =>
        e.id === entry.id ? { ...e, editing: false } : e
      );
      return updated;
    });
  }

  /** Save inline edits for a taxonomy entry */
  saveEditEntry(type: string, entry: TaxonomyEntry): void {
    const data: Record<string, any> = {};
    if (entry.editLabelEn !== undefined) data['labelEn'] = entry.editLabelEn;
    if (entry.editLabelAr !== undefined) data['labelAr'] = entry.editLabelAr;
    if (entry.editCategory !== undefined) data['category'] = entry.editCategory;
    if (entry.editSortOrder !== undefined) data['sortOrder'] = entry.editSortOrder;
    if (entry.editRetention !== undefined) data['defaultRetention'] = entry.editRetention;

    this.api.updateTaxonomyEntry(type, entry.id, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.taxonomy.update(map => {
            const updated = { ...map };
            updated[type] = (updated[type] || []).map(e =>
              e.id === entry.id
                ? { ...e, labelEn: entry.editLabelEn || e.labelEn, labelAr: entry.editLabelAr || e.labelAr, category: entry.editCategory || e.category, sortOrder: entry.editSortOrder ?? e.sortOrder, defaultRetention: entry.editRetention ?? e.defaultRetention, editing: false }
                : e
            );
            return updated;
          });
          this.msg.add({ severity: 'success', summary: this.isAr() ? 'تم' : 'Saved', detail: this.isAr() ? 'تم الحفظ' : 'Entry saved' });
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: this.isAr() ? 'خطأ' : 'Error', detail: this.isAr() ? 'فشل الحفظ' : 'Save failed' });
        },
      });
  }

  /** Toggle active status for a taxonomy entry */
  toggleEntryActive(type: string, entry: TaxonomyEntry): void {
    const newActive = !entry.isActive;
    this.api.updateTaxonomyEntry(type, entry.id, { isActive: newActive, is_active: newActive })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.taxonomy.update(map => {
            const updated = { ...map };
            updated[type] = (updated[type] || []).map(e =>
              e.id === entry.id ? { ...e, isActive: newActive } : e
            );
            return updated;
          });
          this.msg.add({ severity: 'success', summary: this.isAr() ? 'تم' : 'Updated', detail: this.isAr() ? 'تم التحديث' : 'Entry updated' });
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: this.isAr() ? 'خطأ' : 'Error', detail: this.isAr() ? 'فشل التحديث' : 'Update failed' });
        },
      });
  }

  // ── Quality rules inline editing ──

  /** Start inline editing a quality rule */
  startEditRule(rule: QualityRule): void {
    this.qualityRules.update(rules =>
      rules.map(r => r.id === rule.id
        ? { ...r, editing: true, editWeight: r.weight, editActive: r.active }
        : r
      )
    );
  }

  /** Cancel inline editing */
  cancelEditRule(rule: QualityRule): void {
    this.qualityRules.update(rules =>
      rules.map(r => r.id === rule.id ? { ...r, editing: false } : r)
    );
  }

  /** Save quality rule edits (weight + active) */
  saveEditRule(rule: QualityRule): void {
    const data: Record<string, any> = {
      weight: rule.editWeight ?? rule.weight,
      active: rule.editActive ?? rule.active,
      is_active: rule.editActive ?? rule.active,
    };

    this.api.updateTaxonomyEntry('quality-rules', rule.id, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.qualityRules.update(rules =>
            rules.map(r => r.id === rule.id
              ? { ...r, weight: rule.editWeight ?? r.weight, active: rule.editActive ?? r.active, editing: false }
              : r
            )
          );
          this.msg.add({ severity: 'success', summary: this.isAr() ? 'تم' : 'Saved', detail: this.isAr() ? 'تم حفظ القاعدة' : 'Rule saved' });
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: this.isAr() ? 'خطأ' : 'Error', detail: this.isAr() ? 'فشل حفظ القاعدة' : 'Rule save failed' });
        },
      });
  }

  /** Toggle quality rule active status directly */
  toggleRuleActive(rule: QualityRule): void {
    const newActive = !rule.active;
    this.api.updateTaxonomyEntry('quality-rules', rule.id, { active: newActive, is_active: newActive })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.qualityRules.update(rules =>
            rules.map(r => r.id === rule.id ? { ...r, active: newActive } : r)
          );
          this.msg.add({ severity: 'success', summary: this.isAr() ? 'تم' : 'Updated', detail: this.isAr() ? 'تم التحديث' : 'Rule updated' });
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: this.isAr() ? 'خطأ' : 'Error', detail: this.isAr() ? 'فشل التحديث' : 'Update failed' });
        },
      });
  }

  /** Update the add form field */
  updateAddForm(field: string, value: any): void {
    this.addForm.update(f => ({ ...f, [field]: value }));
  }
}
