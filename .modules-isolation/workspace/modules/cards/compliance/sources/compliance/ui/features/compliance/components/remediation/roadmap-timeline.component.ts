import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceRoadmapDto, RoadmapPhaseDto } from '../../models/compliance.models';
import { ComplianceLabels } from '../../config/compliance.labels.en';
import { ProgressIndicatorModule, TagModule } from 'carbon-components-angular';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-roadmap-timeline',
    imports: [CommonModule, ProgressIndicatorModule, TagModule],
    template: `
    <div class="rt-summary" *ngIf="roadmap">
      <div class="rt-stat">
        <span class="rt-stat-val">{{ roadmap.completionPercent }}%</span>
        <span class="rt-stat-lbl">{{ L.completion }}</span>
      </div>
      <div class="rt-stat">
        <span class="rt-stat-val">{{ roadmap.completedTasks }}/{{ roadmap.totalTasks }}</span>
        <span class="rt-stat-lbl">{{ L.tasks }}</span>
      </div>
    </div>

    <div class="rt-phases" *ngIf="roadmap?.phases?.length">
      <div class="rt-phase" *ngFor="let phase of roadmap!.phases; let i = index"
           [class.rt-done]="phaseCompletion(phase) === 100"
           [class.rt-active]="phaseCompletion(phase) > 0 && phaseCompletion(phase) < 100">
        <div class="rt-phase-num">{{ i + 1 }}</div>
        <div class="rt-phase-body">
          <div class="rt-phase-header">
            <span class="rt-phase-title">{{ phase.title }}</span>
            <span class="rt-phase-pct">{{ phaseCompletion(phase) }}%</span>
          </div>
          <cds-progress-bar [value]="phaseCompletion(phase)" [showValue]="false" styleClass="rt-bar" />
          <div class="rt-phase-meta" *ngIf="phase.objective">{{ phase.objective }}</div>
          <div class="rt-milestones" *ngIf="phase.milestones?.length">
            <div class="rt-ms" *ngFor="let ms of phase.milestones">
              <i [class]="ms.status === 'completed' ? ' ms-done' : ms.blocked ? ' ms-blocked' : ' ms-pending'"></i>
              <span class="rt-ms-title">{{ ms.title }}</span>
              <cds-tag *ngIf="ms.blocked" value="Blocked" severity="danger" styleClass="rt-ms-tag" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .rt-summary { display: flex; gap: 24px; margin-bottom: 20px; }
    .rt-stat { text-align: center; }
    .rt-stat-val { display: block; font-size: var(--font-size-3xl); font-weight: 800; color: var(--text-color, #111); }
    .rt-stat-lbl { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary, var(--text-muted)); text-transform: uppercase; }

    .rt-phases { display: flex; flex-direction: column; gap: 16px; }
    .rt-phase {
      display: flex; gap: 14px; padding: 16px;
      border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle));
      background: var(--surface-card, #fff);
      border-inline-start: 4px solid var(--surface-300, var(--border-subtle));
    }
    .rt-phase.rt-done { border-inline-start-color: var(--success); }
    .rt-phase.rt-active { border-inline-start-color: var(--primary); }
    .rt-phase-num {
      width: 32px; height: 32px; border-radius: var(--radius-pill);
      background: var(--surface-100, var(--surface-ice)); display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-base); font-weight: 800; color: var(--text-color, #111); flex-shrink: 0;
    }
    .rt-phase.rt-done .rt-phase-num { background: #dcfce7; color: var(--success); }
    .rt-phase.rt-active .rt-phase-num { background: #dbeafe; color: var(--primary); }
    .rt-phase-body { flex: 1; min-width: 0; }
    .rt-phase-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .rt-phase-title { font-size: var(--font-size-base); font-weight: 700; color: var(--text-color, #111); }
    .rt-phase-pct { font-size: var(--font-size-sm); font-weight: 700; color: var(--primary, var(--primary)); }
    .rt-phase-meta { font-size: var(--font-size-sm); color: var(--text-color-secondary, var(--text-muted)); margin-top: 6px; }

    .rt-milestones { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
    .rt-ms { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); }
    .ms-done { color: var(--success); } .ms-blocked { color: var(--error); } .ms-pending { color: var(--border-subtle); }
    .rt-ms-title { color: var(--text-color, #111); }
  `]
})
export class RoadmapTimelineComponent {
  @Input() roadmap: ComplianceRoadmapDto | null = null;
  @Input() L!: ComplianceLabels;

  phaseCompletion(phase: RoadmapPhaseDto): number {
    if (phase.completionPercent !== undefined) return phase.completionPercent;
    if (!phase.milestones || phase.milestones.length === 0) return 0;
    const tasks = phase.milestones.flatMap(m => m.tasks || []);
    const done = tasks.filter(t => t.status === 'completed').length;
    return tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  }

}
