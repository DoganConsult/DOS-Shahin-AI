/**
 * Roadmap Visualizer Component — Visual representation of the 10-stage roadmap.
 *
 * Shows stage dependencies, estimated effort, completion status,
 * and highlights current/recommended stages.
 *
 * Requirements: 1.4, 12.3
 */

import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { JourneyService, GRCRoadmap, RoadmapPhase } from '@app/core/services/user-account/journey.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-roadmap-visualizer',
    imports: [CommonModule],
    template: `
    <div class="roadmap-visualizer" [attr.dir]="i18n.direction()">
      <h3>{{ i18n.translate('journey.roadmap.visualTitle') }}</h3>

      <div class="timeline">
        @for (phase of phases(); track phase.phaseId; let i = $index) {
          <div
            class="timeline-node"
            [class.completed]="getCompletion(phase) === 100"
            [class.active]="isActive(phase)"
            [class.upcoming]="getCompletion(phase) === 0 && !isActive(phase)"
          >
            <div class="node-connector" [class.first]="i === 0"></div>
            <div class="node-dot">
              @if (getCompletion(phase) === 100) {
                <i class="pi pi-check"></i>
              } @else {
                <span>{{ i + 1 }}</span>
              }
            </div>
            <div class="node-content">
              <div class="node-title">{{ resolveName(phase) }}</div>
              <div class="node-meta">
                <span class="effort">{{ phase.estimatedWeeks }} {{ i18n.translate('journey.roadmap.weeks') }}</span>
                <span class="completion">{{ getCompletion(phase) }}%</span>
              </div>
              <div class="node-bar">
                <div class="node-bar-fill" [style.width.%]="getCompletion(phase)"></div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
    styles: [`
    .roadmap-visualizer { padding: var(--space-md); }
    .timeline { display: flex; flex-direction: column; gap: 0; }
    .timeline-node {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
      padding-block: var(--space-sm);
      position: relative;
    }
    .node-connector {
      position: absolute;
      inset-inline-start: 18px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--surface-border);
    }
    .node-connector.first { top: 50%; }
    .timeline-node:last-child .node-connector { bottom: 50%; }
    .node-dot {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-pill);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: var(--font-size-tag);
      z-index: var(--z-base);
      flex-shrink: 0;
      background: var(--surface-hover);
      color: var(--text-secondary);
      border: 2px solid var(--surface-border);
    }
    .timeline-node.completed .node-dot { background: var(--green-500); color: white; border-color: var(--green-500); }
    .timeline-node.active .node-dot { background: var(--primary); color: white; border-color: var(--primary); }
    .node-content { flex: 1; }
    .node-title { font-weight: 600; margin-block-end: 2px; }
    .node-meta { display: flex; gap: var(--space-md); font-size: var(--font-size-tag); color: var(--text-secondary); margin-block-end: 4px; }
    .node-bar { height: 4px; background: var(--surface-hover); border-radius: var(--radius-xs); overflow: hidden; }
    .node-bar-fill { height: 100%; background: var(--primary); border-radius: var(--radius-xs); transition: width 0.3s; }
    .timeline-node.completed .node-bar-fill { background: var(--green-500); }
  `]
})
export class RoadmapVisualizerComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private journeyService = inject(JourneyService);
  i18n = inject(I18nService);

  roadmap = signal<GRCRoadmap | null>(null);
  phases = computed(() => this.roadmap()?.phases ?? []);

  ngOnInit() {
    this.journeyService.getRoadmap().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rm => this.roadmap.set(rm),
    });
  }

  resolveName(phase: RoadmapPhase): string {
    return this.journeyService.resolveBilingual(phase, 'name');
  }

  getCompletion(phase: RoadmapPhase): number {
    const tasks = phase.milestones.flatMap(m => m.tasks);
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.status === 'completed').length;
    return Math.round((done / tasks.length) * 100);
  }

  isActive(phase: RoadmapPhase): boolean {
    const completion = this.getCompletion(phase);
    if (completion === 100) return false;
    const allPhases = this.phases();
    const idx = allPhases.indexOf(phase);
    // Active if all previous phases are complete
    for (let i = 0; i < idx; i++) {
      if (this.getCompletion(allPhases[i]) < 100) return false;
    }
    return true;
  }
}
