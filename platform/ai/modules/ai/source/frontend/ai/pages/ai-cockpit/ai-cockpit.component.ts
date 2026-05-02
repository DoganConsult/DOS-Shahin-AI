import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiApiService } from '../../services/ai-api.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-ai-cockpit',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './ai-cockpit.component.html'
})
export class AiCockpitComponent implements OnInit {
  private aiService = inject(AiApiService);

  dashboardData = signal<any>(null);
  agentsData = signal<any[]>([]);

  totalAgents = computed(() => this.dashboardData()?.aiAgents || 0);
  activeWorkflows = computed(() => this.dashboardData()?.activeWorkflows || 0);
  pendingApprovals = computed(() => this.dashboardData()?.pendingApprovals || 0);

  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.refreshCockpit();
  }

  refreshCockpit() {
    this.isLoading.set(true);
    
    this.aiService.getUnifiedDashboard().subscribe({
      next: (val) => this.dashboardData.set(val),
      error: (err) => console.error(err)
    });

    this.aiService.getAgentMonitoring().subscribe({
      next: (val) => {
        this.agentsData.set(val.agents || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }
}
