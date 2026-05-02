import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-onboarding-os-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="onboarding-os-container p-6 w-full" [dir]="'ltr'" style="margin-inline-start: auto;">
      <h1 class="text-2xl font-bold text-gray-800 mb-2">Platform Onboarding</h1>
      <p class="text-gray-500 mb-6">Phased activation milestones for tenant setup</p>

      <div *ngIf="isLoading" class="flex items-center justify-center py-16 animate-pulse">
        <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div *ngIf="!isLoading && !flow" class="text-center py-16 bg-green-50 border border-green-100 rounded-lg">
        <h3 class="text-xl font-medium text-green-700">🎉 Onboarding Complete</h3>
        <p class="text-green-600 mt-2">All activation milestones have been completed.</p>
      </div>

      <div *ngIf="!isLoading && flow">
        <!-- Overall Progress -->
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-6">
          <div class="flex justify-between items-center mb-3">
            <p class="text-sm font-medium text-indigo-700">Overall Progress</p>
            <span class="text-2xl font-bold text-indigo-800">{{ flow.overallPct }}%</span>
          </div>
          <div class="w-full bg-indigo-100 rounded-full h-3">
            <div class="bg-indigo-600 h-3 rounded-full transition-all" [style.width]="flow.overallPct + '%'"></div>
          </div>
        </div>

        <!-- Phases -->
        <div class="space-y-4">
          <div *ngFor="let phase of flow.phases; let i = index" class="bg-white border rounded-lg p-5 shadow-sm">
            <div class="flex justify-between items-center mb-3">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold"
                  [class]="phase.progressPct === 100 ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'">{{ i + 1 }}</span>
                <p class="font-bold text-gray-800">{{ phase.name }}</p>
              </div>
              <span class="text-sm font-medium" [class]="phase.progressPct === 100 ? 'text-green-600' : 'text-indigo-600'">
                {{ phase.completedMilestones }}/{{ phase.totalMilestones }}
              </span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2">
              <div class="h-2 rounded-full transition-all"
                [style.width]="phase.progressPct + '%'"
                [class]="phase.progressPct === 100 ? 'bg-green-500' : 'bg-indigo-500'"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  \`
})
export class OnboardingOsDashboardComponent implements OnInit {
  isLoading = true; flow: any = null;
  ngOnInit() {
    setTimeout(() => {
      this.isLoading = false;
      this.flow = {
        overallPct: 68,
        phases: [
          { name: 'Foundation Setup', totalMilestones: 4, completedMilestones: 4, progressPct: 100 },
          { name: 'Core Module Activation', totalMilestones: 6, completedMilestones: 6, progressPct: 100 },
          { name: 'Security & DAuth Config', totalMilestones: 5, completedMilestones: 3, progressPct: 60 },
          { name: 'Integration Wiring', totalMilestones: 4, completedMilestones: 1, progressPct: 25 },
          { name: 'Go-Live Validation', totalMilestones: 3, completedMilestones: 0, progressPct: 0 }
        ]
      };
    }, 500);
  }
}
