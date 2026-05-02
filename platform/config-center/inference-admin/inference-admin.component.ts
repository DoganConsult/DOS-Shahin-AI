import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Subscription } from 'rxjs';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-inference-admin',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    CardModule, TabViewModule, TableModule, TagModule, ButtonModule,
    DialogModule, InputTextModule, InputTextarea, DropdownModule
  ],
  template: `
    <app-page-shell icon="bolt" [title]="i18n.translate('inferenceAdmin.title')"
      [subtitle]="i18n.translate('inferenceAdmin.subtitle')"
      [breadcrumbs]="['Dashboard', 'Inference Admin']" [loading]="loading">

      <div class="grid mb-3">
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ signals.length }}</div><div class="stat-label">{{ i18n.translate('inferenceAdmin.signals') }}</div></div></div>
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ questions.length }}</div><div class="stat-label">{{ i18n.translate('inferenceAdmin.questions') }}</div></div></div>
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ totalRules }}</div><div class="stat-label">{{ i18n.translate('inferenceAdmin.rules') }}</div></div></div>
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ policies.length }}</div><div class="stat-label">{{ i18n.translate('inferenceAdmin.policies') }}</div></div></div>
      </div>

      <p-tabView>
        <!-- Signals Tab -->
        <p-tabPanel [header]="i18n.translate('inferenceAdmin.signals')">
          <div class="mb-3">
            <p-button [label]="i18n.translate('inferenceAdmin.addSignal')" icon="pi pi-plus" (onClick)="openSignalDialog()" />
          </div>
          <p-table aria-label="Signals table" [value]="signals" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('inferenceAdmin.name') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.type') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.source') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.status') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name }}</td>
                <td><p-tag [value]="item.signal_type || item.type || 'metric'" /></td>
                <td>{{ item.source }}</td>
                <td><p-tag [value]="item.status || 'active'" [severity]="item.status === 'inactive' ? 'danger' : 'success'" /></td>
                <td>
                  <p-button icon="pi pi-pencil" [text]="true" severity="info" (onClick)="editSignal(item)" />
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteSignal(item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center p-4">
                <i class="pi pi-inbox" style="font-size:1.5rem; display:block; margin-bottom:8px"></i>
                {{ i18n.translate('inferenceAdmin.noSignals') }}
              </td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Questions Tab -->
        <p-tabPanel [header]="i18n.translate('inferenceAdmin.questions')">
          <div class="mb-3">
            <p-button [label]="i18n.translate('inferenceAdmin.addQuestion')" icon="pi pi-plus" (onClick)="openQuestionDialog()" />
          </div>
          <p-table aria-label="Questions table" [value]="questions" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('inferenceAdmin.question') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.category') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.answerType') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.options') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.question_text || item.text }}</td>
                <td><p-tag [value]="item.category || 'general'" /></td>
                <td>{{ item.answer_type || 'single_choice' }}</td>
                <td>{{ (item.options || []).length }} {{ i18n.translate('inferenceAdmin.options') }}</td>
                <td>
                  <p-button icon="pi pi-pencil" [text]="true" severity="info" (onClick)="editQuestion(item)" />
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteQuestion(item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center p-4">{{ i18n.translate('inferenceAdmin.noQuestions') }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Rules Tab (with sub-views) -->
        <p-tabPanel [header]="i18n.translate('inferenceAdmin.rules')">
          <div class="mb-3 flex gap-2">
            <p-button [label]="i18n.translate('inferenceAdmin.regulatorRules')"
              [outlined]="ruleSubView !== 'regulator'" (onClick)="ruleSubView = 'regulator'" />
            <p-button [label]="i18n.translate('inferenceAdmin.frameworkRules')"
              [outlined]="ruleSubView !== 'framework'" (onClick)="ruleSubView = 'framework'" />
            <p-button [label]="i18n.translate('inferenceAdmin.controlRules')"
              [outlined]="ruleSubView !== 'control'" (onClick)="ruleSubView = 'control'" />
            <span class="flex-grow-1"></span>
            <p-button [label]="i18n.translate('inferenceAdmin.addRule')" icon="pi pi-plus" (onClick)="openRuleDialog()" />
          </div>

          <!-- Regulator Rules -->
          <p-table aria-label="Regulator Rules table" *ngIf="ruleSubView === 'regulator'" [value]="regulatorRules" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('inferenceAdmin.name') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.expression') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.regulator') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.priority') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name }}</td>
                <td><code class="rule-expression">{{ item.expression }}</code></td>
                <td>{{ item.regulator_name || item.regulator_id }}</td>
                <td><p-tag [value]="'' + (item.priority || 0)" [severity]="item.priority > 5 ? 'danger' : item.priority > 3 ? 'warning' : 'info'" /></td>
                <td>
                  <p-button icon="pi pi-pencil" [text]="true" severity="info" (onClick)="editRule(item)" />
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteRule(item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center p-4">{{ i18n.translate('inferenceAdmin.noRegulatorRules') }}</td></tr>
            </ng-template>
          </p-table>

          <!-- Framework Rules -->
          <p-table aria-label="Framework Rules table" *ngIf="ruleSubView === 'framework'" [value]="frameworkRules" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('inferenceAdmin.name') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.expression') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.framework') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.priority') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name }}</td>
                <td><code class="rule-expression">{{ item.expression }}</code></td>
                <td>{{ item.framework_name || item.framework_id }}</td>
                <td><p-tag [value]="'' + (item.priority || 0)" [severity]="item.priority > 5 ? 'danger' : item.priority > 3 ? 'warning' : 'info'" /></td>
                <td>
                  <p-button icon="pi pi-pencil" [text]="true" severity="info" (onClick)="editRule(item)" />
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteRule(item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center p-4">{{ i18n.translate('inferenceAdmin.noFrameworkRules') }}</td></tr>
            </ng-template>
          </p-table>

          <!-- Control Rules -->
          <p-table aria-label="Control Rules table" *ngIf="ruleSubView === 'control'" [value]="controlRules" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('inferenceAdmin.name') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.expression') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.control') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.priority') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name }}</td>
                <td><code class="rule-expression">{{ item.expression }}</code></td>
                <td>{{ item.control_name || item.control_id }}</td>
                <td><p-tag [value]="'' + (item.priority || 0)" [severity]="item.priority > 5 ? 'danger' : item.priority > 3 ? 'warning' : 'info'" /></td>
                <td>
                  <p-button icon="pi pi-pencil" [text]="true" severity="info" (onClick)="editRule(item)" />
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deleteRule(item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center p-4">{{ i18n.translate('inferenceAdmin.noControlRules') }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Policies Tab -->
        <p-tabPanel [header]="i18n.translate('inferenceAdmin.policies')">
          <div class="mb-3">
            <p-button [label]="i18n.translate('inferenceAdmin.addPolicy')" icon="pi pi-plus" (onClick)="openPolicyDialog()" />
          </div>
          <p-table aria-label="Policies table" [value]="policies" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('inferenceAdmin.name') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.description') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.linkedRules') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.status') }}</th>
                <th>{{ i18n.translate('inferenceAdmin.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name }}</td>
                <td>{{ item.description }}</td>
                <td>{{ item.rule_count || (item.rules || []).length }}</td>
                <td><p-tag [value]="item.status || 'active'" [severity]="item.status === 'inactive' ? 'danger' : item.status === 'draft' ? 'warning' : 'success'" /></td>
                <td>
                  <p-button icon="pi pi-pencil" [text]="true" severity="info" (onClick)="editPolicy(item)" />
                  <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="deletePolicy(item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center p-4">{{ i18n.translate('inferenceAdmin.noPolicies') }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>

      <!-- Signal Dialog -->
      <p-dialog [header]="i18n.translate('inferenceAdmin.signalDialog')" [(visible)]="signalDialogVisible" [modal]="true" [style]="{width: '500px'}">
        <div class="flex flex-column gap-3 pt-3">
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.name') }}</label>
            <input pInputText [(ngModel)]="signalForm.name" />
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.type') }}</label>
            <p-dropdown [options]="signalTypes" [(ngModel)]="signalForm.signal_type" optionLabel="label" optionValue="value" />
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.source') }}</label>
            <input pInputText [(ngModel)]="signalForm.source" />
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="signalForm.description" rows="3"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('inferenceAdmin.cancel')" icon="pi pi-times" [text]="true" (onClick)="signalDialogVisible = false" />
          <p-button [label]="i18n.translate('inferenceAdmin.save')" icon="pi pi-check" (onClick)="saveSignal()" />
        </ng-template>
      </p-dialog>

      <!-- Question Dialog -->
      <p-dialog [header]="i18n.translate('inferenceAdmin.questionDialog')" [(visible)]="questionDialogVisible" [modal]="true" [style]="{width: '500px'}">
        <div class="flex flex-column gap-3 pt-3">
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.questionText') }}</label>
            <textarea pInputTextarea [(ngModel)]="questionForm.question_text" rows="3"></textarea>
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.category') }}</label>
            <input pInputText [(ngModel)]="questionForm.category" />
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.answerType') }}</label>
            <p-dropdown [options]="answerTypes" [(ngModel)]="questionForm.answer_type" optionLabel="label" optionValue="value" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('inferenceAdmin.cancel')" icon="pi pi-times" [text]="true" (onClick)="questionDialogVisible = false" />
          <p-button [label]="i18n.translate('inferenceAdmin.save')" icon="pi pi-check" (onClick)="saveQuestion()" />
        </ng-template>
      </p-dialog>

      <!-- Rule Dialog -->
      <p-dialog [header]="i18n.translate('inferenceAdmin.ruleDialog')" [(visible)]="ruleDialogVisible" [modal]="true" [style]="{width: '600px'}">
        <div class="flex flex-column gap-3 pt-3">
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.name') }}</label>
            <input pInputText [(ngModel)]="ruleForm.name" />
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.ruleType') }}</label>
            <p-dropdown [options]="ruleTypes" [(ngModel)]="ruleForm.rule_type" optionLabel="label" optionValue="value" />
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.expression') }}</label>
            <textarea pInputTextarea [(ngModel)]="ruleForm.expression" rows="4" [placeholder]="'e.g. IF signal.score < 50 THEN flag = critical'" [attr.aria-label]="'e.g. IF signal.score < 50 THEN flag = critical'"></textarea>
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.priority') }}</label>
            <input pInputText type="number" [(ngModel)]="ruleForm.priority" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('inferenceAdmin.cancel')" icon="pi pi-times" [text]="true" (onClick)="ruleDialogVisible = false" />
          <p-button [label]="i18n.translate('inferenceAdmin.save')" icon="pi pi-check" (onClick)="saveRule()" />
        </ng-template>
      </p-dialog>

      <!-- Policy Dialog -->
      <p-dialog [header]="i18n.translate('inferenceAdmin.policyDialog')" [(visible)]="policyDialogVisible" [modal]="true" [style]="{width: '500px'}">
        <div class="flex flex-column gap-3 pt-3">
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.name') }}</label>
            <input pInputText [(ngModel)]="policyForm.name" />
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('inferenceAdmin.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="policyForm.description" rows="3"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('inferenceAdmin.cancel')" icon="pi pi-times" [text]="true" (onClick)="policyDialogVisible = false" />
          <p-button [label]="i18n.translate('inferenceAdmin.save')" icon="pi pi-check" (onClick)="savePolicy()" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`
    .stat-box { text-align: center; padding: 1rem; background: var(--surface-card); border-radius: var(--radius-sm); }
    .stat-value { font-size: var(--font-size-2xl); font-weight: var(--font-bold); color: var(--primary-color); }
    .stat-label { font-size: var(--font-size-tag); color: var(--text-color-secondary); }
    .rule-expression { font-size: var(--font-size-caption); background: var(--surface-ground); padding: 2px 6px; border-radius: var(--radius-xs); word-break: break-all; }
  `]
})
export class InferenceAdminComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private subs: Subscription[] = [];
  loading = false;

  signals: Record<string, unknown>[] = [];
  questions: Record<string, unknown>[] = [];
  regulatorRules: Record<string, unknown>[] = [];
  frameworkRules: Record<string, unknown>[] = [];
  controlRules: Record<string, unknown>[] = [];
  policies: Record<string, unknown>[] = [];
  totalRules = 0;

  ruleSubView: 'regulator' | 'framework' | 'control' = 'regulator';

  // Dialog state
  signalDialogVisible = false;
  questionDialogVisible = false;
  ruleDialogVisible = false;
  policyDialogVisible = false;

  signalForm: Record<string, unknown> = {};
  questionForm: Record<string, unknown> = {};
  ruleForm: Record<string, unknown> = {};
  policyForm: Record<string, unknown> = {};

  editingSignal: Record<string, unknown> | null = null;
  editingQuestion: Record<string, unknown> | null = null;
  editingRule: Record<string, unknown> | null = null;
  editingPolicy: Record<string, unknown> | null = null;

  signalTypes = [
    { label: 'Metric', value: 'metric' },
    { label: 'Event', value: 'event' },
    { label: 'Threshold', value: 'threshold' },
    { label: 'Pattern', value: 'pattern' }
  ];

  answerTypes = [
    { label: 'Single Choice', value: 'single_choice' },
    { label: 'Multiple Choice', value: 'multiple_choice' },
    { label: 'Text', value: 'text' },
    { label: 'Numeric', value: 'numeric' },
    { label: 'Boolean', value: 'boolean' }
  ];

  ruleTypes = [
    { label: 'Regulator', value: 'regulator' },
    { label: 'Framework', value: 'framework' },
    { label: 'Control', value: 'control' }
  ];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private loadAll(): void {
    this.loading = true;
    this.subs.push(
      this.apiclientSvc.get('/inference/signals').subscribe({
        next: (d: Record<string, unknown>) => { this.signals = asArray(d, 'signals'); this.loading = false; this.cdr.markForCheck(); },
        error: () => { this.loading = false; this.cdr.markForCheck(); }
      })
    );
    this.subs.push(this.apiclientSvc.get('/inference/questions').subscribe({ next: (d: Record<string, unknown>) => { this.questions = asArray(d, 'questions'); } }));
    this.subs.push(this.apiclientSvc.get('/inference/rules?type=regulator').subscribe({ next: (d: Record<string, unknown>) => { this.regulatorRules = asArray(d, 'rules'); this.updateTotalRules(); } }));
    this.subs.push(this.apiclientSvc.get('/inference/rules?type=framework').subscribe({ next: (d: Record<string, unknown>) => { this.frameworkRules = asArray(d, 'rules'); this.updateTotalRules(); } }));
    this.subs.push(this.apiclientSvc.get('/inference/rules?type=control').subscribe({ next: (d: Record<string, unknown>) => { this.controlRules = asArray(d, 'rules'); this.updateTotalRules(); } }));
    this.subs.push(this.apiclientSvc.get('/inference/policies').subscribe({ next: (d: Record<string, unknown>) => { this.policies = asArray(d, 'policies'); } }));
  }

  private updateTotalRules(): void {
    this.totalRules = this.regulatorRules.length + this.frameworkRules.length + this.controlRules.length;
  }

  // Signal CRUD
  openSignalDialog(): void { this.editingSignal = null; this.signalForm = {}; this.signalDialogVisible = true; }
  editSignal(item: Record<string, unknown>): void { this.editingSignal = item; this.signalForm = { ...item }; this.signalDialogVisible = true; }
  saveSignal(): void {
    const obs = this.editingSignal
      ? this.apiclientSvc.put(`/inference/signals/${this.editingSignal.id}`, this.signalForm)
      : this.apiclientSvc.post('/inference/signals', this.signalForm);
    obs.subscribe({ next: () => { this.signalDialogVisible = false; this.loadAll(); } });
  }
  deleteSignal(item: Record<string, unknown>): void { this.apiclientSvc.del(`/inference/signals/${item.id}`).subscribe({ next: () => this.loadAll() }); }

  // Question CRUD
  openQuestionDialog(): void { this.editingQuestion = null; this.questionForm = {}; this.questionDialogVisible = true; }
  editQuestion(item: Record<string, unknown>): void { this.editingQuestion = item; this.questionForm = { ...item }; this.questionDialogVisible = true; }
  saveQuestion(): void {
    const obs = this.editingQuestion
      ? this.apiclientSvc.put(`/inference/questions/${this.editingQuestion.id}`, this.questionForm)
      : this.apiclientSvc.post('/inference/questions', this.questionForm);
    obs.subscribe({ next: () => { this.questionDialogVisible = false; this.loadAll(); } });
  }
  deleteQuestion(item: Record<string, unknown>): void { this.apiclientSvc.del(`/inference/questions/${item.id}`).subscribe({ next: () => this.loadAll() }); }

  // Rule CRUD
  openRuleDialog(): void { this.editingRule = null; this.ruleForm = { rule_type: this.ruleSubView }; this.ruleDialogVisible = true; }
  editRule(item: Record<string, unknown>): void { this.editingRule = item; this.ruleForm = { ...item }; this.ruleDialogVisible = true; }
  saveRule(): void {
    const obs = this.editingRule
      ? this.apiclientSvc.put(`/inference/rules/${this.editingRule.id}`, this.ruleForm)
      : this.apiclientSvc.post('/inference/rules', this.ruleForm);
    obs.subscribe({ next: () => { this.ruleDialogVisible = false; this.loadAll(); } });
  }
  deleteRule(item: Record<string, unknown>): void { this.apiclientSvc.del(`/inference/rules/${item.id}`).subscribe({ next: () => this.loadAll() }); }

  // Policy CRUD
  openPolicyDialog(): void { this.editingPolicy = null; this.policyForm = {}; this.policyDialogVisible = true; }
  editPolicy(item: Record<string, unknown>): void { this.editingPolicy = item; this.policyForm = { ...item }; this.policyDialogVisible = true; }
  savePolicy(): void {
    const obs = this.editingPolicy
      ? this.apiclientSvc.put(`/inference/policies/${this.editingPolicy.id}`, this.policyForm)
      : this.apiclientSvc.post('/inference/policies', this.policyForm);
    obs.subscribe({ next: () => { this.policyDialogVisible = false; this.loadAll(); } });
  }
  deletePolicy(item: Record<string, unknown>): void { this.apiclientSvc.del(`/inference/policies/${item.id}`).subscribe({ next: () => this.loadAll() }); }
}
