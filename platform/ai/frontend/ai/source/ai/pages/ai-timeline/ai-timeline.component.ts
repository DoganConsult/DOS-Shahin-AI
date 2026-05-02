import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiApiService } from '../../services/ai-api.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-ai-timeline',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './ai-timeline.component.html'
})
export class AiTimelineComponent implements OnInit {
  private aiService = inject(AiApiService);

  timelineEvents = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.refreshTimeline();
  }

  refreshTimeline() {
    this.isLoading.set(true);
    this.aiService.getWorkflowTimeline().subscribe({
      next: (events) => {
        this.timelineEvents.set(events || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  getIconForStatus(status: string): string {
    switch(status) {
      case 'completed': return 'pi pi-check-circle text-green-500';
      case 'in_progress': return 'pi pi-spin pi-cog text-blue-500';
      case 'pending': return 'pi pi-clock text-orange-500';
      case 'overdue': return 'pi pi-exclamation-triangle text-red-500';
      default: return 'pi pi-info-circle text-gray-500';
    }
  }
}
