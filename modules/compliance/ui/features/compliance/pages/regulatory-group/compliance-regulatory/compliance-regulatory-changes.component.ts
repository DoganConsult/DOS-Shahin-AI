/**
 * Compliance Regulatory Changes Page
 * Tracks regulatory changes, their impact assessment, and status lifecycle.
 */
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { catchError, of, forkJoin } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcFormFieldComponent } from '@app/widgets';
import { ButtonModule, NotificationModule, TagModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-regulatory-changes',
    imports: [CommonModule, DatePipe, FormsModule, RouterModule, TagModule, ButtonModule, NotificationModule, GrcFormFieldComponent],
    providers: [],
    templateUrl: './compliance-regulatory-changes.component.html',
    styleUrls: ['./compliance-regulatory-changes.component.scss']
})
export class ComplianceRegulatoryChangesComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private api = inject(ComplianceFeatureApiService);
  private msg = inject(MessageService);
  private router = inject(Router);

  loading = signal(true);
  errorMsg = signal('');
  items = signal<GrcRecord[]>([]);
  selectedItem = signal<GrcRecord | null>(null);
  impactData = signal<GrcRecord | null>(null);
  loadingImpact = signal(false);
  users = signal<GrcRecord[]>([]);
  departments = signal<GrcRecord[]>([]);
  businessUnits = signal<GrcRecord[]>([]);
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  statusFilter = '';
  departmentFilter = '';
  showCreate = false;
  showAssess = false;
  assessItem: GrcRecord | null = null;
  newChange: GrcRecord = { title: '', description: '', regulatorCode: '', effectiveDate: '', severity: 'medium', ownerUserId: '', departmentId: '', businessUnitId: '' };
  assessData = { impactedControls: 0, gapCount: 0, notes: '' };

  filteredItems = computed(() => {
    let list = this.items();
    if (this.departmentFilter) list = list.filter((i) => i.department_id === this.departmentFilter);
    return list;
  });

  ngOnInit(): void {
    this.loadFoundation();
    this.load();
  }

  loadFoundation(): void {
    forkJoin({
      users: this.api.getFoundationUsers().pipe(catchError(() => of([]))),
      depts: this.api.getFoundationDepartments().pipe(catchError(() => of([]))),
      bus: this.api.getFoundationBusinessUnits().pipe(catchError(() => of([]))),
    }).subscribe(res => {
      this.users.set(res.users);
      this.departments.set(res.depts);
      this.businessUnits.set(res.bus);
    });
  }

  load(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.api.getRegulatoryChanges(this.statusFilter || undefined).pipe(
      catchError(err => {
        this.errorMsg.set('Failed to load regulatory changes');
        return of([]);
      })
    ).subscribe(data => {
      this.items.set(Array.isArray(data) ? data : []);
      this.loading.set(false);
    });
  }

  countByStatus(status: string): number {
    return this.items().filter(i => i.status === status).length;
  }

  sevTag(sev: string): 'success' | 'info' | 'warning' | 'danger' {
    if (sev === 'critical') return 'danger';
    if (sev === 'high') return 'warning';
    if (sev === 'medium') return 'info';
    return 'success';
  }

  severityTag(severity: string | null | undefined): 'success' | 'info' | 'warning' | 'danger' {
    if (!severity) return 'info';
    return this.sevTag(severity);
  }

  openDetail(item: GrcRecord): void {
    this.selectedItem.set(item);
    this.impactData.set(null);
    this.loadingImpact.set(true);
    this.api.getRegulatoryChangeImpact(item.change_id).pipe(
      catchError((err) => {
        console.error('Failed to load impact data:', err);
        this.loadingImpact.set(false);
        return of(null);
      })
    ).subscribe((data) => {
      this.impactData.set(data);
      this.loadingImpact.set(false);
    });
  }

  changeStatus(item: GrcRecord, status: string): void {
    this.api.updateRegulatoryChangeStatus(item.change_id, status).pipe(
      catchError(() => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.statusUpdateFailed') });
        return of(null);
      })
    ).subscribe(result => {
      if (result) {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.updated'), detail: this.i18n.translate('common.statusTo', { status: status.replace('_', ' ') }) });
        this.load();
      }
    });
  }

  createChange(): void {
    if (!this.newChange.title) return;
    this.api.createRegulatoryChange(this.newChange as any).pipe(
      catchError(() => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToCreateRegulatoryChange') });
        return of(null);
      })
    ).subscribe(result => {
      if (result) {
        this.showCreate = false;
        this.newChange = { title: '', description: '', regulatorCode: '', effectiveDate: '', severity: 'medium', ownerUserId: '', departmentId: '', businessUnitId: '' };
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.created'), detail: this.i18n.translate('common.regulatoryChangeCreated') });
        this.load();
      }
    });
  }

  assessImpact(item: GrcRecord): void {
    this.assessItem = item;
    this.assessData = { impactedControls: 0, gapCount: 0, notes: '' };
    this.showAssess = true;
  }

  saveAssessment(): void {
    if (!this.assessItem) return;
    this.api.assessRegulatoryImpact(this.assessItem.change_id, this.assessData).pipe(
      catchError(() => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.impactAssessmentFailed') });
        return of(null);
      })
    ).subscribe(result => {
      if (result) {
        this.showAssess = false;
        this.assessItem = null;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.assessed'), detail: this.i18n.translate('common.impactAssessmentSaved') });
        this.load();
      }
    });
  }

  viewAuditLog(item: GrcRecord): void {
    this.selectedItem.set(null);
    this.router.navigate(['/foundation/audit'], { queryParams: { entityType: 'regulatory_change', entityId: item.change_id } });
  }
}
