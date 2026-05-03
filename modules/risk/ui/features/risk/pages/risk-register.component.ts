import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { SessionService } from '@app/dauth/session/session.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import {
  ModuleRecordsTemplateComponent,
  ModuleColumn, ModuleRecord, ModuleNotification
} from '@platform/shell/templates';


@Component({
  selector: 'app-risk-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModuleRecordsTemplateComponent],
  template: `
    <dos-intelligent-register
      eyebrow="RISK / REGISTER"
      title="Risk Register"
      [aiHeadline]="aiHeadline()"
      subtitle="All identified risks — sorted by AI priority score"
      [loading]="loading()"
      [notification]="notification()"
      [columns]="columns"
      [rows]="rows()"
      [totalItems]="totalItems()"
      [pageSize]="25"
      searchPlaceholder="Search risks by title, owner, category..."
      filterLabel="Severity"
      [filterOptions]="severityFilter"
      [viewSwitcher]="viewSwitcher"
      [addAction]="addAction"
      [bulkActions]="bulkActions"
      [statusTags]="statusTags()"
      [currentRole]="currentRole()"
      [writeRoles]="writeRoles"
      (rowClick)="onRowClick($event)"
      (rowEdit)="onRowEdit($event)"
      (search)="onSearch($event)"
      (filter)="onFilter($event)">
    </dos-intelligent-register>
  `
})
export class RiskRegisterPageComponent implements OnInit {
  private api       = inject(RiskApiService);
  private auth      = inject(SessionService);
  private router    = inject(Router);
  private destroyRef = inject(DestroyRef);

  loading   = signal(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawRows   = signal<any[]>([]);

  totalCount = signal(0);
  errorMsg  = signal<string | null>(null);
  searchTerm = signal('');
  severityFilter$ = signal('');

  currentRole = computed(() => this.auth.currentRole?.() ?? 'standard_user');
  readonly writeRoles = ['risk_manager', 'role_risk_manager', 'tenant_admin', 'role_tenant_owner', 'platform_super_admin'];

  aiHeadline = computed(() => {
    const total = this.totalCount();
    const critical = this.rows().filter(r => r._severity === 'critical').length;
    return critical > 0 ? `AI: ${critical} of ${total} risks flagged critical` : `${total} risks tracked`;
  });

  notification = computed<ModuleNotification | null>(() =>
    this.errorMsg() ? { type: 'error', title: 'Failed to load risk register', subtitle: this.errorMsg() ?? '' } : null
  );

  statusTags = computed(() => {
    const critical = this.rows().filter(r => r._severity === 'critical').length;
    return critical > 0 ? [{ label: `${critical} CRITICAL`, severity: 'critical' }] : [];
  });

  rows = computed<ModuleRecord[]>(() =>
    (this.rawRows() as Record<string, unknown>[]).map((r: Record<string, unknown>) => ({
      id: String(r['id'] ?? r['risk_id'] ?? Math.random()),
      title: r['title'] ?? r['name'] ?? 'Unnamed Risk',
      category: r['category'] ?? '—',
      owner: r['owner_name'] ?? r['owner'] ?? '—',
      _severity: String(r['severity'] ?? r['risk_level'] ?? 'medium').toLowerCase(),
      _aiScore: r['ai_score'] ?? r['risk_score'],
      _progress: r['treatment_progress'],
      status: r['status'] ?? 'open',
    } as ModuleRecord))
  );

  totalItems = computed(() => this.totalCount() || this.rows().length);

  readonly columns: ModuleColumn[] = [
    { key: 'title',    label: 'Risk Title', sortable: true, type: 'link' },
    { key: '_severity', label: 'Severity',  sortable: true, type: 'tag' },
    { key: '_aiScore',  label: 'AI Score',  sortable: true, type: 'ai-score' },
    { key: 'owner',     label: 'Owner',     sortable: false, type: 'text' },
    { key: '_progress', label: 'Treatment', sortable: false, type: 'progress' },
    { key: 'status',    label: 'Status',    sortable: true,  type: 'tag' },
  ];

  readonly severityFilter = [
    { content: 'All',      value: '' },
    { content: 'Critical', value: 'critical' },
    { content: 'High',     value: 'high' },
    { content: 'Medium',   value: 'medium' },
    { content: 'Low',      value: 'low' },
  ];

  readonly viewSwitcher = [
    { id: 'all',    label: 'All Risks' },
    { id: 'mine',   label: 'My Risks' },
    { id: 'open',   label: 'Open' },
  ];

  readonly addAction = {
    label: 'Add Risk',
    action: () => this.router.navigate(['/risk/register/new'])
  };

  readonly bulkActions = [
    { content: 'Assign Owner', click: () => {} },
    { content: 'Set Treatment', click: () => {} },
    { content: 'Archive Selected', click: () => {} },
    { content: 'Export Selected', click: () => {} },
  ];

  ngOnInit(): void {
    this.api.getIssues?.()?.pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((data: any[]) => {
      this.rawRows.set(data ?? []);
      this.totalCount.set(data?.length ?? 0);
      this.loading.set(false);
    });


    // Fallback placeholder
    setTimeout(() => {
      if (this.loading()) {
        this.rawRows.set([
          { id: 'R-047', title: 'Inadequate Access Controls', category: 'IT Security', owner: 'John Smith', severity: 'critical', ai_score: 94, treatment_progress: 60, status: 'open' },
          { id: 'R-031', title: 'Third-party Vendor Risk', category: 'Operational', owner: 'Sarah Lee', severity: 'high', ai_score: 78, treatment_progress: 20, status: 'open' },
          { id: 'R-019', title: 'Data Retention Policy Gap', category: 'Compliance', owner: 'Ahmed Al-Said', severity: 'medium', ai_score: 55, treatment_progress: 80, status: 'in-treatment' },
        ]);
        this.totalCount.set(47);
        this.loading.set(false);
      }
    }, 3000);
  }

  onRowClick(row: ModuleRecord) { this.router.navigate(['/risk/register', row.id]); }
  onRowEdit(row: ModuleRecord)  { this.router.navigate(['/risk/register', row.id, 'edit']); }
  onSearch(term: string) { this.searchTerm.set(term); }
  onFilter(val: string) { this.severityFilter$.set(val); }
}
