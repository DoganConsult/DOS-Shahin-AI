import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ExecutiveService, BriefingType, ObjectiveType, AppetiteType } from '../../services/executive.service';

@Component({
  selector: 'app-executive-dashboard',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe, DecimalPipe],
  template: `
    <div class="executive-container p-8 w-full bg-gradient-to-b from-slate-900 to-slate-800 min-h-screen text-white" [dir]="'ltr'" style="margin-inline-start: auto;">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-light tracking-wide">Executive Command</h1>
          <p class="text-slate-400 mt-1">Board-level briefings, strategic objectives, and risk appetite</p>
        </div>
        <button class="bg-amber-500 text-slate-900 px-5 py-2.5 rounded-lg font-semibold shadow-lg hover:bg-amber-400 transition">Generate Briefing</button>
      </div>

      <div *ngIf="isLoading" class="grid grid-cols-3 gap-6 mb-8"><div *ngFor="let i of [1,2,3]" class="bg-slate-700 animate-pulse rounded-xl h-32"></div></div>

      <div *ngIf="!isLoading && error" class="bg-red-900/40 border border-red-700 text-red-200 p-5 rounded-xl"><h3 class="font-bold">Data unavailable</h3><p>{{ error }}</p></div>

      <div *ngIf="!isLoading && !error">
        <!-- KPI Row -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-6 shadow-lg">
            <p class="text-xs text-slate-400 uppercase tracking-widest mb-2">Strategic Objectives</p>
            <p class="text-4xl font-light text-white">{{ objectives.length }}</p>
            <p class="text-xs mt-2 text-slate-300">Total defined objectives</p>
          </div>
          <div class="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-6 shadow-lg">
            <p class="text-xs text-slate-400 uppercase tracking-widest mb-2">Risk Appetite Domains</p>
            <p class="text-4xl font-light" [class]="hasBreach ? 'text-red-400' : 'text-white'">{{ appetites.length }}</p>
            <p class="text-xs mt-2" [class]="hasBreach ? 'text-red-300' : 'text-green-300'">{{ breachedCount }} breaches detected</p>
          </div>
          <div class="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-6 shadow-lg">
            <p class="text-xs text-slate-400 uppercase tracking-widest mb-2">Pending Briefs</p>
            <p class="text-4xl font-light text-white">{{ briefs.length }}</p>
            <p class="text-xs mt-2 text-slate-300">Generated reports</p>
          </div>
        </div>

        <!-- Briefs & Objectives -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 class="text-sm text-slate-400 uppercase tracking-widest mb-4">Strategic Objectives</h2>
            <div *ngFor="let obj of objectives" class="bg-slate-800/60 border border-slate-700 rounded-xl p-5 mb-3 flex items-center justify-between">
              <div>
                <p class="text-xs uppercase text-slate-400">{{ obj.category }}</p>
                <h3 class="text-lg font-medium">{{ obj.title }}</h3>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-24 bg-slate-700 rounded-full h-2">
                  <div class="h-2 rounded-full bg-cyan-500" [style.width]="obj.progressPct + '%'"></div>
                </div>
                <span class="text-sm font-mono">{{ obj.progressPct }}%</span>
              </div>
            </div>
            <div *ngIf="!objectives.length" class="text-slate-500 text-sm italic">No strategic objectives found.</div>
          </div>

          <div>
             <h2 class="text-sm text-slate-400 uppercase tracking-widest mb-4">Recent Briefings</h2>
             <div *ngFor="let b of briefs" class="bg-slate-800/60 border border-slate-700 rounded-xl p-5 mb-3 hover:border-amber-600/50 transition-colors">
               <div class="flex justify-between items-center">
                 <div>
                   <h3 class="text-lg font-medium">{{ b.title }}</h3>
                   <p class="text-sm text-slate-400">{{ b.createdAt | date:'mediumDate' }} · {{ b.generationMethod }}</p>
                 </div>
                 <span class="text-xs px-3 py-1 rounded-full font-semibold uppercase"
                   [class]="b.status === 'approved' ? 'bg-green-900 text-green-300' : b.status === 'draft' ? 'bg-slate-700 text-slate-300' : 'bg-amber-900 text-amber-300'">{{ b.status }}</span>
               </div>
             </div>
             <div *ngIf="!briefs.length" class="text-slate-500 text-sm italic">No executive briefs available.</div>
          </div>
        </div>

        <!-- Risk Appetite -->
        <div>
          <h2 class="text-sm text-slate-400 uppercase tracking-widest mb-4">Risk Appetite Monitor</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div *ngFor="let a of appetites" class="bg-slate-800/60 border rounded-xl p-5"
              [class]="a.isBreached ? 'border-red-600' : 'border-slate-700'">
              <div class="flex justify-between items-center mb-3">
                <p class="font-medium flex items-center">
                   <span *ngIf="a.isBreached" class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75 mr-2"></span>
                   {{ a.riskDomain }}
                </p>
                <span *ngIf="a.isBreached" class="text-xs bg-red-700 text-red-100 px-2 py-0.5 rounded-full">BREACHED</span>
              </div>
              
              <!-- Percent bar logic visually derived from exposure vs limit -->
              <div class="w-full bg-slate-700 rounded-full h-2 mb-2 relative">
                <div class="h-2 rounded-full transition-all" 
                  [style.width]="(a.currentExposure / a.limitThreshold * 100 > 100 ? 100 : a.currentExposure / a.limitThreshold * 100) + '%'"
                  [class]="a.isBreached ? 'bg-red-500' : (a.currentExposure / a.limitThreshold > 0.8 ? 'bg-amber-500' : 'bg-green-500')"></div>
              </div>
              <p class="text-xs text-slate-400">Exposure: {{ a.currentExposure | number }} / Limit: {{ a.limitThreshold | number }}</p>
            </div>
            <div *ngIf="!appetites.length" class="text-slate-500 text-sm italic">No risk appetite thresholds configured.</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ExecutiveDashboardComponent implements OnInit {
  isLoading = true; error: string | null = null;
  briefs: BriefingType[] = [];
  objectives: ObjectiveType[] = [];
  appetites: AppetiteType[] = [];

  get hasBreach(): boolean { return this.appetites.some(a => a.isBreached); }
  get breachedCount(): number { return this.appetites.filter(a => a.isBreached).length; }

  constructor(private executiveSvc: ExecutiveService) {}

  ngOnInit() {
    forkJoin({
      briefs: this.executiveSvc.getBriefings(),
      objectives: this.executiveSvc.getObjectives(),
      appetites: this.executiveSvc.getRiskAppetite()
    }).subscribe({
      next: (res) => {
        this.briefs = res.briefs.data;
        this.objectives = res.objectives.data;
        this.appetites = res.appetites.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = "Failed to synchronize executive data streams.";
        this.isLoading = false;
        console.error('Executive DAG error', err);
      }
    });
  }
}
