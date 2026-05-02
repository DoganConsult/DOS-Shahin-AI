import { Component, Input, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetShellComponent } from '@app/dashboard';
import { GovernanceApiService } from '@app/api/governance-api.service';
import { firstValueFrom } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-leadership-summary-widget',
    imports: [CommonModule, WidgetShellComponent, TagModule],
    template: `
    <app-widget-shell [title]="title()" [fetchedAt]="fetchedAt()">
      @if (data()) {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="border rounded-xl p-3">
            <div class="text-xs text-gray-500">Milestones</div>
            <div class="text-2xl font-semibold">{{ data()?.milestones?.total ?? 0 }}</div>
            <div class="text-xs mt-1">
              <span class="text-green-600">{{ data()?.milestones?.completed ?? 0 }} done</span> ·
              <span class="text-red-600">{{ data()?.milestones?.blocked ?? 0 }} blocked</span>
            </div>
          </div>
          <div class="border rounded-xl p-3">
            <div class="text-xs text-gray-500">At Risk</div>
            <div class="text-2xl font-semibold text-amber-600">{{ data()?.milestones?.atRisk ?? 0 }}</div>
          </div>
          <div class="border rounded-xl p-3">
            <div class="text-xs text-gray-500">Initiatives (recent)</div>
            <div class="text-2xl font-semibold">{{ data()?.initiatives?.recentRuns ?? 0 }}</div>
            <div class="text-xs mt-1 text-blue-600">{{ data()?.initiatives?.activeRuns ?? 0 }} active</div>
          </div>
          <div class="border rounded-xl p-3">
            <div class="text-xs text-gray-500">Expert Packs</div>
            <div class="text-2xl font-semibold">{{ data()?.expertPacks ?? 0 }}</div>
          </div>
        </div>

        @if (data()?.blockedMilestones?.length) {
          <div class="mt-4">
            <div class="text-sm font-medium mb-2">Blocked Milestones</div>
            @for (m of data()?.blockedMilestones?.slice(0, 5); track m.milestoneCode) {
              <div class="flex items-center justify-between py-1 border-b text-sm">
                <span>{{ m.milestoneCode }}</span>
                <p-tag [value]="m.moduleCode" severity="danger" />
              </div>
            }
          </div>
        }

        @if (data()?.atRiskMilestones?.length) {
          <div class="mt-4">
            <div class="text-sm font-medium mb-2">At-Risk Milestones</div>
            @for (m of data()?.atRiskMilestones?.slice(0, 5); track m.milestoneCode) {
              <div class="flex items-center justify-between py-1 border-b text-sm">
                <span>{{ m.milestoneCode }}</span>
                <p-tag [value]="m.moduleCode" severity="warning" />
              </div>
            }
          </div>
        }
      } @else {
        <div class="text-sm text-gray-500">Loading leadership data...</div>
      }
    </app-widget-shell>
  `
})
export class LeadershipSummaryWidgetComponent implements OnInit {
  @Input() config: Record<string, unknown> = {};

  private api = inject(GovernanceApiService);

  readonly title = signal('Leadership Summary');
  readonly fetchedAt = signal<string | null>(null);
  readonly data = signal<GrcRecord | null>(null);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getLeadershipSummary());
      this.data.set(res);
      this.fetchedAt.set(new Date().toISOString());
    } catch {}
  }
}
