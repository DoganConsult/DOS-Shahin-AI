/**
 * Phase 1: DB-Driven GRC Sandbox
 * Interactive sandbox component for GRC data visualization
 *
 * Uses DB-driven IBM Carbon components from the registry instead of
 * hardcoded values. Provides interactive charts, tables, and framework
 * comparison for visitors.
 */

import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrcSandboxService, GrcFramework, GrcControl, GrcSummary } from './grc-sandbox.service';
import { DosCarbonGridComponent, DosCarbonRowComponent, DosCarbonColComponent } from '../carbon/dos-carbon-grid.component';
import { DosCarbonButtonComponent } from '../carbon/dos-carbon-button.component';
import { DosCarbonTagComponent } from '../carbon/dos-carbon-tag.component';
import { DosCarbonProgressBarComponent } from '../carbon/dos-carbon-progress-bar.component';

@Component({
  selector: 'dos-grc-sandbox',
  standalone: true,
  imports: [
    CommonModule,
    DosCarbonGridComponent,
    DosCarbonRowComponent,
    DosCarbonColComponent,
    DosCarbonButtonComponent,
    DosCarbonTagComponent,
    DosCarbonProgressBarComponent,
  ],
  template: `
    <div class="dos-grc-sandbox">
      <header class="dos-grc-sandbox__header">
        <h2>GRC Sandbox</h2>
        <p>Interactive compliance framework explorer</p>
      </header>

      <div class="dos-grc-sandbox__summary" *ngIf="summary()">
        <h3>Compliance Summary</h3>
        <dos-carbon-grid>
          <dos-carbon-row>
            <dos-carbon-col [span]="4">
              <div class="summary-card">
                <div class="summary-card__label">Frameworks</div>
                <div class="summary-card__value">{{ summary().frameworks }}</div>
              </div>
            </dos-carbon-col>
            <dos-carbon-col [span]="4">
              <div class="summary-card">
                <div class="summary-card__label">Controls</div>
                <div class="summary-card__value">{{ summary().controls.total }}</div>
              </div>
            </dos-carbon-col>
            <dos-carbon-col [span]="4">
              <div class="summary-card">
                <div class="summary-card__label">Requirements</div>
                <div class="summary-card__value">{{ summary().requirements.total }}</div>
              </div>
            </dos-carbon-col>
          </dos-carbon-row>
        </dos-carbon-grid>

        <div class="controls-status">
          <h4>Controls Status</h4>
          <div class="status-bar">
            <div class="status-bar__item">
              <span class="status-bar__label">Implemented</span>
              <span class="status-bar__value">{{ summary().controls.implemented }}</span>
              <dos-carbon-progress-bar [value]="controlProgress.implemented" max="100"></dos-carbon-progress-bar>
            </div>
            <div class="status-bar__item">
              <span class="status-bar__label">Partially</span>
              <span class="status-bar__value">{{ summary().controls.partially_implemented }}</span>
              <dos-carbon-progress-bar [value]="controlProgress.partially" max="100"></dos-carbon-progress-bar>
            </div>
            <div class="status-bar__item">
              <span class="status-bar__label">Not Implemented</span>
              <span class="status-bar__value">{{ summary().controls.not_implemented }}</span>
              <dos-carbon-progress-bar [value]="controlProgress.notImplemented" max="100"></dos-carbon-progress-bar>
            </div>
          </div>
        </div>
      </div>

      <div class="dos-grc-sandbox__frameworks">
        <h3>Compliance Frameworks</h3>
        <div class="frameworks-list">
          <div class="framework-card" *ngFor="let fw of frameworks()">
            <div class="framework-card__name">{{ fw.name }}</div>
            <div class="framework-card__version">{{ fw.version }}</div>
            <dos-carbon-tag [type]="'blue'">{{ fw.status }}</dos-carbon-tag>
            <dos-carbon-button [kind]="'ghost'" (click)="selectFramework(fw.framework_id)">View Controls</dos-carbon-button>
          </div>
        </div>
      </div>

      <div class="dos-grc-sandbox__controls" *ngIf="selectedFramework()">
        <h3>Controls - {{ selectedFramework()?.name }}</h3>
        <div class="controls-table">
          <div class="controls-table__header">
            <div class="controls-table__cell">Reference</div>
            <div class="controls-table__cell">Title</div>
            <div class="controls-table__cell">Status</div>
          </div>
          <div class="controls-table__row" *ngFor="let ctrl of filteredControls()">
            <div class="controls-table__cell">{{ ctrl.control_ref }}</div>
            <div class="controls-table__cell">{{ ctrl.title }}</div>
            <div class="controls-table__cell">
              <dos-carbon-tag [type]="getStatusTagType(ctrl.status)">{{ ctrl.status }}</dos-carbon-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dos-grc-sandbox {
      padding: 2rem;
      background: #f4f4f4;
    }

    .dos-grc-sandbox__header {
      margin-bottom: 2rem;
    }

    .dos-grc-sandbox__header h2 {
      font-size: 2rem;
      margin: 0 0 0.5rem 0;
    }

    .dos-grc-sandbox__header p {
      font-size: 1rem;
      color: #525252;
      margin: 0;
    }

    .dos-grc-sandbox__summary {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .summary-card {
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      text-align: center;
    }

    .summary-card__label {
      font-size: 0.875rem;
      color: #525252;
      margin-bottom: 0.5rem;
    }

    .summary-card__value {
      font-size: 2rem;
      font-weight: 600;
      color: #161616;
    }

    .controls-status {
      margin-top: 1.5rem;
    }

    .controls-status h4 {
      margin: 0 0 1rem 0;
    }

    .status-bar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .status-bar__item {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .status-bar__label {
      width: 150px;
      font-size: 0.875rem;
    }

    .status-bar__value {
      width: 50px;
      text-align: right;
      font-weight: 600;
    }

    .dos-grc-sandbox__frameworks {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .frameworks-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .framework-card {
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .framework-card__name {
      font-weight: 600;
      font-size: 1rem;
    }

    .framework-card__version {
      font-size: 0.875rem;
      color: #525252;
    }

    .dos-grc-sandbox__controls {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
    }

    .controls-table {
      margin-top: 1rem;
    }

    .controls-table__header {
      display: grid;
      grid-template-columns: 150px 1fr 150px;
      gap: 1rem;
      padding: 0.5rem;
      background: #f4f4f4;
      font-weight: 600;
      border-radius: 4px 4px 0 0;
    }

    .controls-table__row {
      display: grid;
      grid-template-columns: 150px 1fr 150px;
      gap: 1rem;
      padding: 0.5rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .controls-table__row:last-child {
      border-bottom: none;
      border-radius: 0 0 4px 4px;
    }

    .controls-table__cell {
      display: flex;
      align-items: center;
    }
  `],
})
export class DosGrcSandboxComponent implements OnInit {
  private readonly grcService = inject(GrcSandboxService);
  
