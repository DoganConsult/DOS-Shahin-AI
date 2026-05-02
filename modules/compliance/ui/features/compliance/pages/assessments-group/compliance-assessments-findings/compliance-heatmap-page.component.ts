/**
 * Compliance Heat Map by Business Unit
 * Priority 18: Cross-reference business units → departments → team RACI assignments → controls → control effectiveness
 * Produce BU×framework matrix with color-coded compliance scores
 */
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { ComplianceHeatMapResult, ComplianceHeatMapCell } from '../../../models/compliance.models';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-heatmap-page',
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './compliance-heatmap-page.component.html',
    styleUrls: ['./compliance-heatmap-page.component.scss']
})
export class ComplianceHeatMapPageComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  protected readonly api = inject(ComplianceFeatureApiService);

  loading = signal<boolean>(false);
  loadError = signal<string | null>(null);
  heatMapData = signal<ComplianceHeatMapResult | null>(null);
  groupBy: 'business_unit' | 'department' = 'business_unit';

  // Computed: Extract unique organizational units from cells
  orgUnits = computed(() => {
    const data = this.heatMapData();
    if (!data) return [];

    const unitsMap = new Map<string, { id: string; name: string; parentName: string | null }>();

    for (const cell of data.cells) {
      if (data.groupBy === 'business_unit') {
        const id = cell.businessUnitId || '';
        if (id && !unitsMap.has(id)) {
          unitsMap.set(id, {
            id,
            name: cell.businessUnitName || '',
            parentName: null,
          });
        }
      } else {
        const id = cell.departmentId || '';
        if (id && !unitsMap.has(id)) {
          unitsMap.set(id, {
            id,
            name: cell.departmentName || '',
            parentName: cell.businessUnitName || null,
          });
        }
      }
    }

    return Array.from(unitsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  ngOnInit(): void {
    this.loadHeatMap();
  }

  loadHeatMap(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.api.getComplianceHeatMap(this.groupBy).pipe(
      catchError((err) => {
        console.error('[ComplianceHeatMap] Load error:', err);
        this.loadError.set(err?.message || 'Failed to load compliance heat map');
        return of(null);
      }),
    ).subscribe((data) => {
      this.loading.set(false);
      if (data) {
        this.heatMapData.set(data);
      }
    });
  }

  getCell(orgUnitId: string, frameworkId: string): ComplianceHeatMapCell | null {
    const data = this.heatMapData();
    if (!data) return null;

    return data.cells.find((cell) => {
      if (data.groupBy === 'business_unit') {
        return cell.businessUnitId === orgUnitId && cell.frameworkId === frameworkId;
      } else {
        return cell.departmentId === orgUnitId && cell.frameworkId === frameworkId;
      }
    }) || null;
  }

  getScoreClass(score: number): string {
    if (score >= 81) return 'excellent';
    if (score >= 61) return 'good';
    if (score >= 41) return 'moderate';
    if (score >= 21) return 'poor';
    return 'critical';
  }

  getCellTooltip(cell: ComplianceHeatMapCell): string {
    return `${cell.frameworkName}: ${cell.complianceScore.toFixed(1)}% | ${cell.totalControls} controls | ${cell.effectiveControls} effective | ${cell.criticalGaps} critical gaps`;
  }
}
