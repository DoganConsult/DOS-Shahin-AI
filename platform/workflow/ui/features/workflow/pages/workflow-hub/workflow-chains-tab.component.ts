import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/select';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { ToastService } from '@app/dos/shell/toast.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-chains-tab',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, TagModule, ButtonModule, DialogModule, CardModule, InputTextModule, InputNumberModule, DropdownModule, InputSwitchModule, TooltipModule, AppDatePipe, ConfirmDialogModule],
    providers: [ConfirmationService],
    styles: [`
    .chains-container{padding:20px 28px}
    .section-title{font-size:var(--font-size-lg);font-weight:600;margin-bottom:16px;color:var(--text-heading,#111)}
    .step-list{list-style:none;padding:0;margin:0}
    .step-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-left:3px solid var(--primary-300);margin-bottom:4px;background:var(--surface-50)}
    .step-no{font-weight:700;color:var(--primary-700);min-width:24px}
    .step-module{font-weight:500}
    .step-task{color:var(--text-muted);font-size:var(--font-size-sm)}
    .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
    .detail-label{font-size:var(--font-size-sm);color:var(--text-muted);margin-bottom:2px}
    .detail-value{font-weight:500}
    .section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .m-0{margin:0}
    .flex-row{display:flex;gap:8px}
    .section-subtitle{font-size:var(--font-size-base)}
    .col-actions{width:120px}
    .nowrap{white-space:nowrap}
    .empty-cell{text-align:center;padding:20px;color:var(--text-muted)}
    .mt-24{margin-top:24px}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
    .form-label{display:block;margin-bottom:4px;font-weight:500}
    .form-label-xs{display:block;margin-bottom:4px;font-size:var(--font-size-xs)}
    .w-full{width:100%}
    .mt-8{margin-top:8px}
    .mb-16{margin-bottom:16px}
    .steps-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .fw-500{font-weight:500}
    .steps-list{display:flex;flex-direction:column;gap:8px}
    .step-card{border:1px solid var(--surface-border);border-radius:var(--radius);padding:12px;background:var(--surface-50)}
    .step-grid{display:grid;grid-template-columns:80px 1fr 1fr 100px auto;gap:8px;align-items:end}
    .form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
  `],
    template: `
    <div class="chains-container">
      <div class="section-header">
        <h2 class="section-title m-0">{{ i18n.currentLang()==='ar' ? 'سلاسل سير العمل' : 'Workflow Chains' }}</h2>
        <div class="flex-row">
          <button pButton size="small" icon="pi pi-plus" [label]="i18n.currentLang()==='ar' ? 'سلسلة جديدة' : 'New Chain'" (click)="newChain()" class="p-button-primary"></button>
          <button pButton size="small" icon="pi pi-refresh" [label]="i18n.currentLang()==='ar' ? 'تحديث' : 'Refresh'" (click)="loadDefinitions()" class="p-button-outlined"></button>
        </div>
      </div>

      <h3 class="section-title section-subtitle">{{ i18n.currentLang()==='ar' ? 'التعريفات' : 'Definitions' }}</h3>
      <p-table [value]="definitions()" [rows]="10" [paginator]="definitions().length > 10" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.currentLang()==='ar' ? 'الرمز' : 'Code' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'الاسم' : 'Name' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'الخطوات' : 'Steps' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'نشط' : 'Active' }}</th>
            <th class="col-actions"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-d>
          <tr>
            <td><code>{{d.chain_code}}</code></td>
            <td>{{d.name_en}}</td>
            <td>{{d.steps?.length || 0}}</td>
            <td><p-tag [value]="d.is_active ? 'Active' : 'Inactive'" [severity]="d.is_active ? 'success' : 'warning'" /></td>
            <td class="nowrap">
              <button pButton icon="pi pi-eye" class="p-button-text p-button-sm" [pTooltip]="i18n.currentLang()==='ar' ? 'عرض' : 'View'" (click)="viewDefinition(d)"></button>
              <button pButton icon="pi pi-pencil" class="p-button-text p-button-sm" [pTooltip]="i18n.currentLang()==='ar' ? 'تعديل' : 'Edit'" (click)="editDefinition(d)"></button>
              <button pButton icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger" [pTooltip]="i18n.currentLang()==='ar' ? 'حذف' : 'Delete'" (click)="deleteDefinition(d)"></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="empty-cell">{{ i18n.currentLang()==='ar' ? 'لا توجد سلاسل' : 'No chain definitions found' }}</td></tr></ng-template>
      </p-table>

      <h3 class="section-title section-subtitle mt-24">{{ i18n.currentLang()==='ar' ? 'المثيلات' : 'Instances' }}</h3>
      <p-table [value]="instances()" [rows]="10" [paginator]="instances().length > 10" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.currentLang()==='ar' ? 'السلسلة' : 'Chain' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'الحالة' : 'Status' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'الخطوة الحالية' : 'Current Step' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'الكيان' : 'Entity' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'بدأ في' : 'Started' }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-inst>
          <tr>
            <td><code>{{inst.chain_code}}</code></td>
            <td><p-tag [value]="inst.status" [severity]="inst.status==='active' ? 'info' : inst.status==='completed' ? 'success' : 'danger'" /></td>
            <td>{{inst.current_step}}</td>
            <td>{{inst.trigger_entity_type}} / {{inst.trigger_entity_id | slice:0:8}}</td>
            <td>{{inst.started_at | appDate}}</td>
            <td><button pButton icon="pi pi-list" class="p-button-text p-button-sm" (click)="viewInstance(inst)"></button></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="empty-cell">{{ i18n.currentLang()==='ar' ? 'لا توجد مثيلات' : 'No chain instances' }}</td></tr></ng-template>
      </p-table>

      <p-dialog [header]="selectedDef()?.name_en || 'Chain Definition'" [(visible)]="showDefDialog" [style]="{width:'600px'}" [modal]="true">
        @if (selectedDef(); as d) {
          <div class="detail-grid">
            <div><div class="detail-label">Code</div><div class="detail-value">{{d.chain_code}}</div></div>
            <div><div class="detail-label">Active</div><div class="detail-value">{{d.is_active ? 'Yes' : 'No'}}</div></div>
          </div>
          <h4>Steps</h4>
          <ul class="step-list">
            @for (s of d.steps; track s.step_no) {
              <li class="step-item">
                <span class="step-no">#{{s.step_no}}</span>
                <span class="step-module">{{s.module_code}}</span>
                <span class="step-task">{{s.task_type || s.name_en}}</span>
                @if (s.sla_hours) { <p-tag value="SLA: {{s.sla_hours}}h" severity="warning" /> }
              </li>
            }
          </ul>
        }
      </p-dialog>

      <p-dialog [header]="'Instance: ' + (selectedInst()?.instance_id | slice:0:8)" [(visible)]="showInstDialog" [style]="{width:'600px'}" [modal]="true">
        @if (selectedInst(); as inst) {
          <div class="detail-grid">
            <div><div class="detail-label">Chain</div><div class="detail-value">{{inst.chain_code}}</div></div>
            <div><div class="detail-label">Status</div><div class="detail-value"><p-tag [value]="inst.status" /></div></div>
            <div><div class="detail-label">Current Step</div><div class="detail-value">{{inst.current_step}}</div></div>
            <div><div class="detail-label">Started</div><div class="detail-value">{{inst.started_at | appDate}}</div></div>
          </div>
          <h4>Step Log</h4>
          <p-table [value]="stepLog()" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>#</th><th>Module</th><th>Status</th><th>Started</th><th>Completed</th></tr></ng-template>
            <ng-template pTemplate="body" let-s>
              <tr>
                <td>{{s.step_no}}</td>
                <td>{{s.module_code}}</td>
                <td><p-tag [value]="s.status" [severity]="s.status==='completed' ? 'success' : s.status==='failed' ? 'danger' : 'info'" /></td>
                <td>{{s.started_at | appDate}}</td>
                <td>{{s.completed_at | appDate}}</td>
              </tr>
            </ng-template>
          </p-table>
        }
      </p-dialog>

      <p-dialog [header]="(editingChain() ? (i18n.currentLang()==='ar' ? 'تعديل السلسلة' : 'Edit Chain') : (i18n.currentLang()==='ar' ? 'سلسلة جديدة' : 'New Chain'))" [(visible)]="showChainFormDialog" [style]="{width:'700px'}" [modal]="true" [closable]="true">
        @if (chainForm(); as form) {
          <form [formGroup]="form" (ngSubmit)="saveChain()">
            <div class="form-grid">
              <div>
                <label class="form-label">{{ i18n.currentLang()==='ar' ? 'رمز السلسلة' : 'Chain Code' }} *</label>
                <input pInputText formControlName="chain_code" [readonly]="editingChain()" class="w-full" />
              </div>
              <div>
                <label class="form-label">{{ i18n.currentLang()==='ar' ? 'نشط' : 'Active' }}</label>
                <p-inputSwitch formControlName="is_active" class="mt-8"></p-inputSwitch>
              </div>
            </div>
            <div class="mb-16">
              <label class="form-label">{{ i18n.currentLang()==='ar' ? 'الاسم (EN)' : 'Name (EN)' }} *</label>
              <input pInputText formControlName="name_en" class="w-full" />
            </div>
            <div class="mb-16">
              <label class="form-label">{{ i18n.currentLang()==='ar' ? 'الاسم (AR)' : 'Name (AR)' }}</label>
              <input pInputText formControlName="name_ar" class="w-full" />
            </div>
            <div class="mb-16">
              <div class="steps-header">
                <label class="fw-500">{{ i18n.currentLang()==='ar' ? 'الخطوات' : 'Steps' }} *</label>
                <button pButton type="button" icon="pi pi-plus" label="Add Step" size="small" (click)="addStep()" class="p-button-outlined p-button-sm"></button>
              </div>
              <div formArrayName="steps" class="steps-list">
                @for (step of getStepsArray().controls; track $index; let i = $index) {
                  <div [formGroupName]="i" class="step-card">
                    <div class="step-grid">
                      <div>
                        <label class="form-label-xs">#</label>
                        <input pInputText formControlName="step_no" type="number" class="w-full" />
                      </div>
                      <div>
                        <label class="form-label-xs">{{ i18n.currentLang()==='ar' ? 'الوحدة' : 'Module' }}</label>
                        <p-dropdown formControlName="module_code" [options]="moduleOptions()" optionLabel="label" optionValue="value" class="w-full"></p-dropdown>
                      </div>
                      <div>
                        <label class="form-label-xs">{{ i18n.currentLang()==='ar' ? 'نوع المهمة' : 'Task Type' }}</label>
                        <input pInputText formControlName="task_type" class="w-full" />
                      </div>
                      <div>
                        <label class="form-label-xs">{{ i18n.currentLang()==='ar' ? 'SLA (ساعات)' : 'SLA (hrs)' }}</label>
                        <p-inputNumber formControlName="sla_hours" [showButtons]="false" [min]="0" class="w-full"></p-inputNumber>
                      </div>
                      <button pButton type="button" icon="pi pi-trash" class="p-button-text p-button-danger p-button-sm" (click)="removeStep(i)"></button>
                    </div>
                    <div class="mt-8">
                      <label class="form-label-xs">{{ i18n.currentLang()==='ar' ? 'الاسم' : 'Name' }}</label>
                      <input pInputText formControlName="name_en" class="w-full" />
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="form-actions">
              <button pButton type="button" [label]="i18n.currentLang()==='ar' ? 'إلغاء' : 'Cancel'" (click)="showChainFormDialog = false" class="p-button-outlined"></button>
              <button pButton type="submit" [label]="i18n.currentLang()==='ar' ? 'حفظ' : 'Save'" [disabled]="form.invalid || saving()" [loading]="saving()"></button>
            </div>
          </form>
        }
      </p-dialog>
    </div>
    <p-confirmDialog />`
})
export class WorkflowChainsTabComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  private api = environment.apiUrl;

  definitions = signal<GrcRecord[]>([]);
  instances = signal<GrcRecord[]>([]);
  selectedDef = signal<GrcRecord | null>(null);
  selectedInst = signal<GrcRecord | null>(null);
  stepLog = signal<GrcRecord[]>([]);
  showDefDialog = false;
  showInstDialog = false;
  showChainFormDialog = false;
  editingChain = signal<boolean>(false);
  saving = signal<boolean>(false);
  chainForm = signal<FormGroup | null>(null);

  moduleOptions = signal<Array<{ label: string; value: string }>>([
    { label: 'Risk', value: 'risk' },
    { label: 'Compliance', value: 'compliance' },
    { label: 'Governance', value: 'governance' },
    { label: 'Evidence', value: 'evidence' },
    { label: 'Audit', value: 'audit' },
    { label: 'Policy', value: 'policy' },
    { label: 'Vendor', value: 'vendor' },
    { label: 'Incident', value: 'incident' },
    { label: 'BCP', value: 'bcp' },
    { label: 'Asset', value: 'asset' },
  ]);

  ngOnInit() { this.loadDefinitions(); this.loadInstances(); }

  loadDefinitions() {
    this.http.get<any>(`${this.api}/workflow-chains/definitions`).subscribe({
      next: r => this.definitions.set(r.chains || []),
      error: () => this.definitions.set([]),
    });
  }

  loadInstances() {
    this.http.get<any>(`${this.api}/workflow-chains/instances`).subscribe({
      next: r => this.instances.set(r.instances || []),
      error: () => this.instances.set([]),
    });
  }

  viewDefinition(d: GrcRecord) { this.selectedDef.set(d); this.showDefDialog = true; }

  viewInstance(inst: GrcRecord) {
    this.selectedInst.set(inst);
    this.showInstDialog = true;
    this.http.get<any>(`${this.api}/workflow-chains/instances/${inst.instance_id}`).subscribe({
      next: r => this.stepLog.set(r.steps || []),
      error: () => this.stepLog.set([]),
    });
  }

  newChain() {
    this.editingChain.set(false);
    const form = this.fb.group({
      chain_code: ['', Validators.required],
      name_en: ['', Validators.required],
      name_ar: [''],
      is_active: [true],
      steps: this.fb.array([]),
    });
    this.chainForm.set(form);
    this.showChainFormDialog = true;
  }

  editDefinition(d: GrcRecord) {
    this.editingChain.set(true);
    const form = this.fb.group({
      chain_code: [d.chain_code, Validators.required],
      name_en: [d.name_en, Validators.required],
      name_ar: [d.name_ar || ''],
      is_active: [d.is_active ?? true],
      steps: this.fb.array([]),
    });
    const stepsArray = form.get('steps') as FormArray;
    (d.steps || []).forEach((step) => {
      stepsArray.push(this.fb.group({
        step_no: [step.step_no, Validators.required],
        module_code: [step.module_code, Validators.required],
        task_type: [step.task_type || ''],
        name_en: [step.name_en || ''],
        sla_hours: [step.sla_hours || null],
      }));
    });
    this.chainForm.set(form);
    this.showChainFormDialog = true;
  }

  getStepsArray(): FormArray {
    return this.chainForm()?.get('steps') as FormArray;
  }

  addStep() {
    const stepsArray = this.getStepsArray();
    const nextStepNo = stepsArray.length + 1;
    stepsArray.push(this.fb.group({
      step_no: [nextStepNo, Validators.required],
      module_code: ['', Validators.required],
      task_type: [''],
      name_en: [''],
      sla_hours: [null],
    }));
  }

  removeStep(index: number) {
    const stepsArray = this.getStepsArray();
    stepsArray.removeAt(index);
    // Renumber steps
    stepsArray.controls.forEach((ctrl, i) => {
      ctrl.patchValue({ step_no: i + 1 });
    });
  }

  saveChain() {
    const form = this.chainForm();
    if (!form || form.invalid) return;

    this.saving.set(true);
    const value = form.value;
    const payload = {
      chain_code: value.chain_code,
      name_en: value.name_en,
      name_ar: value.name_ar || null,
      is_active: value.is_active ?? true,
      steps: value.steps.map((s) => ({
        step_no: s.step_no,
        module_code: s.module_code,
        task_type: s.task_type || 'generic',
        name_en: s.name_en || `${s.module_code} step ${s.step_no}`,
        sla_hours: s.sla_hours || null,
      })),
      sod_rules: [],
    };

    this.http.post<any>(`${this.api}/workflow-chains/definitions`, payload).subscribe({
      next: () => {
        this.toast.success(this.i18n.currentLang() === 'ar' ? 'تم الحفظ بنجاح' : 'Chain saved successfully');
        this.showChainFormDialog = false;
        this.loadDefinitions();
        this.saving.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.error || (this.i18n.currentLang() === 'ar' ? 'فشل الحفظ' : 'Failed to save chain'));
        this.saving.set(false);
      },
    });
  }

  deleteDefinition(d: GrcRecord) {
    const isAr = this.i18n.currentLang() === 'ar';
    this.confirmationService.confirm({
      message: isAr ? `هل أنت متأكد من حذف السلسلة "${d.name_en}"؟` : `Are you sure you want to delete chain "${d.name_en}"?`,
      header: isAr ? 'تأكيد الحذف' : 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Deactivate by setting is_active to false (soft delete)
        const payload = {
          chain_code: d.chain_code,
          name_en: d.name_en,
          name_ar: d.name_ar || null,
          steps: d.steps || [],
          sod_rules: d.sod_rules || [],
          is_active: false,
        };
        this.http.post<any>(`${this.api}/workflow-chains/definitions`, payload).subscribe({
          next: () => {
            this.toast.success(isAr ? 'تم حذف السلسلة' : 'Chain deleted successfully');
            this.loadDefinitions();
          },
          error: (err) => {
            this.toast.error(err.error?.error || (isAr ? 'فشل الحذف' : 'Failed to delete chain'));
          },
        });
      },
    });
  }
}