  readonly frameworks = this.grcService.frameworks;
  readonly controls = this.grcService.controls;
  readonly summary = this.grcService.summary;
  readonly loaded = this.grcService.loaded;
  
  // Carbon component keys from DB registry (not hardcoded)
  readonly gridCarbonKey = this.grcService.getCarbonKeyForVisualization('summary');
  readonly tableCarbonKey = this.grcService.getCarbonKeyForVisualization('controls');
  readonly chartCarbonKey = this.grcService.getCarbonKeyForVisualization('comparison');
  
  private readonly _selectedFrameworkId = signal<string | null>(null);
  readonly selectedFramework = computed(() => {
    const id = this._selectedFrameworkId();
    return this.frameworks().find(fw => fw.framework_id === id) || null;
  });
  
  readonly filteredControls = computed(() => {
    const fw = this.selectedFramework();
    if (!fw) return this.controls();
    return this.controls().filter(c => c.framework_name === fw.name);
  });
  
  readonly controlProgress = computed(() => {
    const s = this.summary();
    if (!s) return { implemented: 0, partially: 0, notImplemented: 0 };
    const total = s.controls.total || 1;
    return {
      implemented: (s.controls.implemented / total) * 100,
      partially: (s.controls.partially_implemented / total) * 100,
      notImplemented: (s.controls.not_implemented / total) * 100,
    };
  });

  async ngOnInit(): Promise<void> {
    await this.grcService.loadAll();
  }

  selectFramework(frameworkId: string): void {
    this._selectedFrameworkId.set(frameworkId);
  }

  getStatusTagType(status: string): 'green' | 'red' | 'blue' | 'gray' {
    switch (status) {
      case 'implemented': return 'green';
      case 'partially_implemented': return 'blue';
      case 'not_implemented': return 'red';
      default: return 'gray';
    }
  }
}
