import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-policy-management',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent, ToastModule, CardModule, TableModule, TagModule, TabViewModule, ButtonModule, InputTextModule, DropdownModule, DialogModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <p-dialog [header]="i18n.isArabic() ? 'سياسة جديدة' : 'New Policy'" [(visible)]="showDialog" [modal]="true" [style]="{width: '500px'}">
      <div class="flex flex-column gap-3 p-3">
        <div>
          <label class="font-semibold block mb-1">{{ i18n.isArabic() ? 'الاسم' : 'Name' }}</label>
          <input pInputText [(ngModel)]="newPolicy.name" class="w-full" />
        </div>
        <div>
          <label class="font-semibold block mb-1">{{ i18n.isArabic() ? 'النطاق' : 'Scope' }}</label>
          <p-dropdown [(ngModel)]="newPolicy.scope" [options]="scopeOptions" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div>
          <label class="font-semibold block mb-1">{{ i18n.isArabic() ? 'الإجراء' : 'Action' }}</label>
          <p-dropdown [(ngModel)]="newPolicy.action" [options]="actionOptions" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div>
          <label class="font-semibold block mb-1">{{ i18n.isArabic() ? 'الأولوية' : 'Priority' }}</label>
          <input pInputText type="number" [(ngModel)]="newPolicy.priority" class="w-full" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton [label]="i18n.isArabic() ? 'إلغاء' : 'Cancel'" class="p-button-text" (click)="showDialog = false"></button>
        <button pButton [label]="i18n.isArabic() ? 'حفظ' : 'Save'" (click)="savePolicy()"></button>
      </ng-template>
    </p-dialog>

    <app-page-shell icon="shield" [title]="i18n.isArabic() ? 'إدارة السياسات' : 'AI Policy Management'" [subtitle]="i18n.isArabic() ? 'قواعد الحماية ومحرك السياسات' : 'Guardrails & policy engine'" [breadcrumbs]="['Dashboard','AI','Policy Management']" [loading]="loading()">
      <div class="grid mb-3" [dir]="i18n.direction()">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis()">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" [style.color]="kpi.color">{{ kpi.value }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? kpi.labelAr : kpi.label }}</div>
            </div>
          </p-card>
        </div>
      </div>

      <p-tabView [dir]="i18n.direction()">
        <p-tabPanel [header]="i18n.isArabic() ? 'قواعد السياسة' : 'Policy Rules'">
          <div class="flex justify-content-end mb-2">
            <button pButton [label]="i18n.isArabic() ? 'سياسة جديدة' : 'New Policy'" icon="pi pi-plus" (click)="openDialog()"></button>
          </div>
          <p-table [value]="policies()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" responsiveLayout="scroll" [sortField]="'priority'" [sortOrder]="1">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="priority">{{ i18n.isArabic() ? 'الأولوية' : 'Priority' }} <p-sortIcon field="priority" /></th>
                <th>{{ i18n.isArabic() ? 'الاسم' : 'Name' }}</th>
                <th>{{ i18n.isArabic() ? 'النطاق' : 'Scope' }}</th>
                <th>{{ i18n.isArabic() ? 'الإجراء' : 'Action' }}</th>
                <th>{{ i18n.isArabic() ? 'الحالة' : 'Active' }}</th>
                <th>{{ i18n.isArabic() ? 'آخر تحديث' : 'Updated' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-p>
              <tr>
                <td>{{ p.priority }}</td>
                <td>{{ p.name }}</td>
                <td><p-tag [value]="p.scope || 'global'" /></td>
                <td><p-tag [value]="p.action" [severity]="p.action === 'block' ? 'danger' : p.action === 'warn' ? 'warning' : 'info'" /></td>
                <td><app-status-badge [status]="p.active ? 'active' : 'inactive'" /></td>
                <td>{{ p.updated_at || p.created_at || '—' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد سياسات' : 'No policies configured' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'انتهاكات الحماية' : 'Guardrail Violations'">
          <p-table [value]="violations()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'الوقت' : 'Timestamp' }}</th>
                <th>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}</th>
                <th>{{ i18n.isArabic() ? 'السياسة المنتهَكة' : 'Policy Violated' }}</th>
                <th>{{ i18n.isArabic() ? 'الخطورة' : 'Severity' }}</th>
                <th>{{ i18n.isArabic() ? 'الإجراء المتخذ' : 'Action Taken' }}</th>
                <th>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-v>
              <tr>
                <td>{{ v.timestamp || v.created_at }}</td>
                <td>{{ v.agent_id }}</td>
                <td>{{ v.policy_name || v.policy_id }}</td>
                <td><app-status-badge [status]="v.severity" /></td>
                <td><p-tag [value]="v.action_taken || v.action" [severity]="v.action_taken === 'blocked' ? 'danger' : 'warning'" /></td>
                <td><app-status-badge [status]="v.status || 'open'" /></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد انتهاكات' : 'No violations recorded' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'قيود إقامة البيانات' : 'Data Residency'">
          <p-table [value]="residencyRules()" styleClass="p-datatable-sm" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'المنطقة' : 'Region' }}</th>
                <th>{{ i18n.isArabic() ? 'نوع البيانات' : 'Data Type' }}</th>
                <th>{{ i18n.isArabic() ? 'القيد' : 'Constraint' }}</th>
                <th>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td>{{ r.region || r.geography }}</td>
                <td>{{ r.data_type }}</td>
                <td>{{ r.constraint || r.restriction }}</td>
                <td><app-status-badge [status]="r.enforced ? 'active' : 'inactive'" /></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="4" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد قيود' : 'No residency rules defined' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>
  `,
})
export class AiPolicyManagementComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly policies = signal<any[]>([]);
  readonly violations = signal<any[]>([]);
  readonly residencyRules = signal<any[]>([]);
  readonly kpis = signal<{ label: string; labelAr: string; value: number | string; color: string }[]>([]);

  showDialog = false;
  newPolicy: { name: string; scope: string; action: string; priority: number } = { name: '', scope: 'global', action: 'warn', priority: 50 };

  readonly scopeOptions = [
    { label: 'Global', value: 'global' },
    { label: 'Agent', value: 'agent' },
    { label: 'Module', value: 'module' },
    { label: 'User', value: 'user' },
  ];

  readonly actionOptions = [
    { label: 'Block', value: 'block' },
    { label: 'Warn', value: 'warn' },
    { label: 'Log', value: 'log' },
    { label: 'Redact', value: 'redact' },
  ];

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/policies`).subscribe({
      next: (res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        this.policies.set(list);
        this.kpis.set([
          { label: 'Total Policies', labelAr: 'إجمالي السياسات', value: list.length, color: 'var(--info)' },
          { label: 'Active', labelAr: 'نشطة', value: list.filter((p: any) => p.active).length, color: 'var(--success)' },
          { label: 'Block Rules', labelAr: 'قواعد الحظر', value: list.filter((p: any) => p.action === 'block').length, color: 'var(--severity-critical)' },
          { label: 'Warn Rules', labelAr: 'قواعد التحذير', value: list.filter((p: any) => p.action === 'warn').length, color: 'var(--warning)' },
        ]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load policies' });
      },
    });

    this.http.get<any>(`${environment.apiUrl}/ai/guardrail-violations`).subscribe({
      next: (res) => this.violations.set(res?.data || (Array.isArray(res) ? res : [])),
      error: () => this.violations.set([]),
    });

    this.http.get<any>(`${environment.apiUrl}/ai/policies/residency`).subscribe({
      next: (res) => this.residencyRules.set(res?.data || (Array.isArray(res) ? res : [])),
      error: () => this.residencyRules.set([]),
    });
  }

  openDialog(): void {
    this.newPolicy = { name: '', scope: 'global', action: 'warn', priority: 50 };
    this.showDialog = true;
  }

  savePolicy(): void {
    if (!this.newPolicy.name) return;
    this.http.post<any>(`${environment.apiUrl}/ai/policies`, this.newPolicy).subscribe({
      next: (created) => {
        this.policies.update(list => [created, ...list]);
        this.showDialog = false;
        this.msg.add({ severity: 'success', summary: 'Saved', detail: 'Policy created successfully' });
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to create policy' }),
    });
  }
}
