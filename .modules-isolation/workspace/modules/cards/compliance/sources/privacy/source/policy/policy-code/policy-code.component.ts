import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcLiveService } from '../../core/interceptors/grc-live.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { AiPanelComponent } from '../../shared/ai-panel/ai-panel.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextarea } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-policy-code',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, CardModule, ButtonModule, TagModule, InputTextarea, InputTextModule, TabViewModule, TableModule, AiPanelComponent, DropdownModule, ToastModule],
  providers: [MessageService],
  template: `
    <app-page-shell icon="code" [title]="'Policy-as-Code'"
      [subtitle]="'Define, validate, import/export, and execute policy rules'"
      [breadcrumbs]="['Dashboard', 'Policy-as-Code']" [loading]="loading">
      <p-toast />
      <p-tabView>
        <p-tabPanel header="Rule Editor">
          <p-card header="Validate Rule">
            <textarea pInputTextarea [(ngModel)]="ruleJson" rows="8" class="w-full font-mono" placeholder='{"field":"status","operator":"equals","value":"active"}'></textarea>
            <div class="flex gap-2 mt-3">
              <p-button label="Validate" icon="pi pi-check" (onClick)="validateRule()" />
            </div>
            <div *ngIf="validationResult" class="mt-3 p-3 border-round" [ngClass]="validationResult.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
              {{ validationResult.valid ? (i18n.translate('common.ruleIsValid')) : (i18n.translate('common.invalid') + ': ' + (validationResult.errors || []).join(', ')) }}
            </div>
          </p-card>
        </p-tabPanel>
        <p-tabPanel header="Import / Export">
          <div class="grid">
            <div class="col-6">
              <p-card header="Import Rules (JSON)">
                <textarea pInputTextarea [(ngModel)]="importJson" rows="6" class="w-full font-mono" placeholder="Paste JSON rules here" aria-label="Paste JSON rules here"></textarea>
                <p-button label="Import" icon="pi pi-upload" class="mt-2" (onClick)="importRules()" />
                <div *ngIf="importResult" class="mt-2 p-2 surface-ground border-round">
                  Imported {{ importResult.length }} rules
                </div>
              </p-card>
            </div>
            <div class="col-6">
              <p-card header="Export Rules">
                <p-dropdown [options]="policyOptions" [(ngModel)]="exportPolicyId"
                  [placeholder]="i18n.translate('policyCode.selectPolicyExport')"
                  optionLabel="label" optionValue="value" [filter]="true" [showClear]="true"
                  styleClass="w-full" [style]="{'min-width':'250px'}" />
                <p-button label="Export" icon="pi pi-download" class="mt-2" (onClick)="exportRules()" />
                <div *ngIf="exportResult" class="mt-2 p-2 surface-ground border-round font-mono text-sm" style="max-height:200px;overflow:auto">{{ exportResult }}</div>
              </p-card>
            </div>
          </div>
        </p-tabPanel>
        <p-tabPanel header="Policy Rules">
          <div class="flex gap-2 mb-3">
            <p-dropdown [options]="policyOptions" [(ngModel)]="policyId"
              [placeholder]="i18n.translate('policyCode.selectPolicy')"
              optionLabel="label" optionValue="value" [filter]="true" [showClear]="true"
              styleClass="w-full" [style]="{'min-width':'250px'}" />
            <p-button label="Load Rules" icon="pi pi-search" (onClick)="loadPolicyRules()" />
          </div>
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Policy Rules table" [value]="policyRules" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>Field</th><th>Operator</th><th>Value</th><th>Action</th></tr></ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td>{{ r.field }}</td>
                <td><p-tag [value]="r.operator" /></td>
                <td>{{ r.value }}</td>
                <td>{{ r.action || '-' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No rules loaded</td></tr></ng-template>
          </p-table>
        </p-tabPanel>
        <p-tabPanel header="Execute">
          <p-card header="Execute Policy Rules">
            <div class="flex flex-column gap-3">
              <p-dropdown [options]="policyOptions" [(ngModel)]="execPolicyId"
                [placeholder]="i18n.translate('policyCode.selectPolicy')"
                optionLabel="label" optionValue="value" [filter]="true" [showClear]="true"
                styleClass="w-full" [style]="{'min-width':'250px'}" />
              <textarea pInputTextarea [(ngModel)]="execContext" rows="5" class="w-full font-mono" placeholder='{"status":"active","severity":"high"}'></textarea>
              <p-button label="Execute" icon="pi pi-play" (onClick)="executeRules()" />
            </div>
            <div *ngIf="execResult" class="mt-3 p-3 surface-ground border-round">
              <pre class="text-sm">{{ execResult | json }}</pre>
            </div>
          </p-card>
        </p-tabPanel>
      </p-tabView>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">Retry</button>
      </div>
    </app-page-shell>
    <app-ai-panel module="policy" />
  `,
  styles: [`
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `]
})
export class PolicyCodeComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  loading = false;
  error = '';
  ruleJson = '';
  validationResult: Record<string, unknown> | null = null;
  importJson = '';
  importResult: Record<string, unknown> | null = null;
  exportPolicyId = '';
  exportResult = '';
  policyId = '';
  policyRules: Record<string, unknown>[] = [];
  execPolicyId = '';
  execContext = '';
  execResult: Record<string, unknown> | null = null;

  policies: Record<string, unknown>[] = [];
  policyOptions: { label: string; value: string }[] = [];

  private live = inject(GrcLiveService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private messageService = inject(MessageService);

  constructor(public i18n: I18nService, private governanceSvc: GrcGovernanceService) {}

  ngOnInit() {
    this.loading = true;
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadPolicies());
    this.loadPolicies();
  }

  loadPolicies() {
    this.governanceSvc.getGovernancePolicies().subscribe({
      next: (res: Record<string, unknown>) => {
        const list = res?.policies ?? (Array.isArray(res) ? res : []);
        this.policies = list;
        this.policyOptions = list.map((p: any) => ({
          label: p.title ?? p.name ?? p.policy_code ?? 'Untitled',
          value: p.id ?? p.policy_id ?? p.policy_code
        }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadPolicies') });
      }
    });
  }

  validateRule() {
    try {
      const rule = JSON.parse(this.ruleJson);
      const errors: string[] = [];
      if (!rule.field) errors.push('Missing "field"');
      if (!rule.operator) errors.push('Missing "operator"');
      if (rule.value === undefined && rule.value !== null) errors.push('Missing "value"');
      if (errors.length > 0) {
        this.validationResult = { valid: false, errors };
        this.messageService.add({ severity: 'warn', summary: this.i18n.translate('common.validation'), detail: errors.join(', ') });
      } else {
        this.validationResult = { valid: true, errors: [] };
        this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.validation'), detail: this.i18n.translate('common.ruleIsValid') });
      }
    } catch {
      this.validationResult = { valid: false, errors: ['Invalid JSON'] };
      this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.validation'), detail: this.i18n.translate('common.invalidJsonFormat') });
    }
  }

  importRules() {
    try {
      const parsed = JSON.parse(this.importJson);
      const rules = Array.isArray(parsed) ? parsed : [parsed];
      let imported = 0;
      let failed = 0;
      const results: Record<string, unknown>[] = [];

      rules.forEach((rule: any) => {
        const policyData = {
          title: rule.title ?? rule.name ?? `Imported Rule: ${rule.field ?? 'any'}`,
          description: rule.description ?? `Auto-imported policy rule: ${JSON.stringify(rule)}`,
          status: rule.status ?? 'draft',
          rules: rule.rules ?? [rule]
        };
        this.apiclientSvc.post('/policies', policyData).subscribe({
          next: (d: Record<string, unknown>) => {
            imported++;
            results.push(d);
            if (imported + failed === rules.length) {
              this.importResult = results;
              this.loadPolicies();
              this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.importedRulesSuccessfully', { count: String(imported) }) });
            }
          },
          error: () => {
            failed++;
            if (imported + failed === rules.length) {
              this.importResult = results;
              if (imported > 0) this.loadPolicies();
              this.messageService.add({
                severity: failed === rules.length ? 'error' : 'warn',
                summary: this.i18n.translate('common.error'),
                detail: this.i18n.translate('common.importedFailedCount', { imported: String(imported), failed: String(failed) })
              });
            }
          }
        });
      });
    } catch {
      this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.invalidJsonInput') });
    }
  }

  exportRules() {
    if (!this.exportPolicyId) {
      this.messageService.add({ severity: 'warn', summary: this.i18n.translate('common.warning'), detail: this.i18n.translate('common.pleaseSelectPolicyToExport') });
      return;
    }
    const policy = this.policies.find(
      (p: any) => (p.id ?? p.policy_id ?? p.policy_code) === this.exportPolicyId
    );
    if (policy) {
      const exportData = {
        title: policy.title ?? policy.name,
        rules: policy.rules ?? [],
        exported_at: new Date().toISOString()
      };
      this.exportResult = JSON.stringify(exportData, null, 2);
      this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.policyRulesExportedSuccessfully') });
    } else {
      this.apiclientSvc.get('/policies/' + this.exportPolicyId).pipe(
        catchError(() => {
          this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToFetchPolicyForExport') });
          return of(null);
        })
      ).subscribe((d: Record<string, unknown>) => {
        if (d) {
          const exportData = {
            title: d.title ?? d.name,
            rules: d.rules ?? [],
            exported_at: new Date().toISOString()
          };
          this.exportResult = JSON.stringify(exportData, null, 2);
          this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.policyRulesExportedSuccessfully') });
        }
      });
    }
  }

  loadPolicyRules() {
    if (!this.policyId) {
      this.messageService.add({ severity: 'warn', summary: this.i18n.translate('common.warning'), detail: this.i18n.translate('common.pleaseSelectPolicy') });
      return;
    }
    this.apiclientSvc.get('/policies/' + this.policyId).subscribe({
      next: (d: Record<string, unknown>) => {
        this.policyRules = d?.rules ?? d?.policy?.rules ?? [];
        if (this.policyRules.length === 0) {
          this.messageService.add({ severity: 'info', summary: this.i18n.translate('common.info'), detail: this.i18n.translate('common.noRulesFoundForPolicy') });
        } else {
          this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.loadedRulesCount', { count: String(this.policyRules.length) }) });
        }
      },
      error: () => {
        this.policyRules = [];
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadPolicyRules') });
      }
    });
  }

  executeRules() {
    if (!this.execPolicyId) {
      this.messageService.add({ severity: 'warn', summary: this.i18n.translate('common.warning'), detail: this.i18n.translate('common.pleaseSelectPolicy') });
      return;
    }
    try {
      const context = JSON.parse(this.execContext);
      this.apiclientSvc.post('/policies/' + this.execPolicyId + '/evaluate', { context }).pipe(
        catchError(() => {
          this.messageService.add({ severity: 'warn', summary: this.i18n.translate('common.warning'), detail: this.i18n.translate('common.policyEvaluationNotAvailable') });
          // Client-side fallback: match context against loaded policy rules
          const policy = this.policies.find(
            (p: any) => (p.id ?? p.policy_id ?? p.policy_code) === this.execPolicyId
          );
          const rules = policy?.rules ?? [];
          const results = rules.map((rule: any) => {
            const contextValue = context[rule.field];
            let match = false;
            switch (rule.operator) {
              case 'equals': match = contextValue === rule.value; break;
              case 'not_equals': match = contextValue !== rule.value; break;
              case 'contains': match = String(contextValue ?? '').includes(String(rule.value)); break;
              case 'greater_than': match = Number(contextValue) > Number(rule.value); break;
              case 'less_than': match = Number(contextValue) < Number(rule.value); break;
              default: match = contextValue === rule.value;
            }
            return { field: rule.field, operator: rule.operator, expected: rule.value, actual: contextValue, match };
          });
          return of({ evaluated: true, clientSide: true, results, matchCount: results.filter((r: Record<string, unknown>) => r.match).length, totalRules: results.length });
        })
      ).subscribe({
        next: (d: Record<string, unknown>) => {
          this.execResult = d;
          this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.policyEvaluationComplete') });
        }
      });
    } catch {
      this.execResult = { error: 'Invalid JSON context' };
      this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.invalidJsonContext') });
    }
  }
}
