import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { ToolbarModule } from 'primeng/toolbar';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { MessageService } from 'primeng/api';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { GrcOperationsService } from '@app/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audit',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, StatusBadgeComponent,
    TabViewModule, TableModule, CardModule, ButtonModule,
    DialogModule, InputTextModule, InputTextarea,
    ToolbarModule, MessageModule, ToastModule,
    AiPanelComponent, ExportButtonComponent,
  ],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="search"
      [title]="i18n.translate('nav.audit')"
      [subtitle]="i18n.translate('audit.subtitle')"
      [breadcrumbs]="['Dashboard', 'Audit']"
      [loading]="loading">

      <p-toast />

      <p-tabView [(activeIndex)]="tabIndex" (activeIndexChange)="onTabChange($event)">
        <!-- Plans Tab -->
        <p-tabPanel [header]="i18n.translate('audit.plans')">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="start">
              <app-export-button module="audit" [data]="plans" />
            </ng-template>
            <ng-template pTemplate="end">
              <p-button
                [label]="i18n.translate('audit.newPlan')"
                icon="pi pi-plus"
                (onClick)="showPlanDialog = true" />
            </ng-template>
          </p-toolbar>

          <div class="cards-grid">
            <p-card *ngFor="let p of plans" styleClass="plan-card">
              <div class="plan-header">
                <i class="pi pi-file-edit plan-icon"></i>
                <h3 class="plan-title">{{ p.name }}</h3>
              </div>
              <app-status-badge [status]="p.status" />
              <p class="plan-framework">
                <i class="pi pi-sitemap"></i>
                Framework: {{ p.definition?.frameworkId }}
              </p>
            </p-card>
          </div>

          <div *ngIf="plans.length === 0" class="empty-state">
            <i class="pi pi-inbox" style="font-size: var(--font-size-4xl); color: var(--text-muted);"></i>
            <p class="text-muted mt-2">{{ i18n.translate('common.noData') }}</p>
          </div>
        </p-tabPanel>

        <!-- Findings Tab -->
        <p-tabPanel [header]="i18n.translate('audit.findings')">
          <p-table aria-label="Data table"
            [value]="findings"
            [paginator]="true"
            [rows]="10"
            [rowsPerPageOptions]="[5, 10, 25]"
            styleClass="p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="title">{{ i18n.translate('audit.findingTitle') }} <p-sortIcon field="title" /></th>
                <th>{{ i18n.translate('audit.severity') }}</th>
                <th>{{ i18n.translate('common.status') }}</th>
                <th pSortableColumn="created_at">{{ i18n.translate('common.date') }} <p-sortIcon field="created_at" /></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-f>
              <tr>
                <td><strong>{{ f.title }}</strong></td>
                <td><app-status-badge [status]="f.severity" /></td>
                <td><app-status-badge [status]="f.status" /></td>
                <td>{{ f.created_at | appDate:'short' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="4" class="text-center p-4">
                  <i class="pi pi-inbox" style="font-size: var(--font-size-4xl); color: var(--text-muted);"></i>
                  <p class="text-muted mt-2">{{ i18n.translate('common.noData') }}</p>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Evidence Tab -->
        <p-tabPanel [header]="i18n.translate('audit.evidence')">
          <p-toolbar styleClass="mb-3">
            <ng-template pTemplate="end">
              <p-button
                [label]="i18n.translate('audit.verifyChain')"
                icon="pi pi-link"
                (onClick)="verifyChain()" />
            </ng-template>
          </p-toolbar>

          <p-message
            *ngIf="chainStatus && chainStatus.intact"
            severity="success"
            [text]="chainStatus.message + ' — ' + chainStatus.chainLength + ' entries'"
            styleClass="mb-3 chain-message" />
          <p-message
            *ngIf="chainStatus && !chainStatus.intact"
            severity="error"
            [text]="chainStatus.message + ' — ' + chainStatus.chainLength + ' entries'"
            styleClass="mb-3 chain-message" />

          <p-table aria-label="Data table"
            [value]="evidence"
            [paginator]="true"
            [rows]="10"
            [rowsPerPageOptions]="[5, 10, 25]"
            styleClass="p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>#</th>
                <th>{{ i18n.translate('audit.evidenceTitle') }}</th>
                <th>{{ i18n.translate('audit.hash') }}</th>
                <th pSortableColumn="submitted_at">{{ i18n.translate('common.date') }} <p-sortIcon field="submitted_at" /></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-e>
              <tr>
                <td>{{ e.chain_position }}</td>
                <td><strong>{{ e.title }}</strong></td>
                <td><code>{{ e.content_hash?.slice(0, 16) }}...</code></td>
                <td>{{ e.submitted_at | appDate:'short' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="4" class="text-center p-4">
                  <i class="pi pi-inbox" style="font-size: var(--font-size-4xl); color: var(--text-muted);"></i>
                  <p class="text-muted mt-2">{{ i18n.translate('common.noData') }}</p>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Trail Tab -->
        <p-tabPanel [header]="i18n.translate('audit.trail')">
          <p-table aria-label="Data table"
            [value]="trail"
            [paginator]="true"
            [rows]="10"
            [rowsPerPageOptions]="[5, 10, 25]"
            styleClass="p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="timestamp">{{ i18n.translate('common.date') }} <p-sortIcon field="timestamp" /></th>
                <th>{{ i18n.translate('audit.module') }}</th>
                <th>{{ i18n.translate('audit.action') }}</th>
                <th>{{ i18n.translate('audit.entity') }}</th>
                <th>{{ i18n.translate('audit.user') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-t>
              <tr>
                <td>{{ t.timestamp | appDate:'short' }}</td>
                <td>{{ t.module }}</td>
                <td><app-status-badge [status]="t.action" /></td>
                <td>{{ t.entity_type }}</td>
                <td>{{ t.user_id?.slice(0, 8) }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="5" class="text-center p-4">
                  <i class="pi pi-inbox" style="font-size: var(--font-size-4xl); color: var(--text-muted);"></i>
                  <p class="text-muted mt-2">{{ i18n.translate('common.noData') }}</p>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>

      <!-- New Plan Dialog -->
      <p-dialog
        [header]="i18n.translate('audit.newPlan')"
        [(visible)]="showPlanDialog"
        [modal]="true"
        [style]="{ width: '500px' }">
        <div class="dialog-form">
          <div class="field">
            <label for="planName">{{ i18n.translate('audit.planName') }}</label>
            <input id="planName" type="text" pInputText
                   [(ngModel)]="newPlan.name"
                   placeholder="Plan name" aria-label="Plan name"
                   class="w-full" />
          </div>
          <div class="field">
            <label for="frameworkId">{{ i18n.translate('audit.frameworkId') }}</label>
            <input id="frameworkId" type="text" pInputText
                   [(ngModel)]="newPlan.frameworkId"
                   placeholder="Framework ID" aria-label="Framework ID"
                   class="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button
            [label]="i18n.translate('common.cancel')"
            icon="pi pi-times"
            severity="secondary"
            [text]="true"
            (onClick)="showPlanDialog = false" />
          <p-button
            [label]="i18n.translate('common.save')"
            icon="pi pi-check"
            (onClick)="createPlan()"
            [disabled]="!newPlan.name || !newPlan.frameworkId" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
    <app-ai-panel module="audit" />
  `,
  styles: [`
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-md);
    }


    .plan-header {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-bottom: var(--space-sm);
    }
    .plan-icon {
      font-size: var(--font-size-xl);
      color: var(--primary);
    }
    .plan-title {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--text);
      margin: 0;
    }
    .plan-framework {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin: var(--space-sm) 0 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    code {
      font-size: var(--font-size-sm);
      background: var(--surface-sunken);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
    }


    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }
    .field label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-muted);
    }
    .w-full {
      width: 100%;
    }

    .empty-state {
      text-align: center;
      padding: var(--space-2xl);
    }
    .text-muted {
      color: var(--text-muted);
    }
    .text-center {
      text-align: center;
    }
    .mt-2 {
      margin-top: var(--space-sm);
    }
  `],
})
export class AuditComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  private cdr = inject(ChangeDetectorRef);
  tabIndex = 0;
  loading = false;
  plans: GrcRecord[] = [];
  findings: GrcRecord[] = [];
  evidence: GrcRecord[] = [];
  trail: GrcRecord[] = [];
  chainStatus: GrcRecord | null = null;
  showPlanDialog = false;
  newPlan = { name: '', frameworkId: '' };

  constructor(public i18n: I18nService, private messageService: MessageService, private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void {
    this.loading = true;
    this.loadPlans();
    this.loadFindings();
  }

  onTabChange(index: number): void {
    if (index === 2) this.loadEvidence();
    if (index === 3) this.loadTrail();
  }

  loadPlans(): void {
    this.complianceSvc.getAuditPlans().subscribe({
      next: (r) => { this.plans = r.plans || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => {
        this.loading = false; this.cdr.markForCheck();
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadAuditPlans'), life: 4000 });
      }
    });
  }

  loadFindings(): void {
    this.complianceSvc.getAuditFindings().subscribe({
      next: (r) => this.findings = r.findings || [],
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadFindings'), life: 4000 })
    });
  }

  loadEvidence(): void {
    this.complianceSvc.getEvidence().subscribe({
      next: (r) => this.evidence = r.evidence || [],
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadEvidence'), life: 4000 })
    });
  }

  loadTrail(): void {
    this.operationsSvc.getAuditTrail().subscribe({
      next: (r: any) => this.trail = r.entries || r || [],
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadAuditTrail'), life: 4000 })
    });
  }

  createPlan(): void {
    if (!this.newPlan.name || !this.newPlan.frameworkId) return;
    this.complianceSvc.createAuditPlan(this.newPlan as any).subscribe({
      next: () => {
        this.showPlanDialog = false;
        this.newPlan = { name: '', frameworkId: '' };
        this.loadPlans();
        this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.auditPlanCreated'), life: 3000 });
      },
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToCreateAuditPlan'), life: 4000 })
    });
  }

  verifyChain(): void {
    this.complianceSvc.verifyHashChain().subscribe({
      next: r => this.chainStatus = r,
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToVerifyHashChain'), life: 4000 })
    });
  }

}
