import { Component, ChangeDetectionStrategy, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Workflow3LevelApiService } from '../../services/workflow-3level-api.service';
import type { RecommendationCatalogDto, ForbiddenBoundaryDto, MandatoryReviewPointDto, StepAutonomyDto } from '../../services/workflow-3level-api.service';

type ConfigTab = 'catalog' | 'boundaries' | 'reviews' | 'autonomy';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-ai-config',
    imports: [CommonModule, FormsModule, PageHeaderComponent, TagModule, ButtonModule,
        TableModule, TooltipModule, DialogModule, InputTextModule, InputTextarea, DropdownModule,
        InputNumberModule, CheckboxModule, ToastModule],
    providers: [MessageService],
    template: `
    <p-toast />
    <app-page-header
      titleEn="AI Configuration" titleAr="إعدادات الذكاء الاصطناعي"
      subtitleEn="Recommendation Catalog, Boundaries, Review Points & Autonomy Scopes"
      subtitleAr="كتالوج التوصيات، الحدود، نقاط المراجعة ونطاقات الاستقلالية"
      icon="cog" [breadcrumbs]="['Workflows', 'AI Config']"
      [isAr]="i18n.currentLang()==='ar'" [dir]="i18n.direction()" />

    <div class="cfg-body" [dir]="i18n.direction()">
      <div class="cfg-tabs">
        <button *ngFor="let tab of tabs" class="cfg-tab" [class.active]="activeTab() === tab.key" (click)="activeTab.set(tab.key)">
          <i class="pi" [ngClass]="tab.icon"></i> {{ i18n.currentLang()==='ar' ? tab.labelAr : tab.labelEn }}
        </button>
      </div>

      <!-- Recommendation Catalog -->
      <ng-container *ngIf="activeTab() === 'catalog'">
        <div class="cfg-toolbar"><h4>Recommendation Catalog</h4></div>
        <p-table [value]="catalog()" styleClass="p-datatable-sm p-datatable-striped" [paginator]="true" [rows]="10"
          [attr.aria-label]="'Recommendation Catalog Table'">
          <ng-template pTemplate="header"><tr>
            <th>Type</th><th>Name (EN)</th><th>Name (AR)</th><th>Category</th><th>Step Types</th><th>Human Review</th><th>Max Confidence</th><th>Active</th>
          </tr></ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td><code>{{ item.recommendation_type }}</code></td>
              <td>{{ item.display_name_en }}</td>
              <td>{{ item.display_name_ar }}</td>
              <td><p-tag [value]="item.category" severity="info" /></td>
              <td>{{ item.applicable_step_types?.join(', ') || '—' }}</td>
              <td><i class="pi" [ngClass]="item.requires_human_review ? 'pi-check text-green-500' : 'pi-times text-red-500'"></i></td>
              <td>{{ item.max_confidence_for_auto }}</td>
              <td><p-tag [value]="item.is_active ? 'Active' : 'Inactive'" [severity]="item.is_active ? 'success' : 'danger'" /></td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage"><tr><td colspan="8" class="text-center p-4">No catalog entries</td></tr></ng-template>
        </p-table>
      </ng-container>

      <!-- Forbidden Boundaries -->
      <ng-container *ngIf="activeTab() === 'boundaries'">
        <div class="cfg-toolbar">
          <h4>Forbidden Boundaries</h4>
          <button pButton icon="pi pi-plus" label="Add Boundary" class="p-button-sm" (click)="showBoundaryDialog = true"></button>
        </div>
        <p-table [value]="boundaries()" styleClass="p-datatable-sm p-datatable-striped" [paginator]="true" [rows]="10"
          [attr.aria-label]="'Forbidden Boundaries Table'">
          <ng-template pTemplate="header"><tr>
            <th>Action</th><th>Module</th><th>Entity</th><th>Step</th><th>Reason</th><th>Severity</th><th>Actions</th>
          </tr></ng-template>
          <ng-template pTemplate="body" let-b>
            <tr>
              <td><code>{{ b.forbidden_action }}</code></td>
              <td>{{ b.module_code || 'All' }}</td>
              <td>{{ b.entity_type || 'All' }}</td>
              <td>{{ b.step_type || 'All' }}</td>
              <td>{{ b.reason }}</td>
              <td><p-tag [value]="b.severity" [severity]="b.severity === 'block' ? 'danger' : b.severity === 'warn' ? 'warning' : 'info'" /></td>
              <td><button pButton icon="pi pi-trash" class="p-button-danger p-button-text p-button-sm" (click)="removeBoundary(b)"></button></td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage"><tr><td colspan="7" class="text-center p-4">No boundaries defined</td></tr></ng-template>
        </p-table>
      </ng-container>

      <!-- Mandatory Review Points -->
      <ng-container *ngIf="activeTab() === 'reviews'">
        <div class="cfg-toolbar"><h4>Mandatory Review Points</h4></div>
        <p-table [value]="reviewPoints()" styleClass="p-datatable-sm p-datatable-striped"
          [attr.aria-label]="'Mandatory Review Points Table'">
          <ng-template pTemplate="header"><tr>
            <th>Step Type</th><th>Sub Type</th><th>Human Review</th><th>Min Confidence</th><th>Role</th><th>Reason</th><th>Active</th>
          </tr></ng-template>
          <ng-template pTemplate="body" let-rp>
            <tr>
              <td><code>{{ rp.step_type }}</code></td>
              <td>{{ rp.step_sub_type || '—' }}</td>
              <td><i class="pi" [ngClass]="rp.requires_human_review ? 'pi-check text-green-500' : 'pi-times text-red-500'"></i></td>
              <td>{{ rp.min_confidence_to_skip }}</td>
              <td>{{ rp.review_role || '—' }}</td>
              <td>{{ rp.reason || '—' }}</td>
              <td><p-tag [value]="rp.is_active ? 'Active' : 'Inactive'" [severity]="rp.is_active ? 'success' : 'danger'" /></td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage"><tr><td colspan="7" class="text-center p-4">No review points configured</td></tr></ng-template>
        </p-table>
      </ng-container>

      <!-- Step Autonomy Scopes -->
      <ng-container *ngIf="activeTab() === 'autonomy'">
        <div class="cfg-toolbar"><h4>Step Autonomy Scopes</h4></div>
        <p-table [value]="autonomyScopes()" styleClass="p-datatable-sm p-datatable-striped"
          [attr.aria-label]="'Step Autonomy Scopes Table'">
          <ng-template pTemplate="header"><tr>
            <th>Step Type</th><th>Sub Type</th><th>Max Level</th><th>Allowed Actions</th><th>Human Review</th><th>Max Confidence</th><th>Active</th><th>Actions</th>
          </tr></ng-template>
          <ng-template pTemplate="body" let-sa>
            <tr>
              <td><code>{{ sa.step_type }}</code></td>
              <td>{{ sa.step_sub_type || '—' }}</td>
              <td><p-tag [value]="'L' + sa.max_autonomy_level" severity="info" /></td>
              <td>{{ sa.allowed_ai_actions?.join(', ') || '—' }}</td>
              <td><i class="pi" [ngClass]="sa.mandatory_human_review ? 'pi-check text-green-500' : 'pi-times text-red-500'"></i></td>
              <td>{{ sa.max_confidence_required }}</td>
              <td><p-tag [value]="sa.is_active ? 'Active' : 'Inactive'" [severity]="sa.is_active ? 'success' : 'danger'" /></td>
              <td><button *ngIf="sa.is_active" pButton icon="pi pi-trash" class="p-button-danger p-button-text p-button-sm" (click)="removeAutonomy(sa)"></button></td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage"><tr><td colspan="8" class="text-center p-4">No autonomy scopes configured</td></tr></ng-template>
        </p-table>
      </ng-container>

      <!-- Add Boundary Dialog -->
      <p-dialog header="Add Forbidden Boundary" [(visible)]="showBoundaryDialog" [modal]="true" [style]="{width: '500px'}">
        <div class="flex flex-column gap-3">
          <input pInputText [(ngModel)]="boundaryForm.forbidden_action" placeholder="Forbidden action code" class="w-full" />
          <input pInputText [(ngModel)]="boundaryForm.module_code" placeholder="Module code (optional)" class="w-full" />
          <input pInputText [(ngModel)]="boundaryForm.step_type" placeholder="Step type (optional)" class="w-full" />
          <textarea pInputTextarea [(ngModel)]="boundaryForm.reason" placeholder="Reason" rows="2" class="w-full"></textarea>
          <p-dropdown [(ngModel)]="boundaryForm.severity" [options]="severityOptions" optionLabel="label" optionValue="value" placeholder="Severity" [style]="{width:'100%'}" />
        </div>
        <ng-template pTemplate="footer">
          <button pButton label="Cancel" class="p-button-text" (click)="showBoundaryDialog = false"></button>
          <button pButton label="Create" (click)="createBoundary()" [disabled]="!boundaryForm.forbidden_action || !boundaryForm.reason"></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
    styles: [`
    .cfg-body { padding: 0 24px 40px; }
    .cfg-tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--surface-border); flex-wrap: wrap; }
    .cfg-tab { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border: none; background: transparent; cursor: pointer; font-size: var(--font-size-tag); color: var(--text-color-secondary); border-bottom: 2px solid transparent; transition: all 0.15s; }
    .cfg-tab:hover { color: var(--text-color); }
    .cfg-tab.active { color: var(--primary-700); border-bottom-color: var(--primary-500); font-weight: 600; }
    .cfg-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .cfg-toolbar h4 { margin: 0; }
  `]
})
export class WorkflowAIConfigComponent implements OnInit {
  private api = inject(Workflow3LevelApiService);
  private msg = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);

  activeTab = signal<ConfigTab>('catalog');
  catalog = signal<RecommendationCatalogDto[]>([]);
  boundaries = signal<ForbiddenBoundaryDto[]>([]);
  reviewPoints = signal<MandatoryReviewPointDto[]>([]);
  autonomyScopes = signal<StepAutonomyDto[]>([]);

  showBoundaryDialog = false;
  boundaryForm = { forbidden_action: '', module_code: '', step_type: '', reason: '', severity: 'block' };
  severityOptions = [
    { label: 'Block', value: 'block' },
    { label: 'Warn', value: 'warn' },
    { label: 'Audit Only', value: 'audit_only' },
  ];

  tabs: Array<{ key: ConfigTab; labelEn: string; labelAr: string; icon: string }> = [
    { key: 'catalog', labelEn: 'Recommendation Catalog', labelAr: 'كتالوج التوصيات', icon: 'pi-list' },
    { key: 'boundaries', labelEn: 'Forbidden Boundaries', labelAr: 'الحدود المحظورة', icon: 'pi-ban' },
    { key: 'reviews', labelEn: 'Mandatory Reviews', labelAr: 'مراجعات إلزامية', icon: 'pi-eye' },
    { key: 'autonomy', labelEn: 'Step Autonomy', labelAr: 'استقلالية الخطوات', icon: 'pi-bolt' },
  ];

  ngOnInit(): void {
    forkJoin({
      catalog: this.api.getCatalog().pipe(catchError(() => of([]))),
      boundaries: this.api.getBoundaries().pipe(catchError(() => of([]))),
      reviews: this.api.getReviewPoints().pipe(catchError(() => of([]))),
      autonomy: this.api.getStepAutonomyScopes().pipe(catchError(() => of([]))),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
      this.catalog.set(data.catalog);
      this.boundaries.set(data.boundaries);
      this.reviewPoints.set(data.reviews);
      this.autonomyScopes.set(data.autonomy);
    });
  }

  createBoundary(): void {
    this.api.createBoundary(this.boundaryForm as any).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Boundary created' }); this.showBoundaryDialog = false; this.api.getBoundaries().subscribe(r => this.boundaries.set(r)); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to create boundary' }),
    });
  }

  removeBoundary(b: ForbiddenBoundaryDto): void {
    this.api.deactivateBoundary(b.boundary_id).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Boundary deactivated' }); this.api.getBoundaries().subscribe(r => this.boundaries.set(r)); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to deactivate' }),
    });
  }

  removeAutonomy(sa: StepAutonomyDto): void {
    this.api.deactivateStepAutonomy(sa.scope_id).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Autonomy scope deactivated' }); this.api.getStepAutonomyScopes().subscribe(r => this.autonomyScopes.set(r)); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to deactivate' }),
    });
  }
}
