import {
  Component, ChangeDetectionStrategy, input, output, computed, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { GrcRecord } from '../shared/foundation-types';

/**
 * Create / Edit organization profile dialog.
 * Includes KSA regulatory identity fields (CR, VAT, ISIC, legal structure).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-foundation-org-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DialogModule, InputTextModule, InputTextarea, DropdownModule,
  ],
  template: `
    <p-dialog [header]="dialogTitle()" [(visible)]="showDialog" [style]="{width:'720px','max-width':'95vw'}" [modal]="true">
      <div class="dialog-grid">
        <div class="dg-row"><label>{{ isAr() ? 'الاسم (EN)' : 'Legal Name (EN)' }} *</label><input pInputText [(ngModel)]="form.name_en" class="w-full" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'الاسم (AR)' : 'Legal Name (AR)' }}</label><input pInputText [(ngModel)]="form.name_ar" class="w-full" dir="rtl" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'الاسم المختصر' : 'Brand / Short Name' }}</label><input pInputText [(ngModel)]="form.brand_name" class="w-full" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'النوع' : 'Type' }}</label><p-dropdown [options]="orgTypes" [(ngModel)]="form.org_type" optionLabel="label" optionValue="value" class="w-full" appendTo="body" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'القطاع' : 'Sector / Industry' }}</label><input pInputText [(ngModel)]="form.sector" class="w-full" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'البلد' : 'Country' }}</label><input pInputText [(ngModel)]="form.country" class="w-full" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'المنطقة' : 'Region' }}</label><input pInputText [(ngModel)]="form.region" class="w-full" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'المنطقة الزمنية' : 'Timezone' }}</label><input pInputText [(ngModel)]="form.timezone" class="w-full" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'جهة الاتصال' : 'Contact Name' }}</label><input pInputText [(ngModel)]="form.contact_name" class="w-full" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'البريد الإلكتروني' : 'Contact Email' }}</label><input pInputText [(ngModel)]="form.contact_email" class="w-full" type="email" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'الهاتف' : 'Contact Phone' }}</label><input pInputText [(ngModel)]="form.contact_phone" class="w-full" /></div>
        <div class="dg-row dg-wide"><label>{{ isAr() ? 'عنوان المقر' : 'HQ Address' }}</label><textarea pInputTextarea [(ngModel)]="form.hq_address" class="w-full" rows="2"></textarea></div>
        <div class="dg-row"><label>{{ isAr() ? 'الحالة' : 'Status' }}</label><p-dropdown [options]="statusOptions" [(ngModel)]="form.status" optionLabel="label" optionValue="value" class="w-full" appendTo="body" /></div>
        <div class="dg-row dg-wide" style="border-top:1px solid var(--surface-border);padding-top:14px;margin-top:6px">
          <label style="font-size: var(--font-size-sm);font-weight:700;color:var(--text-heading)">{{ isAr() ? 'البيانات التنظيمية (KSA)' : 'KSA Regulatory Identity' }}</label>
        </div>
        <div class="dg-row"><label>{{ isAr() ? 'رقم السجل التجاري' : 'CR Number' }}</label><input pInputText [(ngModel)]="form.cr_number" class="w-full" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'رقم 700' : 'CR 700 Number' }}</label><input pInputText [(ngModel)]="form.cr_700_number" class="w-full" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'الرقم الضريبي' : 'VAT Number' }}</label><input pInputText [(ngModel)]="form.vat_number" class="w-full" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'رمز ISIC' : 'ISIC Code' }}</label><input pInputText [(ngModel)]="form.isic_code" class="w-full" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'الهيكل القانوني' : 'Legal Structure' }}</label><p-dropdown [options]="legalStructureOptions" [(ngModel)]="form.legal_structure" optionLabel="label" optionValue="value" class="w-full" appendTo="body" [showClear]="true" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'نهاية السنة المالية' : 'Fiscal Year End' }}</label><input pInputText [(ngModel)]="form.fiscal_year_end" class="w-full" placeholder="MM-DD" aria-label="MM-DD" /></div>
        <div class="dg-row"><label>{{ isAr() ? 'تصنيف البيانات' : 'Data Classification' }}</label><p-dropdown [options]="dataClassOptions" [(ngModel)]="form.data_classification" optionLabel="label" optionValue="value" class="w-full" appendTo="body" /></div>
      </div>
      <ng-template pTemplate="footer">
        <button class="org-cta" (click)="showDialog=false">{{ isAr() ? 'إلغاء' : 'Cancel' }}</button>
        <button class="org-cta-primary" (click)="saveClick.emit(form)" [disabled]="saving()">
          <i class="pi" [ngClass]="saving() ? 'pi-spin pi-spinner' : 'pi-check'"></i>
          {{ isAr() ? 'حفظ' : 'Save' }}
        </button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .dialog-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 16px;padding:8px 0}
    .dg-row{display:flex;flex-direction:column;gap:4px}
    .dg-row label{font-size: var(--font-size-sm);font-weight:600;color:var(--text-secondary)}
    .dg-wide{grid-column:1/-1}
    .org-cta-primary{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border:none;border-radius:var(--radius);background:var(--primary-600,#2563eb);color:#fff;font-size: var(--font-size-sm);font-weight:600;cursor:pointer;transition:background .15s}
    .org-cta-primary:hover{background:var(--primary-700,#1d4ed8)}
    .org-cta-primary:disabled{opacity:.6;cursor:not-allowed}
    .org-cta{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--surface-border);border-radius:var(--radius);background:var(--surface-card);color:var(--text-color);font-size: var(--font-size-sm);font-weight:600;cursor:pointer;transition:all .15s}
    .org-cta:hover{background:var(--surface-ice);border-color:var(--border)}
    @media(max-width:600px){.dialog-grid{grid-template-columns:1fr}}
  `],
})
export class FoundationOrgDialogComponent {
  readonly i18n = inject(I18nService);
  isAr = computed(() => this.i18n.currentLang() === 'ar');

  /* Inputs */
  saving = input.required<boolean>();

  /* Outputs */
  saveClick = output<unknown>();

  /* Dialog state */
  showDialog = false;
  editing = false;
  form: GrcRecord = {};

  dialogTitle = computed(() => {
    if (this.editing) return this.isAr() ? 'تعديل المنظمة' : 'Edit Organization';
    return this.isAr() ? 'إنشاء منظمة' : 'Create Organization';
  });

  get orgTypes() {
    return [
      { label: this.i18n.translate('foundation.corporation'), value: 'corporation' },
      { label: this.i18n.translate('foundation.government'), value: 'government' },
      { label: this.i18n.translate('foundation.nonProfit'), value: 'non_profit' },
      { label: this.i18n.translate('foundation.holding'), value: 'holding' },
      { label: this.i18n.translate('foundation.subsidiary'), value: 'subsidiary' },
      { label: this.i18n.translate('foundation.branch'), value: 'branch' },
      { label: this.i18n.translate('foundation.division'), value: 'division' },
      { label: this.i18n.translate('foundation.jointVenture'), value: 'joint_venture' },
      { label: this.i18n.translate('foundation.affiliate'), value: 'affiliate' },
    ];
  }

  get statusOptions() {
    return [
      { label: this.i18n.translate('foundation.active'), value: 'active' },
      { label: this.i18n.translate('foundation.inactive'), value: 'inactive' },
      { label: this.i18n.translate('foundation.archived'), value: 'archived' },
    ];
  }

  get legalStructureOptions() {
    return [
      { label: this.i18n.translate('foundation.llc'), value: 'llc' },
      { label: this.i18n.translate('foundation.jsc'), value: 'jsc' },
      { label: this.i18n.translate('foundation.soleProprietorship'), value: 'sole_proprietorship' },
      { label: this.i18n.translate('foundation.partnership'), value: 'partnership' },
      { label: this.i18n.translate('foundation.governmentEntity'), value: 'government' },
      { label: this.i18n.translate('foundation.nonProfitOrg'), value: 'non_profit' },
      { label: this.i18n.translate('foundation.foreignBranch'), value: 'foreign_branch' },
    ];
  }

  get dataClassOptions() {
    return [
      { label: this.i18n.translate('foundation.public'), value: 'public' },
      { label: this.i18n.translate('foundation.internal'), value: 'internal' },
      { label: this.i18n.translate('foundation.confidential'), value: 'confidential' },
      { label: this.i18n.translate('foundation.restricted'), value: 'restricted' },
    ];
  }

  /** Open dialog for creating a new org */
  openCreate(): void {
    this.editing = false;
    this.form = {
      name_en: '', name_ar: '', org_type: 'subsidiary', status: 'active',
      brand_name: '', sector: '', country: '', region: '', timezone: '',
      contact_name: '', contact_email: '', contact_phone: '', hq_address: '',
      cr_number: '', cr_700_number: '', vat_number: '', isic_code: '',
      legal_structure: null, fiscal_year_end: '12-31', data_classification: 'internal',
    };
    this.showDialog = true;
  }

  /** Open dialog for editing an existing org */
  openEdit(org: GrcRecord): void {
    this.editing = true;
    const m = (org.metadata && typeof org.metadata === 'object') ? org.metadata : {};
    this.form = {
      name_en: org.name_en, name_ar: org.name_ar || '', org_type: org.org_type, status: org.status,
      brand_name: m['brand_name'] || '', sector: m['sector'] || '', country: m['country'] || '',
      region: m['region'] || '', timezone: m['timezone'] || '', contact_name: m['contact_name'] || '',
      contact_email: m['contact_email'] || '', contact_phone: m['contact_phone'] || '', hq_address: m['hq_address'] || '',
      cr_number: org.cr_number || '', cr_700_number: org.cr_700_number || '',
      vat_number: org.vat_number || '', isic_code: org.isic_code || '',
      legal_structure: org.legal_structure || null, fiscal_year_end: org.fiscal_year_end || '12-31',
      data_classification: org.data_classification || 'internal',
    };
    this.showDialog = true;
  }

  close(): void {
    this.showDialog = false;
  }
}
