import { Component, Input, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageMatrixDto, CoverageMatrixRow } from '../../models/compliance.models';
import { ComplianceLabels } from '../../config/compliance.labels.en';
import { TableModule, TagModule, TooltipModule } from 'carbon-components-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-coverage-matrix',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, TooltipModule],
  template: `
    <div class="matrix-summary" *ngIf="matrix">
      <span class="ms-item"><strong>{{ matrix.totalObligations }}</strong> Total</span>
      <span class="ms-item cov"><strong>{{ matrix.covered }}</strong> Covered</span>
      <span class="ms-item impl"><strong>{{ matrix.implemented }}</strong> Implemented</span>
      <span class="ms-item ev"><strong>{{ matrix.withEvidence }}</strong> With Evidence</span>
      <span class="ms-item maturity" *ngIf="matrix.maturityLevel">
        <strong>Maturity:</strong> {{ matrix.maturityLevel }}
        <span *ngIf="matrix.maturityScore != null">({{ matrix.maturityScore }}%)</span>
      </span>
    </div>
    <table cdsTable aria-label="Data table" [value]="matrix?.matrix || []" [paginator]="(matrix?.matrix || []).length > 15" [rows]="15"
      styleClass="p-datatable-sm p-datatable-gridlines" *ngIf="matrix">
      <ng-template pTemplate="header">
        <tr>
          <th style="width:80px">{{ L.code }}</th>
          <th>{{ L.obligation }}</th>
          <th style="width:80px">Priority</th>
          <th style="width:70px" [cdsTooltip]="Has mapped control">Control</th>
          <th style="width:70px" [cdsTooltip]="Control implemented">Impl.</th>
          <th style="width:70px" [cdsTooltip]="Has evidence">Evidence</th>
          <th style="width:70px" [cdsTooltip]="Control tested/passed">Tested</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td><code>{{ row.obligationCode }}</code></td>
          <td>{{ row.obligationTitle }}</td>
          <td><cds-tag [value]="row.priority || 'medium'" [severity]="priSev(row.priority)" /></td>
          <td class="center"><i class="pi" [ngClass]="row.hasControl ? 'pi-check-circle ok' : 'pi-times-circle no'" ></i></td>
          <td class="center"><i class="pi" [ngClass]="row.isImplemented ? 'pi-check-circle ok' : 'pi-minus-circle no'" ></i></td>
          <td class="center"><i class="pi" [ngClass]="row.hasEvidence ? 'pi-check-circle ok' : 'pi-minus-circle no'" ></i></td>
          <td class="center"><i class="pi" [ngClass]="row.isTested ? 'pi-check-circle ok' : 'pi-minus-circle no'" ></i></td>
        </tr>
      </ng-template>
    </table>
  `,
  styles: [`
    .matrix-summary { display: flex; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
    .ms-item { font-size: var(--font-size-sm); color: var(--text-color-secondary, var(--text-muted)); }
    .ms-item strong { color: var(--text-color, #111); }
    .ms-item.cov strong { color: var(--primary); }
    .ms-item.impl strong { color: var(--success); }
    .ms-item.ev strong { color: var(--secondary, #8b5cf6); }
    .ms-item.maturity strong { color: var(--primary); }
    .center { text-align: center; }
    .ok { color: var(--success); font-size: var(--font-size-md); }
    .no { color: var(--border-subtle); font-size: var(--font-size-md); }
  `]
})
export class CoverageMatrixComponent {
  @Input() matrix: CoverageMatrixDto | null = null;
  @Input() L!: ComplianceLabels;

  priSev(p: string): 'danger' | 'warning' | 'info' | 'success' {
    if (p === 'high' || p === 'critical') return 'danger';
    if (p === 'medium') return 'warning';
    return 'info';
  }
}
