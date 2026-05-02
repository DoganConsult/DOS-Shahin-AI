import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { McpService } from '../../services/mcp.service';

@Component({
  selector: 'app-mcp-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mcp-dashboard p-8 min-h-screen bg-slate-900 text-slate-100" [dir]="'ltr'" style="margin-inline-start: auto;">
      <header class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-light text-cyan-400">Model Context Protocol</h1>
          <p class="text-slate-400 mt-2">Agent & Tool Registry Command Center</p>
        </div>
        <button class="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-medium transition shadow-lg shadow-cyan-900/50">Register Agent</button>
      </header>

      <div *ngIf="isLoading" class="flex space-x-6 animate-pulse">
        <div class="h-40 w-1/3 bg-slate-800 rounded-xl"></div>
        <div class="h-40 w-1/3 bg-slate-800 rounded-xl"></div>
      </div>

      <div *ngIf="error" class="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded-lg">
        {{ error }}
      </div>

      <div *ngIf="!isLoading && !error" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <!-- Agents Panel -->
        <div class="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h2 class="text-xl font-semibold mb-4 text-white flex items-center">
            <span class="w-2 h-2 bg-green-500 rounded-full mr-3 text-cyan-400 border border-cyan-400/50 flex align-center justify-center p-2 text-xs font-bold leading-none">A</span>
            Active Agents ({{ agents.length }})
          </h2>
          <div class="space-y-4">
            <div *ngFor="let agent of agents" class="p-4 rounded-xl bg-slate-800 border border-slate-600 hover:border-cyan-500 transition-colors">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-medium text-lg">{{ agent.name }}</h3>
                  <p class="text-sm text-slate-400 mt-1 truncate">{{ agent.systemPrompt || 'No system prompt' }}</p>
                </div>
                <span class="px-2 py-1 text-xs rounded-lg font-mono bg-cyan-900/40 text-cyan-300">v{{ agent.agentId.substring(0,6) }}</span>
              </div>
              <div class="mt-4 flex gap-2">
                <span *ngFor="let bt of agent.boundTools" class="text-xs px-2 py-1 bg-slate-700 rounded-md text-slate-300">{{ bt.name }}</span>
                <span *ngIf="!agent.boundTools?.length" class="text-xs text-slate-500 italic">No bound tools</span>
              </div>
            </div>
            
            <div *ngIf="!agents.length" class="text-center p-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
              No agents registered in the tenant schema.
            </div>
          </div>
        </div>

        <!-- Tools Panel -->
        <div class="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h2 class="text-xl font-semibold mb-4 text-white">Registered Tools ({{ tools.length }})</h2>
          <div class="grid grid-cols-1 gap-3">
             <div *ngFor="let tool of tools" class="flex justify-between items-center p-4 bg-slate-800 rounded-xl border border-slate-600 border-l-4 border-l-emerald-500">
               <div>
                 <h3 class="font-medium">{{ tool.name }}</h3>
                 <p class="text-xs text-slate-400 mt-1">{{ tool.description || 'No description' }}</p>
               </div>
               <button class="text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition">Inspect Schema</button>
             </div>

             <div *ngIf="!tools.length" class="text-center p-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
              No tools available.
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class McpDashboardComponent implements OnInit {
  isLoading = true;
  error: string | null = null;
  agents: any[] = [];
  tools: any[] = [];

  constructor(private mcp: McpService) {}

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.isLoading = true;
    this.error = null;
    
    // In real app we wait for both. We chain here to match basic pattern without rxjs overload
    this.mcp.getAgents().subscribe({
      next: (res) => {
        this.agents = res.data;
        this.mcp.getTools().subscribe({
          next: (tRes) => {
            this.tools = tRes.data;
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Tools error', err);
            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        this.error = 'Failed to load MCP payload registries.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }
}
