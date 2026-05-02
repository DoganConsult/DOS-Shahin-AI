import { Component, OnInit, inject, computed, ChangeDetectionStrategy, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TabViewModule } from 'primeng/tabs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { GOVERNANCE_TABS } from '../../governance.constants';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/widgets';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-actions',
    imports: [
        CommonModule, FormsModule, RouterModule,
        PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent,
        GrcDataTableComponent, GrcFormFieldComponent,
        TableModule, TagModule, ButtonModule, DialogModule,
        InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule, TabViewModule,
        ConfirmDialogModule, AppDatePipe
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './governance-actions.component.html',
    styleUrls: ['./governance-actions.component.scss']
})
export class GovernanceActionsComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private confirmSvc = inject(ConfirmationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private msg = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  readonly dir  = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [
    { id: 'add', labelEn: 'Add Action', labelAr: 'إضافة مهمة', icon: 'plus', primary: true },
  ];
  onHeaderAction(id: string): void { if (id === 'add') this.openCreate(); }

  readonly priorityOptions = [
    { label: 'Critical', value: 'critical' }, { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' },
  ];
  readonly escalationOptions = [
    { label: 'None', value: '' },
    { label: 'Auto-escalate at 7 days overdue → Manager', value: '7d_manager' },
    { label: 'Auto-escalate at 14 days overdue → Director', value: '14d_director' },
    { label: 'Auto-escalate immediately → Committee', value: '0d_committee' },
  ];

  loading = true;
  items: Record<string, any>[] = [];
  filteredItems: Record<string, any>[] = [];
  searchTerm = '';
  statusFilter = '';
  sourceFilter = '';
  showDialog = false;
  editMode = false;
  editId = '';
  form: Record<string, any> = { title: '', description: '', assignedTo: '', deadline: '', sourceType: '', sourceId: '' };
  showCloseDialog = false;
  closureNote = '';
  closeTarget: Record<string, any> | null = null;
  activeTab = 0;

  totalCount = 0;
  completedCount = 0;
  pendingCount = 0;
  overdueCount = 0;
  escalatedCount = 0;
  boardAttentionCount = 0;

  escalatedItems: Record<string, any>[] = [];
  dueSoonItems: Record<string, any>[] = [];
  overdueItems: Record<string, any>[] = [];
  boardAttentionItems: Record<string, any>[] = [];
  completedWithEvidence: Record<string, any>[] = [];
  crossModuleGroups: { source: string; items: Record<string, any>[] }[] = [];

  escalationRulesList = [
    { label: 'Auto-escalate at 7 days overdue → Manager', description: 'Actions overdue by 7+ days are escalated to manager level', scope: 'All modules' },
    { label: 'Auto-escalate at 14 days overdue → Director', description: 'Actions overdue by 14+ days are escalated to director level', scope: 'All modules' },
    { label: 'Immediate escalation → Committee', description: 'Critical actions are immediately escalated to governance committee', scope: 'Critical only' },
    { label: 'Board attention at 30 days overdue', description: 'Actions overdue by 30+ days are flagged for board attention and health impact', scope: 'All modules' },
    { label: 'Priority auto-upgrade', description: 'Low→Medium at 7d, Medium→High at 14d, High→Critical at 30d overdue', scope: 'All modules' },
    { label: 'Closure requires evidence or commentary', description: 'Actions cannot be completed without a closure note or attached evidence', scope: 'All modules' },
  ];

  statusOptions = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Overdue', value: 'overdue' },
  ];

  sourceOptions = [
    { label: 'All Sources', value: '' },
    { label: 'Policy', value: 'policy' },
    { label: 'Committee', value: 'committee' },
    { label: 'Decision', value: 'decision' },
    { label: 'Audit Finding', value: 'audit_finding' },
    { label: 'Risk Treatment', value: 'risk_treatment' },
    { label: 'Workflow', value: 'workflow' },
    { label: 'Remediation', value: 'remediation' },
  ];

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['overdue'] === '1') this.statusFilter = 'overdue';
      if (params['status']) this.statusFilter = params['status'];
      if (params['sourceType']) this.sourceFilter = params['sourceType'];
      if (params['openCreate'] === '1') setTimeout(() => this.openCreate(), 100);
      this.loadItems();
    });
  }

  loadItems(): void {
    this.loading = true;
    this.operationsSvc.getActionItems().subscribe({
      next: (data: any) => {
        this.items = Array.isArray(data) ? data : data?.items || data?.data || [];
        this.computeHealth();
        this.filterList();
        this.loading = false;
      },
      error: () => { this.items = []; this.filteredItems = []; this.loading = false; },
    });
  }

  computeHealth(): void {
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 86400000);
    this.totalCount = this.items.length;
    this.completedCount = this.items.filter(a => a.status === 'completed').length;
    this.pendingCount = this.items.filter(a => a.status !== 'completed' && a.status !== 'deleted').length;
    this.overdueCount = this.items.filter(a => a.status !== 'completed' && a.deadline && new Date(a.deadline) < now).length;
    this.escalatedCount = this.items.filter(a => a.escalation_state === 'escalated').length;
    this.boardAttentionCount = this.items.filter(a => a.board_attention).length;

    this.escalatedItems = this.items.filter(a => a.escalation_state === 'escalated' && a.status !== 'completed');
    this.overdueItems = this.items.filter(a => a.status !== 'completed' && a.status !== 'deleted' && a.deadline && new Date(a.deadline) < now);
    this.dueSoonItems = this.items.filter(a => a.status !== 'completed' && a.status !== 'deleted' && a.deadline && new Date(a.deadline) >= now && new Date(a.deadline) <= in7d);
    this.boardAttentionItems = this.items.filter(a => a.board_attention && a.status !== 'completed' && a.status !== 'deleted');
    this.completedWithEvidence = this.items.filter(a => a.status === 'completed' && (a.closure_note || a.closure_evidence));

    const sourceMap = new Map<string, GrcRecord[]>();
    for (const item of this.items.filter(a => a.status !== 'deleted')) {
      const src = item.source_type || item.sourceType || 'manual';
      if (src === 'manual' || src === 'workflow') continue;
      if (!sourceMap.has(src)) sourceMap.set(src, []);
      sourceMap.get(src)!.push(item);
    }
    this.crossModuleGroups = Array.from(sourceMap.entries()).map(([source, items]) => ({ source, items }));
  }

  getDaysOverdue(item: Record<string, any>): number {
    if (!item.deadline) return 0;
    const diff = new Date().getTime() - new Date(item.deadline).getTime();
    return Math.max(0, Math.ceil(diff / 86400000));
  }

  filterList(): void {
    let list = [...this.items];
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(i => (i.title || '').toLowerCase().includes(t));
    }
    if (this.statusFilter === 'overdue') {
      const now = new Date();
      list = list.filter(i => i.status !== 'completed' && i.deadline && new Date(i.deadline) < now);
    } else if (this.statusFilter) {
      list = list.filter(i => i.status === this.statusFilter);
    }
    if (this.sourceFilter) {
      list = list.filter(i => (i.sourceType || i.source_type) === this.sourceFilter);
    }
    this.filteredItems = list;
  }

  isOverdue(item: Record<string, any>): boolean {
    return item.status !== 'completed' && item.deadline && new Date(item.deadline) < new Date();
  }

  openCreate(): void {
    this.editMode = false; this.editId = '';
    this.form = { title: '', description: '', assignedTo: '', deadline: '', sourceType: 'workflow', sourceId: 'manual', priority: 'medium', escalationRule: '' };
    this.showDialog = true;
  }

  openEdit(item: Record<string, any>): void {
    this.editMode = true;
    this.editId = item.itemId || item.item_id || item.id;
    this.form = {
      title: item.title || '',
      description: item.description || '',
      assignedTo: item.assignedTo || item.assigned_to || '',
      deadline: item.deadline ? item.deadline.substring(0, 10) : '',
      sourceType: item.sourceType || item.source_type || '',
      sourceId: item.sourceId || item.source_id || '',
      priority: item.priority || 'medium',
      escalationRule: item.escalationRule || item.escalation_rule || '',
    };
    this.showDialog = true;
  }

  save(): void {
    if (!this.form.title) return;
    const payload = { ...this.form };
    const obs = this.editMode
      ? this.apiclientSvc.put(`/action-items/${this.editId}`, payload)
      : this.apiclientSvc.post('/action-items', payload);
    obs.subscribe({
      next: () => { this.showDialog = false; this.loadItems(); this.msg.add({ severity: 'success', summary: this.i18n.translate(this.editMode ? 'common.updated' : 'common.created'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.operationFailed'), life: 4000 }); },
    });
  }

  markComplete(item: Record<string, any>): void {
    this.closeTarget = item;
    this.closureNote = '';
    this.showCloseDialog = true;
  }

  confirmComplete(): void {
    if (!this.closeTarget || !this.closureNote) return;
    const id = this.closeTarget.itemId || this.closeTarget.item_id || this.closeTarget.id;
    this.apiclientSvc.put(`/action-items/${id}`, { status: 'completed', closure_note: this.closureNote }).subscribe({
      next: () => { this.showCloseDialog = false; this.loadItems(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.completed'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), life: 4000 }); },
    });
  }

  openAudit(item: Record<string, any>): void {
    const id = item.itemId || item.item_id || item.id;
    this.router.navigate(['/foundation/audit'], { queryParams: { entityType: 'action_item', entityId: id } });
  }

  confirmDelete(item: Record<string, any>): void {
    this.confirmSvc.confirm({
      message: `Delete action "${item.title}"?`,
      header: "Confirm",
      icon: "pi pi-exclamation-triangle",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
      const id = item.itemId || item.item_id || item.id;
      this.apiclientSvc.del(`/action-items/${id}`).subscribe({
      next: () => { this.loadItems(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), life: 4000 }); },
      });
      },
    });
  }

}
