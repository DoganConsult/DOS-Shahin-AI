import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { LocalKnowledgeApiService } from '../../services/local-knowledge-api.service';
import { LocalKnowledgeState } from '../../state/local-knowledge.state';

@Component({
  selector: 'app-local-knowledge-hub',
  templateUrl: './local-knowledge-hub.component.html',
  styleUrls: ['./local-knowledge-hub.component.scss']
})
export class LocalKnowledgeHubComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  totalDocuments = 0;
  indexedDocuments = 0;
  failedDocuments = 0;
  pendingDocuments = 0;
  lastIngestion: string | null = null;
  
  // UI state
  loading = false;
  error: string | null = null;
  
  constructor(
    private apiService: LocalKnowledgeApiService,
    private state: LocalKnowledgeState
  ) {}

  ngOnInit(): void {
    this.loadHubData();
    this.subscribeToStateUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadHubData(): void {
    this.loading = true;
    this.error = null;

    this.apiService.getHubStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.totalDocuments = data.totalDocuments;
          this.indexedDocuments = data.indexedDocuments;
          this.failedDocuments = data.failedDocuments;
          this.pendingDocuments = data.pendingDocuments;
          this.lastIngestion = data.lastIngestion;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load hub data';
          this.loading = false;
          console.error('Hub data loading error:', err);
        }
      });
  }

  private subscribeToStateUpdates(): void {
    this.state.documents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(documents => {
        // Update statistics when documents change
        this.totalDocuments = documents.length;
        this.indexedDocuments = documents.filter(d => d.status === 'embedded').length;
        this.failedDocuments = documents.filter(d => d.status === 'failed').length;
        this.pendingDocuments = documents.filter(d => ['pending', 'ingesting', 'chunked'].includes(d.status)).length;
      });
  }

  refreshData(): void {
    this.loadHubData();
  }

  navigateToIngestion(): void {
    // Navigate to ingestion page
  }

  navigateToRetrieval(): void {
    // Navigate to retrieval page
  }

  navigateToCuration(): void {
    // Navigate to curation page
  }
}
