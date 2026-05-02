/**
 * Advanced Policy Impact Simulator Component
 * Feature 23: Policy Impact Simulation
 * 
 * Visualizes the cascading impact of policy changes across linked entities
 * with interactive graph visualization and impact analysis.
 */
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import {
  PolicyImpactApiService,
  ImpactedEntity,
  PolicyImpactResult,
} from '@app/core/services/api-clients/grc-domain/policy-impact-api.service';
import { GovernanceApiService } from '@app/api';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';
import { TreeNode } from 'primeng/api';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  selector: 'app-policy-impact-simulator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GrcDataTableComponent,
    ToastModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    DropdownModule,
    SkeletonModule,
    ProgressSpinnerModule,
    TooltipModule,
    TreeModule,
    EmptyStateComponent,
    PageHeaderComponent,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './policy-impact-simulator.component.html',
  styleUrls: ['./policy-impact-simulator.component.scss'],
})
export class PolicyImpactSimulatorComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly impactService = inject(PolicyImpactApiService);
  private readonly governanceService = inject(GovernanceApiService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  // State
  selectedPolicyId: string | null = null;
  availablePolicies = signal<Array<{ id: string; name: string }>>([]);
  simulating = signal(false);
  simulationResult = signal<PolicyImpactResult | null>(null);
  impactTree = signal<TreeNode[]>([]);
  sortMeta = signal<GrcRecord[]>([]);

  ngOnInit(): void {
    this.loadAvailablePolicies();
  }

  loadAvailablePolicies(): void {
    this.governanceService
      .getPolicies()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.messageService.add({
            severity: 'error',
            summary: this.i18n.translate('common.error'),
            detail: err.error?.message || this.i18n.translate('policy.loadFailed'),
          });
          return of([]);
        }),
      )
      .subscribe((policies) => {
        this.availablePolicies.set(
          policies.map((p) => ({
            id: p.id,
            name: p.title || `Policy ${p.id}`,
          })),
        );
      });
  }

  onPolicySelected(): void {
    this.simulationResult.set(null);
    this.impactTree.set([]);
  }

  runSimulation(): void {
    if (!this.selectedPolicyId) return;

    this.simulating.set(true);
    this.simulationResult.set(null);

    this.impactService
      .simulateImpact(this.selectedPolicyId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.messageService.add({
            severity: 'error',
            summary: this.i18n.translate('common.error'),
            detail: err.error?.message || this.i18n.translate('policyImpact.simulationFailed'),
          });
          return of(null);
        }),
        finalize(() => this.simulating.set(false)),
      )
      .subscribe((result) => {
        if (result) {
          this.simulationResult.set(result);
          this.buildImpactTree(result.impactedEntities);
        }
      });
  }

  buildImpactTree(entities: ImpactedEntity[]): void {
    // Build tree structure from impacted entities
    const tree: TreeNode[] = [];
    const entityMap = new Map<string, TreeNode>();

    entities.forEach((entity) => {
      const node: TreeNode = {
        label: `${entity.entityType}: ${entity.entityName}`,
        data: entity,
        icon: this.getEntityIcon(entity.entityType),
        children: [],
      };
      entityMap.set(entity.entityId, node);
    });

    // Build parent-child relationships (simplified - in real implementation, use entity links)
    entityMap.forEach((node) => {
      tree.push(node);
    });

    this.impactTree.set(tree);
  }

  onNodeSelect(event: GrcRecord): void {
    const entity = event.node.data as ImpactedEntity;
    if (entity) {
      this.navigateToEntity(entity);
    }
  }

  navigateToEntity(entity: ImpactedEntity): void {
    // Navigate to entity detail page based on type
    const routeMap: Record<string, string> = {
      control: '/compliance/controls',
      risk: '/risk/risks',
      policy: '/governance/policies',
      assessment: '/compliance/assessments',
    };

    const route = routeMap[entity.entityType.toLowerCase()];
    if (route) {
      this.router.navigate([route, entity.entityId]);
    }
  }

  exportResults(): void {
    const result = this.simulationResult();
    if (!result) return;

    const csv = this.generateCSV(result.impactedEntities);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policy-impact-${this.selectedPolicyId}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  generateCSV(entities: ImpactedEntity[]): string {
    const headers = ['Entity Type', 'Entity Name', 'Impact Level', 'Impact Score', 'Description'];
    const rows = entities.map((e) => [
      e.entityType,
      e.entityName || '',
      e.impactLevel,
      String(e.impactScore ?? 0),
      e.impactDescription || '',
    ]);

    return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  }

  onSort(event: GrcRecord): void {
    this.sortMeta.set(event.multiSortMeta);
  }

  getImpactClass(count: number, level: 'high' | 'medium' | 'low' = 'high'): string {
    if (count === 0) return '';
    return level;
  }

  getImpactSeverity(level: string): 'danger' | 'warning' | 'info' {
    switch (level) {
      case 'high':
      case 'direct':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
      case 'indirect':
        return 'info';
      default:
        return 'info';
    }
  }

  getImpactScoreClass(score: number): string {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  getEntityIcon(entityType: string): string {
    const iconMap: Record<string, string> = {
      control: 'pi pi-shield',
      risk: 'pi pi-exclamation-triangle',
      policy: 'pi pi-file',
      assessment: 'pi pi-clipboard',
    };
    return iconMap[entityType.toLowerCase()] || 'pi pi-circle';
  }

  truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
