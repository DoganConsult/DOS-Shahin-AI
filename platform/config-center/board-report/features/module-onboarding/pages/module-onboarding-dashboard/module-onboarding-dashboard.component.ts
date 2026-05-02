import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModuleOnboardingService, ModuleStatusType } from '../../services/module-onboarding.service';

@Component({
  selector: 'app-module-onboarding-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="onboarding-container p-8 min-h-screen bg-slate-50" [dir]="'ltr'" style="margin-inline-start: auto;">
      <header class="mb-10 text-center">
        <h1 class="text-4xl font-extrabold text-slate-800 tracking-tight">Active Deployments</h1>
        <p class="text-slate-500 mt-3 text-lg">Track your tenant module provisioning sequences</p>
      </header>

      <div *ngIf="isLoading" class="flex justify-center p-12">
        <div class="animate-pulse flex space-x-4">
          <div class="w-12 h-12 bg-indigo-200 rounded-full"></div>
          <div class="w-12 h-12 bg-indigo-200 rounded-full"></div>
          <div class="w-12 h-12 bg-indigo-200 rounded-full"></div>
        </div>
      </div>

      <div *ngIf="!isLoading && error" class="max-w-3xl mx-auto bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
        <div class="flex"><div class="flex-shrink-0"><span class="text-red-500 w-5 h-5 block">!</span></div><div class="ml-3"><p class="text-sm text-red-700">{{ error }}</p></div></div>
      </div>

      <div *ngIf="!isLoading && !error" class="max-w-5xl mx-auto grid gap-6">
        <div *ngFor="let mod of activeModules" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition">
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-indigo-100 flex justify-center items-center text-indigo-600 font-bold text-xl uppercase">{{ mod.moduleCode | slice:0:2 }}</div>
              <div>
                <h2 class="text-xl font-bold text-slate-800 capitalize">{{ mod.moduleCode.replace('-', ' ') }}</h2>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium" 
                    [class]="mod.overallStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
                    {{ mod.overallStatus }}
                  </span>
                  <span class="text-sm text-slate-500 font-medium">{{ mod.completionPct }}% Complete</span>
                </div>
              </div>
            </div>
            <button *ngIf="mod.overallStatus !== 'completed'" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition shadow block">View Checklist</button>
          </div>

          <!-- Progress Track -->
          <div class="w-full bg-slate-100 rounded-full h-3 mb-6 overflow-hidden">
            <div class="bg-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out relative" [style.width]="mod.completionPct + '%'">
              <div class="absolute inset-0 bg-white/20 w-full" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px);"></div>
            </div>
          </div>

          <!-- Steps -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div *ngFor="let step of mod.steps" class="flex gap-3 p-3 rounded-xl" [class]="step.isComplete ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-100'">
              <div class="mt-0.5">
                <input type="checkbox" [checked]="step.isComplete" [disabled]="step.isComplete" (change)="completeStep(mod.moduleId, step.stepCode)" class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
              </div>
              <div>
                <p class="font-medium text-sm" [class]="step.isComplete ? 'text-emerald-900 line-through opacity-70' : 'text-slate-700'">{{ step.stepCode.replace('_', ' ') | titlecase }}</p>
                <p class="text-xs mt-0.5" [class]="step.isComplete ? 'text-emerald-600' : 'text-slate-500'">{{ step.isRequired ? 'Required' : 'Optional' }}</p>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="!activeModules.length" class="text-center bg-white p-12 rounded-2xl border border-slate-200 border-dashed">
          <p class="text-slate-500">No active module onboarding sequences found.</p>
        </div>
      </div>
    </div>
  `
})
export class ModuleOnboardingDashboardComponent implements OnInit {
  isLoading = true;
  error: string | null = null;
  activeModules: ModuleStatusType[] = [];

  constructor(private onboardingSvc: ModuleOnboardingService) {}

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.isLoading = true;
    this.error = null;
    this.onboardingSvc.getActiveOnboardings().subscribe({
      next: (res) => {
        this.activeModules = res.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = "Could not fetch active onboarding metrics.";
        this.isLoading = false;
      }
    });
  }

  completeStep(moduleId: string, stepCode: string) {
    this.onboardingSvc.completeStep(moduleId, stepCode).subscribe({
      next: () => this.fetchData(),
      error: () => alert('Failed to complete step.')
    });
  }
}
