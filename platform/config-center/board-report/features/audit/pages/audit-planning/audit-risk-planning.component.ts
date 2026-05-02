import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AuditApiService } from '../../services/audit-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-risk-planning',
    imports: [CommonModule, AppDatePipe, AppNumberPipe, FormsModule, PageShellComponent, StatusBadgeComponent,
        ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule,
        DropdownModule, CalendarModule, TagModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="chart-bar"
      [title]="i18n.translate('audit.riskbasedPlanning')"
      [subtitle]="i18n.translate('audit.rankedEntitiesByWeightedRiskScore')"
      [loading]="loading()">
      <p-toast />

      <!-- Health Strip -->
      <div class="health-strip">
        <div class="health-card"><span class="health-value">{{ items().length }}</span><span class="health-label">{{ i18n.translate('audit.totalEntities') }}</span></div>
        <div class="health-card"><span class="health-value high">{{ highRiskCount }}</span><span class="health-label">{{ i18n.translate('audit.highRisk') }}</span></div>
        <div class="health-card"><span class="health-value medium">{{ mediumRiskCount }}</span><span class="health-label">{{ i18n.translate('audit.mediumRisk') }}</span></div>
        <div class="health-card"><span class="health-value low">{{ lowRiskCount }}</span><span class="health-label">{{ i18n.translate('audit.lowRisk') }}</span></div>
      </div>

      <!-- Cross-module navigation links -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="router.navigate(['/risk/register'])"><i class="pi pi-shield"></i> {{ i18n.translate('audit.riskRegister') || 'Risk Register' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/universe'])"><i class="pi pi-globe"></i> {{ i18n.translate('audit.auditUniverse') || 'Audit Universe' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/risk/heatmap'])"><i class="pi pi-th-large"></i> {{ i18n.translate('audit.riskHeatmap') || 'Risk Heatmap' }}</button>
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <span class="text-muted" style="font-size: var(--font-size-sm)">{{ i18n.translate('audit.autorankedByWeightedScoreDescending') }}</span>
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="items()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="entity_name">{{ i18n.translate('audit.entityName') }} <p-sortIcon field="entity_name" /></th>
            <th>{{ i18n.translate('audit.entityType') }}</th>
            <th pSortableColumn="weighted_score">{{ i18n.translate('audit.weightedScore') }} <p-sortIcon field="weighted_score" /></th>
            <th pSortableColumn="inherent_risk">{{ i18n.translate('audit.inherentRisk') }} <p-sortIcon field="inherent_risk" /></th>
            <th pSortableColumn="control_effectiveness">{{ i18n.translate('audit.controlEffectiveness') }} <p-sortIcon field="control_effectiveness" /></th>
            <th pSortableColumn="materiality">{{ i18n.translate('audit.materiality') }} <p-sortIcon field="materiality" /></th>
            <th>{{ i18n.translate('audit.lastAudited') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td class="font-semibold">{{ e.entity_name }}</td>
            <td><app-status-badge [status]="e.entity_type" /></td>
            <td><span [class]="scoreClass(e.weighted_score)" class="score-pill">{{ e.weighted_score | appNumber:'decimal':'1.1-1' }}</span></td>
            <td><span [class]="scoreClass(e.inherent_risk)" class="score-pill">{{ e.inherent_risk | appNumber:'decimal':'1.1-1' }}</span></td>
            <td><span [class]="scoreClass(e.control_effectiveness)" class="score-pill">{{ e.control_effectiveness | appNumber:'decimal':'1.1-1' }}</span></td>
            <td><span [class]="scoreClass(e.materiality)" class="score-pill">{{ e.materiality | appNumber:'decimal':'1.1-1' }}</span></td>
            <td>{{ e.last_audited | appDate:'medium' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noItemsYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>
    </app-page-shell>
  `,
    styles: [`
    .health-strip { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 120px; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius); padding: 12px 16px; display: flex; flex-direction: column; align-items: center; }
    .health-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .health-value.high { color: var(--warning); } .health-value.medium { color: var(--warning); } .health-value.low { color: var(--success); }
    .health-label { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    .font-semibold { font-weight: 600; }
    .score-pill { display: inline-block; padding: 2px 10px; border-radius: var(--radius-lg); font-weight: 600; font-size: var(--font-size-sm); }
    .score-red { background: #fee2e2; color: var(--error); }
    .score-orange { background: #ffedd5; color: var(--warning); }
    .score-yellow { background: #fef9c3; color: #a16207; }
    .score-green { background: #dcfce7; color: var(--success); }
    .text-muted { color: var(--text-muted); }
    .cross-links { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); background: transparent; color: var(--text-color); font-size: var(--font-size-sm); cursor: pointer; transition: background 0.15s, color 0.15s; }
    .cross-link-btn:hover { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
  `]
})
export class AuditRiskPlanningComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly router = inject(Router);

  loading = signal(true);
  items = signal<Record<string, any>[]>([]);
  get highRiskCount() { return this.items().filter((i: Record<string, any>) => i.weighted_score > 3.5).length; }
  get mediumRiskCount() { return this.items().filter((i: Record<string, any>) => i.weighted_score > 2 && i.weighted_score <= 3.5).length; }
  get lowRiskCount() { return this.items().filter((i: Record<string, any>) => i.weighted_score <= 2).length; }

  ngOnInit() { this.load(); }

  load() {
    this.api.getRankedList().subscribe({
      next: r => { this.items.set((r as any).ranked_list || (r as any).data || []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadRiskPlanningData') }); }
    });
  }

  scoreClass(val: number): string {
    if (val > 4) return 'score-red';
    if (val > 3) return 'score-orange';
    if (val > 2) return 'score-yellow';
    return 'score-green';
  }
}
