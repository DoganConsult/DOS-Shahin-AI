import {
  Component, ChangeDetectionStrategy, input, output, computed, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { GrcRecord } from '../shared/foundation-types';

/**
 * All user-management dialogs: invite user, create/edit user,
 * single role assign, bulk role assign, bulk dept assign, and delegation creation.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-foundation-users-dialogs',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DialogModule, InputTextModule, DropdownModule, CheckboxModule, ButtonModule,
  ],
  template: `
    <!-- Invite User dialog -->
    <p-dialog [header]="isAr() ? 'دعوة مستخدم' : 'Invite User'" [(visible)]="showInviteDialog" [style]="{width:'720px','max-width':'95vw'}" [modal]="true">
      <div class="dialog-grid">
        <div class="dg-row dg-wide">
          <label>{{ isAr() ? 'البريد الإلكتروني' : 'Email' }} *</label>
          <input pInputText [(ngModel)]="inviteForm.email" class="w-full" type="email" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'الاسم' : 'Name' }}</label>
          <input pInputText [(ngModel)]="inviteForm.name" class="w-full" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'الدور' : 'Role' }}</label>
          <p-dropdown [options]="roleOptions()" [(ngModel)]="inviteForm.role" optionLabel="label" optionValue="value"
            class="w-full" [placeholder]="isAr() ? 'اختر...' : 'Select...'" appendTo="body" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'القسم' : 'Department' }}</label>
          <p-dropdown [options]="deptOptions()" [(ngModel)]="inviteForm.department_id" optionLabel="label" optionValue="value"
            class="w-full" [placeholder]="isAr() ? 'اختر...' : 'Select...'" [showClear]="true" [filter]="true" appendTo="body" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'الفريق' : 'Team' }}</label>
          <p-dropdown [options]="teamOptions()" [(ngModel)]="inviteForm.team_id" optionLabel="label" optionValue="value"
            class="w-full" [placeholder]="isAr() ? 'اختر...' : 'Select...'" [showClear]="true" [filter]="true" appendTo="body" />
        </div>
        <div class="dg-row dg-wide pdpl-consent-row">
          <div class="pdpl-banner">
            <i class="pi pi-shield" style="color:var(--primary)"></i>
            <span class="pdpl-label">{{ isAr() ? 'موافقة PDPL (نظام حماية البيانات الشخصية)' : 'PDPL Consent (Personal Data Protection Law)' }}</span>
          </div>
          <div class="pdpl-checks">
            <p-checkbox [(ngModel)]="inviteForm.pdpl_data_processing" [binary]="true" inputId="pdpl_dp"
              [label]="isAr() ? 'الموافقة على معالجة البيانات الشخصية' : 'Consent to process personal data'" />
            <p-checkbox [(ngModel)]="inviteForm.pdpl_platform_usage" [binary]="true" inputId="pdpl_pu"
              [label]="isAr() ? 'الموافقة على استخدام المنصة' : 'Consent to platform usage tracking'" />
          </div>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="isAr() ? 'إلغاء' : 'Cancel'" severity="secondary" [text]="true" (onClick)="showInviteDialog=false" />
        <p-button [label]="isAr() ? 'إرسال الدعوة' : 'Send Invitation'" icon="pi pi-send" (onClick)="sendInvite.emit(inviteForm)" [loading]="saving()" />
      </ng-template>
    </p-dialog>

    <!-- Create / Edit User dialog -->
    <p-dialog [header]="editingUser() ? (isAr() ? 'تعديل مستخدم' : 'Edit User') : (isAr() ? 'إضافة مستخدم' : 'Add User')"
      [(visible)]="showUserDialog" [style]="{width:'720px','max-width':'95vw'}" [modal]="true">
      <div class="dialog-grid">
        <div class="dg-row">
          <label>{{ isAr() ? 'الاسم الأول' : 'First Name' }} *</label>
          <input pInputText [(ngModel)]="userForm.first_name" class="w-full" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'الاسم الأخير' : 'Last Name' }}</label>
          <input pInputText [(ngModel)]="userForm.last_name" class="w-full" />
        </div>
        <div class="dg-row dg-wide">
          <label>{{ isAr() ? 'البريد الإلكتروني' : 'Email' }} *</label>
          <input pInputText [(ngModel)]="userForm.email" class="w-full" type="email" [disabled]="editingUser()" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'الدور' : 'Role' }}</label>
          <p-dropdown [options]="roleOptions()" [(ngModel)]="userForm.role" optionLabel="label" optionValue="value"
            class="w-full" [placeholder]="isAr() ? 'اختر...' : 'Select...'" [showClear]="true" appendTo="body" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'القسم' : 'Department' }}</label>
          <p-dropdown [options]="deptOptions()" [(ngModel)]="userForm.department_id" optionLabel="label" optionValue="value"
            class="w-full" [placeholder]="isAr() ? 'اختر...' : 'Select...'" [showClear]="true" [filter]="true" appendTo="body" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'الفريق' : 'Team' }}</label>
          <p-dropdown [options]="teamOptions()" [(ngModel)]="userForm.team_id" optionLabel="label" optionValue="value"
            class="w-full" [placeholder]="isAr() ? 'اختر...' : 'Select...'" [showClear]="true" [filter]="true" appendTo="body" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'الحالة' : 'Status' }}</label>
          <p-dropdown [options]="userStatusOptions" [(ngModel)]="userForm.status" optionLabel="label" optionValue="value" class="w-full" appendTo="body" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'المسمى الوظيفي' : 'Job Title' }}</label>
          <input pInputText [(ngModel)]="userForm.job_title" class="w-full" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'الجنسية' : 'Nationality' }}</label>
          <input pInputText [(ngModel)]="userForm.nationality" class="w-full" [placeholder]="isAr() ? 'مثل: SA' : 'e.g. SA'" maxlength="3" />
        </div>
        <div class="dg-row" style="display:flex;gap:20px;align-items:center">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" [(ngModel)]="userForm.is_ciso" /> {{ isAr() ? 'CISO' : 'CISO' }}
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" [(ngModel)]="userForm.is_dpo" /> {{ isAr() ? 'DPO' : 'DPO' }}
          </label>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="isAr() ? 'إلغاء' : 'Cancel'" severity="secondary" [text]="true" (onClick)="showUserDialog=false" />
        <p-button [label]="isAr() ? 'حفظ' : 'Save'" icon="pi pi-check" (onClick)="saveUser.emit(userForm)" [loading]="saving()" />
      </ng-template>
    </p-dialog>

    <!-- Role Assign dialog -->
    <p-dialog [header]="isAr() ? 'تعيين دور' : 'Assign Role'" [(visible)]="showRoleDialog" [style]="{width:'520px','max-width':'95vw'}" [modal]="true">
      <div class="dialog-grid">
        <div class="dg-row dg-wide">
          <label>{{ isAr() ? 'المستخدم' : 'User' }}</label>
          <input pInputText [value]="roleAssignUser()?.email || ''" class="w-full" [disabled]="true" />
        </div>
        <div class="dg-row dg-wide">
          <label>{{ isAr() ? 'الدور' : 'Role' }} *</label>
          <p-dropdown [options]="roleOptions()" [(ngModel)]="roleAssignValue" optionLabel="label" optionValue="value"
            class="w-full" [placeholder]="isAr() ? 'اختر دور...' : 'Select role...'" appendTo="body" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="isAr() ? 'إلغاء' : 'Cancel'" severity="secondary" [text]="true" (onClick)="showRoleDialog=false" />
        <p-button [label]="isAr() ? 'تعيين' : 'Assign'" icon="pi pi-check" (onClick)="confirmRoleAssign.emit(roleAssignValue)" [loading]="saving()" />
      </ng-template>
    </p-dialog>

    <!-- Bulk Role Assign dialog -->
    <p-dialog [header]="isAr() ? 'تعيين دور جماعي' : 'Bulk Assign Role'" [(visible)]="showBulkRoleDialog" [style]="{width:'520px','max-width':'95vw'}" [modal]="true">
      <div class="dialog-grid">
        <div class="dg-row dg-wide">
          <label>{{ isAr() ? 'المستخدمون المحددون' : 'Selected Users' }}</label>
          <span class="text-sm">{{ selectedCount() }} {{ isAr() ? 'مستخدم' : 'users' }}</span>
        </div>
        <div class="dg-row dg-wide">
          <label>{{ isAr() ? 'الدور' : 'Role' }} *</label>
          <p-dropdown [options]="roleOptions()" [(ngModel)]="bulkRoleValue" optionLabel="label" optionValue="value"
            class="w-full" [placeholder]="isAr() ? 'اختر دور...' : 'Select role...'" appendTo="body" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="isAr() ? 'إلغاء' : 'Cancel'" severity="secondary" [text]="true" (onClick)="showBulkRoleDialog=false" />
        <p-button [label]="isAr() ? 'تعيين للكل' : 'Assign to All'" icon="pi pi-check" (onClick)="confirmBulkRole.emit(bulkRoleValue)" [loading]="saving()" />
      </ng-template>
    </p-dialog>

    <!-- Bulk Dept Assign dialog -->
    <p-dialog [header]="isAr() ? 'تعيين قسم جماعي' : 'Bulk Assign Department'" [(visible)]="showBulkDeptDialog" [style]="{width:'520px','max-width':'95vw'}" [modal]="true">
      <div class="dialog-grid">
        <div class="dg-row dg-wide">
          <label>{{ isAr() ? 'المستخدمون المحددون' : 'Selected Users' }}</label>
          <span class="text-sm">{{ selectedCount() }} {{ isAr() ? 'مستخدم' : 'users' }}</span>
        </div>
        <div class="dg-row dg-wide">
          <label>{{ isAr() ? 'القسم' : 'Department' }} *</label>
          <p-dropdown [options]="deptOptions()" [(ngModel)]="bulkDeptValue" optionLabel="label" optionValue="value"
            class="w-full" [placeholder]="isAr() ? 'اختر قسم...' : 'Select department...'" [filter]="true" appendTo="body" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="isAr() ? 'إلغاء' : 'Cancel'" severity="secondary" [text]="true" (onClick)="showBulkDeptDialog=false" />
        <p-button [label]="isAr() ? 'تعيين للكل' : 'Assign to All'" icon="pi pi-check" (onClick)="confirmBulkDept.emit(bulkDeptValue)" [loading]="saving()" />
      </ng-template>
    </p-dialog>

    <!-- Create Delegation dialog -->
    <p-dialog [header]="isAr() ? 'إنشاء تفويض' : 'Create Delegation'" [(visible)]="showDelegationDialog" [style]="{width:'560px','max-width':'95vw'}" [modal]="true">
      <div class="dialog-grid">
        <div class="dg-row dg-wide">
          <label>{{ isAr() ? 'المفوَّض إليه' : 'Delegate To' }} *</label>
          <p-dropdown [options]="delegateOptions()" [(ngModel)]="delegationForm.delegate_user_id" optionLabel="label" optionValue="value"
            class="w-full" [placeholder]="isAr() ? 'اختر مستخدم...' : 'Select user...'" [filter]="true" appendTo="body" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'نوع التفويض' : 'Authority Area' }}</label>
          <p-dropdown [options]="authorityAreaOptions" [(ngModel)]="delegationForm.authority_area" optionLabel="label" optionValue="value"
            class="w-full" appendTo="body" />
        </div>
        <div class="dg-row">
          <label>{{ isAr() ? 'تاريخ الانتهاء' : 'Expires' }}</label>
          <input type="date" pInputText [(ngModel)]="delegationForm.valid_to" class="w-full" />
        </div>
        <div class="dg-row dg-wide">
          <label>{{ isAr() ? 'السبب' : 'Reason' }}</label>
          <input pInputText [(ngModel)]="delegationForm.reason" class="w-full" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="isAr() ? 'إلغاء' : 'Cancel'" severity="secondary" [text]="true" (onClick)="showDelegationDialog=false" />
        <p-button [label]="isAr() ? 'إنشاء' : 'Create'" icon="pi pi-check" (onClick)="confirmDelegation.emit(delegationForm)" [loading]="saving()" [disabled]="!delegationForm.delegate_user_id" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .dialog-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 20px}
    .dg-row{display:flex;flex-direction:column;gap:4px}
    .dg-row label{font-size: var(--font-size-sm);font-weight:600;color:var(--text-muted)}
    .dg-wide{grid-column:1/-1}
    .pdpl-consent-row{margin-top:4px}
    .pdpl-banner{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--blue-50,#eff6ff);border:1px solid var(--blue-200,#bfdbfe);border-radius:var(--radius);margin-bottom:6px}
    .pdpl-label{font-size: var(--font-size-sm);font-weight:700;color:var(--blue-700,#1d4ed8)}
    .pdpl-checks{display:flex;flex-direction:column;gap:8px;padding-inline-start:4px}
    @media(max-width:768px){.dialog-grid{grid-template-columns:1fr}}
  `],
})
export class FoundationUsersDialogsComponent {
  readonly i18n = inject(I18nService);
  isAr = computed(() => this.i18n.currentLang() === 'ar');

  /* Inputs */
  roleOptions = input.required<{ label: string; value: string }[]>();
  deptOptions = input.required<{ label: string; value: string }[]>();
  teamOptions = input.required<{ label: string; value: string }[]>();
  delegateOptions = input.required<{ label: string; value: string }[]>();
  saving = input.required<boolean>();
  editingUser = input.required<boolean>();
  roleAssignUser = input.required<unknown>();
  selectedCount = input.required<number>();

  /* Outputs */
  sendInvite = output<unknown>();
  saveUser = output<unknown>();
  confirmRoleAssign = output<string>();
  confirmBulkRole = output<string>();
  confirmBulkDept = output<string | null>();
  confirmDelegation = output<unknown>();

  /* Dialog visibility (mutated locally, set via public methods) */
  showInviteDialog = false;
  showUserDialog = false;
  showRoleDialog = false;
  showBulkRoleDialog = false;
  showBulkDeptDialog = false;
  showDelegationDialog = false;

  /* Form state */
  inviteForm: GrcRecord = { email: '', name: '', role: 'viewer', department_id: null, team_id: null, pdpl_data_processing: true, pdpl_platform_usage: true };
  userForm: GrcRecord = { first_name: '', last_name: '', email: '', role: '', status: 'active', department_id: null, team_id: null, job_title: '', nationality: '', is_ciso: false, is_dpo: false };
  roleAssignValue = '';
  bulkRoleValue = '';
  bulkDeptValue: string | null = null;
  delegationForm: GrcRecord = { delegate_user_id: null, authority_area: 'general', valid_to: '', reason: '' };

  get userStatusOptions() {
    return [
      { label: this.i18n.translate('foundation.active'), value: 'active' },
      { label: this.i18n.translate('foundation.disabled'), value: 'disabled' },
      { label: this.i18n.translate('foundation.inactive'), value: 'inactive' },
    ];
  }

  authorityAreaOptions = [
    { label: 'General', value: 'general' },
    { label: 'Approval', value: 'approval' },
    { label: 'Risk Management', value: 'risk_management' },
    { label: 'Compliance', value: 'compliance' },
    { label: 'Audit', value: 'audit' },
  ];

  /* Public methods for the parent to open dialogs and reset forms */
  openInvite(): void {
    this.inviteForm = { email: '', name: '', role: 'viewer', department_id: null, team_id: null, pdpl_data_processing: true, pdpl_platform_usage: true };
    this.showInviteDialog = true;
  }

  openCreate(): void {
    this.userForm = { first_name: '', last_name: '', email: '', role: '', status: 'active', department_id: null, team_id: null, job_title: '', nationality: '', is_ciso: false, is_dpo: false };
    this.showUserDialog = true;
  }

  openEdit(row: GrcRecord): void {
    this.userForm = {
      first_name: row.first_name || '', last_name: row.last_name || '', email: row.email,
      role: row.role || '', status: row.status, department_id: row.department_id || null,
      team_id: null, job_title: row.job_title || '', nationality: row.nationality || '',
      is_ciso: row.is_ciso || false, is_dpo: row.is_dpo || false,
    };
    this.showUserDialog = true;
  }

  openRoleAssign(role: string): void {
    this.roleAssignValue = role;
    this.showRoleDialog = true;
  }

  openBulkRole(): void {
    this.bulkRoleValue = '';
    this.showBulkRoleDialog = true;
  }

  openBulkDept(): void {
    this.bulkDeptValue = null;
    this.showBulkDeptDialog = true;
  }

  openDelegation(): void {
    this.delegationForm = { delegate_user_id: null, authority_area: 'general', valid_to: '', reason: '' };
    this.showDelegationDialog = true;
  }

  closeAll(): void {
    this.showInviteDialog = false;
    this.showUserDialog = false;
    this.showRoleDialog = false;
    this.showBulkRoleDialog = false;
    this.showBulkDeptDialog = false;
    this.showDelegationDialog = false;
  }
}
